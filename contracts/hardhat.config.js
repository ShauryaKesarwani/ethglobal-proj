require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


const { CELO_SEP_RPC, PVT_KEY, ETHERSCAN_API_KEY, SEP_ALCHEMY_RPC } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: { url: CELO_SEP_RPC },
    },
    sepolia: {
      url: SEP_ALCHEMY_RPC, // or Infura RPCnpm i
      accounts: PVT_KEY ? [PVT_KEY] : [],
    },
    celoSepolia: {
      chainId: 11142220,
      url: CELO_SEP_RPC,
      accounts: PVT_KEY ? [PVT_KEY] : [],
    },

    localhost: { url: "http://127.0.0.1:8545" },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // For contract verification
  },
};