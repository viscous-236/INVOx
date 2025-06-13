// contexts/WalletContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from './contract/Main';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeWallet = async () => {
      try {
        if (!window.ethereum || !window.ethereum.isMetaMask) return;

        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts.length > 0 && mounted) {
          await connectToWallet();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    const handleAccountsChanged = (accounts) => {
      if (!mounted) return;

      if (accounts.length === 0) {
        setAddress(null);
        setContract(null);
        setIsConnected(false);
      } else {
        connectToWallet();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    // Initialize
    initializeWallet();

    // Add event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      mounted = false;
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connectToWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Only get contract if getContract function exists and works
      let contractInstance = null;
      try {
        contractInstance = await getContract();
      } catch (contractError) {
        console.warn('Could not get contract:', contractError);
        // Continue without contract - you can handle this in your components
      }

      setAddress(userAddress);
      setContract(contractInstance);
      setIsConnected(true);

      return true;
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      setAddress(null);
      setContract(null);
      setIsConnected(false);
      return false;
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return false;
    }

    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const success = await connectToWallet();
      return success;
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        alert("Please connect to MetaMask.");
      } else {
        alert("Failed to connect wallet. Please try again.");
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setContract(null);
    setIsConnected(false);
  };

  const value = {
    address,
    contract,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};