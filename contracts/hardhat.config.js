require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();


const { ALCHEMY_RPC_URL, PVT_KEY, ETHERSCAN_API_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: { url: ALCHEMY_RPC_URL },
    },
    sepolia: {
      url: ALCHEMY_RPC_URL, // or Infura RPCnpm i
      accounts: PVT_KEY ? [PVT_KEY] : [],
    },
    celoSepolia: {
      chainId: 11142220,
      url: ALCHEMY_RPC_URL, // e.g. from Alchemy/QuickNode/thirdweb
      accounts: PVT_KEY ? [PVT_KEY] : [],
    },

    localhost: { url: "http://127.0.0.1:8545" },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // For contract verification
  },
};