// scripts/deploy-and-verify.js
const { ethers, network, run } = require("hardhat");

async function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function main() {
    console.log("Deploying ACGC & SplitOrSteal...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Network:", network.name);

    const hubV2 = process.env.CELO_TESTNET_HUB_V2;
    if (!hubV2) throw new Error("Missing CELO_TESTNET_HUB_V2 in .env");

    const scopeSeed = "eclairs-seed";

    // Try object form first. If verify fails, we’ll retry with tuple form.
    const rawCfgObj = {
        olderThan: 0,
        forbiddenCountries: [],
        ofacEnabled: false,
    };
    const rawCfgTuple = [0, [], false];

    // ---------------- ACGC ----------------
    const ACGCFactory = await ethers.getContractFactory("ACGC");
    console.log("Deploying ACGC...");
    const acgc = await ACGCFactory.deploy(hubV2, scopeSeed, rawCfgObj);

    const acgcReceipt = await acgc.deploymentTransaction().wait();
    const acgcAddress = await acgc.getAddress();

    console.log("ACGC deployed!");
    console.log("----------------------------");
    console.log("Contract address:", acgcAddress);
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);
    console.log("Block number:", acgcReceipt.blockNumber);
    console.log("Transaction hash:", acgcReceipt.hash);
    console.log("Gas used:", acgcReceipt.gasUsed.toString());
    console.log("----------------------------");

    const confirmations = 3;
    console.log(`Waiting for ${confirmations} confirmations before verify (ACGC)...`);
    await acgc.deploymentTransaction().wait(confirmations);

    await sleep(5000);

    const verifyArgsObj = [hubV2, scopeSeed, rawCfgObj];
    const verifyArgsTuple = [hubV2, scopeSeed, rawCfgTuple];

    async function tryVerify(address, args, label) {
        console.log(`Verifying ${address} (${label}) ...`);
        await run("verify:verify", {
            address,
            constructorArguments: args,
        });
        console.log("Verified with", label);
    }

    try {
        await tryVerify(acgcAddress, verifyArgsObj, "object form");
    } catch (e1) {
        const msg = (e1?.message || "").toLowerCase();
        if (msg.includes("already verified")) {
            console.log("Already verified.");
        } else {
            console.warn("Object-form verify failed, retrying with tuple form...");
            try {
                await tryVerify(acgcAddress, verifyArgsTuple, "tuple form");
            } catch (e2) {
                const msg2 = (e2?.message || "").toLowerCase();
                if (msg2.includes("already verified")) {
                    console.log("Already verified.");
                } else {
                    console.error("Verification failed for ACGC.");
                    console.error(e2);
                }
            }
        }
    }

    // ---------------- SplitOrSteal ----------------
    const SoSFactory = await ethers.getContractFactory("SplitOrSteal");
    console.log("Deploying SplitOrSteal...");
    const sos = await SoSFactory.deploy(acgcAddress);

    const sosReceipt = await sos.deploymentTransaction().wait();
    const sosAddress = await sos.getAddress();

    console.log("SplitOrSteal deployed!");
    console.log("----------------------------");
    console.log("Contract address:", sosAddress);
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);
    console.log("Block number:", sosReceipt.blockNumber);
    console.log("Transaction hash:", sosReceipt.hash);
    console.log("Gas used:", sosReceipt.gasUsed.toString());
    console.log("----------------------------");

    console.log(`Waiting for ${confirmations} confirmations before verify (SplitOrSteal)...`);
    await sos.deploymentTransaction().wait(confirmations);

    await sleep(5000);

    try {
        await tryVerify(sosAddress, [acgcAddress], "constructor(acgcAddr)");
    } catch (e) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("already verified")) {
            console.log("Already verified.");
        } else {
            console.error("Verification failed for SplitOrSteal.");
            console.error(e);
        }
    }

    console.log("Done.");
}

main().catch((err) => {
    console.error("Deployment failed:", err);
    process.exitCode = 1;
});