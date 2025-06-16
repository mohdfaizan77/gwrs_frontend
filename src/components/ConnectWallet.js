import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSigner, getContract } from "../contract";
import "../styles/ConnectWallet.css"; // Import the CSS

export default function ConnectWallet() {
  const navigate = useNavigate();
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [toAddress, setToAddress] = useState(
    "0x859c4567383A1555bE6549a40C349C1fd52214df"
  );
  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [values, setValues] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [paused, setPaused] = useState(false);
  const [tgeExecuted, setExecuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  // Toast notification system
  const showToast = (message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleLogout = () => {
    navigate("/");
  };

  // Enhanced error handler
  const handleError = (error, operation) => {
    console.error(`${operation} error:`, error);

    let errorMessage = "";
    let errorType = "error";

    // Handle different types of errors
    if (error.code === 4001) {
      errorMessage = "Transaction was rejected by user";
      errorType = "warning";
    } else if (error.code === -32603) {
      errorMessage =
        "Internal JSON-RPC error. Please check your network connection.";
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      errorMessage = "Insufficient funds for gas fees";
    } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      errorMessage =
        "Cannot estimate gas. Transaction may fail or contract conditions not met.";
    } else if (error.code === "NETWORK_ERROR") {
      errorMessage =
        "Network connection error. Please check your internet connection.";
    } else if (error.message?.includes("MetaMask")) {
      errorMessage = "MetaMask error: " + error.message.split("MetaMask")[1];
    } else if (error.message?.includes("execution reverted")) {
      // Extract revert reason if available
      const revertReason =
        error.message.match(/execution reverted: (.+)/)?.[1] ||
        "Transaction reverted";
      errorMessage = `Contract error: ${revertReason}`;
    } else if (error.message?.includes("user rejected")) {
      errorMessage = "Transaction was cancelled by user";
      errorType = "warning";
    } else if (error.message?.includes("TGE already executed")) {
      errorMessage = "TGE has already been executed for this contract";
      errorType = "warning";
    } else if (error.message?.includes("TGE not ready")) {
      errorMessage =
        "TGE is not ready to be executed yet. Please check the timing requirements.";
      errorType = "warning";
    } else if (error.message?.includes("Only owner")) {
      errorMessage = "Only the contract owner can execute this function";
      errorType = "warning";
    } else {
      errorMessage =
        error.message || `An error occurred during ${operation.toLowerCase()}`;
    }

    showToast(errorMessage, errorType);
  };

  const VESTING_DURATION = 24 * 30 * 24 * 60 * 60; // 24 months in seconds
  const CLIFF_DURATION = 6 * 30 * 24 * 60 * 60; // 6 months in seconds

  /**
   * Fetch the TGE timestamp from the smart contract
   * @returns {Promise<number>} The TGE timestamp
   */
  const getTgeTimestamp = async () => {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const tgeTimestamp = await contract.tgeTimestamp();
      return Number(tgeTimestamp); // Convert BigNumber to number
    } catch (error) {
      console.error("Error fetching TGE timestamp:", error);
      throw error;
    }
  };

  /**
   * Calculate the time left until the next vesting claim can be made
   * @param {number} tgeTimestamp - The timestamp when TGE was executed
   * @returns {number} Time left in seconds
   */
  const timeLeftToClaimVestedTokens = (tgeTimestamp) => {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const elapsedTime = currentTime - tgeTimestamp;

    if (elapsedTime < CLIFF_DURATION) {
      // If the cliff period has not passed yet, return the remaining time to the cliff
      return CLIFF_DURATION - elapsedTime;
    } else if (elapsedTime < VESTING_DURATION) {
      // If the cliff period has passed but the vesting period has not completed, return the remaining vesting time
      return VESTING_DURATION - elapsedTime;
    } else {
      // If the vesting period has completed, no time left
      return 0;
    }
  };

  // Account change detection
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User disconnected
          setAccount("");
          setBalance("");
          setAvailableAccounts([]);
          showToast("Wallet disconnected", "warning");
        } else if (accounts[0] !== account) {
          // User switched accounts
          const newAccount = accounts[0];
          setAccount(newAccount);
          setBalance(""); // Clear old balance
          showToast(
            `Switched to account: ${newAccount.substring(
              0,
              6
            )}...${newAccount.substring(36)}`,
            "info"
          );

          // Auto-refresh balance for new account
          refreshBalanceForAccount(newAccount);
        }
        setAvailableAccounts(accounts);
      };

      const handleChainChanged = (chainId) => {
        showToast(`Network changed to: ${parseInt(chainId, 16)}`, "info");
        // Optionally refresh data when network changes
        if (account) {
          refreshBalanceForAccount(account);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      // Cleanup
      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [account]);

  useEffect(() => {
    handleTgeExecution();
  }, [tgeExecuted]);

  useEffect(() => {
    const fetchAndSetTgeTimestamp = async () => {
      try {
        const tgeTimestamp = await getTgeTimestamp();
        const timeLeft = timeLeftToClaimVestedTokens(tgeTimestamp);
        setTimeLeft(timeLeft);
      } catch (error) {
        console.error("Failed to fetch TGE timestamp:", error);
      }
    };

    fetchAndSetTgeTimestamp();

    const interval = setInterval(() => {
      if (timeLeft !== null) {
        const newTimeLeft = timeLeft - 1;
        if (newTimeLeft > 0) {
          setTimeLeft(newTimeLeft);
        } else {
          clearInterval(interval);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };

  // Helper function to refresh balance for a specific account
  const refreshBalanceForAccount = async (accountAddress) => {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);
      const bal = await contract.balanceOf(accountAddress);
      setBalance(bal.toString());
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  };

  const transferTokenToUser = async () => {
    try {
      if (!toAddress || !amount) {
        showToast("Please enter a valid address and amount!", "warning", 3000);
        return;
      }

      const signer = await getSigner();
      const contract = getContract(signer);

      showToast("Processing transaction...", "info", 2000);

      const tx = await contract.transfer(toAddress, amount);
      await tx.wait(); // Wait for transaction confirmation

      setTransactionHash(tx.hash);
      showToast("Transfer successful!", "success", 3000);
    } catch (error) {
      console.error("Transfer failed:", error);
      showToast("Transfer failed!", "error", 3000);
    }
  };

  // Get all available accounts
  const getAllAccounts = async () => {
    try {
      if (!window.ethereum) return [];

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      setAvailableAccounts(accounts);
      return accounts;
    } catch (err) {
      console.error("Failed to get accounts:", err);
      return [];
    }
  };

  const connect = async () => {
    setIsLoading(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }

      showToast("Connecting to wallet...", "info", 2000);

      const signer = await getSigner();
      const address = await signer.getAddress();
      setAccount(address);

      // Get all available accounts
      const accounts = await getAllAccounts();

      showToast("Wallet connected successfully!", "success");

      // Get initial balance
      const contract = getContract(signer);
      const bal = await contract.balanceOf(address);
      setBalance(bal.toString());

      showToast(`Balance loaded: ${bal.toString()} GWRS`, "info", 3000);

      if (accounts.length > 1) {
        showToast(
          `${accounts.length} accounts available. Click "Switch Account" to change.`,
          "info",
          4000
        );
      }

      handleTgeExecution();
    } catch (err) {
      handleError(err, "Wallet Connection");
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet function
  const disconnect = () => {
    try {
      setAccount(""); // Clear account state
      setBalance(""); // Clear balance
      showToast("Wallet disconnected successfully!", "warning", 3000);
    } catch (err) {
      console.error("Error disconnecting wallet:", err);
      showToast("Failed to disconnect wallet!", "error", 3000);
    }
  };

  const handlePauseUnpause = async () => {
    try {
      setIsLoading(true);
      const signer = await getSigner();
      const contract = getContract(signer);

      if (!account) {
        console.error("No account connected");
        showToast(
          "No account connected. Please connect your wallet!",
          "error",
          3000
        );
        setIsLoading(false);
        return;
      }

      // Check the current contract state
      const isPaused = await contract.paused();
      setPaused(isPaused); // Store paused state

      if (isPaused) {
        await contract.unpause(); // Unpause if paused
        showToast("Contract is now unpaused!", "success", 3000);
      } else {
        await contract.pause(); // Pause if active
        showToast("Contract is now paused!", "warning", 3000);
      }

      // Update paused state after execution
      setPaused(await contract.paused());
    } catch (error) {
      console.error("Error pausing/unpausing contract:", error);
      showToast("Failed to pause/unpause contract!", "error", 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitializers = async () => {
    setIsLoading(true);
    try {
      showToast("Fetching contract data...", "info", 1000);

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
        tgeExecuted,
        liquidityWallet,
        foundationWallet,
        logisticsWallet,
        teamWallet,
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
        contract.tgeExecuted(),
        contract.liquidityWallet(),
        contract.foundationWallet(),
        contract.logisticsWallet(),
        contract.teamWallet(),
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
        liquidityWallet,
        foundationWallet,
        logisticsWallet,
        teamWallet,
      });

      showToast("Contract data loaded successfully!", "success");
    } catch (err) {
      handleError(err, "Contract Data Fetch");
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonLabel = () => (paused ? "Unpause Contract" : "Pause Contract");

  const handleTgeExecution = async () => {
    // setIsLoading(true);
    const signer = await getSigner();
    const contract = getContract(signer);

    const isExecuted = await contract.tgeExecuted();

    if (isExecuted) {
      showToast("TGE Status : True ", "success", 2000);
    } else {
      showToast("TGE Status : False ", "error", 3000);
    }
    setExecuted(isExecuted);
  };

  const executeTGE = async () => {
    setIsLoading(true);
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.executeTGE();
      await tx.wait();

      showToast("TGE Executed Successfully!", "success", 2000);
    } catch (error) {
      showToast(`Error: ${error.message}`, "error", 3000);
    }
    setIsLoading(false);
  };

  return (
    <div className="connect-wallet-container">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="toast-content">
              <span className="toast-icon">
                {toast.type === "success" && "✅"}
                {toast.type === "error" && "❌"}
                {toast.type === "warning" && "⚠️"}
                {toast.type === "info" && "ℹ️"}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {/* Header */}
      <div className="wallet-header">
        <div>
          <h1>Goodware Solidity Contract Dashboard</h1>
          {/* <p>Manage your tokens and execute TGE operations</p> */}
        </div>
        <div className="logout">
          <button
            className={`btn switch-account-button ${
              isLoading ? "loading" : ""
            }`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Wallet Connection Card */}
        <div className="dashboard-card">
          <h2 className="card-title">Wallet Connection</h2>

          <div className="connection-status">
            <div
              className={`status-indicator ${
                account ? "status-connected" : "status-disconnected"
              }`}
            >
              <span className="status-dot"></span>
              {account ? "Connected" : "Disconnected"}
            </div>
          </div>

          <div className="wallet-buttons">
            <button
              className={`btn connect-button ${isLoading ? "loading" : ""}`}
              onClick={connect}
              disabled={isLoading}
            >
              {account ? "Reconnect Wallet" : "Connect Wallet"}
            </button>

            {account && (
              // disconnect
              <button
                className={`btn switch-account-button ${
                  isLoading ? "loading" : ""
                }`}
                onClick={disconnect}
                disabled={isLoading}
                title="Disconnect Wallet"
              >
                🔄 Disconnect Wallet
              </button>
            )}

            {account && (
              <button
                className={`btn connect-button ${isLoading ? "loading" : ""}`}
                onClick={() => handleTgeExecution()}
                disabled={isLoading}
              >
                Check TGE Execution Status
              </button>
            )}

            {account && !tgeExecuted && (
              <button
                className={`btn connect-button ${isLoading ? "loading" : ""}`}
                onClick={() => executeTGE()}
                disabled={isLoading}
              >
                Execute TGE
              </button>
            )}
          </div>

          {account && (
            <>
              <div className="account-info">
                <strong>Connected Address:</strong>
                <br />
                <span className="address-display" title={account}>
                  {account}
                </span>
                <button
                  className="copy-address-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(account);
                    showToast("Address copied to clipboard!", "success", 2000);
                  }}
                  title="Copy address"
                >
                  📋
                </button>
                <h1>Time Left to Claim Vested Tokens</h1>
                {timeLeft !== null ? (
                  <p className="timer">{formatTime(timeLeft)}</p>
                ) : (
                  <p>Loading...</p>
                )}
              </div>

              {availableAccounts.length > 1 && (
                <div className="accounts-info">
                  <small>
                    <strong>
                      {availableAccounts.length} accounts available
                    </strong>
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

        {/* Transfer Tokens to User Address */}
        <div className="dashboard-card">
          <h2 className="card-title">Transfer Tokens</h2>
          <div className="token-transfer-input-group blue-info">
            <input
              type="text"
              placeholder="Recipient Address"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
            />
          </div>
          <div className="token-transfer-input-group green-info">
            <input
              type="number"
              placeholder="Tokens"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="token_btn">
            <button
              className="token-transfer-button"
              onClick={transferTokenToUser}
            >
              Send Tokens
            </button>
          </div>
          {transactionHash && (
            <div className="transaction-hash-display">
              <p>✅ Transaction Hash: {transactionHash}</p>
            </div>
          )}
        </div>
        
        <div className="dashboard-card">
          <h2 className="card-title">Token Allocations</h2>
          {values && (
            <div>
              <p className="blue-info">Liquidity: {values.liquidityWallet}</p>
              <p className="green-info">teamWallet: {values.teamWallet}</p>
              <p className="violet-info">
                foundationWallet: {values.foundationWallet}
              </p>
              <p className="orange-info">
                logisticsWallet: {values.logisticsWallet}
              </p>
            </div>
          )}
        </div>
        {/* Contract Information Card */}
        <div className="dashboard-card initializers-container">
          <h2 className="card-title">Contract Information</h2>

          <button
            className={`btn fetch-button ${isLoading ? "loading" : ""}`}
            onClick={fetchInitializers}
            disabled={isLoading}
          >
            {values ? "Refresh Contract Data" : "Fetch Contract Data"}
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
                {values.tgeTimestamp.toString() !== "0"
                  ? new Date(
                      values.tgeTimestamp.toString() * 1000
                    ).toLocaleString()
                  : "Not set"}
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
