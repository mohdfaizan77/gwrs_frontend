// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/ReentrancyGuard.sol";

// import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// /**
//  * @title GWRS Token - GoodWares Utility Token
//  * @dev BEP-20 compliant token for the GoodWares ecosystem
//  * @notice Pure utility token for services discount and staking rewards
//  */
// contract GWRSToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
//     using SafeMath for uint256;

//     // Token Constants
//     uint256 public constant TOTAL_SUPPLY = 250_000_000 * 10**18; // 250 million tokens
//     uint256 public constant TGE_UNLOCK = 83_333_333 * 10**18; // Initial unlock amount
    
//     // Vesting schedules (in seconds)
//     uint256 public constant VESTING_DURATION = 24 * 30 days; // 24 months
//     uint256 public constant CLIFF_DURATION = 6 * 30 days; // 6 months cliff
    
//     // IDO Fund Locking Constants
//     uint256 public constant IDO_FUND_LOCK_DURATION = 12 * 30 days; // 12 months lock
//     uint256 public constant IDO_FUND_INITIAL_UNLOCK = 20; // 20% unlocked at TGE
//     uint256 public constant IDO_FUND_VESTING_DURATION = 10 * 30 days; // 10 months vesting after initial unlock
    
//     // Token allocation amounts
//     struct TokenAllocation {
//         uint256 total;
//         uint256 tgeUnlock;
//         uint256 vestedAmount;
//         uint256 claimedAmount;
//         uint256 startTime;
//         bool initialized;
//     }
    
//     // IDO Fund Locking Structure
//     struct IDOFundLock {
//         uint256 totalRaised;
//         uint256 initialUnlockAmount;
//         uint256 lockedAmount;
//         uint256 releasedAmount;
//         uint256 lockStartTime;
//         uint256 vestingStartTime;
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
    
//     // IDO Fund Locking
//     IDOFundLock public idoFundLock;
//     address public immutable idoFundWallet;
    
//     // Staking functionality
//     struct StakingInfo {
//         uint256 stakedAmount;
//         uint256 stakingStartTime;
//         uint256 lastRewardClaim;
//         uint256 totalRewards;
//     }
    
//     mapping(address => StakingInfo) public stakingData;
//     uint256 public constant STAKING_REWARD_RATE = 1200; // 12% APY
//     uint256 public totalStaked;
//     uint256 public stakingRewardPool;
    
//     // Service discount functionality
//     mapping(address => uint256) public serviceDiscountTier;
//     uint256 public constant TIER_1_THRESHOLD = 1000 * 10**18;
//     uint256 public constant TIER_2_THRESHOLD = 5000 * 10**18;
//     uint256 public constant TIER_3_THRESHOLD = 10000 * 10**18;
    
//     // Events
//     event TokensVested(address indexed beneficiary, uint256 amount, string category);
//     event TokensStaked(address indexed staker, uint256 amount);
//     event TokensUnstaked(address indexed staker, uint256 amount);
//     event StakingRewardsClaimed(address indexed staker, uint256 rewards);
//     event ServiceDiscountUpdated(address indexed user, uint256 tier);
//     event IDOAllocationSet(address indexed investor, uint256 amount);
//     event AirdropClaimed(address indexed recipient, uint256 amount);
//     event IDOFundsLocked(uint256 totalAmount, uint256 initialUnlock, uint256 lockedAmount);
//     event IDOFundsReleased(uint256 amount, uint256 totalReleased);
//     event TGEExecuted(uint256 timestamp);
    
//     // TGE timestamp
//     uint256 public tgeTimestamp;
//     bool public tgeExecuted;
    
//     // Addresses for allocations
//     address public immutable liquidityWallet;
//     address public immutable teamWallet;
//     address public immutable foundationWallet;
//     address public immutable logisticsWallet;
    
//     constructor(
//         address _liquidityWallet,
//         address _teamWallet,
//         address _foundationWallet,
//         address _logisticsWallet,
//         address _idoFundWallet,
//         address _initialOwner
//     ) ERC20("GoodWares Token", "GWRS") Ownable(_initialOwner) {
//         require(_liquidityWallet != address(0), "Invalid liquidity wallet");
//         require(_teamWallet != address(0), "Invalid team wallet");
//         require(_foundationWallet != address(0), "Invalid foundation wallet");
//         require(_logisticsWallet != address(0), "Invalid logistics wallet");
//         require(_idoFundWallet != address(0), "Invalid IDO fund wallet");
//         require(_initialOwner != address(0), "Invalid initial owner");
        
