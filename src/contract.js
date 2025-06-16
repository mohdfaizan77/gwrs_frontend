// src/contract.js
import { Contract, JsonRpcProvider, BrowserProvider } from 'ethers';
import GWRS_ABI from './abi/GWRSToken.json';

// For local Hardhat testnet (backend connection)
const provider = new JsonRpcProvider('http://127.0.0.1:8545');

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
    "0x6d925938edb8a16b3035a4cf34faa090f490202a",
    GWRS_ABI,
    signerOrProvider
  );
