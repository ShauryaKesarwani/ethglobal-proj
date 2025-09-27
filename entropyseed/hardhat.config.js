require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const { BASE_SEP_RPC, PVT_KEY } = process.env;
console.log("RPC?", BASE_SEP_RPC ? "ok" : "missing"); // temp debug

module.exports = {
  solidity: "0.8.24",
  networks: {
    baseSepolia: {
      url: BASE_SEP_RPC || "https://sepolia.base.org",
      chainId: 84532,
      accounts: PVT_KEY ? [PVT_KEY] : [],
    },
  },
};
