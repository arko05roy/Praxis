// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IReputationManager
 * @notice Interface for the PRAXIS Reputation Manager
 * @dev Manages executor tiers, reputation tracking, and stake requirements
 */
interface IReputationManager {
    /**
     * @notice Get an executor's reputation
     * @param executor The executor address
     * @return reputation The executor reputation struct
     */
    function getReputation(address executor) external view returns (PraxisStructs.ExecutorReputation memory reputation);

    /**
     * @notice Get an executor's tier configuration
     * @param executor The executor address
     * @return config The tier configuration
     */
    function getExecutorTierConfig(address executor) external view returns (PraxisStructs.TierConfig memory config);

    /**
     * @notice Get required stake for an executor at given capital level
     * @param executor The executor address
     * @param capitalUsd The capital amount in USD
     * @return stake The required stake amount
     */
    function getRequiredStake(address executor, uint256 capitalUsd) external view returns (uint256 stake);

    /**
     * @notice Check if an executor is banned
     * @param executor The executor address
     * @return banned Whether the executor is banned
     */
    function isBanned(address executor) external view returns (bool banned);

    /**
     * @notice Check if an executor is whitelisted
     * @param executor The executor address
     * @return whitelisted Whether the executor is whitelisted
     */
    function isWhitelisted(address executor) external view returns (bool whitelisted);

    /**
     * @notice Get max drawdown allowed for executor
     * @param executor The executor address
     * @return maxDrawdown Maximum drawdown in bps
     */
    function getMaxDrawdown(address executor) external view returns (uint16 maxDrawdown);

    /**
     * @notice Record a settlement (called by settlement engine)
     * @param executor The executor address
     * @param volumeUsd Volume in USD
     * @param pnlUsd PnL in USD
     * @param wasProfit Whether it was profitable
     */
    function recordSettlement(address executor, uint256 volumeUsd, int256 pnlUsd, bool wasProfit) external;

    /**
     * @notice Whitelist an executor
     * @param executor The executor address
     */
    function whitelistExecutor(address executor) external;

    /**
     * @notice Ban an executor
     * @param executor The executor address
     * @param reason The reason for banning
     */
    function banExecutor(address executor, string calldata reason) external;

    /**
     * @notice Set the settlement engine address
     * @param engine The settlement engine address
     */
    function setSettlementEngine(address engine) external;
}
