import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ethers from "ethers";
import { getSigner, getContract } from "../contract";
import "../styles/ConnectWallet.css"; // Ensure this path is correct relative to your project structure

const IDOAllocationForm = () => {
  const [investors, setInvestors] = useState([{ address: "", amount: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const [account, setAccount] = useState("");

  // Initialize account state and listen for account changes
  useEffect(() => {
    const initializeAccount = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error("Error initializing account:", error);
        }
      }
    };

    initializeAccount();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setAccount("");
        toast.warn("Wallet disconnected");
      } else {
        setAccount(accounts[0]);
        toast.info(`Switched to: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      }
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const addInvestor = () => {
    setInvestors((prev) => [...prev, { address: "", amount: "" }]);
  };

  const removeInvestor = (index) => {
    setInvestors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (index, field, value) => {
    setInvestors((prev) =>
      prev.map((inv, i) => (i === index ? { ...inv, [field]: value } : inv))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
      }

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0];

      const signer = await getSigner();
      const contract = getContract(signer);

      // Validate addresses
      const investorAddresses = investors.map(({ address }) => {
        // if (!ethers.utils.isAddress(address)) {
        //   throw new Error(`Invalid address: ${address}`);
        // }
        return address;
      });

      // Validate amounts
      const amounts = investors.map(({ amount }) => {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error(`Invalid amount: ${amount}`);
        }
        return parsedAmount.toString();
        // return ethers.utils.parseEther(parsedAmount.toString());
      });

      // Send transaction
      const tx = await contract.setIDOAllocations(investorAddresses, amounts, { from: userAddress });
      toast.info("Transaction pending...");
      await tx.wait();
      toast.success("IDO allocations set successfully!");
      setInvestors([{ address: "", amount: "" }]);
    } catch (error) {
      toast.error(error.message || "Transaction failed");
      console.error(error);
    }

    setIsLoading(false);
  };

  return (
    <div className="connect-wallet-container">
      <div className="dashboard-card token-transfer-card">
        <h2 className="card-title">Set IDO Allocations</h2>
        <form onSubmit={handleSubmit} className="token-transfer-form">
          {investors.map((investor, index) => (
            <div key={index} className="token-transfer-input-group">
              <div className="flex space-x-4 items-end">
                <div className="flex-1 blue-info">
                  <input
                    type="text"
                    placeholder="Investor Address"
                    value={investor.address}
                    onChange={(e) => handleInputChange(index, "address", e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 green-info">
                  <input
                    type="number"
                    step="0.000000000000000001"
                    placeholder="Amount (Tokens)"
                    value={investor.amount}
                    onChange={(e) => handleInputChange(index, "amount", e.target.value)}
                    required
                  />
                </div>
                {investors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInvestor(index)}
                    className="btn switch-account-button"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between token-transfer-actions">
            <button
              type="button"
              onClick={addInvestor}
              className="btn connect-button"
            >
              Add Investor
            </button>
            <button
              type="submit"
              className={`btn token-transfer-button ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Submit Allocations"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IDOAllocationForm;