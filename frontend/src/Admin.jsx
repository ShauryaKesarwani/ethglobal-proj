import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CONTRACT_ADDRESS = "0x5437410A2b3cd021b0ee5dA5BB8948Ffa3A0A61b";

const CELO_SEPOLIA = {
  chainId: "0xAA044C",
  chainName: "Celo Sepolia Testnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
  blockExplorerUrls: ["https://celo-sepolia.blockscout.com"],
};

const Admin = () => {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [nullifierToMark, setNullifierToMark] = useState("");
  const [nullifierToCheck, setNullifierToCheck] = useState("");
  const [userStatus, setUserStatus] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const contractABI = useMemo(() => [
    "function markCheater(uint256 nullifier) external",
    "function unmarkCheater(uint256 nullifier) external", 
    "function isAllowed(uint256 nullifier) external view returns (bool)",
    "function nameOf(uint256 nullifier) external view returns (string)",
    "function i_owner() external view returns (address)",
    "event NullifierIssued(uint256 nullifier)",
    "event CheaterFlagged(uint256 nullifier)",
    "event CheaterUnflagged(uint256 nullifier)", 
    "event UserNameDisclosed(uint256 nullifier, string fullName)"
  ], []);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      // Switch to Celo Sepolia
      await switchToCeloSepolia();
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [address] = await provider.send("eth_requestAccounts", []);
      setAccount(address);

      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
      setContract(contractInstance);

      // Listen for events
      contractInstance.on("CheaterFlagged", (nullifier) => {
        console.log("Cheater flagged:", nullifier.toString());
      });

      contractInstance.on("CheaterUnflagged", (nullifier) => {
        console.log("Cheater unflagged:", nullifier.toString());
      });

    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  }, [contractABI]);

  useEffect(() => {
    const initializeAdmin = async () => {
      await connectWallet();
      loadConnectedUsers();
    };
    initializeAdmin();
  }, [connectWallet]);

  const switchToCeloSepolia = async () => {
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
      }
    }
  };

  const loadConnectedUsers = () => {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key !== 'currentUser' && !isNaN(key)) {
        try {
          const userData = localStorage.getItem(key);
          const parsed = JSON.parse(userData);
          if (parsed.name) {
            users.push({
              nullifier: key,
              name: parsed.name,
              timestamp: parsed.timestamp
            });
          }
        } catch {
          // If it's not JSON, it might be old format (just string)
          const userData = localStorage.getItem(key);
          if (typeof userData === 'string') {
            users.push({
              nullifier: key,
              name: userData,
              timestamp: Date.now()
            });
          }
        }
      }
    }
    setConnectedUsers(users);
  };

  const markAsCheater = async () => {
    if (!contract || !nullifierToMark) return;
    
    setLoading(true);
    try {
      const tx = await contract.markCheater(nullifierToMark);
      await tx.wait();
      alert(`Successfully marked nullifier ${nullifierToMark} as cheater`);
      setNullifierToMark("");
    } catch (error) {
      console.error("Error marking cheater:", error);
      alert("Error marking cheater: " + error.message);
    }
    setLoading(false);
  };

  const unmarkCheater = async () => {
    if (!contract || !nullifierToMark) return;
    
    setLoading(true);
    try {
      const tx = await contract.unmarkCheater(nullifierToMark);
      await tx.wait();
      alert(`Successfully unmarked nullifier ${nullifierToMark} as cheater`);
      setNullifierToMark("");
    } catch (error) {
      console.error("Error unmarking cheater:", error);
      alert("Error unmarking cheater: " + error.message);
    }
    setLoading(false);
  };

  const checkUserStatus = async () => {
    if (!contract || !nullifierToCheck) return;
    
    setLoading(true);
    try {
      const isAllowed = await contract.isAllowed(nullifierToCheck);
      const name = await contract.nameOf(nullifierToCheck);
      
      setUserStatus(isAllowed);
      setUserName(name);
    } catch (error) {
      console.error("Error checking user status:", error);
      alert("Error checking user status: " + error.message);
    }
    setLoading(false);
  };

  const markUserAsCheater = async (nullifier) => {
    if (!contract) return;
    
    setLoading(true);
    try {
      const tx = await contract.markCheater(nullifier);
      await tx.wait();
      alert(`Successfully marked user as cheater`);
      loadConnectedUsers(); // Refresh the list
    } catch (error) {
      console.error("Error marking cheater:", error);
      alert("Error marking cheater: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          {account ? (
            <div className="space-y-2">
              <p><strong>Connected Account:</strong> {account}</p>
              <p><strong>Network:</strong> Celo Sepolia</p>
              <p><strong>Contract:</strong> {CONTRACT_ADDRESS}</p>
            </div>
          ) : (
            <Button onClick={connectWallet}>Connect Wallet</Button>
          )}
        </CardContent>
      </Card>

      {/* Connected Users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connected Users ({connectedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {connectedUsers.length > 0 ? (
            <div className="space-y-4">
              {connectedUsers.map((user, index) => (
                <div key={index} className="border p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Nullifier:</strong> {user.nullifier}</p>
                    <p><strong>Connected:</strong> {new Date(user.timestamp).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => markUserAsCheater(user.nullifier)}
                    disabled={loading}
                  >
                    Mark as Cheater
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No users connected yet</p>
          )}
          <Button onClick={loadConnectedUsers} className="mt-4" variant="outline">
            Refresh Users
          </Button>
        </CardContent>
      </Card>

      {/* Mark/Unmark Cheater */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cheater Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nullifier ID:</label>
            <Input
              type="text"
              placeholder="Enter nullifier to mark/unmark"
              value={nullifierToMark}
              onChange={(e) => setNullifierToMark(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={markAsCheater} 
              disabled={!contract || !nullifierToMark || loading}
              variant="destructive"
            >
              Mark as Cheater
            </Button>
            <Button 
              onClick={unmarkCheater} 
              disabled={!contract || !nullifierToMark || loading}
              variant="outline"
            >
              Unmark Cheater
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Check User Status */}
      <Card>
        <CardHeader>
          <CardTitle>Check User Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nullifier ID:</label>
            <Input
              type="text"
              placeholder="Enter nullifier to check status"
              value={nullifierToCheck}
              onChange={(e) => setNullifierToCheck(e.target.value)}
            />
          </div>
          <Button 
            onClick={checkUserStatus} 
            disabled={!contract || !nullifierToCheck || loading}
          >
            Check Status
          </Button>
          
          {userStatus !== null && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <p><strong>User Name:</strong> {userName || "N/A"}</p>
              <p><strong>Status:</strong> 
                <span className={userStatus ? "text-green-600" : "text-red-600"}>
                  {userStatus ? " ✅ Allowed" : " ❌ Banned (Cheater)"}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
