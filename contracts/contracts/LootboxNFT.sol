// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// You'll need to install: @pythnetwork/entropy-sdk-solidity
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract LootboxNFT is ERC721, Ownable, IEntropyConsumer {
    IEntropy public entropy;
    uint256 public nextTokenId = 1;
    
    struct NFTTraits {
        string rarity;
        string color;
        uint256 power;
    }
    
    mapping(uint256 => NFTTraits) public tokenTraits;
    mapping(uint64 => address) public pendingRequests; // sequenceNumber => user
    
    event LootboxOpened(address user, uint256 tokenId, string rarity, string color, uint256 power);
    
    constructor(address _entropy) ERC721("LootboxNFT", "LOOT") {
        entropy = IEntropy(_entropy);
    }
    
    function openLootbox(bytes32 userRandomNumber) external payable {
        address entropyProvider = entropy.getDefaultProvider();
        uint128 requestFee = entropy.getFee(entropyProvider);
        
        require(msg.value >= requestFee, "Insufficient fee");
        
        uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
            entropyProvider,
            userRandomNumber
        );
        
        pendingRequests[sequenceNumber] = msg.sender;
    }
    
    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 randomNumber
    ) internal override {
        address user = pendingRequests[sequenceNumber];
        require(user != address(0), "Invalid request");
        
        // Generate traits using randomness
        uint256 rand = uint256(randomNumber);
        
        string memory rarity = _getRarity(rand % 100);
        string memory color = _getColor((rand >> 8) % 7);
        uint256 power = _getPower((rand >> 16) % 100, rarity);
        
        // Mint NFT
        uint256 tokenId = nextTokenId++;
        _mint(user, tokenId);
        tokenTraits[tokenId] = NFTTraits(rarity, color, power);
        
        emit LootboxOpened(user, tokenId, rarity, color, power);
        delete pendingRequests[sequenceNumber];
    }
    
    function _getRarity(uint256 roll) internal pure returns (string memory) {
        if (roll < 50) return "Common";
        if (roll < 80) return "Rare"; 
        if (roll < 95) return "Epic";
        return "Legendary";
    }
    
    function _getColor(uint256 colorIndex) internal pure returns (string memory) {
        string[7] memory colors = ["Red", "Blue", "Green", "Purple", "Gold", "Silver", "Black"];
        return colors[colorIndex];
    }
    
    function _getPower(uint256 basePower, string memory rarity) internal pure returns (uint256) {
        uint256 multiplier = 1;
        if (keccak256(bytes(rarity)) == keccak256(bytes("Rare"))) multiplier = 2;
        else if (keccak256(bytes(rarity)) == keccak256(bytes("Epic"))) multiplier = 3;
        else if (keccak256(bytes(rarity)) == keccak256(bytes("Legendary"))) multiplier = 5;
        
        return (basePower % 20 + 10) * multiplier; // 10-29 base, then multiplied
    }
    
    function getEntropyAddress() external view override returns (address) {
        return address(entropy);
    }
}