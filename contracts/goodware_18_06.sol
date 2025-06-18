// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/token/ERC20/ERC20.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/access/Ownable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/Pausable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/ReentrancyGuard.sol";

// /**
//  * @title GWRS Token - GoodWares Utility Token
//  * @dev BEP-20 compliant token for the GoodWares ecosystem
//  * @notice Pure utility token for services discount and staking rewards
//  */
// contract GWRSToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
//     // Token Constants
//     uint256 public constant TOTAL_SUPPLY = 250_000_000 * 10**18; // 250 million tokens
//     uint256 public constant TGE_UNLOCK = 83_333_333 * 10**18; // Initial unlock amount
    
//     // Vesting schedules (in seconds)
//     uint256 public constant VESTING_DURATION = 24 * 30 days; // 24 months
//     uint256 public constant CLIFF_DURATION = 6 * 30 days; // 6 months cliff

//     //AllocationBalance
    
//     // Token allocation amounts
//     struct TokenAllocation {
//         uint256 total;
//         uint256 tgeUnlock;
//         uint256 vestedAmount;
//         uint256 claimedAmount;
//         uint256 startTime;
//         bool initialized;
//     }
    
//     // Allocation categories
//     mapping(address => TokenAllocation) public liquidityAllocation;
//     mapping(address => TokenAllocation) public teamAllocation;
//     mapping(address => TokenAllocation) public foundationAllocation;
//     mapping(address => TokenAllocation) public logisticsAllocation;
    
//     // IDO and Airdrop tracking
//     mapping(address => uint256) public idoAllocations;
//     mapping(address => uint256) public airdropAllocations;
//     mapping(address => bool) public airdropClaimed;
    
//     // Staking functionality
//     struct StakingInfo {
//         uint256 stakedAmount;
//         uint256 stakingStartTime;
//         uint256 lastRewardClaim;
//         uint256 totalRewards;
//     }
    
//     mapping(address => StakingInfo) public stakingData;
//     uint256 public constant STAKING_REWARD_RATE = 1200; // 12% APY (12/100 * 100 for precision)
//     uint256 public totalStaked;
//     uint256 public stakingRewardPool;
    
//     // Service discount functionality
//     mapping(address => uint256) public serviceDiscountTier;
//     uint256 public constant TIER_1_THRESHOLD = 1000 * 10**18; // 1,000 GWRS
//     uint256 public constant TIER_2_THRESHOLD = 5000 * 10**18; // 5,000 GWRS
//     uint256 public constant TIER_3_THRESHOLD = 10000 * 10**18; // 10,000 GWRS
    
//     // Events
//     event TokensVested(address indexed beneficiary, uint256 amount, string category);
//     event TokensStaked(address indexed staker, uint256 amount);
//     event TokensUnstaked(address indexed staker, uint256 amount);
//     event StakingRewardsClaimed(address indexed staker, uint256 rewards);
//     event ServiceDiscountUpdated(address indexed user, uint256 tier);
//     event IDOAllocationSet(address indexed investor, uint256 amount);
//     event AirdropClaimed(address indexed recipient, uint256 amount);
    
//     // TGE timestamp
//     uint256 public tgeTimestamp;
//     bool public tgeExecuted;
    
//     // Addresses for allocations
//     address public liquidityWallet;
//     address public teamWallet;
//     address public foundationWallet;
//     address public logisticsWallet;
    
//     constructor(
//         address _liquidityWallet,
//         address _teamWallet,
//         address _foundationWallet,
//         address _logisticsWallet,
//         address _initialOwner
//     ) ERC20("GoodWares Token", "GWRS") Ownable(_initialOwner) {
//         require(_liquidityWallet != address(0), "Invalid liquidity wallet");
//         require(_teamWallet != address(0), "Invalid team wallet");
//         require(_foundationWallet != address(0), "Invalid foundation wallet");
//         require(_logisticsWallet != address(0), "Invalid logistics wallet");
//         require(_initialOwner != address(0), "Invalid initial owner");
        
