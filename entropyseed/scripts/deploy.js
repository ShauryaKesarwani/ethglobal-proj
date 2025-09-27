// scripts/deployBadgeSeed.js
const { ethers, network } = require("hardhat");

async function main() {
  console.log("Deploying BadgeSeed...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);

  const entropyAddr = process.env.ENTROPY_ADDRESS;
  const providerAddr = process.env.PROVIDER_ADDRESS;

  if (!entropyAddr || !providerAddr) {
    throw new Error(
      "❌ ENTROPY_ADDRESS and ENTROPY_PROVIDER must be set in .env"
    );
  }

  const BadgeSeedFactory = await ethers.getContractFactory("BadgeSeed");
  console.log("⏳ Deploying contract...");
  const badgeSeed = await BadgeSeedFactory.deploy(entropyAddr, providerAddr);

  const receipt = await badgeSeed.deploymentTransaction().wait();

  console.log("\n✅ BadgeSeed deployed!");
  console.log("----------------------------");
  console.log("Contract address:", await badgeSeed.getAddress());
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);
  console.log("Block number:", receipt.blockNumber);
  console.log("Tx hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("----------------------------");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exitCode = 1;
});
