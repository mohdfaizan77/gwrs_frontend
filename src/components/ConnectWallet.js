import React, { useState } from 'react';
import { getSigner, getContract } from '../contract';
import '../styles/ConnectWallet.css'; // Import the CSS

export default function ConnectWallet() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [transactionHash, setTransactionHash] = useState("");
  const [values, setValues] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const connect = async () => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      const contract = getContract(signer);
      const bal = await contract.balanceOf(address);
      setBalance(bal.toString());
    } catch (err) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeTGE = async () => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tx = await contract.executeTGE();
      await tx.wait(); // Wait for transaction confirmation
      setTransactionHash(tx.hash);
    } catch (err) {
      alert(`Execution error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBalance = async () => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      const address = await signer.getAddress();
      const contract = getContract(signer);
      const bal = await contract.balanceOf(address);
      setBalance(bal.toString());
    } catch (err) {
      alert(`Balance check error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitializers = async () => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const totalSupply = await contract.TOTAL_SUPPLY();
      const tgeUnlock = await contract.TGE_UNLOCK();
      const vestingDuration = await contract.VESTING_DURATION();
      const cliffDuration = await contract.CLIFF_DURATION();
      const stakingRewardRate = await contract.STAKING_REWARD_RATE();
      const tier1Threshold = await contract.TIER_1_THRESHOLD();
      const tier2Threshold = await contract.TIER_2_THRESHOLD();
      const tier3Threshold = await contract.TIER_3_THRESHOLD();
      const stakingRewardPool = await contract.stakingRewardPool();
      const tgeTimestamp = await contract.tgeTimestamp();
      const tgeExecuted = await contract.tgeExecuted();
      const liquidityWallet = await contract.liquidityWallet();
      const teamWallet = await contract.teamWallet();
      const foundationWallet = await contract.foundationWallet();
      const logisticsWallet = await contract.logisticsWallet();

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
        liquidityWallet,
        teamWallet,
        foundationWallet,
        logisticsWallet
      });
    } catch (err) {
      alert(`Error fetching initializers: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="connect-wallet-container">
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

          <button 
            className={`btn connect-button ${isLoading ? 'loading' : ''}`}
            onClick={connect}
            disabled={isLoading}
          >
            {account ? 'Reconnect Wallet' : 'Connect Wallet'}
          </button>

          {account && (
            <div className="account-info">
              <strong>Connected Address:</strong><br />
              {account}
            </div>
          )}

          {balance && (
            <div className="balance1-info">
              <strong>Token Balance:</strong> {balance} GWRS
            </div>
          )}
        </div>

         <div className="dashboard-card">
      <h2 className="card-title">Token Allocations</h2>
      {values && (
        <div>
          <p className='blue-info'>Liquidity: {values.liquidityWallet}</p>
          <p className='green-info'>teamWallet: {values.teamWallet}</p>
          <p className='violet-info'>foundationWallet: {values.foundationWallet}</p>
          <p className='orange-info'>logisticsWallet: {values.logisticsWallet}</p>
          {/* <p>Team: {values.team}</p>
          <p>Foundation: {values.foundation}</p>
          <p>Logistics: {values.logistics}</p> */}
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
                <strong>liquidityWallet</strong>
                {values.liquidityWallet.toString()} GWRS
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