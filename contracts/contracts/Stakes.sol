// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns(bool);
    function transfer(address to, uint256 amount) external returns(bool);
    function allowance(address owner, address spender) external view returns(uint256);
}

contract TwoPlayerStaking {
    address public owner;
    uint256 public nextMatchId;
    uint256 public platformFeeBP;

    constructor(uint256 _platformFeeBP) {
        owner = msg.sender;
        platformFeeBP = _platformFeeBP;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // Match token = zero address for ETH, else ERC20 address
    struct Match {
        address playerA;
        address playerB;
        address token; // zero = ETH
        uint256 stake; // each player's stake
        uint256 createdAt;
        uint256 joinDeadline; // if opponent doesn't join, creator can cancel
        address arbiter; // optional: arbiter that can resolve
        bool joined;
        bool resolved;
        address winner;
        uint16 loserPenaltyPercent; // 0 - 100 (percent of loser stake that is forfeited); use 100 for full forfeiture
    }

    mapping(uint256 => Match) public matches;
    mapping(uint256 => mapping(address => bool)) public hasStaked; // matchId -> player -> staked
    mapping(address => uint256) public withdrawable; // pull pattern

    //events
    event MatchCreated(uint256 matchId, address creator, address token, uint256 stake, uint256 joinDeadline, address arbiter, uint16 loserPenaltyPercent);
    event Joined(uint256 matchId, address player);
    event Resolved(uint256 matchId, address winner, uint256 payout);
    event Withdrawn(address to, uint256 amount);
    event PlatformFeeWithdrawn(address to, uint256 amount);

    //create match
    function createMatchETH(uint256 joinDeadlineSeconds, address arbiter, uint16 loserPenaltyPercent) external payable returns(uint256) {
        require(msg.value > 0, "stake required");
        require(loserPenaltyPercent <= 100, "bad penalty");
        uint256 matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.playerA = msg.sender;
        m.token = address(0);
        m.stake = msg.value;
        m.createdAt = block.timestamp;
        m.joinDeadline = block.timestamp + joinDeadlineSeconds;
        m.arbiter = arbiter;
        m.joined = false;
        m.resolved = false;
        m.loserPenaltyPercent = loserPenaltyPercent;
        hasStaked[matchId][msg.sender] = true;
        emit MatchCreated(matchId, msg.sender, address(0), msg.value, m.joinDeadline, arbiter, loserPenaltyPercent);
        return matchId;
    }

    function createMatchERC20(address token, uint256 stake, uint256 joinDeadlineSeconds, address arbiter, uint16 loserPenaltyPercent) external returns(uint256) {
        require(token != address(0), "use createMatchETH for ETH");
        require(stake > 0, "stake > 0");
        require(loserPenaltyPercent <= 100, "bad penalty");
        require(IERC20(token).transferFrom(msg.sender, address(this), stake), "transferFrom failed");
        uint256 matchId = nextMatchId++;
        Match storage m = matches[matchId];
        m.playerA = msg.sender;
        m.token = token;
        m.stake = stake;
        m.createdAt = block.timestamp;
        m.joinDeadline = block.timestamp + joinDeadlineSeconds;
        m.arbiter = arbiter;
        m.joined = false;
        m.resolved = false;
        m.loserPenaltyPercent = loserPenaltyPercent;
        hasStaked[matchId][msg.sender] = true;
        emit MatchCreated(matchId, msg.sender, token, stake, m.joinDeadline, arbiter, loserPenaltyPercent);
        return matchId;
    }

    function joinMatchETH(uint256 matchId) external payable {
        Match storage m = matches[matchId];
        require(m.playerA != address(0), "no match");
        require(!m.joined, "already joined");
        require(m.token == address(0), "type mismatch");
        require(msg.value == m.stake, "wrong stake amount");
        require(block.timestamp <= m.joinDeadline, "join deadline passed");
        m.playerB = msg.sender;
        m.joined = true;
        hasStaked[matchId][msg.sender] = true;
        emit Joined(matchId, msg.sender);
    }

    function joinMatchERC20(uint256 matchId) external {
        Match storage m = matches[matchId];
        require(m.playerA != address(0), "no match");
        require(!m.joined, "already joined");
        require(m.token != address(0), "type mismatch");
        require(block.timestamp <= m.joinDeadline, "join deadline passed");
        // transfer stake from joining player
        require(IERC20(m.token).transferFrom(msg.sender, address(this), m.stake), "transferFrom failed");
        m.playerB = msg.sender;
        m.joined = true;
        hasStaked[matchId][msg.sender] = true;
        emit Joined(matchId, msg.sender);
    }

    //cancel if not joined
    function cancelUnjoined(uint256 matchId) external {
        Match storage m = matches[matchId];
        require(m.playerA == msg.sender, "only creator");
        require(!m.joined, "already joined");
        require(block.timestamp > m.joinDeadline, "can't cancel yet");
        m.resolved = true; // mark done
        if (m.token == address(0)) {
            withdrawable[msg.sender] += m.stake;
        } else {
            withdrawable[msg.sender] += 0; // not numeric token-aware; for ERC20 we will transfer immediately
            require(IERC20(m.token).transfer(msg.sender, m.stake), "refund failed");
        }
    }

    mapping(uint256 => mapping(address => address)) public confirmations; // matchId -> caller -> claimedWinner

    function confirmWinner(uint256 matchId, address winner) external {
        Match storage m = matches[matchId];
        require(m.joined, "not joined");
        require(!m.resolved, "already resolved");
        require(msg.sender == m.playerA || msg.sender == m.playerB, "only players");
        require(winner == m.playerA || winner == m.playerB, "invalid winner");
        confirmations[matchId][msg.sender] = winner;

        address aConf = confirmations[matchId][m.playerA];
        address bConf = confirmations[matchId][m.playerB];
        if (aConf != address(0) && bConf != address(0) && aConf == bConf) {
            _finalize(matchId, aConf);
        }
    }

    function resolveByArbiter(uint256 matchId, address winner) external {
        Match storage m = matches[matchId];
        require(m.joined, "not joined");
        require(!m.resolved, "already resolved");
        require(m.arbiter != address(0), "no arbiter");
        require(msg.sender == m.arbiter, "only arbiter");
        require(winner == m.playerA || winner == m.playerB, "invalid winner");
        _finalize(matchId, winner);
    }

    function _finalize(uint256 matchId, address winner) internal {
        Match storage m = matches[matchId];
        require(!m.resolved, "already resolved");
        m.resolved = true;
        m.winner = winner;

        uint256 totalPool = m.stake * 2;
        uint256 fee = (totalPool * platformFeeBP) / 10000;

        uint256 loserForfeit = (m.stake * m.loserPenaltyPercent) / 100;
        uint256 winnerGets = m.stake + loserForfeit;

        if (fee > 0) {
            if (winnerGets > fee) {
                winnerGets -= fee;
            } else {
                fee = winnerGets;
                winnerGets = 0;
            }
            withdrawable[owner] += fee;
        }

        uint256 loserRefund = (m.stake > loserForfeit) ? (m.stake - loserForfeit) : 0;

        withdrawable[winner] += winnerGets;
        address loser = (winner == m.playerA ? m.playerB : m.playerA);
        if (loserRefund > 0) withdrawable[loser] += loserRefund;
        emit Resolved(matchId, winner, winnerGets);
    }

    function withdraw() external {
        uint256 amt = withdrawable[msg.sender];
        require(amt > 0, "no funds");
        withdrawable[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amt}("");
        require(ok, "transfer failed");
        emit Withdrawn(msg.sender, amt);
    }

    function setPlatformFee(uint256 bp) external onlyOwner {
        require(bp <= 1000, "too high");
        platformFeeBP = bp;
    }

    receive() external payable {}
}