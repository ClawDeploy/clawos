// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPaymentEscrow
 * @notice Interface for the PaymentEscrow contract
 */
interface IPaymentEscrow {
    enum PaymentStatus {
        PENDING,
        COMPLETED,
        REFUNDED,
        DISPUTED
    }

    struct Payment {
        bytes32 paymentId;
        bytes32 skillId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 platformFee;
        PaymentStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    event PaymentCreated(
        bytes32 indexed paymentId,
        bytes32 indexed skillId,
        address indexed buyer,
        address seller,
        uint256 amount,
        uint256 platformFee
    );
    event PaymentCompleted(bytes32 indexed paymentId, uint256 sellerAmount, uint256 platformAmount);
    event PaymentRefunded(bytes32 indexed paymentId, uint256 amount);
    event PaymentDisputed(bytes32 indexed paymentId, string reason);
    event FundsWithdrawn(address indexed seller, uint256 amount);

    function createPayment(
        bytes32 skillId,
        address seller,
        uint256 amount
    ) external returns (bytes32 paymentId);

    function completePayment(bytes32 paymentId) external;

    function refundPayment(bytes32 paymentId) external;

    function disputePayment(bytes32 paymentId, string calldata reason) external;

    function withdrawFunds() external;

    function getPayment(bytes32 paymentId) external view returns (Payment memory);

    function getPendingPayments(address seller) external view returns (bytes32[] memory);

    function getBalance(address seller) external view returns (uint256);
}
