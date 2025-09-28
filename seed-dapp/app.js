// Web3 logic for Seed-Art Generator (Base Sepolia only)
// Requires: p5 loaded first, then sketch.js (defines window.generateArt), then this file.

// ---------- Config (Base Sepolia only) ----------
const EXPECTED_CHAIN_ID_HEX = "0x14a34"; // Base Sepolia
const BADGESEED_ADDRESS = "0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344"; // <-- replace with your deployed address
const BADGESEED_ABI = [
  "function requestSeed() external payable returns (uint64)",
  "function seedOfUser(address) external view returns (bytes32)",
  "function entropy() external view returns (address)",
  "event SeedRequested(address indexed player, uint64 reqId)",
  "event SeedAssigned(address indexed player, uint64 reqId, bytes32 seed)",
];
// Pyth Entropy v2 (fee)
const ENTROPY_ABI = ["function getFeeV2() external view returns (uint256)"];

// For wallet_addEthereumChain
const BASE_SEPOLIA_PARAMS = {
  chainId: "0x14a34",
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

// ---------- State ----------
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// ---------- DOM ----------
const connectBtn = document.getElementById("connectBtn");
const seedBtn = document.getElementById("seedBtn");
const statusEl = document.getElementById("status");

// ---------- Utils ----------
function logStatus(msg) {
  statusEl.innerHTML = msg;
  console.log(msg);
}

function shortAddr(a) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function bytes32ToSeedInt(b32) {
  // bytes32 -> [0, 2^31-2] (p5 randomSeed expects 32-bit range)
  const bn = ethers.BigNumber.from(b32);
  const mod = ethers.BigNumber.from("0x7fffffff"); // 2^31 - 1
  return Number(bn.mod(mod).toString());
}

async function ensureBaseSepoliaInteractive() {
  const current = await window.ethereum.request({ method: "eth_chainId" });
  if (current.toLowerCase() === EXPECTED_CHAIN_ID_HEX.toLowerCase()) return;

  // try to switch
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: EXPECTED_CHAIN_ID_HEX }],
    });
    return;
  } catch (err) {
    // chain not added → add then we're done
    if (
      err.code === 4902 ||
      /unrecognized chain|not added/i.test(err.message)
    ) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      });
      return;
    }
    throw err;
  }
}

async function assertBaseSepolia() {
  const current = await window.ethereum.request({ method: "eth_chainId" });
  if (current.toLowerCase() !== EXPECTED_CHAIN_ID_HEX.toLowerCase()) {
    seedBtn.disabled = true;
    throw new Error("Wrong network. Please switch to Base Sepolia.");
  }
}

async function nativeSymbol() {
  // Base Sepolia uses ETH
  return "ETH";
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.ethereum) {
    connectBtn.disabled = true;
    logStatus("❌ MetaMask not detected. Please install MetaMask.");
    return;
  }
  if (!BADGESEED_ADDRESS || /^0x0{40}$/i.test(BADGESEED_ADDRESS)) {
    connectBtn.disabled = true;
    logStatus(
      "❌ Contract address not set. Update BADGESEED_ADDRESS in app.js."
    );
    return;
  }
  await checkConnection();
});

// ---------- Connect ----------
connectBtn.onclick = async () => {
  try {
    logStatus("🔄 Connecting to MetaMask…");

    // Prompt accounts + ensure correct chain (auto-switch/add)
    await ensureBaseSepoliaInteractive();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts?.length) throw new Error("No accounts returned by wallet");

    await assertBaseSepolia();

    userAddress = accounts[0];
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);

    connectBtn.textContent = `Connected: ${shortAddr(userAddress)}`;
    connectBtn.disabled = true;
    seedBtn.disabled = false;

    logStatus("✅ Wallet connected. Ready to generate art.");
  } catch (err) {
    console.error(err);
    logStatus(`❌ Connection failed: ${err.message}`);
  }
};

// ---------- Request Seed ----------
seedBtn.onclick = async () => {
  try {
    seedBtn.disabled = true;

    await assertBaseSepolia();
    if (!contract) throw new Error("Contract not initialized");

    logStatus("🔄 Fetching entropy fee…");
    const entropyAddress = await contract.entropy();
    const entropy = new ethers.Contract(entropyAddress, ENTROPY_ABI, provider);
    const fee = await entropy.getFeeV2();
    const symbol = await nativeSymbol();
    logStatus(`💰 Entropy fee: ${ethers.utils.formatEther(fee)} ${symbol}`);

    // Listen for SeedAssigned for THIS player
    const player = await signer.getAddress();
    const onceSeed = new Promise((resolve) => {
      const handler = (evtPlayer, reqId, seed) => {
        if (evtPlayer.toLowerCase() === player.toLowerCase()) {
          contract.off("SeedAssigned", handler);
          resolve(seed);
        }
      };
      contract.on("SeedAssigned", handler);
    });

    logStatus("🧾 Sending requestSeed() transaction…");
    const tx = await contract.requestSeed({ value: fee });
    logStatus("⏳ Waiting for confirmation…");
    await tx.wait();

    logStatus("🛰️ Waiting for seed assignment… (listening + polling fallback)");

    // Poll fallback (RPCs sometimes delay logs)
    const seed = await Promise.race([
      onceSeed,
      pollForSeed({ maxAttempts: 120, delayMs: 2000 }),
    ]);
    if (!seed) throw new Error("Timed out waiting for seed");

    const seedInt = bytes32ToSeedInt(seed);
    const preview = `${seed.slice(0, 10)}…`;
    logStatus(`🎉 Seed assigned: <code>${preview}</code> → rendering art…`);

    // Render deterministically
    window.generateArt(seedInt);

    logStatus(`✅ Art generated from seed <code>${preview}</code>.`);
  } catch (err) {
    console.error(err);
    logStatus(`❌ Error: ${err.message}`);
  } finally {
    seedBtn.disabled = false;
  }
};

// ---------- Poll fallback ----------
async function pollForSeed({ maxAttempts = 120, delayMs = 2000 } = {}) {
  let tries = 0;
  while (tries < maxAttempts) {
    try {
      const s = await contract.seedOfUser(userAddress);
      if (s && s !== ethers.constants.HashZero) return s;
      tries++;
      logStatus(`⏳ Polling for seed… (${tries}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delayMs));
    } catch {
      tries++;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}

// ---------- Auto-init if already connected ----------
async function checkConnection() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      // try to silently ensure correct network (no auto-add in background)
      try {
        await assertBaseSepolia();
      } catch (e) {
        // If wrong chain, we keep connect enabled so user can click and get interactive prompt
        logStatus(
          "⚠️ Wrong network. Click ‘Connect Wallet’ to switch to Base Sepolia."
        );
        const id = await window.ethereum.request({ method: "eth_chainId" });
        console.log("chainId:", id); // should be 0x14a34

        connectBtn.disabled = false;
        seedBtn.disabled = true;
        return;
      }

      userAddress = accounts[0];
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);

      connectBtn.textContent = `Connected: ${shortAddr(userAddress)}`;
      connectBtn.disabled = true;
      seedBtn.disabled = false;
      logStatus("✅ Wallet already connected. Ready to generate art.");
    } else {
      logStatus("Ready to connect wallet…");
    }
  } catch (err) {
    console.warn("Connection check failed:", err);
  }
}

// ---------- Wallet events ----------
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => location.reload());
  window.ethereum.on?.("chainChanged", () => location.reload());
}
