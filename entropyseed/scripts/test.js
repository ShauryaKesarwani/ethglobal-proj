const { ethers, network } = require("hardhat");

const ENTROPY_ABI = ["function getFeeV2() view returns (uint256)"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Testing BadgeSeed…");

  const badgeAddr = process.env.BADGESEED_ADDRESS;
  if (!badgeAddr) throw new Error("Set BADGESEED_ADDRESS in .env");

  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);
  console.log("Network:", network.name);
  console.log("BadgeSeed:", badgeAddr);

  const badge = await ethers.getContractAt("BadgeSeed", badgeAddr, caller);

  const entropyAddr = await badge.entropy();
  const entropy = new ethers.Contract(entropyAddr, ENTROPY_ABI, caller);
  const fee = await entropy.getFeeV2();

  console.log("Entropy:", entropyAddr);
  console.log("Fee (wei):", fee.toString());

  console.log("Requesting seed…");
  const tx = await badge.requestSeed({ value: fee });
  const rc = await tx.wait();
  console.log("request tx:", rc.hash);

  // try to parse SeedRequested for reqId (optional)
  try {
    const parsed = rc.logs
      .map((l) => {
        try {
          return badge.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .find((ev) => ev.name === "SeedRequested");
    if (parsed) {
      console.log(
        "SeedRequested → player:",
        parsed.args.player,
        "reqId:",
        parsed.args.reqId.toString()
      );
    }
  } catch {}

  console.log("Waiting for callback (polling seedOfUser) …");
  const maxTry = 120,
    delayMs = 2000;
  for (let i = 0; i < maxTry; i++) {
    const seed = await badge.seedOfUser(caller.address);
    if (seed && seed !== ethers.ZeroHash) {
      console.log("✅ Seed assigned:", seed);
      return;
    }
    process.stdout.write(".");
    await sleep(delayMs);
  }
  console.log("\n⚠️ Timeout. Check explorer for SeedAssigned or try later.");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
