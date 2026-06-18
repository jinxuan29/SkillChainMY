/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../utils/config";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [role, setRole] = useState("guest"); // 'issuer', 'student', or 'guest'
  const [contract, setContract] = useState(null);

  // Lazily initialize the read-only contract perfectly without useEffect
  const [readOnlyContract] = useState(() => {
    try {
      const environment = import.meta.env.VITE_APP_ENV;
      const rpcUrl = environment === "live" 
        ? import.meta.env.VITE_SEPOLIA_RPC 
        : "http://127.0.0.1:8545";
      
      console.log(`📡 Connecting to ${environment} network at:`, rpcUrl);

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (err) {
      console.error("Failed to load ReadOnly Contract. Check Address/ABI.", err);
      return null;
    }
  });

  const checkUserRole = async (userAddress, activeContract) => {
    try {
      const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
      const ADMIN_ROLE = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE in OpenZeppelin

      // Check the blockchain for the user's roles
      const isAdmin = await activeContract.hasRole(ADMIN_ROLE, userAddress);
      const isIssuer = await activeContract.hasRole(ISSUER_ROLE, userAddress);

      if (isAdmin) {
        setRole("admin");
      } else if (isIssuer) {
        setRole("issuer");
      } else {
        setRole("student");
      }
    } catch (error) {
      console.error("Error checking role:", error);
      setRole("student");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const network = await window.ethereum.request({ method: 'eth_chainId' });
      const sepoliaChainId = '0xaa36a7'; 
      
      if (network !== sepoliaChainId) {
        alert("You are on the wrong network! Please switch MetaMask to Sepolia.");
        return; 
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const activeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setAccount(accounts[0]);
      setContract(activeContract);
      await checkUserRole(accounts[0], activeContract);
    } catch (err) {
      console.error(err);
      // USER READABLE ERROR HANDLING FOR CONNECTION
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        alert("Wallet connection was cancelled by the user.");
      } else {
        alert("Failed to connect wallet. Ensure MetaMask is unlocked.");
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const activeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          setContract(activeContract);
          await checkUserRole(accounts[0], activeContract);
        } else {
          setAccount(null);
          setRole("guest");
          setContract(null);
        }
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ account, role, contract, readOnlyContract, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
};