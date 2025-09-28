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

    event NullifierIssued(uint256 nullifier);
    event CheaterFlagged(uint256 nullifier);
    event CheaterUnflagged(uint256 nullifier);
    event UserNameDisclosed(uint256 nullifier, string fullName);

    mapping(uint256 => bool) public isBanned;
    mapping(uint256 => string) private lastName;  // latest disclosed name by nullifier

    constructor(
        address hubV2,
        string memory scopeSeed,
        SelfUtils.UnformattedVerificationConfigV2 memory rawCfg
    ) SelfVerificationRoot(hubV2, scopeSeed) {
        i_owner = msg.sender;

        verificationConfig = SelfUtils.formatVerificationConfigV2(rawCfg);
        verificationConfigId = IIdentityVerificationHubV2(hubV2).setVerificationConfigV2(verificationConfig);
    }


    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        uint256 nullifier = output.nullifier;

        // output.name is an array: ["FIRST", "MIDDLE", "LAST"] (ordering depends on doc)
        string memory fullName = _concatName(output.name);

        // persist if you want later reads
        if (bytes(fullName).length != 0) {
            lastName[nullifier] = fullName;
        }

        emit NullifierIssued(nullifier);
        emit UserNameDisclosed(nullifier, fullName);
    }

// helper to join the array with spaces
    function _concatName(string[] memory parts) internal pure returns (string memory) {
        if (parts.length == 0) return "";
        bytes memory out = bytes(parts[0]);
        for (uint256 i = 1; i < parts.length; i++) {
            out = abi.encodePacked(out, " ", parts[i]);
        }
        return string(out);
    }


    function _decodeName(bytes calldata data) external pure returns (string memory) {
        return abi.decode(data, (string));
    }

    function getConfigId(bytes32, bytes32, bytes memory) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function getVerificationConfigId() external view returns (bytes32) {
        return verificationConfigId;
    }

    function markCheater(uint256 nullifier) external onlyOwner {
        isBanned[nullifier] = true;
        emit CheaterFlagged(nullifier);
    }

    function unmarkCheater(uint256 nullifier) external onlyOwner {
        isBanned[nullifier] = false;
        emit CheaterUnflagged(nullifier);
    }

    function isAllowed(uint256 nullifier) external view returns (bool) {
        return !isBanned[nullifier];
    }

    function nameOf(uint256 nullifier) external view returns (string memory) {
        return lastName[nullifier];
    }
}