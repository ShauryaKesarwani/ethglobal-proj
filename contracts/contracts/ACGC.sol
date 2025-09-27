// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";


contract ACGC is SelfVerificationRoot {
    address public immutable i_owner;
    modifier onlyOwner() { require(msg.sender == i_owner, "not owner"); _; }

    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;


    event Verified(uint256 nullifier, bytes userData);
    event CheaterFlagged(uint256 nullifier, bytes32 evidenceHash);

    //nullifier to ban status // true - banned, false - not banned
    mapping(uint256 => bool) public isBanned;

    // user unique key(name + dob + nationality + docId + gender) to their nullifier(pvd by self, docs + scopeSeed)(int)
    mapping(bytes32 => uint256) public lastNullifierByUserKey;

    //hubv2 -> hub contract address(mannet or coel), scopeSeed -> app specific seed to make nullifier, rawCfg -> unformatted config
    constructor( address hubV2, string memory scopeSeed, SelfUtils.UnformattedVerificationConfigV2 memory rawCfg ) SelfVerificationRoot(hubV2, scopeSeed) {
        i_owner = msg.sender;
        verificationConfig = SelfUtils.formatVerificationConfigV2(rawCfg); //formats the config and turns it into low level formatted code(i.e wire)
        // register with Hub contract --> Hub returns a configId --> get configId used by getConfigId()
        verificationConfigId = IIdentityVerificationHubV2(hubV2).setVerificationConfigV2(verificationConfig);
    }


    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output, bytes memory userData) internal override {
        // Per docs: scope affects the nullifier; it’s stable for a person within this scope.
        // Use it as the privacy‑preserving identity key for bans.
        uint256 nullifier = output.nullifier; // provided by Hub V2 for this scope

        // we can bind uuid or any other user data to the nullifier
        if (userData.length > 0) {
            bytes32 userKey = keccak256(userData); // frontend may pass wallet or UUID in userDefinedData
            lastNullifierByUserKey[userKey] = nullifier;
        }

        emit Verified(nullifier, userData);
    }

    function getConfigId(
        bytes32, //chain id
        bytes32, //user identifier
        bytes memory //user def data
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }


    // Mark a (user id)scope‑nullifier as cheater.
    function markCheater(uint256 nullifier, bytes32 evidenceHash) external onlyOwner {
        isBanned[nullifier] = true;
        emit CheaterFlagged(nullifier, evidenceHash);
    }

    // Check gating result right after a successful verification.
    function isAllowed(uint256 nullifier) external view returns (bool) {
        return !isBanned[nullifier];
    }

    // Convenience: if frontend stored a userDefinedData, it can query by it
    function lastNullifierFor(bytes32 userKey) external view returns (uint256) {
        return lastNullifierByUserKey[userKey];
    }
}