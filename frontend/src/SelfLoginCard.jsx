import React, { useEffect, useMemo, useState } from "react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";

// --- FILL THESE ---
const IS_TESTNET = true; // false for mainnet
const CONTRACT_ADDRESS = "0x5437410A2b3cd021b0ee5dA5BB8948Ffa3A0A61b"; // LOWERCASE!
const SCOPE_SEED = "eclairs-seed"; // EXACT scopeSeed used at deploy
const APP_NAME = "Eclairs";
const LOGO_URL = "https://i.postimg.cc/mrmVf9hm/self.png";
// -------------------

const CELO_SEPOLIA = {

  chainId: "0xAA044C", // 11142220 (Celo Sepolia); keep this if you already use it
  chainName: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
  blockExplorerUrls: ["https://celo-sepolia.blockscout.com"],
};

export default function SelfLoginCard() {
  let i = 1;
  const [selfApp, setSelfApp] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [err, setErr] = useState("");
  const [account, setAccount] = useState(null);

  // connect wallet (read-only is fine)
  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [addr] = await provider.send("eth_requestAccounts", []);
      setAccount(addr);
    })().catch(console.error);
  }, []);

  const switchToCeloSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CELO_SEPOLIA.chainId }],
      });
    } catch (e) {
      if (e.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CELO_SEPOLIA],
        });
      } else {
        throw e;
      }
    }
  };

  // Build the Self app payload — MUST mirror your on-chain config exactly
  const appPayload = useMemo(() => {
    // Fallback userId if wallet not connected yet
    const userId = (account || "0x0000000000000000000000000000000000000000").toLowerCase();

    // If your rawCfg at deploy was:
    //   { olderThan: 0, forbiddenCountries: [], ofacEnabled: false }
    // then keep disclosures minimal and do NOT request extra fields.
    const app = new SelfAppBuilder({
      version: 2,
      appName: APP_NAME,
      scope: SCOPE_SEED,                       // must match deploy scopeSeed
      endpoint: CONTRACT_ADDRESS.toLowerCase(),// must be lowercase
      logoBase64: LOGO_URL,                    // url or base64
      userId,                                  // stable id (EVM addr)
      userIdType: "hex",
      endpointType: IS_TESTNET ? "staging_celo" : "celo",
      userDefinedData: "login",                // becomes keccak(userData) -> userKey on-chain
      disclosures: {
        minimumAge: 0,                         // maps to olderThan
        excludedCountries: [],                 // maps to forbiddenCountries
        name : true,
        ofac: false,                           // maps to ofacEnabled
        // DO NOT add nationality/gender/etc if not in config
      },
    }).build();
    setSelfApp(app);
    console.log("SELF PAYLOAD", JSON.stringify(selfApp, null, 2));

    return app;
  }, [account]);

  // Subscribe to Verified(nullifier, userData)
  useEffect(() => {
    if (!window.ethereum || !CONTRACT_ADDRESS) return;
    let contract;
    (async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const abi = ["event Verified(uint256 nullifier, bytes userData)"];
      contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      contract.on("Verified", (nullifier, userData) => {
        console.log("[Self] Verified!");
        console.log("nullifier:", nullifier?.toString?.());
        console.log("userData (bytes):", userData);
      });
    })().catch(console.error);
    return () => { if (contract) contract.removeAllListeners("Verified"); };
  }, []);

  const openLogin = async () => {
    setErr("");
    try {
      if (IS_TESTNET) await switchToCeloSepolia();
      setShowQR(true);
    } catch (e) {
      setErr("Failed to switch to Celo Sepolia");
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openLogin}>
        Login with Self
      </Button>

      {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}

      {showQR && appPayload ? (
          <div className="mt-6 rounded-xl border border-white/20 bg-white/50 p-4">
            <SelfQRcodeWrapper
                selfApp={appPayload}
                onSuccess={async () => {
                  console.log("[Self] ✅ Verified! (proof accepted + callback to contract)");
                  setShowQR(false);

                  try {
                    // connect to ACGC contract
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();

                    // ABI includes our event so we can read it
                    const acgcAbi = [
                      "event NullifierIssued(uint256 nullifier)",
                      "event UserNameDisclosed(uint256 nullifier,string fullName)"
                    ];

                    const acgc = new ethers.Contract(CONTRACT_ADDRESS, acgcAbi, signer);

                    // listen once for NullifierIssued after verification
                    acgc.once("UserNameDisclosed", (nullifier, fullName) => {
                      console.log("✅ Verified user:", fullName, "nullifier:", nullifier.toString());
                      localStorage.setItem(nullifier.toString(), fullName);
                    });

                  } catch (err) {
                    console.error("⚠️ Failed to fetch nullifier:", err);
                  }
                }}
                onError={(data) => {
                  console.error("[Self] Verification error:", data);
                  // If you see ScopeMismatch(), check scope, endpoint (lowercase), and disclosures.
                }}
            />
            <p className="mt-3 text-xs text-white/70">
              Scan with the Self app to verify on&nbsp;
              Celo {IS_TESTNET ? "Sepolia" : "mainnet"}.
            </p>
          </div>
      ) : null}
    </div>
  );
}