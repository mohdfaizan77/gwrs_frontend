// src/config.js
export const validateEnv = () => {
  if (!process.env.REACT_APP_CONTRACT_ADDRESS) {
    throw new Error('Missing contract address in environment');
  }
  if (!process.env.REACT_APP_NETWORK_URL) {
    throw new Error('Missing network URL in environment');
  }
};
