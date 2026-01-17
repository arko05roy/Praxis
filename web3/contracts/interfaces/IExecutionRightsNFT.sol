// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IExecutionRightsNFT
 * @notice Interface for the PRAXIS Execution Rights NFT
 * @dev ERC-721 token that encodes executor permissions and constraints
 */
interface IExecutionRightsNFT is IERC721 {
    /**
     * @notice Mint a new Execution Rights Token
     * @param executor The executor address
     * @param capitalLimit Maximum capital the executor can use
     * @param duration Duration in seconds
     * @param constraints Risk constraints
     * @param fees Fee structure
     * @return tokenId The minted token ID
     */
    function mint(
        address executor,
        uint256 capitalLimit,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        PraxisStructs.FeeStructure calldata fees
    ) external payable returns (uint256 tokenId);

    /**
     * @notice Get the execution rights for a token
     * @param tokenId The token ID
     * @return rights The execution rights struct
     */
    function getRights(uint256 tokenId) external view returns (PraxisStructs.ExecutionRights memory rights);

    /**
     * @notice Check if a token is valid (active)
     * @param tokenId The token ID
     * @return isValid Whether the token is valid
     */
    function isValid(uint256 tokenId) external view returns (bool isValid);

    /**
     * @notice Check if a token has expired
     * @param tokenId The token ID
     * @return isExpired Whether the token is expired
     */
    function isExpired(uint256 tokenId) external view returns (bool isExpired);

    /**
     * @notice Settle an ERT (called by settlement engine)
     * @param tokenId The token ID
     */
    function settle(uint256 tokenId) external;

    /**
     * @notice Return stake to executor (called by settlement engine)
     * @param tokenId The token ID
     * @param amount Amount to return
     */
    function returnStake(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Slash stake from ERT (called by settlement engine)
     * @param tokenId The token ID
     * @param amount Amount to slash
     */
    function slashStake(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Set the settlement engine address
     * @param engine The settlement engine address
     */
    function setSettlementEngine(address engine) external;
}
