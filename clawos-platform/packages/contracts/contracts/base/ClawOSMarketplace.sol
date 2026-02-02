// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IClawOSMarketplace.sol";
import "./interfaces/ISkillRegistry.sol";
import "./interfaces/IPaymentEscrow.sol";

/**
 * @title ClawOSMarketplace
 * @notice Main marketplace contract for the ClawOS platform on Base L2
 * @dev Integrates SkillRegistry and PaymentEscrow for complete marketplace functionality
 */
contract ClawOSMarketplace is IClawOSMarketplace, Ownable, ReentrancyGuard, Pausable {
    
    // Contract references
    ISkillRegistry public skillRegistry;
    IPaymentEscrow public paymentEscrow;

    // Platform configuration
    address public feeRecipient;
    uint256 public platformFeeBps = 250; // 2.5%
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max

    // Purchase tracking
    mapping(bytes32 => Purchase) private purchases;
    mapping(address => bytes32[]) private buyerPurchases;
    mapping(address => bytes32[]) private sellerPurchases;
    uint256 private purchaseCounter;

    // Events from interface
    event SkillPurchased(
        bytes32 indexed purchaseId,
        bytes32 indexed skillId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    event PurchaseCompleted(bytes32 indexed purchaseId);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event SkillRegistryUpdated(address oldRegistry, address newRegistry);
    event PaymentEscrowUpdated(address oldEscrow, address newEscrow);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    modifier validSkill(bytes32 skillId) {
        require(address(skillRegistry) != address(0), "Marketplace: registry not set");
        ISkillRegistry.Skill memory skill = skillRegistry.getSkill(skillId);
        require(skill.isActive, "Marketplace: skill not active");
        require(skill.owner != msg.sender, "Marketplace: cannot buy own skill");
        _;
    }

    modifier validPurchase(bytes32 purchaseId) {
        require(purchases[purchaseId].buyer != address(0), "Marketplace: purchase does not exist");
        _;
    }

    constructor(
        address _skillRegistry,
        address _paymentEscrow,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Marketplace: invalid fee recipient");
        
        skillRegistry = ISkillRegistry(_skillRegistry);
        paymentEscrow = IPaymentEscrow(_paymentEscrow);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Purchase a skill from the marketplace
     * @param skillId The skill to purchase
     * @return purchaseId The unique purchase identifier
     */
    function purchaseSkill(bytes32 skillId) 
        external 
        whenNotPaused 
        nonReentrant 
        validSkill(skillId) 
        returns (bytes32 purchaseId) 
    {
        require(address(paymentEscrow) != address(0), "Marketplace: escrow not set");

        ISkillRegistry.Skill memory skill = skillRegistry.getSkill(skillId);
        uint256 price = skill.price;
        address seller = skill.owner;

        // Generate purchase ID
        purchaseCounter++;
        purchaseId = keccak256(abi.encodePacked(
            msg.sender,
            skillId,
            block.timestamp,
            purchaseCounter
        ));

        // Create payment in escrow
        bytes32 paymentId = paymentEscrow.createPayment(skillId, seller, price);

        // Record purchase
        purchases[purchaseId] = Purchase({
            purchaseId: purchaseId,
            skillId: skillId,
            buyer: msg.sender,
            seller: seller,
            amount: price,
            timestamp: block.timestamp,
            isCompleted: false
        });

        buyerPurchases[msg.sender].push(purchaseId);
        sellerPurchases[seller].push(purchaseId);

        emit SkillPurchased(purchaseId, skillId, msg.sender, seller, price);

        return purchaseId;
    }

    /**
     * @notice Complete a purchase and release funds to seller
     * @param purchaseId The purchase identifier
     */
    function completePurchase(bytes32 purchaseId) 
        external 
        whenNotPaused 
        nonReentrant 
        validPurchase(purchaseId) 
    {
        Purchase storage purchase = purchases[purchaseId];
        require(!purchase.isCompleted, "Marketplace: purchase already completed");
        require(
            msg.sender == purchase.buyer || msg.sender == owner(),
            "Marketplace: unauthorized"
        );

        purchase.isCompleted = true;

        // Complete the payment in escrow
        // Note: This would need the paymentId from escrow, in production we'd link them
        // For now, this is a simplified version

        emit PurchaseCompleted(purchaseId);
    }

    /**
     * @notice Get purchase details
     * @param purchaseId The purchase identifier
     * @return Purchase struct
     */
    function getPurchase(bytes32 purchaseId) external view returns (Purchase memory) {
        return purchases[purchaseId];
    }

    /**
     * @notice Get all purchases by a buyer
     * @param buyer The buyer address
     * @return Array of purchase IDs
     */
    function getPurchasesByBuyer(address buyer) external view returns (bytes32[] memory) {
        return buyerPurchases[buyer];
    }

    /**
     * @notice Get all purchases for a seller
     * @param seller The seller address
     * @return Array of purchase IDs
     */
    function getPurchasesBySeller(address seller) external view returns (bytes32[] memory) {
        return sellerPurchases[seller];
    }

    /**
     * @notice Calculate platform fee for a given amount
     * @param amount The transaction amount
     * @return The fee amount
     */
    function calculatePlatformFee(uint256 amount) external view returns (uint256) {
        return (amount * platformFeeBps) / BASIS_POINTS;
    }

    /**
     * @notice Set the platform fee percentage
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Marketplace: fee exceeds maximum");
        
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Set the fee recipient address
     * @param newRecipient New fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Marketplace: invalid address");
        
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Set the skill registry contract
     * @param newRegistry New registry address
     */
    function setSkillRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Marketplace: invalid address");
        
        address oldRegistry = address(skillRegistry);
        skillRegistry = ISkillRegistry(newRegistry);
        
        emit SkillRegistryUpdated(oldRegistry, newRegistry);
    }

    /**
     * @notice Set the payment escrow contract
     * @param newEscrow New escrow address
     */
    function setPaymentEscrow(address newEscrow) external onlyOwner {
        require(newEscrow != address(0), "Marketplace: invalid address");
        
        address oldEscrow = address(paymentEscrow);
        paymentEscrow = IPaymentEscrow(newEscrow);
        
        emit PaymentEscrowUpdated(oldEscrow, newEscrow);
    }

    /**
     * @notice Pause the marketplace
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the marketplace
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw function for stuck tokens
     * @param token The token address
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Marketplace: invalid token");
        
        (bool success, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", owner(), amount)
        );
        require(success, "Marketplace: transfer failed");
        
        emit EmergencyWithdraw(token, amount);
    }

    /**
     * @notice Get total number of purchases
     * @return Total purchase count
     */
    function getTotalPurchases() external view returns (uint256) {
        return purchaseCounter;
    }

    /**
     * @notice Check if a purchase is completed
     * @param purchaseId The purchase identifier
     * @return True if completed
     */
    function isPurchaseCompleted(bytes32 purchaseId) external view returns (bool) {
        return purchases[purchaseId].isCompleted;
    }
}
