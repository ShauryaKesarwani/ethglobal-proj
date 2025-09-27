// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IACGC {
    function isAllowed(uint256 nullifier) external view returns (bool);
}

contract SessionManager {
    IACGC public immutable acgc;
    uint256 public constant TTL = 3 hours;

    // nullifier => unix seconds when session expires
    mapping(uint256 => uint64) public sessionExpiry;

    event SessionOpened(uint256 indexed nullifier, uint64 expiresAt);
    event SessionCleared(uint256 indexed nullifier);
    event SessionCancelled(uint256 indexed nullifier);

    modifier onlyACGC() { require(msg.sender == address(acgc), "not ACGC"); _; }

    constructor(address acgcAddr) {
        require(acgcAddr != address(0), "zero acgc");
        acgc = IACGC(acgcAddr);
    }

    function openSession(uint256 nullifier) external onlyACGC {
        require(nullifier != 0, "no nullifier");
        require(acgc.isAllowed(nullifier), "banned");
        uint64 exp = uint64(block.timestamp + TTL);
        sessionExpiry[nullifier] = exp;
        emit SessionOpened(nullifier, exp);
    }

    function isActive(uint256 nullifier) external view returns (bool active, uint64 expiresAt) {
        expiresAt = sessionExpiry[nullifier];
        active = (expiresAt != 0 && block.timestamp <= expiresAt) && acgc.isAllowed(nullifier);
    }

    function clearIfExpired(uint256 nullifier) external onlyACGC {
        uint64 exp = sessionExpiry[nullifier];
        if (exp != 0 && block.timestamp > exp) {
            delete sessionExpiry[nullifier];
            emit SessionCleared(nullifier);
        }
    }

    function cancelSession(uint256 nullifier) external onlyACGC {
        if (sessionExpiry[nullifier] != 0) {
            delete sessionExpiry[nullifier];
            emit SessionCancelled(nullifier);
        }
    }
}