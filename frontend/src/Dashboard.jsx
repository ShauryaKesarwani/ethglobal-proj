import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for existing wallet connection on component mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      const walletData = localStorage.getItem('walletConnection');
      if (walletData) {
        try {
          const parsedData = JSON.parse(walletData);
          const thirtyMinutesInMs = 30 * 60 * 1000;
          
          // Check if connection has expired (30 minutes)
          if (Date.now() - parsedData.timestamp > thirtyMinutesInMs) {
            localStorage.removeItem('walletConnection');
            console.log('🕐 Wallet connection expired after 30 minutes');
          } else {
            // Restore connection
            setAddress(parsedData.address);
            
            // Try to get current balance
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const bal = await provider.getBalance(parsedData.address);
              setBalance(ethers.formatEther(bal));
            } catch {
              console.log('Could not fetch balance');
            }
            
            // Set timeout for remaining time
            const remainingTime = thirtyMinutesInMs - (Date.now() - parsedData.timestamp);
            setTimeout(() => {
              localStorage.removeItem('walletConnection');
              setAddress('');
              setBalance(null);
              console.log('🕐 Wallet connection expired after 30 minutes');
            }, remainingTime);
          }
        } catch (error) {
          console.error('Error parsing wallet data:', error);
          localStorage.removeItem('walletConnection');
        }
      }
    };
    
    checkExistingConnection();
  }, []);

  // Celo Sepolia network details
  const CELO_SEPOLIA_NETWORK = {
    chainId: '0xAA044C', // 11142220 in hex
    chainName: 'Celo Sepolia Testnet',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18
    },
    rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
    blockExplorerUrls: ['https://celo-sepolia.blockscout.com']
  };

  const connectWallet = async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }
    try {
      setLoading(true);
      
      // Switch to Celo Sepolia network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CELO_SEPOLIA_NETWORK.chainId }],
        });
      } catch (switchError) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CELO_SEPOLIA_NETWORK],
          });
        } else {
          throw switchError;
        }
      }

      const [selectedAddress] = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAddress(selectedAddress);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(selectedAddress);
      setBalance(ethers.formatEther(bal));
      
      // Store wallet connection with timestamp
      const walletData = {
        address: selectedAddress,
        timestamp: Date.now()
      };
      localStorage.setItem('walletConnection', JSON.stringify(walletData));
      
      // Set timeout to clear after 30 minutes
      setTimeout(() => {
        localStorage.removeItem('walletConnection');
        setAddress('');
        setBalance(null);
        console.log('🕐 Wallet connection expired after 30 minutes');
      }, 30 * 60 * 1000);
    } catch (e) {
      setError("Failed to connect or switch network");
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const openFaucet = () => {
    window.open('https://faucet.celo.org/celo-sepolia', '_blank');
  };

  const refreshBalance = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } catch (e) {
      setError("Failed to refresh balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 h-screen">
      <h1 className="flex text-3xl font-bold mb-8 w-full justify-center text-white">
        Celo Sepolia Treasure Chest
      </h1>
      
      <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
        {!address ? (
          <div className="text-center">
            <Button 
              onClick={connectWallet} 
              size="lg" 
              className="mb-8 bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-8 py-3"
            >
              Connect MetaMask
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            {/* Wallet Info */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 text-white">
              <p className="text-sm opacity-80">Connected Wallet:</p>
              <p className="font-mono text-xs break-all">{address}</p>
              <div className="mt-2">
                {loading ? (
                  <p className="text-yellow-400">Loading...</p>
                ) : error ? (
                  <p className="text-red-400">{error}</p>
                ) : balance !== null ? (
                  <p className="text-green-400 font-bold text-lg">
                    {parseFloat(balance).toFixed(4)} CELO
                  </p>
                ) : null}
              </div>
            </div>

            {/* Treasure Chest */}
            <div 
              className="relative cursor-pointer transform hover:scale-105 transition-transform duration-200"
              onClick={openFaucet}
              title="Click to open Celo Faucet"
            >
              <div className="w-48 h-48 mx-auto bg-gradient-to-b from-yellow-600 to-yellow-800 rounded-lg shadow-2xl relative overflow-hidden">
                {/* Chest body */}
                <div className="absolute bottom-0 w-full h-32 bg-gradient-to-b from-yellow-700 to-yellow-900 rounded-b-lg"></div>
                
                {/* Chest lid */}
                <div className="absolute top-0 w-full h-20 bg-gradient-to-b from-yellow-500 to-yellow-700 rounded-t-lg transform hover:-rotate-12 transition-transform duration-300 origin-bottom"></div>
                
                {/* Lock */}
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-6 h-8 bg-gray-700 rounded"></div>
                
                {/* Sparkles */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
                <div className="absolute top-8 left-6 w-1 h-1 bg-yellow-200 rounded-full animate-ping delay-1000"></div>
                <div className="absolute bottom-8 right-6 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping delay-500"></div>
                
                {/* Coins inside (visible when hovering) */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                  <div className="flex space-x-1">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <p className="text-white text-lg font-bold mt-4 animate-pulse">
                Click to Get Testnet CELO!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button 
                onClick={refreshBalance}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                Refresh Balance
              </Button>
              <Button 
                onClick={openFaucet}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Open Faucet
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;