//         liquidityWallet = _liquidityWallet;
//         teamWallet = _teamWallet;
//         foundationWallet = _foundationWallet;
//         logisticsWallet = _logisticsWallet;
//         idoFundWallet = _idoFundWallet;
        
//         // Initialize staking reward pool (5% of total supply)
//         stakingRewardPool = TOTAL_SUPPLY.mul(5).div(100);
//     }
    
//     /**
//      * @dev Set IDO raised funds amount and initialize locking mechanism
//      */
//     function setIDORaisedFunds(uint256 _totalRaised) external onlyOwner {
//         require(!idoFundLock.initialized, "IDO funds already initialized");
//         require(_totalRaised > 0, "Total raised must be greater than 0");
//         require(tgeExecuted, "TGE must be executed first");
        
//         uint256 initialUnlock = _totalRaised.mul(IDO_FUND_INITIAL_UNLOCK).div(100);
//         uint256 lockedAmount = _totalRaised.sub(initialUnlock);
        
//         idoFundLock = IDOFundLock({
//             totalRaised: _totalRaised,
//             initialUnlockAmount: initialUnlock,
//             lockedAmount: lockedAmount,
//             releasedAmount: 0,
//             lockStartTime: block.timestamp,
//             vestingStartTime: block.timestamp.add(IDO_FUND_LOCK_DURATION),
//             initialized: true
//         });
        
//         emit IDOFundsLocked(_totalRaised, initialUnlock, lockedAmount);
//     }
    
//     /**
//      * @dev Calculate releasable IDO funds
//      */
//     function calculateReleasableIDOFunds() public view returns (uint256) {
//         if (!idoFundLock.initialized) return 0;
        
//         if (block.timestamp < idoFundLock.vestingStartTime) return 0;
        
//         uint256 elapsedVestingTime = block.timestamp.sub(idoFundLock.vestingStartTime);
        
//         if (elapsedVestingTime >= IDO_FUND_VESTING_DURATION) {
//             return idoFundLock.lockedAmount.sub(idoFundLock.releasedAmount);
//         }
        
//         uint256 vestedAmount = idoFundLock.lockedAmount
//             .mul(elapsedVestingTime)
//             .div(IDO_FUND_VESTING_DURATION);
        
//         return vestedAmount.sub(idoFundLock.releasedAmount);
//     }
    
//     /**
//      * @dev Release vested IDO funds
//      */
//     function releaseIDOFunds() external onlyOwner nonReentrant {
//         require(idoFundLock.initialized, "IDO funds not initialized");
        
//         uint256 releasableAmount = calculateReleasableIDOFunds();
//         require(releasableAmount > 0, "No funds to release");
        
//         idoFundLock.releasedAmount = idoFundLock.releasedAmount.add(releasableAmount);
//         payable(idoFundWallet).transfer(releasableAmount);
        
//         emit IDOFundsReleased(releasableAmount, idoFundLock.releasedAmount);
//     }
    
//     /**
//      * @dev Get IDO fund lock information
//      */
//     function getIDOFundLockInfo() external view returns (
//         uint256 totalRaised,
//         uint256 initialUnlockAmount,
//         uint256 lockedAmount,
//         uint256 releasedAmount,
//         uint256 lockStartTime,
//         uint256 vestingStartTime,
//         uint256 releasableNow,
//         bool initialized
//     ) {
//         return (
//             idoFundLock.totalRaised,
//             idoFundLock.initialUnlockAmount,
//             idoFundLock.lockedAmount,
//             idoFundLock.releasedAmount,
//             idoFundLock.lockStartTime,
//             idoFundLock.vestingStartTime,
//             calculateReleasableIDOFunds(),
//             idoFundLock.initialized
//         );
//     }
    
//     receive() external payable {}
    
//     /**
//      * @dev Execute Token Generation Event (TGE)
//      */
//     function executeTGE() external onlyOwner {
//         require(!tgeExecuted, "TGE already executed");
//         require(tgeTimestamp == 0, "TGE timestamp already set");
        
//         tgeTimestamp = block.timestamp;
//         tgeExecuted = true;
        
//         _mint(address(this), TOTAL_SUPPLY);
        