//         liquidityWallet = _liquidityWallet;
//         teamWallet = _teamWallet;
//         foundationWallet = _foundationWallet;
//         logisticsWallet = _logisticsWallet;
        
//         // Initialize staking reward pool (5% of total supply)
//         stakingRewardPool = (TOTAL_SUPPLY * 5) / 100;
//     }
    
//     /**
//      * @dev Execute Token Generation Event (TGE)
//      * @notice Distributes initial token allocations according to tokenomics
//      */
//     function executeTGE() external onlyOwner {
//         require(!tgeExecuted, "TGE already executed");
//         require(tgeTimestamp == 0, "TGE timestamp already set");
        
//         tgeTimestamp = block.timestamp;
//         tgeExecuted = false;
        
//         // Mint total supply to contract
//         _mint(address(this), TOTAL_SUPPLY);
        
//         // Initialize allocations with vesting schedules
//         _initializeLiquidityAllocation();
//         _initializeTeamAllocation();
//         _initializeFoundationAllocation();
//         _initializeLogisticsAllocation();
        
//         // Distribute TGE unlocked amounts
//         _distributeTGEAmounts();
        
//         emit TokensVested(address(this), TGE_UNLOCK, "TGE_DISTRIBUTION");
//         tgeExecuted = true;
//     }
    
//     /**
//      * @dev Initialize liquidity allocation (50% - 125M tokens)
//      */
//     function _initializeLiquidityAllocation() private {
//         liquidityAllocation[liquidityWallet] = TokenAllocation({
//             total: 125_000_000 * 10**18,
//             tgeUnlock: 41_666_667 * 10**18,
//             vestedAmount: 0,
//             claimedAmount: 0,
//             startTime: tgeTimestamp,
//             initialized: true
//         });
//     }
    
//     /**
//      * @dev Initialize team allocation (5% - 12.5M tokens)
//      */
//     function _initializeTeamAllocation() private {
//         teamAllocation[teamWallet] = TokenAllocation({
//             total: 12_500_000 * 10**18,
//             tgeUnlock: 4_166_667 * 10**18,
//             vestedAmount: 0,
//             claimedAmount: 0,
//             startTime: tgeTimestamp,
//             initialized: true
//         });
//     }
    
//     /**
//      * @dev Initialize foundation allocation (10% - 25M tokens)
//      */
//     function _initializeFoundationAllocation() private {
//         foundationAllocation[foundationWallet] = TokenAllocation({
//             total: 25_000_000 * 10**18,
//             tgeUnlock: 8_333_333 * 10**18,
//             vestedAmount: 0,
//             claimedAmount: 0,
//             startTime: tgeTimestamp,
//             initialized: true
//         });
//     }
    
//     /**
//      * @dev Initialize logistics allocation (11% - 27.5M tokens)
//      */
//     function _initializeLogisticsAllocation() private {
//         logisticsAllocation[logisticsWallet] = TokenAllocation({
//             total: 27_500_000 * 10**18,
//             tgeUnlock: 9_166_667 * 10**18,
//             vestedAmount: 0,
//             claimedAmount: 0,
//             startTime: tgeTimestamp,
//             initialized: true
//         });
//     }
    
//     /**
//      * @dev Distribute TGE unlocked amounts
//      */
//     function _distributeTGEAmounts() private {
//         // Transfer TGE amounts to respective wallets
//         _transfer(address(this), liquidityWallet, liquidityAllocation[liquidityWallet].tgeUnlock);
//         _transfer(address(this), teamWallet, teamAllocation[teamWallet].tgeUnlock);
//         _transfer(address(this), foundationWallet, foundationAllocation[foundationWallet].tgeUnlock);
//         _transfer(address(this), logisticsWallet, logisticsAllocation[logisticsWallet].tgeUnlock);
        
//         // Update claimed amounts
//         liquidityAllocation[liquidityWallet].claimedAmount = liquidityAllocation[liquidityWallet].tgeUnlock;
//         teamAllocation[teamWallet].claimedAmount = teamAllocation[teamWallet].tgeUnlock;
//         foundationAllocation[foundationWallet].claimedAmount = foundationAllocation[foundationWallet].tgeUnlock;
//         logisticsAllocation[logisticsWallet].claimedAmount = logisticsAllocation[logisticsWallet].tgeUnlock;
//     }

