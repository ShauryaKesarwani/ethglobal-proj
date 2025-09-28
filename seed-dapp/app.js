// ──────────────────────────────────────────────
// 🌱 Seed-Art Generator – Base Sepolia Frontend
// ──────────────────────────────────────────────

// --------- Config ---------
const EXPECTED_CHAIN_ID_HEX = "0x14a34"; // Base Sepolia
const BADGESEED_ADDRESS = "0xf19f86ecC9531763c258e56Eb2ee21cA702F0E35"; // your BadgeSeed
const BADGESEED_ABI = [
  "function requestSeed() external payable returns (uint64)",
  "function seedOfUser(address) view returns (bytes32)",
  "function entropy() view returns (address)",
  "event SeedRequested(address indexed player,uint64 reqId)",
  "event SeedAssigned(address indexed player,uint64 reqId,bytes32 seed)",
];

const ENTROPY_ABI = ["function getFeeV2() view returns (uint256)"];

const BASE_SEPOLIA_PARAMS = {
  chainId: EXPECTED_CHAIN_ID_HEX,
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

// --------- DOM refs ---------
const connectBtn = document.getElementById("connectBtn");
const seedBtn = document.getElementById("seedBtn");
const statusEl = document.getElementById("status");

// --------- State ---------
let provider, signer, contract, userAddress;

// --------- Helpers ---------
const logStatus = (msg) => {
  statusEl.innerHTML = msg;
  console.log(msg);
};

const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function bytes32ToSeedInt(seedHex) {
  // Fold bytes32 into 32-bit for p5
  return parseInt(seedHex.slice(2, 10), 16);
}

async function ensureBaseSepolia() {
  const current = await window.ethereum.request({ method: "eth_chainId" });
  if (current.toLowerCase() === EXPECTED_CHAIN_ID_HEX) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
    });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      });
    } else {
      throw e;
    }
  }
}

async function assertBaseSepolia() {
  const c = await window.ethereum.request({ method: "eth_chainId" });
  if (c.toLowerCase() !== EXPECTED_CHAIN_ID_HEX)
    throw new Error("⚠️ Wrong network – switch to Base Sepolia.");
}

// --------- Boot ---------
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.ethereum) {
    connectBtn.disabled = true;
    logStatus("❌ MetaMask not found – install it.");
    return;
  }
  if (!BADGESEED_ADDRESS) {
    connectBtn.disabled = true;
    logStatus("❌ BadgeSeed address missing in app.js");
    return;
  }

  // If user already connected previously
  await silentReconnect();

  // If a seed was cached earlier, render immediately
  const cached = localStorage.getItem("SEED_INT");
  if (cached) {
    logStatus("♻️ Restoring previous art from cached seed…");
    window.generateArt(Number(cached));
  }
});

// --------- Connect wallet ---------
connectBtn.onclick = async () => {
  try {
    logStatus("🔄 Connecting wallet…");
    await ensureBaseSepolia();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts.length) throw new Error("No accounts returned");

    await assertBaseSepolia();

    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);

    connectBtn.textContent = `Connected: ${shortAddr(userAddress)}`;
    connectBtn.disabled = true;
    seedBtn.disabled = false;

    logStatus("✅ Wallet connected. Ready to request seed.");
  } catch (e) {
    console.error(e);
    logStatus(`❌ ${e.message}`);
  }
};

// --------- Request seed ---------
seedBtn.onclick = async () => {
  try {
    seedBtn.disabled = true;
    await assertBaseSepolia();
    if (!contract) throw new Error("Contract not ready");

    logStatus("🔄 Fetching entropy fee…");
    const entropyAddr = await contract.entropy();
    const entropy = new ethers.Contract(entropyAddr, ENTROPY_ABI, provider);
    const fee = await entropy.getFeeV2();
    logStatus(`💰 Entropy fee: ${ethers.utils.formatEther(fee)} ETH`);

    // Listen once for our own SeedAssigned
    const player = await signer.getAddress();
    const onceSeed = new Promise((resolve) => {
      const handler = (p, reqId, seed) => {
        if (p.toLowerCase() === player.toLowerCase()) {
          contract.off("SeedAssigned", handler);
          resolve(seed);
        }
      };
      contract.on("SeedAssigned", handler);
    });

    logStatus("🛰️ Sending requestSeed tx…");
    const tx = await contract.requestSeed({ value: fee });
    logStatus("⏳ Waiting for confirmation…");
    await tx.wait();

    logStatus("🛰️ Waiting for seed assignment…");

    // Fallback polling
    const seed = await Promise.race([onceSeed, pollForSeed()]);
    if (!seed) throw new Error("Timeout: no seed assigned.");

    const seedInt = bytes32ToSeedInt(seed);
    const preview = `${seed.slice(0, 10)}…`;

    // Cache & render
    localStorage.setItem("SEED_HEX", seed);
    localStorage.setItem("SEED_INT", String(seedInt));

    window.generateArt(seedInt);
    logStatus(`✅ Seed assigned ${preview} → Art rendered.`);
  } catch (e) {
    console.error(e);
    logStatus(`❌ ${e.message}`);
  } finally {
    seedBtn.disabled = false;
  }
};

// --------- Poll fallback ---------
async function pollForSeed(max = 120, delay = 2000) {
  for (let i = 0; i < max; i++) {
    const s = await contract.seedOfUser(userAddress);
    if (s && s !== ethers.constants.HashZero) return s;
    logStatus(`⏳ Polling for seed… (${i + 1}/${max})`);
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

// --------- Silent reconnect if wallet already authorized ---------
async function silentReconnect() {
  try {
    const accs = await window.ethereum.request({ method: "eth_accounts" });
    if (!accs.length) return;
    await assertBaseSepolia();

    userAddress = accs[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);

    connectBtn.textContent = `Connected: ${shortAddr(userAddress)}`;
    connectBtn.disabled = true;
    seedBtn.disabled = false;
    logStatus("✅ Wallet already connected.");
  } catch (e) {
    console.warn("Silent reconnect failed:", e.message);
  }
}

// --------- React to wallet events ---------
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}
