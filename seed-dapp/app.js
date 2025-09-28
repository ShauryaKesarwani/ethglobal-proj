// Web3 logic for Seed-Art Generator
// Connects to BadgeSeed contract for on-chain randomness

// Contract configuration
// Mock address for testing - replace with actual deployed contract address
const BADGESEED_ADDRESS = "0x384deF1468DEe98F76f47377F82047079c88D4F3"; // Mock address for testing
const BADGESEED_ABI = [
    "function requestSeed() external payable returns (uint64)",
    "function seedOfUser(address) external view returns (bytes32)",
    "function entropy() external view returns (address)",
    "event SeedRequested(address indexed player, uint64 reqId)",
    "event SeedAssigned(address indexed player, uint64 reqId, bytes32 seed)"
];

// Global variables
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const seedBtn = document.getElementById('seedBtn');
const statusEl = document.getElementById('status');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    updateStatus('Ready to connect wallet...');
    
    // Check if contract address is set
    if (BADGESEED_ADDRESS === "0x0000000000000000000000000000000000000000") {
        updateStatus('❌ Contract address not set. Please update BADGESEED_ADDRESS in app.js');
        connectBtn.disabled = true;
        return;
    }
    
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        updateStatus('❌ MetaMask not detected. Please install MetaMask to continue.');
        connectBtn.disabled = true;
        return;
    }
    
    // Check if already connected
    checkConnection();
});

// Connect wallet
connectBtn.onclick = async function() {
    try {
        updateStatus('🔄 Connecting to MetaMask...');
        
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        userAddress = accounts[0];
        
        // Initialize ethers
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Initialize contract
        contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);
        
        // Update UI
        connectBtn.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        connectBtn.disabled = true;
        seedBtn.disabled = false;
        
        updateStatus('✅ Wallet connected! Ready to generate art.');
        
    } catch (error) {
        console.error('Connection failed:', error);
        updateStatus(`❌ Connection failed: ${error.message}`);
    }
};

// Request seed and generate art
seedBtn.onclick = async function() {
    try {
        updateStatus('🔄 Requesting entropy seed...');
        seedBtn.disabled = true;
        
        // Get entropy fee from the entropy contract
        const entropyAddress = await contract.entropy();
        const entropyContract = new ethers.Contract(entropyAddress, [
            "function getFeeV2() external view returns (uint256)"
        ], provider);
        
        const fee = await entropyContract.getFeeV2();
        
        updateStatus(`💰 Entropy fee: ${ethers.utils.formatEther(fee)} ETH`);
        
        // Request seed
        const tx = await contract.requestSeed({ value: fee });
        updateStatus('⏳ Waiting for transaction confirmation...');
        
        await tx.wait();
        updateStatus('✅ Transaction confirmed! Polling for seed...');
        
        // Poll for seed
        const seed = await pollForSeed();
        
        if (seed) {
            updateStatus('🎨 Generating art from seed...');
            
            // Convert hex seed to numeric seed
            const numericSeed = parseInt(seed.slice(2, 10), 16);
            
            // Generate art
            window.generateArt(numericSeed);
            
            updateStatus(`🎉 Art generated! Seed: ${seed.slice(0, 10)}...`);
        } else {
            updateStatus('❌ Failed to get seed after 120 attempts');
        }
        
    } catch (error) {
        console.error('Seed request failed:', error);
        updateStatus(`❌ Error: ${error.message}`);
    } finally {
        seedBtn.disabled = false;
    }
};

// Poll for seed assignment
async function pollForSeed() {
    const maxAttempts = 120; // 2 minutes with 1s intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const seed = await contract.seedOfUser(userAddress);
            
            // Check if seed is assigned (not zero)
            if (seed !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                return seed;
            }
            
            attempts++;
            updateStatus(`⏳ Polling for seed... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            
        } catch (error) {
            console.error('Polling error:', error);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return null;
}

// Check if already connected
async function checkConnection() {
    try {
        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });
        
        if (accounts.length > 0) {
            userAddress = accounts[0];
            
            // Initialize ethers
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            // Initialize contract
            contract = new ethers.Contract(BADGESEED_ADDRESS, BADGESEED_ABI, signer);
            
            // Update UI
            connectBtn.textContent = `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            connectBtn.disabled = true;
            seedBtn.disabled = false;
            
            updateStatus('✅ Wallet already connected! Ready to generate art.');
        }
    } catch (error) {
        console.error('Connection check failed:', error);
    }
}

// Update status message
function updateStatus(message) {
    statusEl.textContent = message;
    console.log('Status:', message);
}

// Handle account changes
window.ethereum.on('accountsChanged', function(accounts) {
    if (accounts.length === 0) {
        // Disconnected
        location.reload();
    } else {
        // Account changed
        location.reload();
    }
});

// Handle chain changes
window.ethereum.on('chainChanged', function(chainId) {
    location.reload();
});
