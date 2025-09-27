// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

import "./SessionManager.sol";


contract ACGC is SelfVerificationRoot {
    address public immutable i_owner;
    modifier onlyOwner() { require(msg.sender == i_owner, "not owner"); _; }

    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    SessionManager public session;

    event NullifierIssued(uint256 nullifier);
    event CheaterFlagged(uint256 nullifier);
    event CheaterUnflagged(uint256 nullifier);
    event SessionDeployed(address sessionAddress);
    event SessionAutoOpened(uint256 nullifier, bool ok); // ok=false => session call failed; verification still succeeds

    // nullifier => banned?
    mapping(uint256 => bool) public isBanned;

    constructor(
        address hubV2,
        string memory scopeSeed,
        SelfUtils.UnformattedVerificationConfigV2 memory rawCfg
    ) SelfVerificationRoot(hubV2, scopeSeed) {
        i_owner = msg.sender;

        // Register verification config with Hub
        verificationConfig = SelfUtils.formatVerificationConfigV2(rawCfg);
        verificationConfigId = IIdentityVerificationHubV2(hubV2).setVerificationConfigV2(verificationConfig);

        // Deploy SessionManager and keep its address
        session = new SessionManager(address(this));
        emit SessionDeployed(address(session));
    }

    // emit nullifier + auto-open session
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory //userdata ignoring fully
    ) internal override {
        uint256 nullifier = output.nullifier;

        // Emit ONLY the nullifier
        emit NullifierIssued(nullifier);

        // If you want to hard-stop verification for banned nullifiers, uncomment below:
         require(!isBanned[nullifier], "banned");

        // Auto-open a 3h session; never revert verification if this fails
        try session.openSession(nullifier) {
            emit SessionAutoOpened(nullifier, true);
        } catch {
            emit SessionAutoOpened(nullifier, false);
        }
    }

    // Hub routing
    function getConfigId(
        bytes32,
        bytes32,
        bytes memory
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function getVerificationConfigId() external view returns (bytes32) {
        return verificationConfigId;
    }

    // Admin banlist
    function markCheater(uint256 nullifier) external onlyOwner {
        isBanned[nullifier] = true;
        emit CheaterFlagged(nullifier);
    }

    function isAllowed(uint256 nullifier) external view returns (bool) {
        return !isBanned[nullifier];
    }
}