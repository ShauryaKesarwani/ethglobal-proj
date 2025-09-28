🎨 Seed-Art Generator

Deterministic generative art powered by on-chain entropy.

📝 What It Is

This dApp binds Pyth Network entropy → BadgeSeed contract → p5.js art.
A wallet click requests a seed on-chain; the same seed will always regenerate the same abstract art.

⚙️ Stack

Smart Contract: BadgeSeed.sol (wraps Pyth Entropy V2)

Frontend: HTML + CSS + Vanilla JS

Web3: ethers.js v5 + MetaMask

Art: p5.js seeded randomness

Network: Base Sepolia (or any chain where Pyth Entropy V2 lives)

📂 Structure

seed-art/
├─ index.html      → UI + buttons + canvas
├─ style.css       → minimal dark theme
├─ app.js          → wallet connect & seed logic
├─ sketch.js       → p5.js deterministic art
└─ README.md


🚀 Quick-Start
1 · Deploy BadgeSeed

git clone …/entropyseed
cd entropyseed
cp .env.example .env     # fill in:
# ENTROPY_ADDRESS=<pyth entropy contract>
# PROVIDER_ADDRESS=<pyth provider>
# PVT_KEY=<deployer key>
npx hardhat run scripts/deploy.js --network baseSepolia

2 · Wire Frontend

Edit app.js:

const BADGESEED_ADDRESS = "0x<your-BadgeSeed-address>";

3 · Run Locally

npx serve .
#   – or –
python3 -m http.server 8000

Open http://localhost:3000 (or chosen port).
🖥️ Flow

    Connect Wallet → MetaMask popup → ethers.js provider+signer.

    Request Seed → reads entropy.getFeeV2() → sends requestSeed() with fee.

    Wait Callback → polls seedOfUser() every 2 s (120 × ≈4 min).

    Seed → Art → converts hex→int:

    parseInt(seed.slice(2,10),16)

    Render → window.generateArt(seedInt) in sketch.js.

🎨 Art

    Deterministic: identical seed → identical art

    Abstract / organic: ellipses + noise + gradients

    NFT-ready: canvas image is reproducible & verifiable on-chain

🔧 Contract API

function requestSeed() external payable returns(uint64);
function seedOfUser(address) external view returns(bytes32);
function entropy() external view returns(address);

Emits:

event SeedRequested(address player,uint64 reqId);
event SeedAssigned(address player,uint64 reqId,bytes32 seed);

🛠️ Troubleshooting

    MetaMask not detected: install extension → refresh

    Wrong network: switch to Base Sepolia (0x14A34)

    NotEnoughFee: hold enough test-ETH to pay entropy fee

    Timeout: Pyth callback may lag; retry or inspect block explorer

    Canvas blank: check browser console that p5.js + seed conversion loaded

🤓 Dev Notes

    Replace generateArt() in sketch.js to try new visual formulas.

    Front-end expects any contract exposing the same three functions above.

    Auto-reload on accountsChanged / chainChanged.

📜 License

MIT for demo code.
Built at ETHGlobal — where sleep is optional, but good README is mandatory.