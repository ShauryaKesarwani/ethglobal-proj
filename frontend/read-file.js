import { ethers } from "ethers";

const RPC = "https://forno.celo-sepolia.celo-testnet.org";
const CONTRACT = "0x4B16056983Fbc29ceE326705A566C8008A914936"; // address on Celo Sepolia
const ABI = [
  "function getVerificationConfigId() view returns (bytes32)",
  "function getConfigId(bytes32,bytes32,bytes) view returns (bytes32)"
];

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC);
  const c = new ethers.Contract(CONTRACT, ABI, provider);

  const idA = await c.getVerificationConfigId();
  console.log("getVerificationConfigId:", idA);

  // hub-style call (params ignored in your impl anyway)
  const idB = await c.getConfigId(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x"
  );
  console.log("getConfigId(...):        ", idB);
})();