//         _initializeLiquidityAllocation();
//         _initializeTeamAllocation();
//         _initializeFoundationAllocation();
//         _initializeLogisticsAllocation();
        
//         _distributeTGEAmounts();
        
//         emit TGEExecuted(tgeTimestamp);
//     }
    
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
    
//     function _distributeTGEAmounts() private {
//         _transfer(address(this), liquidityWallet, liquidityAllocation[liquidityWallet].tgeUnlock);
//         _transfer(address(this), teamWallet, teamAllocation[teamWallet].tgeUnlock);
//         _transfer(address(this), foundationWallet, foundationAllocation[foundationWallet].tgeUnlock);
//         _transfer(address(this), logisticsWallet, logisticsAllocation[logisticsWallet].tgeUnlock);
        
//         liquidityAllocation[liquidityWallet].claimedAmount = liquidityAllocation[liquidityWallet].tgeUnlock;
//         teamAllocation[teamWallet].claimedAmount = teamAllocation[teamWallet].tgeUnlock;
//         foundationAllocation[foundationWallet].claimedAmount = foundationAllocation[foundationWallet].tgeUnlock;
//         logisticsAllocation[logisticsWallet].claimedAmount = logisticsAllocation[logisticsWallet].tgeUnlock;
//     }
    
//     function setIDOAllocations(address[] calldata investors, uint256[] calldata amounts) 
//         external onlyOwner {
//         require(investors.length == amounts.length, "Arrays length mismatch");
        
//         uint256 totalIDOAmount = 0;
//         for (uint256 i = 0; i < investors.length; i++) {
//             require(investors[i] != address(0), "Invalid investor address");
//             idoAllocations[investors[i]] = amounts[i];
//             totalIDOAmount = totalIDOAmount.add(amounts[i]);
//             emit IDOAllocationSet(investors[i], amounts[i]);
//         }
        
//         require(totalIDOAmount <= 50_000_000 * 10**18, "Exceeds IDO allocation");
//     }
    
//     function claimIDOTokens() external nonReentrant {
//         require(tgeExecuted, "TGE not executed yet");
//         uint256 allocation = idoAllocations[msg.sender];
//         require(allocation > 0, "No IDO allocation");
        
//         idoAllocations[msg.sender] = 0;
//         _transfer(address(this), msg.sender, allocation);
        
//         _updateServiceDiscountTier(msg.sender);
//     }
    
//     function setAirdropAllocations(address[] calldata recipients, uint256[] calldata amounts) 
//         external onlyOwner {
//         require(recipients.length == amounts.length, "Arrays length mismatch");
        
//         uint256 totalAirdropAmount = 0;
//         for (uint256 i = 0; i < recipients.length; i++) {
//             require(recipients[i] != address(0), "Invalid recipient address");
//             airdropAllocations[recipients[i]] = amounts[i];
//             totalAirdropAmount = totalAirdropAmount.add(amounts[i]);
//         }
        
//         require(totalAirdropAmount <= 5_000_000 * 10**18, "Exceeds airdrop allocation");
//     }
    
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
    
//     function calculateVestedAmount(TokenAllocation memory allocation) public view returns (uint256) {
//         if (!allocation.initialized || block.timestamp < allocation.startTime.add(CLIFF_DURATION)) {
//             return 0;
//         }
        
//         uint256 elapsedTime = block.timestamp.sub(allocation.startTime);
//         uint256 vestableAmount = allocation.total.sub(allocation.tgeUnlock);
        
//         if (elapsedTime >= VESTING_DURATION) {
//             return vestableAmount;
//         }
        
//         return vestableAmount.mul(elapsedTime).div(VESTING_DURATION);
//     }
    
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
//         uint256 claimableAmount = vestedAmount.sub(allocation.vestedAmount);
        
//         require(claimableAmount > 0, "No tokens to claim");
        
//         allocation.vestedAmount = vestedAmount;
//         allocation.claimedAmount = allocation.claimedAmount.add(claimableAmount);
        
//         _transfer(address(this), msg.sender, claimableAmount);
//         emit TokensVested(msg.sender, claimableAmount, category);
//     }
    
//     function stakeTokens(uint256 amount) external nonReentrant whenNotPaused {
//         require(amount > 0, "Amount must be greater than 0");
//         require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
//         if (stakingData[msg.sender].stakedAmount > 0) {
//             _claimStakingRewards();
//         }
        
