// src/contract.js
import { Contract, JsonRpcProvider, BrowserProvider } from 'ethers';
import GWRS_ABI from './abi/GWRSToken.json';

// For local Hardhat testnet (backend connection)
const provider = new JsonRpcProvider('http://localhost:8545');

// For user wallet connection (frontend, MetaMask)
export const getSigner = async () => {
  if (window.ethereum) {
    const browserProvider = new BrowserProvider(window.ethereum);
    return await browserProvider.getSigner();
  }
  throw new Error('No crypto wallet found');
};

export const getContract = (signerOrProvider = provider) =>
  new Contract(
    "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    GWRS_ABI,
    signerOrProvider
  );
