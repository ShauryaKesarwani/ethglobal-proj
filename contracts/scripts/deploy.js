const { ethers, network, run } = require("hardhat");

async function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function main() {
    console.log("Deploying ACGC...");

    const [deployer] = await ethers.getSigners();
    const net = await ethers.provider.getNetwork();

    console.log("Deployer address:", deployer.address);
    console.log("Network:", network.name);
    console.log("Chain ID:", net.chainId);

    const hubV2 = process.env.CELO_TESTNET_HUB_V2;
    if (!hubV2) throw new Error("Missing CELO_TESTNET_HUB_V2 in .env");

    const scopeSeed = "eclairs-seed";

    // Keep your object/tuple approach for constructor + verify
    const rawCfgObj = {
        olderThan: 0,
        forbiddenCountries: [],
        ofacEnabled: false,
    };
    const rawCfgTuple = [0, [], false];

    const ACGCFactory = await ethers.getContractFactory("ACGC");
    console.log("Deploying contract...");
    const acgc = await ACGCFactory.deploy(hubV2, scopeSeed, rawCfgObj);

    const depTx = acgc.deploymentTransaction();
    console.log("Deployment tx hash:", depTx.hash);

    const receipt = await depTx.wait(); // 1 conf
    const address = await acgc.getAddress();

    console.log("ACGC deployed!");
    console.log("----------------------------");
    console.log("Contract address:", address);
    console.log("Deployer:", deployer.address);
    console.log("Network:", network.name);
    console.log("Block number:", receipt.blockNumber);
    console.log("Transaction hash:", receipt.hash);
    console.log("Gas used:", receipt.gasUsed.toString());

    // --- Read post-deploy fields (added) ---
    try {
        const sessionAddr = await acgc.session();
        const configId = await acgc.getVerificationConfigId();
        console.log("SessionManager:", sessionAddr);
        console.log("verificationConfigId:", configId);
    } catch (readErr) {
        console.warn("Warning: could not read session/configId:", readErr?.message || readErr);
    }
    console.log("----------------------------");

    // OPTIONAL: wait for a few confirmations so the explorer indexes the bytecode
    const confirmations = 3;
    console.log(`Waiting for ${confirmations} confirmations before verify...`);
    await depTx.wait(confirmations);

    // Small delay after confirmations
    await sleep(5000);

    // ---- VERIFY (object form first) ----
    const verifyArgsObj = [hubV2, scopeSeed, rawCfgObj];
    const verifyArgsTuple = [hubV2, scopeSeed, rawCfgTuple];

    async function tryVerify(args, label) {
        console.log(`Verifying (${label}) ...`);
        await run("verify:verify", {
            address,
            constructorArguments: args,
        });
        console.log("Verified with", label);
    }

    try {
        await tryVerify(verifyArgsObj, "object form");
    } catch (e1) {
        const msg = (e1?.message || "").toLowerCase();
        if (msg.includes("already verified")) {
            console.log("ℹ️ Already verified.");
        } else {
            console.warn("Object-form verify failed, retrying with tuple form...");
            try {
                await tryVerify(verifyArgsTuple, "tuple form");
            } catch (e2) {
                const msg2 = (e2?.message || "").toLowerCase();
                if (msg2.includes("already verified")) {
                    console.log("ℹ️ Already verified.");
                } else {
                    console.error("Verification failed.");
                    console.error(e2);
                }
            }
        }
    }
}

main().catch((err) => {
    console.error("Deployment failed:", err);
    process.exitCode = 1;
});