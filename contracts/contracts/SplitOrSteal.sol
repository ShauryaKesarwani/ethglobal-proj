// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IACGC {
    function isAllowed(uint256 nullifier) external view returns (bool);
}

abstract contract PullPayments {
    mapping(address => uint256) public withdrawable;

    event Withdrawal(address indexed to, uint256 amount);

    function _credit(address to, uint256 amount) internal {
        if (amount > 0) {
            withdrawable[to] += amount;
        }
    }

    function withdraw() external {
        uint256 amt = withdrawable[msg.sender];
        require(amt > 0, "Nothing to withdraw");
        withdrawable[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok, "ETH send failed");
        emit Withdrawal(msg.sender, amt);
    }
}

contract SplitOrSteal is PullPayments {
    address public immutable owner;
    IACGC public immutable acgc;
    bool public overtimeEnabled; // default false (MVP)

    mapping(address => uint256) public boundNullifier;

    struct Room {
        address p1;
        address p2;
        uint256 stake;      // each player stakes this
        uint64  commitDL;   // unix seconds
        uint64  revealDL;   // unix seconds

        bytes32 c1;         // commitment of p1
        bytes32 c2;         // commitment of p2
        bool    r1;         // p1 revealed?
        bool    r2;         // p2 revealed?
        uint8   moves1;     // low 5 bits valid
        uint8   moves2;     // low 5 bits valid

        bool    settled;    // settled once
    }

    uint256 public nextRoomId = 1;
    mapping(uint256 => Room) public rooms;

    uint256 public protocolPool;

    event RoomCreated(uint256 indexed roomId, address indexed host, uint256 stake, uint64 commitDL, uint64 revealDL);
    event RoomJoined(uint256 indexed roomId, address indexed joiner);
    event Committed(uint256 indexed roomId, address indexed player, bytes32 commitment);
    event Revealed(uint256 indexed roomId, address indexed player, uint8 moves5bits, bytes32 salt);
    event MatchSettled(
        uint256 indexed roomId,
        address winner,
        address loser,
        uint256 toWinner,
        uint256 toLoser,
        uint256 stealStealRounds,
        bool tie
    );
    event ProtocolPoolUpdated(int256 delta, uint256 newTotal);
    event Bound(address indexed wallet, uint256 nullifier);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address acgcAddr) {
        require(acgcAddr != address(0), "zero acgc");
        owner = msg.sender;
        acgc = IACGC(acgcAddr);
    }


    function bindNullifierOnce(uint256 nullifier) public {
        require(boundNullifier[msg.sender] == 0, "already bound");
        require(nullifier != 0, "no nullifier");
        require(acgc.isAllowed(nullifier), "not verified/banned");
        boundNullifier[msg.sender] = nullifier;
        emit Bound(msg.sender, nullifier);
    }

    function _requireVerifiedAndBound(address who, uint256 maybeNullifier) internal {
        if (boundNullifier[who] == 0) {
            // allow auto-bind on first call
            require(maybeNullifier != 0, "missing nullifier");
            bindNullifierOnce(maybeNullifier);
        } else {
            // still check that nullifier remains allowed
            require(acgc.isAllowed(boundNullifier[who]), "banned/not allowed");
        }
    }

    // ========= Rooms lifecycle =========

    /// @param stakeWei per-player stake (ETH)
    /// @param commitDL absolute unix seconds
    /// @param revealDL absolute unix seconds
    /// @param nullifier user’s scoped nullifier (only used to auto-bind if not bound yet)
    function createRoom(
        uint256 stakeWei,
        uint64 commitDL,
        uint64 revealDL,
        uint256 nullifier
    ) external payable returns (uint256 roomId) {
        require(stakeWei > 0, "stake=0");
        require(msg.value == stakeWei, "send exact stake");
        require(commitDL > block.timestamp && revealDL > commitDL, "bad deadlines");

        _requireVerifiedAndBound(msg.sender, nullifier);

        roomId = nextRoomId++;
        Room storage r = rooms[roomId];
        r.p1 = msg.sender;
        r.stake = stakeWei;
        r.commitDL = commitDL;
        r.revealDL = revealDL;

        emit RoomCreated(roomId, msg.sender, stakeWei, commitDL, revealDL);
    }

    /// @notice Cancel before a second player joins; host only.
    function cancelRoom(uint256 roomId) external {
        Room storage r = rooms[roomId];
        require(r.p1 == msg.sender, "not host");
        require(r.p2 == address(0), "already joined");
        require(!r.settled, "already settled");

        uint256 refund = r.stake;
        r.stake = 0; // prevent re-use
        r.p1 = address(0);

        (bool ok, ) = msg.sender.call{value: refund}("");
        require(ok, "refund failed");
    }

    function joinRoom(uint256 roomId, uint256 nullifier) external payable {
        Room storage r = rooms[roomId];
        require(r.p1 != address(0), "no room");
        require(r.p2 == address(0), "already has p2");
        require(!r.settled, "settled");
        require(msg.value == r.stake, "send exact stake");

        _requireVerifiedAndBound(msg.sender, nullifier);

        r.p2 = msg.sender;
        emit RoomJoined(roomId, msg.sender);
    }

    function commit(uint256 roomId, bytes32 commitment, uint256 nullifier) external {
        Room storage r = rooms[roomId];
        require(r.p1 != address(0) && r.p2 != address(0), "need two players");
        require(block.timestamp <= r.commitDL, "commit window closed");

        _requireVerifiedAndBound(msg.sender, nullifier);

        if (msg.sender == r.p1) {
            require(r.c1 == bytes32(0), "already committed");
            r.c1 = commitment;
        } else if (msg.sender == r.p2) {
            require(r.c2 == bytes32(0), "already committed");
            r.c2 = commitment;
        } else {
            revert("not participant");
        }
        emit Committed(roomId, msg.sender, commitment);
    }

    function reveal(uint256 roomId, uint8 moves5bits, bytes32 salt, uint256 nullifier) external {
        Room storage r = rooms[roomId];
        require(block.timestamp <= r.revealDL, "reveal window closed");
        require(r.c1 != bytes32(0) && r.c2 != bytes32(0), "both must commit first");

        _requireVerifiedAndBound(msg.sender, nullifier);

        bytes32 expected = keccak256(abi.encodePacked(roomId, moves5bits, salt));

        if (msg.sender == r.p1) {
            require(!r.r1, "already revealed");
            require(expected == r.c1, "bad reveal");
            r.moves1 = moves5bits & 0x1F; // low 5 bits
            r.r1 = true;
        } else if (msg.sender == r.p2) {
            require(!r.r2, "already revealed");
            require(expected == r.c2, "bad reveal");
            r.moves2 = moves5bits & 0x1F;
            r.r2 = true;
        } else {
            revert("not participant");
        }

        emit Revealed(roomId, msg.sender, moves5bits & 0x1F, salt);
    }

    function claimNoCommit(uint256 roomId) external {
        Room storage r = rooms[roomId];
        require(block.timestamp > r.commitDL, "too early");
        require(!r.settled, "settled");
        require(r.p1 != address(0), "no room");

        // Cases:
        // - Only p1 exists & no p2: allow host to reclaim stake via cancelRoom (handled earlier)
        // - Both joined but one/both didn't commit: we refund both stakers
        bool p1Committed = (r.c1 != bytes32(0));
        bool p2Committed = (r.c2 != bytes32(0));

        require(r.p2 != address(0), "nobody joined");

        if (!p1Committed || !p2Committed) {
            // refund both stakes
            r.settled = true;
            _credit(r.p1, r.stake);
            _credit(r.p2, r.stake);
        } else {
            revert("both committed");
        }
    }

    function settle(uint256 roomId) external {
        Room storage r = rooms[roomId];
        require(!r.settled, "settled");
        require(r.p1 != address(0) && r.p2 != address(0), "no room");

        // If reveal window passed and someone didn't reveal -> forfeit
        bool revealClosed = block.timestamp > r.revealDL;
        bool bothRevealed = r.r1 && r.r2;
        require(bothRevealed || revealClosed, "wait until both reveal or deadline");

        uint256 totalPot = r.stake * 2;
        uint256 perRound = totalPot / 5;
        uint256 dust = totalPot - perRound * 5; // avoid locked dust: goes to protocolPool

        uint256 p1Amt = 0;
        uint256 p2Amt = 0;
        uint256 ssRounds = 0; // steal/steal rounds count

        if (bothRevealed) {
            // Evaluate 5 rounds
            for (uint8 i = 0; i < 5; i++) {
                bool a = ((r.moves1 >> i) & 1) == 1; // true=STEAL
                bool b = ((r.moves2 >> i) & 1) == 1;

                if (!a && !b) {
                    // split/split
                    p1Amt += perRound / 2;
                    p2Amt += perRound - (perRound / 2);
                } else if (a && !b) {
                    // p1 steals
                    p1Amt += perRound;
                } else if (!a && b) {
                    // p2 steals
                    p2Amt += perRound;
                } else {
                    // steal/steal
                    ssRounds += 1;
                }
            }
        } else {
            // Forfeit path --> whoever revealed gets all unresolved rounds as if Split/Steal in their favor.
            require(revealClosed, "deadline not passed");
            bool p1Revealed = r.r1;
            bool p2Revealed = r.r2;
            require(p1Revealed != p2Revealed, "invalid forfeit state");

            // If any revealed, count revealed-vs-revealed rounds (if both revealed some? Not possible with one reveal model)
            // Then give all 5 rounds to the revealer as if they STEAL vs SPLIT
            if (p1Revealed) {
                p1Amt += perRound * 5;
            } else {
                p2Amt += perRound * 5;
            }
        }

        if (ssRounds > 0) {
            uint256 addPool = perRound * ssRounds + dust; // dust goes to pool too
            protocolPool += addPool;
            emit ProtocolPoolUpdated(int256(addPool), protocolPool);
            dust = 0;
        } else if (dust > 0) {
            // If no SS rounds, still send dust to pool to avoid leftovers
            protocolPool += dust;
            emit ProtocolPoolUpdated(int256(dust), protocolPool);
            dust = 0;
        }

        r.settled = true;

        _credit(r.p1, p1Amt);
        _credit(r.p2, p2Amt);

        // Winner (for NFT signal). Tie -> no NFT
        address winner = address(0);
        address loser = address(0);
        bool tie = false;
        if (p1Amt > p2Amt) {
            winner = r.p1; loser = r.p2;
        } else if (p2Amt > p1Amt) {
            winner = r.p2; loser = r.p1;
        } else {
            tie = true;
        }

        emit MatchSettled(roomId, winner, loser, p1Amt > p2Amt ? p1Amt : p2Amt, p1Amt > p2Amt ? p2Amt : p1Amt, ssRounds, tie);
    }

    function ownerWithdrawProtocolPool(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero addr");
        require(amount <= protocolPool, "exceeds pool");
        protocolPool -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "send failed");
        emit ProtocolPoolUpdated(-int256(amount), protocolPool);
    }


    function getRoom(uint256 roomId) external view returns (Room memory) {
        return rooms[roomId];
    }

    function listJoinable(uint256 startId, uint256 limit) external view returns (uint256[] memory) {
        uint256 end = nextRoomId;
        if (startId == 0) startId = 1;
        if (limit == 0) limit = 50;

        uint256[] memory tmp = new uint256[](limit);
        uint256 count = 0;
        for (uint256 i = startId; i < end && count < limit; i++) {
            Room storage r = rooms[i];
            if (r.p1 != address(0) && r.p2 == address(0) && !r.settled) {
                tmp[count++] = i;
            }
        }
        // shrink
        assembly { mstore(tmp, count) }
        return tmp;
    }

    receive() external payable {}
}