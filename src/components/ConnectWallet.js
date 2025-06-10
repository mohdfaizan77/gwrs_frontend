import React, { useState } from 'react';
import { getSigner, getContract } from '../contract';
import '../styles/ConnectWallet.css'; // Import the CSS

export default function ConnectWallet() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [transactionHash, setTransactionHash] = useState("");
  const [values, setValues] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);

  // Toast notification system
  const showToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    setToasts(prev => [...prev, toast]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Enhanced error handler
  const handleError = (error, operation) => {
    console.error(`${operation} error:`, error);
    
    let errorMessage = '';
    let errorType = 'error';
    
    // Handle different types of errors
    if (error.code === 4001) {
      errorMessage = 'Transaction was rejected by user';
      errorType = 'warning';
    } else if (error.code === -32603) {
      errorMessage = 'Internal JSON-RPC error. Please check your network connection.';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for gas fees';
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      errorMessage = 'Cannot estimate gas. Transaction may fail or contract conditions not met.';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection error. Please check your internet connection.';
    } else if (error.message?.includes('MetaMask')) {
      errorMessage = 'MetaMask error: ' + error.message.split('MetaMask')[1];
    } else if (error.message?.includes('execution reverted')) {
      // Extract revert reason if available
      const revertReason = error.message.match(/execution reverted: (.+)/)?.[1] || 'Transaction reverted';
      errorMessage = `Contract error: ${revertReason}`;
    } else if (error.message?.includes('user rejected')) {
      errorMessage = 'Transaction was cancelled by user';
      errorType = 'warning';
    } else if (error.message?.includes('TGE already executed')) {
      errorMessage = 'TGE has already been executed for this contract';
      errorType = 'warning';
    } else if (error.message?.includes('TGE not ready')) {
      errorMessage = 'TGE is not ready to be executed yet. Please check the timing requirements.';
      errorType = 'warning';
    } else if (error.message?.includes('Only owner')) {
      errorMessage = 'Only the contract owner can execute this function';
      errorType = 'warning';
    } else {
      errorMessage = error.message || `An error occurred during ${operation.toLowerCase()}`;
    }
    
    showToast(errorMessage, errorType);
  };

  // Account change detection
  React.useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setAccount('');
          setBalance('');
          setAvailableAccounts([]);
          showToast('Wallet disconnected', 'warning');
        } else if (accounts[0] !== account) {
          // User switched accounts
          const newAccount = accounts[0];
          setAccount(newAccount);
          setBalance(''); // Clear old balance
          showToast(`Switched to account: ${newAccount.substring(0, 6)}...${newAccount.substring(36)}`, 'info');
          
          // Auto-refresh balance for new account
          refreshBalanceForAccount(newAccount);
        }
        setAvailableAccounts(accounts);
      };

      const handleChainChanged = (chainId) => {
        showToast(`Network changed to: ${parseInt(chainId, 16)}`, 'info');
        // Optionally refresh data when network changes
        if (account) {
          refreshBalanceForAccount(account);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  // Helper function to refresh balance for a specific account
  const refreshBalanceForAccount = async (accountAddress) => {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const bal = await contract.balanceOf(accountAddress);
      setBalance(bal.toString());
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  };

  // Manual account switching
  const switchAccount = async () => {
    try {
      showToast('Opening account selector...', 'info', 2000);
      
      // Request account access (this will open MetaMask account selection)
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        const newAccount = accounts[0];
        setAccount(newAccount);
        setBalance(''); // Clear old balance
        setAvailableAccounts(accounts);
        
        showToast(`Switched to: ${newAccount.substring(0, 6)}...${newAccount.substring(36)}`, 'success');
        
        // Get balance for new account
        const signer = await getSigner();
        const contract = getContract(signer);
        const bal = await contract.balanceOf(newAccount);
        setBalance(bal.toString());
        
        showToast(`Balance loaded: ${bal.toString()} GWRS`, 'info', 3000);
      }
    } catch (err) {
      handleError(err, 'Account Switch');
    }
  };

  // Get all available accounts
  const getAllAccounts = async () => {
    try {
      if (!window.ethereum) return [];
      
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });
      
      setAvailableAccounts(accounts);
      return accounts;
    } catch (err) {
      console.error('Failed to get accounts:', err);
      return [];
    }
  };

  const connect = async () => {
    setIsLoading(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      showToast('Connecting to wallet...', 'info', 2000);
      
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      // Get all available accounts
      const accounts = await getAllAccounts();
      
      showToast('Wallet connected successfully!', 'success');

      // Get initial balance
      const contract = getContract(signer);
      const bal = await contract.balanceOf(address);
      setBalance(bal.toString());
      
      showToast(`Balance loaded: ${bal.toString()} GWRS`, 'info', 3000);
      
      if (accounts.length > 1) {
        showToast(`${accounts.length} accounts available. Click "Switch Account" to change.`, 'info', 4000);
      }
    } catch (err) {
      handleError(err, 'Wallet Connection');
    } finally {
      setIsLoading(false);
    }
  };

  const executeTGE = async () => {
    if (!account) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    setIsLoading(true);
    setTransactionHash(''); // Clear previous transaction hash
    
    try {
      showToast('Preparing TGE execution...', 'info', 2000);
      
      const signer = await getSigner();
      const contract = getContract(signer);
      
      // Check if TGE is already executed
      const tgeExecuted = await contract.tgeExecuted();
      if (tgeExecuted) {
        throw new Error('TGE has already been executed for this contract');
      }
      
      // Check if user is the owner (if applicable)
      try {
        const owner = await contract.owner();
        const userAddress = await signer.getAddress();
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error('Only the contract owner can execute TGE');
        }
      } catch (ownerError) {
        // If owner() function doesn't exist, continue
        console.log('Owner check skipped:', ownerError.message);
      }
      
      // Estimate gas before execution
      try {
        const gasEstimate = await contract.estimateGas.executeTGE();
        showToast(`Estimated gas: ${gasEstimate.toString()}`, 'info', 2000);
      } catch (gasError) {
        console.warn('Gas estimation failed:', gasError);
        showToast('Warning: Could not estimate gas. Transaction may fail.', 'warning');
      }
      
      showToast('Executing TGE... Please confirm the transaction in your wallet', 'info');
      
      const tx = await contract.executeTGE();
      
      showToast(`Transaction submitted! Hash: ${tx.hash.substring(0, 10)}...`, 'info');
      setTransactionHash(tx.hash);
      
      showToast('Waiting for transaction confirmation...', 'info');
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        showToast('🎉 TGE executed successfully!', 'success', 7000);
        
        // Refresh balance after successful execution
        const newBalance = await contract.balanceOf(account);
        setBalance(newBalance.toString());
        
        showToast(`Updated balance: ${newBalance.toString()} GWRS`, 'success', 5000);
      } else {
        throw new Error('Transaction failed during execution');
      }
      
    } catch (err) {
      setTransactionHash(''); // Clear transaction hash on error
      handleError(err, 'TGE Execution');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBalance = async () => {
    if (!account) {
      showToast('Please connect your wallet first', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      showToast('Refreshing balance...', 'info', 1000);
      
      const signer = await getSigner();
      const address = await signer.getAddress();
      const contract = getContract(signer);
      const bal = await contract.balanceOf(address);
      setBalance(bal.toString());
      
      showToast(`Balance updated: ${bal.toString()} GWRS`, 'success');
    } catch (err) {
      handleError(err, 'Balance Check');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitializers = async () => {
    setIsLoading(true);
    try {
      showToast('Fetching contract data...', 'info', 1000);
      
      const signer = await getSigner();
      const contract = getContract(signer);

      const [
        totalSupply,
        tgeUnlock,
        vestingDuration,
        cliffDuration,
        stakingRewardRate,
        tier1Threshold,
        tier2Threshold,
        tier3Threshold,
        stakingRewardPool,
        tgeTimestamp,
        tgeExecuted
      ] = await Promise.all([
        contract.TOTAL_SUPPLY(),
        contract.TGE_UNLOCK(),
        contract.VESTING_DURATION(),
        contract.CLIFF_DURATION(),
        contract.STAKING_REWARD_RATE(),
        contract.TIER_1_THRESHOLD(),
        contract.TIER_2_THRESHOLD(),
        contract.TIER_3_THRESHOLD(),
        contract.stakingRewardPool(),
        contract.tgeTimestamp(),
        contract.tgeExecuted()
      ]);

      setValues({
        totalSupply,
        tgeUnlock,
        vestingDuration,
        cliffDuration,
        stakingRewardRate,
        tier1Threshold,
        tier2Threshold,
        tier3Threshold,
        stakingRewardPool,
        tgeTimestamp,
        tgeExecuted,
      });
      
      showToast('Contract data loaded successfully!', 'success');
    } catch (err) {
      handleError(err, 'Contract Data Fetch');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="connect-wallet-container">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="toast-content">
              <span className="toast-icon">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="wallet-header">
        <h1>Token Dashboard</h1>
        <p>Manage your tokens and execute TGE operations</p>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* Wallet Connection Card */}
        <div className="dashboard-card">
          <h2 className="card-title">Wallet Connection</h2>
          
          <div className="connection-status">
            <div className={`status-indicator ${account ? 'status-connected' : 'status-disconnected'}`}>
              <span className="status-dot"></span>
              {account ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="wallet-buttons">
            <button 
              className={`btn connect-button ${isLoading ? 'loading' : ''}`}
              onClick={connect}
              disabled={isLoading}
            >
              {account ? 'Reconnect Wallet' : 'Connect Wallet'}
            </button>
            
            {account && (
              <button 
                className={`btn switch-account-button ${isLoading ? 'loading' : ''}`}
                onClick={switchAccount}
                disabled={isLoading}
                title="Switch to a different MetaMask account"
              >
                🔄 Switch Account
              </button>
            )}
          </div>

          {account && (
            <>
              <div className="account-info">
                <strong>Connected Address:</strong><br />
                <span className="address-display" title={account}>
                  {account}
                </span>
                <button 
                  className="copy-address-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(account);
                    showToast('Address copied to clipboard!', 'success', 2000);
                  }}
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              
              {availableAccounts.length > 1 && (
                <div className="accounts-info">
                  <small>
                    <strong>{availableAccounts.length} accounts available</strong>
                    <br />
                    Use "Switch Account" or change in MetaMask
                  </small>
                </div>
              )}
            </>
          )}

          {balance && (
            <div className="balance-info">
              <strong>Token Balance:</strong> {balance} GWRS
            </div>
          )}
        </div>

        {/* TGE Operations Card */}
        <div className="dashboard-card">
          <h2 className="card-title">TGE Operations</h2>
          
          <button 
            className={`btn execute-tge-button ${isLoading ? 'loading' : ''}`}
            onClick={executeTGE}
            disabled={isLoading || !account}
          >
            Execute TGE
          </button>

          <button 
            className={`btn check-balance-button ${isLoading ? 'loading' : ''}`}
            onClick={checkBalance}
            disabled={isLoading || !account}
          >
            Refresh Balance
          </button>

          {transactionHash && (
            <div className="transaction-info">
              <strong>Transaction Hash:</strong><br />
              {transactionHash}
            </div>
          )}
        </div>

        {/* Contract Information Card */}
        <div className="dashboard-card initializers-container">
          <h2 className="card-title">Contract Information</h2>
          
          <button 
            className={`btn fetch-button ${isLoading ? 'loading' : ''}`}
            onClick={fetchInitializers}
            disabled={isLoading}
          >
            {values ? 'Refresh Contract Data' : 'Fetch Contract Data'}
          </button>

          {values && (
            <div className="initializer-values">
              <p>
                <strong>Total Supply</strong>
                {values.totalSupply.toString()} GWRS
              </p>
              <p>
                <strong>TGE Unlock</strong>
                {values.tgeUnlock.toString()} GWRS
              </p>
              <p>
                <strong>Vesting Duration</strong>
                {Math.floor(values.vestingDuration.toString() / 86400)} days
              </p>
              <p>
                <strong>Cliff Duration</strong>
                {Math.floor(values.cliffDuration.toString() / 86400)} days
              </p>
              <p>
                <strong>Staking Reward Rate</strong>
                {values.stakingRewardRate.toString()}% APY
              </p>
              <p>
                <strong>Tier 1 Threshold</strong>
                {values.tier1Threshold.toString()} GWRS
              </p>
              <p>
                <strong>Tier 2 Threshold</strong>
                {values.tier2Threshold.toString()} GWRS
              </p>
              <p>
                <strong>Tier 3 Threshold</strong>
                {values.tier3Threshold.toString()} GWRS
              </p>
              <p>
                <strong>Staking Reward Pool</strong>
                {values.stakingRewardPool.toString()} GWRS
              </p>
              <p>
                <strong>TGE Timestamp</strong>
                {values.tgeTimestamp.toString() !== '0' 
                  ? new Date(values.tgeTimestamp.toString() * 1000).toLocaleString()
                  : 'Not set'
                }
              </p>
              <p>
                <strong>TGE Executed</strong>
                {values.tgeExecuted ? "✅ Yes" : "❌ No"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}