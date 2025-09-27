// test.js
const { ethers, network } = require("hardhat");

const ENTROPY_ABI = ["function getFeeV2() view returns (uint256)"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// helper to fold a 0x-seed into a 32-bit number for p5.js sketches
function hexToNumericSeed(hexSeed) {
  // strip "0x", take first 8 hex chars, parse as 32-bit int
  return parseInt(hexSeed.slice(2, 10), 16);
}

async function main() {
  console.log("Testing BadgeSeed…");

  const badgeAddr = process.env.BADGESEED_ADDRESS;
  if (!badgeAddr) throw new Error("Set BADGESEED_ADDRESS in .env");

  const [caller] = await ethers.getSigners();
  console.log("Caller:", caller.address);
  console.log("Network:", network.name);
  console.log("BadgeSeed:", badgeAddr);

  const badge = await ethers.getContractAt("BadgeSeed", badgeAddr, caller);

  // ── entropy fee lookup ──────────────────────────
  const entropyAddr = await badge.entropy();
  const entropy = new ethers.Contract(entropyAddr, ENTROPY_ABI, caller);
  const fee = await entropy.getFeeV2();

  console.log("Entropy:", entropyAddr);
  console.log("Fee (wei):", fee.toString());

  // ── request the seed ────────────────────────────
  console.log("Requesting seed…");
  const tx = await badge.requestSeed({ value: fee });
  const rc = await tx.wait();
  console.log("request tx:", rc.hash);

  // ── parse SeedRequested event (optional) ────────
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

  // ── poll until callback delivers the seed ───────
  console.log("Waiting for callback (polling seedOfUser) …");
  const maxTry = 120,
    delayMs = 2000;

  for (let i = 0; i < maxTry; i++) {
    const seed = await badge.seedOfUser(caller.address);
    if (seed && seed !== ethers.ZeroHash) {
      console.log("✅ Seed assigned:", seed);
      const numericSeed = hexToNumericSeed(seed);
      console.log("🎨 Numeric seed for p5.js:", numericSeed);
      return;
    }
    process.stdout.write(".");
    await sleep(delayMs);
  }

  console.log("\n⚠️ Timeout. Check explorer for SeedAssigned or try later.");
}

// ── run main ─────────────────────────────────────
main().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1;
});