//      //** ************************************************************************************************  **//
    
//     /**
//      * @dev Set IDO allocations for investors
//      * @param investors Array of investor addresses
//      * @param amounts Array of allocation amounts
//      */
//     function setIDOAllocations(address investors, uint256 amounts) 
//         external onlyOwner {
//         uint256 totalIDOAmount = 0;
//             require(investors != address(0), "Invalid investor address");
//             idoAllocations[investors] = amounts;
//             totalIDOAmount = totalIDOAmount + amounts;
//             emit IDOAllocationSet(investors, amounts);
        
//         require(totalIDOAmount <= 10_000_000 * 10**18, "Exceeds IDO allocation");
//     }

//      /**
//      * @dev Get the IDO allocation for a specific investor.
//      * @param investor The address of the investor to query.
//      * @return The allocated amount for the investor.
//      */
//     function getIDOAllocation(address investor) external view onlyOwner returns (uint256) {
//         return idoAllocations[investor];
//     }
    
//     /**
//      * @dev Claim IDO tokens
//      */
//     function claimIDOTokens() external nonReentrant {
//         require(tgeExecuted, "TGE not executed yet");
//         uint256 allocation = idoAllocations[msg.sender];
//         require(allocation > 0, "No IDO allocation");
        
//         idoAllocations[msg.sender] = 0;
//         _transfer(address(this), msg.sender, allocation);
        
//         _updateServiceDiscountTier(msg.sender);
//     }

//     //** ************************************************************************************************  **//
    
//     /**
//      * @dev Set airdrop allocations
//      * @param recipients Array of recipient addresses
//      * @param amounts Array of airdrop amounts
//      */
//     function setAirdropAllocations(address[] calldata recipients, uint256[] calldata amounts) 
//         external onlyOwner {
//         require(recipients.length == amounts.length, "Arrays length mismatch");
        
//         uint256 totalAirdropAmount = 0;
//         for (uint256 i = 0; i < recipients.length; i++) {
//             require(recipients[i] != address(0), "Invalid recipient address");
//             airdropAllocations[recipients[i]] = amounts[i];
//             totalAirdropAmount = totalAirdropAmount + amounts[i];
//         }
        
//         require(totalAirdropAmount <= 5_000_000 * 10**18, "Exceeds airdrop allocation");
//     }
    
//     /**
//      * @dev Claim airdrop tokens
//      */
//     function claimAirdrop() external nonReentrant {
//         require(tgeExecuted, "TGE not executed yet");
//         require(!airdropClaimed[msg.sender], "Airdrop already claimed");
//         uint256 allocation = airdropAllocations[msg.sender];
//         require(allocation > 0, "No airdrop allocation");
        
//         airdropClaimed[msg.sender] = true;
//         _transfer(address(this), msg.sender, allocation);
        
//         _updateServiceDiscountTier(msg.sender);
//         emit AirdropClaimed(msg.sender, allocation);
//     }
    
//     /**
//      * @dev Calculate vested amount for an allocation
//      * @param allocation The token allocation struct
//      * @return The amount of tokens that can be claimed
//      */
//     function calculateVestedAmount(TokenAllocation memory allocation) public view returns (uint256) {
//         if (!allocation.initialized || block.timestamp < allocation.startTime + CLIFF_DURATION) {
//             return 0;
//         }
        
//         uint256 elapsedTime = block.timestamp - allocation.startTime;
//         uint256 vestableAmount = allocation.total - allocation.tgeUnlock;
        
//         if (elapsedTime >= VESTING_DURATION) {
//             return vestableAmount;
//         }
        
//         uint256 vestedAmount = (vestableAmount * elapsedTime) / VESTING_DURATION;
//         return vestedAmount;
//     }
    
//     /**
//      * @dev Claim vested tokens
//      * @param category The allocation category ("liquidity", "team", "foundation", "logistics")
//      */
//     function claimVestedTokens(string calldata category) external nonReentrant {
//         require(tgeExecuted, "TGE not executed yet");
        
