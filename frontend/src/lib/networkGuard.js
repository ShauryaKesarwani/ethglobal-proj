export const BASE_SEPOLIA = {
  chainId: "0x14A34", // 84532
  chainName: "Base Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

export async function ensureBaseSepolia(ethereum) {
  const id = await ethereum.request({ method: "eth_chainId" });
  if (id !== BASE_SEPOLIA.chainId) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainId }],
      });
    } catch (e) {
      if (e && e.code === 4902) {
        await ethereum.request({ method: "wallet_addEthereumChain", params: [BASE_SEPOLIA] });
      } else {
        throw e;
      }
    }
  }
}
