// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ISkillRegistry
 * @notice Interface for the SkillRegistry contract
 */
interface ISkillRegistry {
    struct Skill {
        bytes32 id;
        address owner;
        string name;
        string description;
        string metadataURI;
        uint256 price;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    event SkillRegistered(bytes32 indexed skillId, address indexed owner, string name, uint256 price);
    event SkillUpdated(bytes32 indexed skillId, uint256 price, bool isActive);
    event SkillTransferred(bytes32 indexed skillId, address indexed from, address indexed to);

    function registerSkill(
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external returns (bytes32 skillId);

    function updateSkill(bytes32 skillId, uint256 price, bool isActive) external;

    function transferSkill(bytes32 skillId, address newOwner) external;

    function getSkill(bytes32 skillId) external view returns (Skill memory);

    function getSkillsByOwner(address owner) external view returns (bytes32[] memory);

    function isSkillOwner(bytes32 skillId, address account) external view returns (bool);
}
