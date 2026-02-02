// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ISkillRegistry.sol";

/**
 * @title SkillRegistry
 * @notice Manages skill registration and ownership for the ClawOS marketplace
 * @dev Uses bytes32 IDs for skill identification
 */
contract SkillRegistry is ISkillRegistry, Ownable, ReentrancyGuard {
    
    // Mapping from skill ID to Skill struct
    mapping(bytes32 => Skill) private skills;
    
    // Mapping from owner address to array of skill IDs
    mapping(address => bytes32[]) private ownerSkills;
    
    // Mapping to track skill existence
    mapping(bytes32 => bool) private skillExists;
    
    // Counter for generating unique skill IDs
    uint256 private skillCounter;
    
    // Maximum length constraints
    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MAX_SKILLS_PER_OWNER = 1000;

    modifier onlySkillOwner(bytes32 skillId) {
        require(skillExists[skillId], "SkillRegistry: skill does not exist");
        require(skills[skillId].owner == msg.sender, "SkillRegistry: caller is not the owner");
        _;
    }

    modifier validSkillData(
        string calldata name,
        string calldata description,
        uint256 price
    ) {
        require(bytes(name).length > 0 && bytes(name).length <= MAX_NAME_LENGTH, "SkillRegistry: invalid name length");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "SkillRegistry: description too long");
        require(price > 0, "SkillRegistry: price must be greater than 0");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new skill on the marketplace
     * @param name Skill name
     * @param description Skill description
     * @param metadataURI URI pointing to additional metadata (IPFS, etc.)
     * @param price Price in USDC (6 decimals)
     * @return skillId The unique identifier for the registered skill
     */
    function registerSkill(
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external validSkillData(name, description, price) returns (bytes32 skillId) {
        require(ownerSkills[msg.sender].length < MAX_SKILLS_PER_OWNER, "SkillRegistry: max skills reached");

        skillCounter++;
        skillId = keccak256(abi.encodePacked(msg.sender, name, skillCounter, block.timestamp));

        skills[skillId] = Skill({
            id: skillId,
            owner: msg.sender,
            name: name,
            description: description,
            metadataURI: metadataURI,
            price: price,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        skillExists[skillId] = true;
        ownerSkills[msg.sender].push(skillId);

        emit SkillRegistered(skillId, msg.sender, name, price);
        
        return skillId;
    }

    /**
     * @notice Update skill price and active status
     * @param skillId The skill identifier
     * @param price New price in USDC
     * @param isActive Whether the skill is active for purchase
     */
    function updateSkill(
        bytes32 skillId,
        uint256 price,
        bool isActive
    ) external onlySkillOwner(skillId) {
        require(price > 0, "SkillRegistry: price must be greater than 0");

        Skill storage skill = skills[skillId];
        skill.price = price;
        skill.isActive = isActive;
        skill.updatedAt = block.timestamp;

        emit SkillUpdated(skillId, price, isActive);
    }

    /**
     * @notice Transfer skill ownership to a new address
     * @param skillId The skill identifier
     * @param newOwner The new owner address
     */
    function transferSkill(bytes32 skillId, address newOwner) external onlySkillOwner(skillId) {
        require(newOwner != address(0), "SkillRegistry: invalid new owner");
        require(newOwner != msg.sender, "SkillRegistry: cannot transfer to self");

        Skill storage skill = skills[skillId];
        address previousOwner = skill.owner;
        skill.owner = newOwner;
        skill.updatedAt = block.timestamp;

        // Remove skill from previous owner's list
        bytes32[] storage prevOwnerSkills = ownerSkills[previousOwner];
        for (uint256 i = 0; i < prevOwnerSkills.length; i++) {
            if (prevOwnerSkills[i] == skillId) {
                prevOwnerSkills[i] = prevOwnerSkills[prevOwnerSkills.length - 1];
                prevOwnerSkills.pop();
                break;
            }
        }

        // Add to new owner's list
        ownerSkills[newOwner].push(skillId);

        emit SkillTransferred(skillId, previousOwner, newOwner);
    }

    /**
     * @notice Get skill details
     * @param skillId The skill identifier
     * @return Skill struct with all details
     */
    function getSkill(bytes32 skillId) external view returns (Skill memory) {
        require(skillExists[skillId], "SkillRegistry: skill does not exist");
        return skills[skillId];
    }

    /**
     * @notice Get all skill IDs owned by an address
     * @param owner The owner address
     * @return Array of skill IDs
     */
    function getSkillsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerSkills[owner];
    }

    /**
     * @notice Check if an address is the owner of a skill
     * @param skillId The skill identifier
     * @param account The address to check
     * @return True if the account is the owner
     */
    function isSkillOwner(bytes32 skillId, address account) external view returns (bool) {
        return skillExists[skillId] && skills[skillId].owner == account;
    }

    /**
     * @notice Check if a skill exists
     * @param skillId The skill identifier
     * @return True if the skill exists
     */
    function skillExists(bytes32 skillId) external view returns (bool) {
        return skillExists[skillId];
    }

    /**
     * @notice Get the total number of registered skills
     * @return Total skill count
     */
    function getTotalSkills() external view returns (uint256) {
        return skillCounter;
    }
}
