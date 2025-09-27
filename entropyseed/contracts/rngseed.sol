// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract BadgeSeed is IEntropyConsumer {
    IEntropyV2 public entropy;
    address public entropyProvider;

    mapping(uint64 => address) private whoAsked;
    mapping(address => bytes32) public seedOfUser;

    event SeedRequested(address indexed player, uint64 reqId);
    event SeedAssigned(address indexed player, uint64 reqId, bytes32 seed);

    constructor(address entropyAddr, address providerAddr) {
        entropy = IEntropyV2(entropyAddr);
        entropyProvider = providerAddr;
    }

    function requestSeed() external payable returns (uint64 reqId) {
        uint256 fee = entropy.getFeeV2();
        require(msg.value >= fee, "NotEnoughFee");

        reqId = entropy.requestV2{value: fee}();

        whoAsked[reqId] = msg.sender;

        emit SeedRequested(msg.sender, reqId);
    }

    function entropyCallback(
        uint64 reqId,
        address,
        bytes32 randomNumber
    ) internal override {
        address player = whoAsked[reqId];
        require(player != address(0), "UnknownReq");

        seedOfUser[player] = randomNumber;
        emit SeedAssigned(player, reqId, randomNumber);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    receive() external payable {}
}