//         TokenAllocation storage allocation;
        
//         if (keccak256(bytes(category)) == keccak256(bytes("liquidity"))) {
//             require(msg.sender == liquidityWallet, "Not authorized");
//             allocation = liquidityAllocation[msg.sender];
//         } else if (keccak256(bytes(category)) == keccak256(bytes("team"))) {
//             require(msg.sender == teamWallet, "Not authorized");
//             allocation = teamAllocation[msg.sender];
//         } else if (keccak256(bytes(category)) == keccak256(bytes("foundation"))) {
//             require(msg.sender == foundationWallet, "Not authorized");
//             allocation = foundationAllocation[msg.sender];
//         } else if (keccak256(bytes(category)) == keccak256(bytes("logistics"))) {
//             require(msg.sender == logisticsWallet, "Not authorized");
//             allocation = logisticsAllocation[msg.sender];
//         } else {
//             revert("Invalid category");
//         }
        
//         uint256 vestedAmount = calculateVestedAmount(allocation);
//         uint256 claimableAmount = vestedAmount - allocation.vestedAmount;
        
//         require(claimableAmount > 0, "No tokens to claim");
        
//         allocation.vestedAmount = vestedAmount;
//         allocation.claimedAmount = allocation.claimedAmount + claimableAmount;
        
//         _transfer(address(this), msg.sender, claimableAmount);
//         emit TokensVested(msg.sender, claimableAmount, category);
//     }
    
//     /**
//      * @dev Stake tokens for rewards
//      * @param amount Amount of tokens to stake
//      */
//     function stakeTokens(uint256 amount) external nonReentrant whenNotPaused {
//         require(amount > 0, "Amount must be greater than 0");
//         require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
//         // Claim any pending rewards first
//         if (stakingData[msg.sender].stakedAmount > 0) {
//             _claimStakingRewards();
//         }
        
//         // Transfer tokens to contract
//         _transfer(msg.sender, address(this), amount);
        
//         // Update staking data
//         stakingData[msg.sender].stakedAmount = stakingData[msg.sender].stakedAmount + amount;
//         stakingData[msg.sender].stakingStartTime = block.timestamp;
//         stakingData[msg.sender].lastRewardClaim = block.timestamp;
        
//         totalStaked = totalStaked + amount;
        
//         _updateServiceDiscountTier(msg.sender);
//         emit TokensStaked(msg.sender, amount);
//     }
    
//     /**
//      * @dev Unstake tokens
//      * @param amount Amount of tokens to unstake
//      */
//     function unstakeTokens(uint256 amount) external nonReentrant {
//         require(amount > 0, "Amount must be greater than 0");
//         require(stakingData[msg.sender].stakedAmount >= amount, "Insufficient staked amount");
        
//         // Claim pending rewards
//         _claimStakingRewards();
        
//         // Update staking data
//         stakingData[msg.sender].stakedAmount = stakingData[msg.sender].stakedAmount - amount;
//         totalStaked = totalStaked - amount;
        
//         // Transfer tokens back to user
//         _transfer(address(this), msg.sender, amount);
        
//         _updateServiceDiscountTier(msg.sender);
//         emit TokensUnstaked(msg.sender, amount);
//     }
    
//     /**
//      * @dev Calculate staking rewards for a user
//      * @param user User address
//      * @return The amount of rewards earned
//      */
//     function calculateStakingRewards(address user) public view returns (uint256) {
//         StakingInfo memory staking = stakingData[user];
        
//         if (staking.stakedAmount == 0) {
//             return 0;
//         }
        
//         uint256 stakingDuration = block.timestamp - staking.lastRewardClaim;
//         uint256 rewards = (staking.stakedAmount * STAKING_REWARD_RATE * stakingDuration) / (365 days * 10000);
        
//         return rewards;
//     }
    
//     /**
//      * @dev Claim staking rewards
//      */
//     function claimStakingRewards() external nonReentrant {
//         _claimStakingRewards();
//     }
    
