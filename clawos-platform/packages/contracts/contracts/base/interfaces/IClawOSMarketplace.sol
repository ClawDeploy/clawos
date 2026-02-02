// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ISkillRegistry.sol";
import "./IPaymentEscrow.sol";

/**
 * @title IClawOSMarketplace
 * @notice Interface for the main ClawOS Marketplace contract
 */
interface IClawOSMarketplace {
    struct Purchase {
        bytes32 purchaseId;
        bytes32 skillId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
    }

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

    function purchaseSkill(bytes32 skillId) external returns (bytes32 purchaseId);

    function completePurchase(bytes32 purchaseId) external;

    function getPurchase(bytes32 purchaseId) external view returns (Purchase memory);

    function getPurchasesByBuyer(address buyer) external view returns (bytes32[] memory);

    function getPurchasesBySeller(address seller) external view returns (bytes32[] memory);

    function calculatePlatformFee(uint256 amount) external view returns (uint256);

    function setPlatformFee(uint256 newFeeBps) external;

    function setFeeRecipient(address newRecipient) external;

    function setSkillRegistry(address newRegistry) external;

    function setPaymentEscrow(address newEscrow) external;

    function emergencyWithdraw() external;
}
