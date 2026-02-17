// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Minimal interface for ERC-5192 (Soulbound Token)
interface IERC5192 {
    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title WePay Agent Passport
 * @notice A Soulbound Token (SBT) acting as the identity and reputation layer for agents.
 * @dev Implements ERC-721 but disables transfers (Soulbound).
 */
contract AgentPassport is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Mapping from tokenId to Reputation Score (0-100+)
    mapping(uint256 => uint256) public reputationScore;

    // Mapping from Agent Wallet Address to Token ID
    mapping(address => uint256) public agentToTokenId;

    event PassportMinted(address indexed agent, uint256 tokenId);
    event ReputationUpdated(uint256 indexed tokenId, uint256 newScore);

    constructor() ERC721("WePay Agent Passport", "PASS") Ownable(msg.sender) {}

    /**
     * @notice Mints a new Passport for an agent. Only owner (WePay Oracle) can mint.
     * @param agent The wallet address of the agent.
     */
    function mint(address agent) external onlyOwner {
        require(agentToTokenId[agent] == 0, "Agent already has a passport");
        
        uint256 tokenId = ++_nextTokenId;
        _safeMint(agent, tokenId);
        
        // Initialize reputation
        reputationScore[tokenId] = 10; // Start with base score
        agentToTokenId[agent] = tokenId;

        emit PassportMinted(agent, tokenId);
    }

    /**
     * @notice Updates the reputation score of an agent.
     * @param agent The wallet address of the agent.
     * @param score The new reputation score.
     */
    function updateReputation(address agent, uint256 score) external onlyOwner {
        uint256 tokenId = agentToTokenId[agent];
        require(tokenId != 0, "Agent has no passport");
        
        reputationScore[tokenId] = score;
        emit ReputationUpdated(tokenId, score);
    }

    /**
     * @notice Soulbound: Transfers are disabled.
     */
    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: Transfer not allowed");
    }

    /**
     * @notice Soulbound: Safe transfers are disabled.
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: Transfer not allowed");
    }
    
    /**
     * @notice ERC-5192 Compliance: Always returns true for locked.
     */
    function locked(uint256) external pure returns (bool) {
        return true;
    }
}