//     /**
//      * @dev Internal function to claim staking rewards
//      */
//     function _claimStakingRewards() private {
//         uint256 rewards = calculateStakingRewards(msg.sender);
        
//         if (rewards > 0 && rewards <= stakingRewardPool) {
//             stakingRewardPool = stakingRewardPool - rewards;
//             stakingData[msg.sender].totalRewards = stakingData[msg.sender].totalRewards + rewards;
//             stakingData[msg.sender].lastRewardClaim = block.timestamp;
            
//             _transfer(address(this), msg.sender, rewards);
//             emit StakingRewardsClaimed(msg.sender, rewards);
//         }
//     }
    
//     /**
//      * @dev Update service discount tier based on token balance + staked amount
//      * @param user User address
//      */
//     function _updateServiceDiscountTier(address user) private {
//         uint256 totalUserTokens = balanceOf(user) + stakingData[user].stakedAmount;
//         uint256 newTier = 0;
        
//         if (totalUserTokens >= TIER_3_THRESHOLD) {
//             newTier = 3; // 15% discount
//         } else if (totalUserTokens >= TIER_2_THRESHOLD) {
//             newTier = 2; // 10% discount
//         } else if (totalUserTokens >= TIER_1_THRESHOLD) {
//             newTier = 1; // 5% discount
//         }
        
//         if (serviceDiscountTier[user] != newTier) {
//             serviceDiscountTier[user] = newTier;
//             emit ServiceDiscountUpdated(user, newTier);
//         }
//     }
    
//     /**
//      * @dev Get service discount percentage for a user
//      * @param user User address
//      * @return Discount percentage (500 = 5%, 1000 = 10%, etc.)
//      */
//     function getServiceDiscount(address user) external view returns (uint256) {
//         uint256 tier = serviceDiscountTier[user];
//         if (tier == 3) return 1500; // 15%
//         if (tier == 2) return 1000; // 10%
//         if (tier == 1) return 500;  // 5%
//         return 0;
//     }
    
//     /**
//      * @dev Override transfer to update service discount tiers
//      */
//     function _update(address from, address to, uint256 amount) internal override {
//         super._update(from, to, amount);
        
//         if (from != address(0) && from != address(this)) {
//             _updateServiceDiscountTier(from);
//         }
//         if (to != address(0) && to != address(this)) {
//             _updateServiceDiscountTier(to);
//         }
//     }
    
//     /**
//      * @dev Pause contract functions
//      */
//     // function pause() external onlyOwner {
//     //     _pause();
//     // }
    
//     /**
//      * @dev Unpause contract functions
//      */
//     function unpause() external onlyOwner {
//         _unpause();
//     }
    
//     /**
//      * @dev Emergency function to withdraw remaining tokens (only after vesting complete)
//      */
//     function emergencyWithdraw() external onlyOwner {
//         require(block.timestamp > tgeTimestamp + VESTING_DURATION + 365 days, "Vesting not complete");
//         uint256 balance = balanceOf(address(this));
//         if (balance > 0) {
//             _transfer(address(this), owner(), balance);
//         }
//     }
    
//     /**
//      * @dev Get contract information
//      */
//     // function getContractInfo() public  view returns (
//     //     uint256 totalSupply_,
//     //     uint256 totalStaked_,
//     //     uint256 stakingRewardPool_,
//     //     uint256 tgeTimestamp_,
//     //     bool tgeExecuted_,
//     //     uint256 teamWallet_,
//     //     uint256 liquidityWallet_,
//     //     uint256 foundationWallet_,
//     //     uint256 logisticsWallet_
//     // ) {
//     //     return (
//     //         totalSupply(),
//     //         totalStaked,
//     //         stakingRewardPool,
//     //         tgeTimestamp,
//     //         tgeExecuted,
//     //         teamAllocation[teamWallet].tgeUnlock,
//     //         teamAllocation[liquidityWallet].tgeUnlock,
//     //         teamAllocation[foundationWallet].tgeUnlock,
//     //         teamAllocation[logisticsWallet].tgeUnlock
//     //     );
//     // }
// }