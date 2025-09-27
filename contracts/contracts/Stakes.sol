// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
//
//interface IACGC {
//    function isAllowed(uint256 nullifier) external view returns (bool);
//    function lastNullifierByUserKey(bytes32 userKey) external view returns (uint256);
//}


contract Stakes {
//    address public owner;
//    IACGC  public verifier;
//
//    modifier onlyOwner() {
//        require(msg.sender == owner, "only owner");
//        _;
//    }
//
//    mapping(address => uint256) public boundNullifier; // address => nullifier
//
//    uint256 public nextRoomId;
//
//    struct Room {
//        uint256 stake;
//        uint256 createdAt;
//        uint256 joinDeadline;
//        address arbiter;            // judge/referee
//        uint16  loserPenaltyPercent;// 0..100 (portion of loser stake awarded to winner)
//
//        bool open;                  // room accepting joins
//        bool joined;                // both players joined
//        bool resolved;              // payout computed & credited
//
//        address playerAAddr;
//        uint256 playerANullifier;
//
//        address playerBAddr;
//        uint256 playerBNullifier;
//
//        address winnerAddr;
//        uint256 winnerNullifier;
//    }
//
//    mapping(uint256 => Room) public rooms;
//
//    // confirmations: roomId => confirmer => claimed winner
//    mapping(uint256 => mapping(address => address)) public confirmations;
//
//    // pull balances
//    mapping(address => uint256) public ethWithdrawable;
//
//    // ---- Events ----
//    event RoomCreated(
//        uint256 indexed roomId,
//        uint256 stake,
//        uint256 joinDeadline,
//        address indexed arbiter,
//        uint16 loserPenaltyPercent
//    );
//    event VerifierUpdated(address indexed newVerifier);
//    event BoundNullifier(address indexed user, uint256 nullifier);
//    event Joined(uint256 indexed roomId, address indexed player, uint256 playerNullifier);
//    event Resolved(uint256 indexed roomId, address indexed winner, uint256 winnerNullifier, uint256 winnerGets);
//    event RoomClosed(uint256 indexed roomId);
//    event Withdrawn(address indexed to, uint256 amount);
//
//    // ---- Constructor ----
//    constructor(address _verifier) {
//        owner = msg.sender;                 // deployer is the admin (same as ACGC deployer)
//        verifier = IACGC(_verifier);
//        emit VerifierUpdated(_verifier);
//    }
//
//    // ---- Admin: manage verifier, create/close rooms ----
//    function setVerifier(address v) external onlyOwner {
//        require(v != address(0), "zero addr");
//        verifier = IACGC(v);
//        emit VerifierUpdated(v);
//    }
//
//    /// @notice Owner creates a room; players will later join and stake.
//    function createRoom(
//        uint256 stake,
//        uint256 joinDeadlineSeconds,
//        address arbiter,
//        uint16 loserPenaltyPercent
//    ) external onlyOwner returns (uint256 roomId) {
//        require(stake > 0, "stake>0");
//        require(loserPenaltyPercent <= 100, "bad penalty");
//
//        roomId = nextRoomId++;
//        Room storage r = rooms[roomId];
//
//        r.stake = stake;
//        r.createdAt = block.timestamp;
//        r.joinDeadline = block.timestamp + joinDeadlineSeconds;
//        r.arbiter = arbiter;
//        r.loserPenaltyPercent = loserPenaltyPercent;
//        r.open = true;
//
//        emit RoomCreated(roomId, stake, r.joinDeadline, arbiter, loserPenaltyPercent);
//    }
//
//    /// @notice Owner can close a room that didn't fill. Refunds any staked players.
//    function closeRoom(uint256 roomId) external onlyOwner {
//        Room storage r = rooms[roomId];
//        require(r.open && !r.resolved, "not open or resolved");
//        r.open = false;
//        emit RoomClosed(roomId);
//
//        // Refund anyone who already joined (pull pattern)
//        if (r.playerAAddr != address(0) && !r.joined) {
//            ethWithdrawable[r.playerAAddr] += r.stake;
//        }
//        if (r.playerBAddr != address(0) && !r.joined) {
//            ethWithdrawable[r.playerBAddr] += r.stake;
//        }
//    }
//
//    // ---- Identity helpers ----
//    function _nullifierFromUserData(bytes memory userData) internal view returns (uint256) {
//        return verifier.lastNullifierByUserKey(keccak256(userData));
//    }
//
//    mapping(uint256 => address) public nullifierOwner; // nullifier -> bound address
//
//    function _assertAndBindNullifier(bytes memory userData) internal returns (uint256 n) {
//        n = _nullifierFromUserData(userData);
//        require(n != 0, "no nullifier");
//        require(verifier.isAllowed(n), "banned/not allowed");
//
//        uint256 existing = boundNullifier[msg.sender];
//        address boundAddr = nullifierOwner[n];
//
//        if (existing == 0) {
//            // either unclaimed, or already bound to this same address
//            require(boundAddr == address(0) || boundAddr == msg.sender, "nullifier bound to another addr");
//            boundNullifier[msg.sender] = n;
//            nullifierOwner[n] = msg.sender;
//            emit BoundNullifier(msg.sender, n);
//        } else {
//            require(existing == n, "addr bound to different nullifier");
//        }
//    }
//
//
//    // ---- Players join & stake (ETH only) ----
//    function joinRoom(uint256 roomId, bytes calldata userData) external payable {
//        Room storage r = rooms[roomId];
//        require(r.open, "room closed");
//        require(block.timestamp <= r.joinDeadline, "join deadline passed");
//        require(!r.resolved, "already resolved");
//        require(msg.value == r.stake, "wrong stake");
//
//        uint256 n = _assertAndBindNullifier(userData);
//
//        if (r.playerAAddr == address(0)) {
//            // fill slot A
//            r.playerAAddr = msg.sender;
//            r.playerANullifier = n;
//            emit Joined(roomId, msg.sender, n);
//            return;
//        }
//
//        require(r.playerBAddr == address(0), "room full");
//        require(msg.sender != r.playerAAddr, "already joined");
//
//        // fill slot B
//        r.playerBAddr = msg.sender;
//        r.playerBNullifier = n;
//        r.joined = true;
//        r.open = false; // stop further joins
//        emit Joined(roomId, msg.sender, n);
//    }
//
//    /// @notice If room didn’t fill in time, a player who joined can pull refund.
//    function refundIfUnfilled(uint256 roomId) external {
//        Room storage r = rooms[roomId];
//        require(!r.joined, "room filled");
//        require(block.timestamp > r.joinDeadline || !r.open, "not refundable yet");
//
//        // grant refund to caller if they had deposited
//        if (msg.sender == r.playerAAddr && r.stake > 0) {
//            ethWithdrawable[msg.sender] += r.stake;
//            r.playerAAddr = address(0); // prevent double-claim
//        } else if (msg.sender == r.playerBAddr && r.stake > 0) {
//            ethWithdrawable[msg.sender] += r.stake;
//            r.playerBAddr = address(0);
//        } else {
//            revert("no deposit");
//        }
//    }
//
//    // ---- Resolution paths ----
//
//    // 1) Both players agree on winner
//    mapping(uint256 => mapping(address => address)) public confirmations; // roomId => confirmer => claimedWinner
//
//    function confirmWinner(uint256 roomId, address winnerAddr) external {
//        Room storage r = rooms[roomId];
//        require(r.joined && !r.resolved, "invalid state");
//        require(msg.sender == r.playerAAddr || msg.sender == r.playerBAddr, "only players");
//        require(winnerAddr == r.playerAAddr || winnerAddr == r.playerBAddr, "bad winner");
//
//        confirmations[roomId][msg.sender] = winnerAddr;
//
//        address a = confirmations[roomId][r.playerAAddr];
//        address b = confirmations[roomId][r.playerBAddr];
//        if (a != address(0) && a == b) {
//            _finalize(roomId, winnerAddr);
//        }
//    }
//
//    // 2) Arbiter or Owner resolves
//    function resolve(uint256 roomId, address winnerAddr) external {
//        Room storage r = rooms[roomId];
//        require(r.joined && !r.resolved, "invalid state");
//        require(
//            (r.arbiter != address(0) && msg.sender == r.arbiter) || msg.sender == owner,
//            "not arbiter/owner"
//        );
//        require(winnerAddr == r.playerAAddr || winnerAddr == r.playerBAddr, "bad winner");
//        _finalize(roomId, winnerAddr);
//    }
//
//    // ---- Finalize payouts (no platform fee) ----
//    function _finalize(uint256 roomId, address winnerAddr) internal {
//        Room storage r = rooms[roomId];
//        require(!r.resolved, "already resolved");
//        r.resolved = true;
//
//        // set outcome identity for transparency
//        uint256 winnerNull = (winnerAddr == r.playerAAddr) ? r.playerANullifier : r.playerBNullifier;
//        r.winnerAddr = winnerAddr;
//        r.winnerNullifier = winnerNull;
//
//        // payout math
//        uint256 loserForfeit = (r.stake * r.loserPenaltyPercent) / 100;
//        uint256 winnerGets = r.stake + loserForfeit;                         // own stake + opponent's forfeit
//        uint256 loserRefund = (r.stake > loserForfeit) ? (r.stake - loserForfeit) : 0;
//
//        address loserAddr = (winnerAddr == r.playerAAddr) ? r.playerBAddr : r.playerAAddr;
//
//        if (winnerGets > 0) ethWithdrawable[winnerAddr] += winnerGets;
//        if (loserRefund > 0) ethWithdrawable[loserAddr] += loserRefund;
//
//        emit Resolved(roomId, winnerAddr, winnerNull, winnerGets);
//    }
//
//    // ---- Withdraw (pull pattern) ----
//    function withdraw() external {
//        uint256 amt = ethWithdrawable[msg.sender];
//        require(amt > 0, "no funds");
//        ethWithdrawable[msg.sender] = 0;
//        (bool ok, ) = payable(msg.sender).call{value: amt}("");
//        require(ok, "transfer failed");
//        emit Withdrawn(msg.sender, amt);
//    }
//
//    // accept native CELO/ETH
//    receive() external payable {}
}