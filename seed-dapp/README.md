# 🎨 Seed-Art Generator

A Web3 + generative art application that creates unique, deterministic artwork from on-chain randomness using Pyth Network's entropy.

## 📝 Overview

This project demonstrates how to tie **on-chain random seeds** to **deterministic generative art**:

1. **Connect to MetaMask** and call a deployed BadgeSeed smart contract
2. **Request entropy seed** by paying the entropy fee to Pyth Network
3. **Poll the contract** for `seedOfUser()` until a seed is assigned
4. **Convert hex seed** to deterministic numeric seed
5. **Generate art** using p5.js with the seeded randomness
6. **Display canvas** live on the page - this canvas becomes the NFT art

## 🔧 Tech Stack

- **HTML/CSS/JS** - Single-page dApp
- **ethers.js v5** - Web3 calls in browser
- **p5.js** - Generative art framework
- **MetaMask** - Wallet connection
- **Pyth Network** - On-chain entropy/randomness
- **BadgeSeed Contract** - Smart contract for seed management

## 🗂️ File Structure

```
seed-dapp/
├── index.html        # UI container with buttons and canvas
├── style.css         # Dark theme styling
├── app.js            # Web3 logic, wallet connect, contract interaction
├── sketch.js         # p5.js generative art with deterministic seed
└── README.md         # This file
```

## 🚀 Quick Start

### 1. Deploy BadgeSeed Contract

First, you need to deploy the BadgeSeed contract:

```bash
cd ../entropyseed
npm install
```

Create a `.env` file with:
```env
ENTROPY_ADDRESS=0x...  # Pyth entropy contract address
PROVIDER_ADDRESS=0x... # Pyth provider address
PRIVATE_KEY=0x...      # Your private key
```

Deploy the contract:
```bash
npx hardhat run scripts/deploy.js --network <your-network>
```

### 2. Update Contract Address

In `app.js`, replace the placeholder address:
```javascript
const BADGESEED_ADDRESS = "0xYourDeployedContractAddress";
```

### 3. Run the DApp

```bash
# Option 1: Using npx serve
npx serve .

# Option 2: Using Python
python3 -m http.server 8000

# Option 3: Using Node.js
npx http-server
```

Then open `http://localhost:3000` (or 8000) in your browser.

## 🎯 How It Works

### 1. **Wallet Connection**
- User clicks "Connect Wallet"
- MetaMask prompts for account access
- App initializes ethers.js provider and signer

### 2. **Seed Request**
- User clicks "Request Seed & Generate Art"
- App fetches entropy fee from Pyth Network
- Sends `requestSeed()` transaction with fee
- Waits for transaction confirmation

### 3. **Seed Polling**
- Polls `seedOfUser(address)` every 2 seconds
- Continues for up to 120 attempts (4 minutes)
- Once seed is assigned, proceeds to art generation

### 4. **Art Generation**
- Converts hex seed to numeric seed: `parseInt(seed.slice(2,10), 16)`
- Calls `window.generateArt(numericSeed)`
- p5.js creates deterministic abstract art
- Canvas is attached to `#canvas-container`

## 🎨 Art Generation

The `sketch.js` file contains the generative art logic:

- **Deterministic**: Same seed always produces same art
- **Abstract patterns**: 500 colorful ellipses with seeded randomness
- **Gradient backgrounds**: Smooth color transitions
- **Organic shapes**: Noise-based irregular forms
- **Connecting lines**: Network-like connections between elements

## 🔧 Smart Contract Interface

The BadgeSeed contract provides:

```solidity
// Request entropy seed (payable)
function requestSeed() external payable returns (uint64)

// Get user's assigned seed
function seedOfUser(address) external view returns (bytes32)

// Get entropy contract address
function entropy() external view returns (address)
```

## 🌐 Network Requirements

- **MetaMask** installed and connected
- **Testnet ETH** for transaction fees
- **Same network** as deployed BadgeSeed contract
- **Pyth Network** entropy available on the network

## 🎯 Use Cases

- **NFT Art Generation**: Each seed creates unique, reproducible art
- **Gaming**: Random loot, procedural content
- **Lotteries**: Fair, verifiable randomness
- **Research**: Deterministic but unpredictable patterns

## 🔍 Troubleshooting

### Common Issues:

1. **"MetaMask not detected"**
   - Install MetaMask browser extension
   - Refresh the page

2. **"Connection failed"**
   - Check MetaMask is unlocked
   - Ensure you're on the correct network

3. **"NotEnoughFee" error**
   - Ensure you have enough ETH for the entropy fee
   - Check the fee amount in the status message

4. **"Failed to get seed"**
   - Network might be slow
   - Try again after a few minutes
   - Check if Pyth Network is operational

5. **Art not generating**
   - Check browser console for errors
   - Ensure p5.js loaded correctly
   - Verify seed conversion is working

## 📚 Development

### Adding New Art Patterns

Modify `generateAbstractPattern()` in `sketch.js`:

```javascript
function generateAbstractPattern(p) {
    // Your custom art generation logic here
    // Use p.random() and p.noise() for seeded randomness
}
```

### Customizing UI

Edit `style.css` for different themes, or modify `index.html` for different layouts.

### Contract Integration

The app is designed to work with any entropy-based contract that provides:
- `requestSeed()` payable function
- `seedOfUser(address)` view function
- Event emission for seed assignment

## 🎉 Features

- ✅ **MetaMask Integration** - Seamless wallet connection
- ✅ **Real Entropy** - Uses Pyth Network for true randomness
- ✅ **Deterministic Art** - Same seed = same artwork
- ✅ **Responsive Design** - Works on mobile and desktop
- ✅ **Error Handling** - Comprehensive status messages
- ✅ **Canvas Management** - Proper cleanup and regeneration
- ✅ **Event Listening** - Handles account/chain changes

## 📄 License

This project demonstrates Web3 + generative art integration. Feel free to use and modify for your own projects!

---

**Built with ❤️ for the Web3 + Art community**