//         _transfer(msg.sender, address(this), amount);
        
//         stakingData[msg.sender].stakedAmount = stakingData[msg.sender].stakedAmount.add(amount);
//         stakingData[msg.sender].stakingStartTime = block.timestamp;
//         stakingData[msg.sender].lastRewardClaim = block.timestamp;
        
//         totalStaked = totalStaked.add(amount);
        
//         _updateServiceDiscountTier(msg.sender);
//         emit TokensStaked(msg.sender, amount);
//     }
    
//     function unstakeTokens(uint256 amount) external nonReentrant {
//         require(amount > 0, "Amount must be greater than 0");
//         require(stakingData[msg.sender].stakedAmount >= amount, "Insufficient staked amount");
        
//         _claimStakingRewards();
        
//         stakingData[msg.sender].stakedAmount = stakingData[msg.sender].stakedAmount.sub(amount);
//         totalStaked = totalStaked.sub(amount);
        
//         _transfer(address(this), msg.sender, amount);
        
//         _updateServiceDiscountTier(msg.sender);
//         emit TokensUnstaked(msg.sender, amount);
//     }
    
//     function calculateStakingRewards(address user) public view returns (uint256) {
//         StakingInfo memory staking = stakingData[user];
        
//         if (staking.stakedAmount == 0) return 0;
        
//         uint256 stakingDuration = block.timestamp.sub(staking.lastRewardClaim);
//         return staking.stakedAmount
//             .mul(STAKING_REWARD_RATE)
//             .mul(stakingDuration)
//             .div(365 days)
//             .div(10000);
//     }
    
//     function claimStakingRewards() external nonReentrant {
//         _claimStakingRewards();
//     }
    
//     function _claimStakingRewards() private {
//         uint256 rewards = calculateStakingRewards(msg.sender);
        
//         if (rewards > 0 && rewards <= stakingRewardPool) {
//             stakingRewardPool = stakingRewardPool.sub(rewards);
//             stakingData[msg.sender].totalRewards = stakingData[msg.sender].totalRewards.add(rewards);
//             stakingData[msg.sender].lastRewardClaim = block.timestamp;
            
//             _transfer(address(this), msg.sender, rewards);
//             emit StakingRewardsClaimed(msg.sender, rewards);
//         }
//     }
    
//     function _updateServiceDiscountTier(address user) private {
//         uint256 totalUserTokens = balanceOf(user).add(stakingData[user].stakedAmount);
//         uint256 newTier = 0;
        
//         if (totalUserTokens >= TIER_3_THRESHOLD) {
//             newTier = 3;
//         } else if (totalUserTokens >= TIER_2_THRESHOLD) {
//             newTier = 2;
//         } else if (totalUserTokens >= TIER_1_THRESHOLD) {
//             newTier = 1;
//         }
        
//         if (serviceDiscountTier[user] != newTier) {
//             serviceDiscountTier[user] = newTier;
//             emit ServiceDiscountUpdated(user, newTier);
//         }
//     }
    
//     function getServiceDiscount(address user) external view returns (uint256) {
//         uint256 tier = serviceDiscountTier[user];
//         if (tier == 3) return 1500;
//         if (tier == 2) return 1000;
//         if (tier == 1) return 500;
//         return 0;
//     }
    
//     function _afterTokenTransfer(address from, address to) internal {
//     // Directly implement the logic you need
//     if (from != address(0)) _updateServiceDiscountTier(from);
//     if (to != address(0)) _updateServiceDiscountTier(to);
// }
    
//     function pause() external onlyOwner {
//         _pause();
//     }
    
//     function unpause() external onlyOwner {
//         _unpause();
//     }
    
//     function emergencyWithdraw() external onlyOwner {
//         require(block.timestamp > tgeTimestamp.add(VESTING_DURATION).add(365 days), "Vesting not complete");
//         uint256 balance = balanceOf(address(this));
//         if (balance > 0) {
//             _transfer(address(this), owner(), balance);
//         }
//     }
    
//     function getContractInfo() external view returns (
//         uint256 totalSupply_,
//         uint256 totalStaked_,
//         uint256 stakingRewardPool_,
//         uint256 tgeTimestamp_,
//         bool tgeExecuted_
//     ) {
//         return (
//             totalSupply(),
//             totalStaked,
//             stakingRewardPool,
//             tgeTimestamp,
//             tgeExecuted
//         );
//     }
// }