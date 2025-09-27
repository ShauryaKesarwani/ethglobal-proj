// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract RandomLeva is IEntropyConsumer {
    IEntropyV2 public entropyWala;                    
    event RandomMila(uint64 reqId, bytes32 randomValue); 

    constructor(address entropyAddr) {
        entropyWala = IEntropyV2(entropyAddr);
    }

    function randomMango() external payable returns (uint64 reqId) {
        uint256 lenaFee = entropyWala.getFeeV2();
        require(msg.value >= lenaFee, "kamFunds");
        reqId = entropyWala.requestV2{value: lenaFee}();
    }

    function entropyCallback(
        uint64 reqId,
        address /*provider*/,
        bytes32 randomValue
    ) internal override {
        emit RandomMila(reqId, randomValue);
    }

    function getEntropy() internal view override returns (address) {
        return address(entropyWala);
    }

    receive() external payable {}
}
