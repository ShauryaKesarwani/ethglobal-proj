const { ethers, network } = require("hardhat");

async function main() {
    console.log("Deploying ACGC...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Network:", network.name);

    const hubV2 = process.env.CELO_TESTNET_HUB_V2;
    const scopeSeed = "MySeedString";

    const rawCfg = {
        olderThan: 0,
        forbiddenCountries: [],
        ofacEnabled: false
    };

    const ACGCFactory = await ethers.getContractFactory("ACGC");
    console.log("Deploying contract...");
    const acgc = await ACGCFactory.deploy(hubV2, scopeSeed, rawCfg);

    // Wait for it to be mined
    const receipt = await acgc.deploymentTransaction().wait();

    console.log("ACGC deployed!");
    console.log("----------------------------");
    console.log("Contract address:", await acgc.getAddress());
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);
    console.log("Block number:", receipt.blockNumber);
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("----------------------------");
}

main().catch((err) => {
    console.error("Deployment failed:", err);
    process.exitCode = 1;
});