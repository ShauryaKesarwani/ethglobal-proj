// Mock deployment script to generate a test contract address
// This is for development/testing purposes only

const { ethers } = require("ethers");

function generateMockAddress() {
    // Generate a random address for testing
    const randomBytes = ethers.randomBytes(20);
    return ethers.getAddress(ethers.hexlify(randomBytes));
}

function main() {
    console.log("🚀 Mock BadgeSeed Deployment");
    console.log("================================");
    
    const mockAddress = generateMockAddress();
    console.log("📝 Mock Contract Address:", mockAddress);
    console.log("📝 Network: Local Test");
    console.log("📝 Note: This is a mock address for testing only");
    console.log("================================");
    console.log("✅ Copy this address to app.js:");
    console.log(`const BADGESEED_ADDRESS = "${mockAddress}";`);
}

main().catch((error) => {
    console.error("❌ Mock deployment failed:", error);
    process.exit(1);
});
