# 🚀 Deployment Guide

## Step 1: Deploy BadgeSeed Contract

### Prerequisites
- Node.js and npm installed
- MetaMask with testnet ETH
- Access to a testnet (Sepolia, Goerli, etc.)

### 1.1 Navigate to entropyseed directory
```bash
cd ../entropyseed
npm install
```

### 1.2 Create environment file
Create `.env` file with:
```env
ENTROPY_ADDRESS=0x...  # Pyth entropy contract address for your network
PROVIDER_ADDRESS=0x... # Pyth provider address for your network
PRIVATE_KEY=0x...      # Your private key (without 0x prefix)
```

### 1.3 Get Pyth Network addresses
For different networks, check:
- **Sepolia**: https://docs.pyth.network/entropy/contract-addresses
- **Base Sepolia**: https://docs.pyth.network/entropy/contract-addresses
- **Arbitrum Sepolia**: https://docs.pyth.network/entropy/contract-addresses

### 1.4 Deploy contract
```bash
# For Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# For Base Sepolia
npx hardhat run scripts/deploy.js --network baseSepolia

# For Arbitrum Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

### 1.5 Copy contract address
After deployment, copy the contract address from the console output.

## Step 2: Update DApp Configuration

### 2.1 Update contract address
In `app.js`, replace:
```javascript
const BADGESEED_ADDRESS = "0xYourDeployedContractAddress";
```

### 2.2 Verify network
Make sure your MetaMask is connected to the same network where you deployed the contract.

## Step 3: Run the DApp

### 3.1 Start local server
```bash
# Option 1: Using npx serve
npx serve .

# Option 2: Using Python
python3 -m http.server 8000

# Option 3: Using Node.js
npx http-server
```

### 3.2 Open in browser
Navigate to `http://localhost:3000` (or 8000)

## Step 4: Test the Flow

1. **Connect Wallet** - Click "Connect Wallet" button
2. **Request Seed** - Click "Request Seed & Generate Art"
3. **Pay Fee** - Confirm transaction in MetaMask
4. **Wait for Seed** - App will poll for seed assignment
5. **Generate Art** - Art will appear automatically

## 🔧 Troubleshooting

### Contract Deployment Issues
- **"NotEnoughFee"**: Ensure you have enough ETH for gas + entropy fee
- **"Invalid address"**: Check ENTROPY_ADDRESS and PROVIDER_ADDRESS
- **"Network not supported"**: Use supported testnets (Sepolia, Base Sepolia, etc.)

### DApp Issues
- **"Contract address not set"**: Update BADGESEED_ADDRESS in app.js
- **"MetaMask not detected"**: Install MetaMask browser extension
- **"Connection failed"**: Check MetaMask is unlocked and on correct network

### Network Issues
- **Slow transactions**: Testnets can be slow, wait for confirmation
- **Failed transactions**: Check gas limits and network congestion
- **Wrong network**: Ensure MetaMask is on the same network as deployed contract

## 📋 Network-Specific Instructions

### Sepolia Testnet
```bash
# Add to MetaMask
Network Name: Sepolia
RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
Chain ID: 11155111
Currency Symbol: ETH
```

### Base Sepolia
```bash
# Add to MetaMask
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
```

### Arbitrum Sepolia
```bash
# Add to MetaMask
Network Name: Arbitrum Sepolia
RPC URL: https://sepolia-rollup.arbitrum.io/rpc
Chain ID: 421614
Currency Symbol: ETH
```

## 🎯 Production Considerations

For production deployment:

1. **Use mainnet contracts** (when available)
2. **Implement proper error handling**
3. **Add loading states and progress indicators**
4. **Optimize gas usage**
5. **Add contract verification**
6. **Implement rate limiting**
7. **Add analytics and monitoring**

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all addresses are correct
3. Ensure sufficient ETH balance
4. Check network connectivity
5. Try refreshing the page

---

**Happy deploying! 🚀**
