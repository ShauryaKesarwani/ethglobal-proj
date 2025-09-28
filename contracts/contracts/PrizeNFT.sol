pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PrizeNFT is ERC721URIStorage, Ownable {
    uint256 public nextId = 1;

    constructor() ERC721("PythPerlins", "PYPLN") Ownable(msg.sender) {}

    function mintTo(address to, string calldata tokenURI_) external onlyOwner returns (uint256 tokenId) {
        tokenId = nextId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
    }
}