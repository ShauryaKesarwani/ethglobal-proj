import { keccak256, solidityPacked } from "ethers";

/** choices: array of 5 booleans (true=STEAL, false=SPLIT) -> pack uint8 (0..31) */
export function packChoices(choices) {
  if (!Array.isArray(choices) || choices.length !== 5) {
    throw new Error("Need exactly 5 choices");
  }
  let n = 0;
  for (let i = 0; i < 5; i++) {
    if (choices[i]) n |= (1 << i);
  }
  return n;
}

/** 32-byte random salt using Web Crypto */
export function makeSalt() {
  const arr = new Uint8Array(32);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  return "0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** commitment = keccak256(abi.encodePacked(uint256 roomId, uint8 moves5bits, bytes32 salt)) */
export function makeCommitment(roomId, moves5bits, salt) {
  // roomId should be a BigInt or number; salt should be 0x-prefixed 32 bytes
  const packed = solidityPacked(["uint256", "uint8", "bytes32"], [roomId, moves5bits, salt]);
  return keccak256(packed);
}
