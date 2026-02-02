// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPaymentEscrow.sol";

/**
 * @title PaymentEscrow
 * @notice Handles USDC payments with escrow functionality for the ClawOS marketplace
 * @dev 2.5% platform fee is deducted from each transaction
 */
contract PaymentEscrow is IPaymentEscrow, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // USDC token contract
    IERC20 public immutable usdc;
    
    // Platform fee recipient
    address public feeRecipient;
    
    // Platform fee in basis points (250 = 2.5%)
    uint256 public platformFeeBps = 250;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% max fee
    uint256 public constant BASIS_POINTS = 10000;

    // Payment storage
    mapping(bytes32 => Payment) private payments;
    mapping(address => bytes32[]) private sellerPendingPayments;
    mapping(address => uint256) private sellerBalances;
    
    // Payment counter for unique IDs
    uint256 private paymentCounter;
    
    // Trusted marketplace contract
    address public marketplace;

    // Modifiers
    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "PaymentEscrow: caller is not the marketplace");
        _;
    }

    modifier validPayment(bytes32 paymentId) {
        require(payments[paymentId].buyer != address(0), "PaymentEscrow: payment does not exist");
        _;
    }

    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);

    constructor(
        address _usdc,
        address _feeRecipient,
        address _marketplace
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "PaymentEscrow: invalid USDC address");
        require(_feeRecipient != address(0), "PaymentEscrow: invalid fee recipient");
        require(_marketplace != address(0), "PaymentEscrow: invalid marketplace address");
        
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        marketplace = _marketplace;
    }

    /**
     * @notice Create a new payment in escrow
     * @param skillId The skill being purchased
     * @param seller The seller address
     * @param amount The payment amount in USDC
     * @return paymentId The unique payment identifier
     */
    function createPayment(
        bytes32 skillId,
        address seller,
        uint256 amount
    ) external onlyMarketplace nonReentrant returns (bytes32 paymentId) {
        require(seller != address(0), "PaymentEscrow: invalid seller");
        require(amount > 0, "PaymentEscrow: amount must be greater than 0");

        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / BASIS_POINTS;
        uint256 sellerAmount = amount - platformFee;

        paymentCounter++;
        paymentId = keccak256(abi.encodePacked(
            msg.sender,
            skillId,
            seller,
            amount,
            paymentCounter,
            block.timestamp
        ));

        // Transfer USDC from buyer to this contract
        usdc.safeTransferFrom(tx.origin, address(this), amount);

        payments[paymentId] = Payment({
            paymentId: paymentId,
            skillId: skillId,
            buyer: tx.origin,
            seller: seller,
            amount: sellerAmount,
            platformFee: platformFee,
            status: PaymentStatus.PENDING,
            createdAt: block.timestamp,
            completedAt: 0
        });

        sellerPendingPayments[seller].push(paymentId);

        emit PaymentCreated(paymentId, skillId, tx.origin, seller, amount, platformFee);

        return paymentId;
    }

    /**
     * @notice Complete a payment and release funds to seller
     * @param paymentId The payment identifier
     */
    function completePayment(bytes32 paymentId) external onlyMarketplace validPayment(paymentId) nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.PENDING, "PaymentEscrow: payment not pending");

        payment.status = PaymentStatus.COMPLETED;
        payment.completedAt = block.timestamp;

        // Add to seller's withdrawable balance
        sellerBalances[payment.seller] += payment.amount;

        // Transfer platform fee to fee recipient
        usdc.safeTransfer(feeRecipient, payment.platformFee);

        // Remove from pending payments
        _removePendingPayment(payment.seller, paymentId);

        emit PaymentCompleted(paymentId, payment.amount, payment.platformFee);
    }

    /**
     * @notice Refund a payment to the buyer
     * @param paymentId The payment identifier
     */
    function refundPayment(bytes32 paymentId) external onlyMarketplace validPayment(paymentId) nonReentrant {
        Payment storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.PENDING, "PaymentEscrow: payment not pending");

        uint256 refundAmount = payment.amount + payment.platformFee;
        payment.status = PaymentStatus.REFUNDED;
        payment.completedAt = block.timestamp;

        // Remove from pending payments
        _removePendingPayment(payment.seller, paymentId);

        // Transfer full amount back to buyer
        usdc.safeTransfer(payment.buyer, refundAmount);

        emit PaymentRefunded(paymentId, refundAmount);
    }

    /**
     * @notice Mark a payment as disputed
     * @param paymentId The payment identifier
     * @param reason The dispute reason
     */
    function disputePayment(bytes32 paymentId, string calldata reason) external validPayment(paymentId) {
        Payment storage payment = payments[paymentId];
        require(
            msg.sender == payment.buyer || msg.sender == payment.seller || msg.sender == owner(),
            "PaymentEscrow: unauthorized"
        );
        require(payment.status == PaymentStatus.PENDING, "PaymentEscrow: payment not pending");

        payment.status = PaymentStatus.DISPUTED;

        emit PaymentDisputed(paymentId, reason);
    }

    /**
     * @notice Withdraw accumulated funds for a seller
     */
    function withdrawFunds() external nonReentrant {
        uint256 balance = sellerBalances[msg.sender];
        require(balance > 0, "PaymentEscrow: no funds to withdraw");

        sellerBalances[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, balance);

        emit FundsWithdrawn(msg.sender, balance);
    }

    /**
     * @notice Get payment details
     * @param paymentId The payment identifier
     * @return Payment struct
     */
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Get pending payments for a seller
     * @param seller The seller address
     * @return Array of payment IDs
     */
    function getPendingPayments(address seller) external view returns (bytes32[] memory) {
        return sellerPendingPayments[seller];
    }

    /**
     * @notice Get withdrawable balance for a seller
     * @param seller The seller address
     * @return Balance in USDC
     */
    function getBalance(address seller) external view returns (uint256) {
        return sellerBalances[seller];
    }

    /**
     * @notice Set the platform fee percentage
     * @param newFeeBps New fee in basis points (250 = 2.5%)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "PaymentEscrow: fee exceeds maximum");
        
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Set the fee recipient address
     * @param newRecipient New fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "PaymentEscrow: invalid address");
        
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @notice Set the marketplace contract address
     * @param newMarketplace New marketplace address
     */
    function setMarketplace(address newMarketplace) external onlyOwner {
        require(newMarketplace != address(0), "PaymentEscrow: invalid address");
        
        address oldMarketplace = marketplace;
        marketplace = newMarketplace;
        
        emit MarketplaceUpdated(oldMarketplace, newMarketplace);
    }

    /**
     * @notice Emergency function to recover stuck tokens
     * @param token The token address
     * @param amount The amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(usdc), "PaymentEscrow: cannot recover USDC");
        IERC20(token).safeTransfer(owner(), amount);
    }

    // Internal function to remove a payment from pending list
    function _removePendingPayment(address seller, bytes32 paymentId) internal {
        bytes32[] storage pending = sellerPendingPayments[seller];
        for (uint256 i = 0; i < pending.length; i++) {
            if (pending[i] == paymentId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }
}
