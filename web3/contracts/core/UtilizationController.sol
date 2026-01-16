// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";

/**
 * @title UtilizationController
 * @notice Enforces maximum utilization cap on vault capital
 * @dev Ensures 30% of vault capital always remains in reserve (70% max utilization)
 */
contract UtilizationController is Ownable {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Default maximum utilization (70%)
    uint256 public constant DEFAULT_MAX_UTILIZATION_BPS = 7000;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Maximum utilization in basis points
    uint256 public maxUtilizationBps;

    /// @notice Reference to the execution vault
    address public vault;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event MaxUtilizationUpdated(uint256 oldMax, uint256 newMax);
    event VaultSet(address indexed vault);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the UtilizationController
     * @param _vault Address of the execution vault
     */
    constructor(address _vault) Ownable(msg.sender) {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
        maxUtilizationBps = DEFAULT_MAX_UTILIZATION_BPS;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Check if a new allocation can be made
     * @param totalAssets Total assets in the vault
     * @param currentAllocated Currently allocated capital
     * @param newAllocation Amount to allocate
     * @return Whether the allocation is allowed
     */
    function canAllocate(
        uint256 totalAssets,
        uint256 currentAllocated,
        uint256 newAllocation
    ) external view returns (bool) {
        if (totalAssets == 0) return false;

        uint256 newUtilization = ((currentAllocated + newAllocation) * BPS) / totalAssets;
        return newUtilization <= maxUtilizationBps;
    }

    /**
     * @notice Get the available capital for new allocations
     * @param totalAssets Total assets in the vault
     * @param currentAllocated Currently allocated capital
     * @return The amount available for allocation
     */
    function availableForAllocation(
        uint256 totalAssets,
        uint256 currentAllocated
    ) external view returns (uint256) {
        uint256 maxAllocatable = (totalAssets * maxUtilizationBps) / BPS;

        if (currentAllocated >= maxAllocatable) return 0;
        return maxAllocatable - currentAllocated;
    }

    /**
     * @notice Get current utilization rate
     * @param totalAssets Total assets in the vault
     * @param currentAllocated Currently allocated capital
     * @return utilizationBps Current utilization in basis points
     */
    function getCurrentUtilization(
        uint256 totalAssets,
        uint256 currentAllocated
    ) external pure returns (uint256 utilizationBps) {
        if (totalAssets == 0) return 0;
        return (currentAllocated * BPS) / totalAssets;
    }

    /**
     * @notice Get the reserve amount (capital that must stay liquid)
     * @param totalAssets Total assets in the vault
     * @return The minimum reserve amount
     */
    function getReserveAmount(uint256 totalAssets) external view returns (uint256) {
        return (totalAssets * (BPS - maxUtilizationBps)) / BPS;
    }

    /**
     * @notice Check if a withdrawal would violate reserve requirements
     * @param totalAssets Total assets in the vault
     * @param currentAllocated Currently allocated capital
     * @param withdrawAmount Amount to withdraw
     * @return Whether the withdrawal is allowed
     */
    function canWithdraw(
        uint256 totalAssets,
        uint256 currentAllocated,
        uint256 withdrawAmount
    ) external view returns (bool) {
        if (withdrawAmount > totalAssets) return false;

        uint256 assetsAfterWithdraw = totalAssets - withdrawAmount;
        if (assetsAfterWithdraw == 0) return currentAllocated == 0;

        uint256 utilizationAfter = (currentAllocated * BPS) / assetsAfterWithdraw;
        return utilizationAfter <= maxUtilizationBps;
    }

    /**
     * @notice Get maximum withdrawable amount
     * @param totalAssets Total assets in the vault
     * @param currentAllocated Currently allocated capital
     * @return The maximum amount that can be withdrawn
     */
    function maxWithdrawable(
        uint256 totalAssets,
        uint256 currentAllocated
    ) external view returns (uint256) {
        if (currentAllocated == 0) return totalAssets;

        // After withdrawal: currentAllocated / (totalAssets - withdraw) <= maxUtilizationBps / BPS
        // Solving: withdraw <= totalAssets - (currentAllocated * BPS / maxUtilizationBps)
        uint256 minRequiredAssets = (currentAllocated * BPS) / maxUtilizationBps;

        if (minRequiredAssets >= totalAssets) return 0;
        return totalAssets - minRequiredAssets;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Update the maximum utilization (emergency use)
     * @param _maxUtilizationBps New maximum utilization in bps
     */
    function setMaxUtilization(uint256 _maxUtilizationBps) external onlyOwner {
        if (_maxUtilizationBps > BPS) {
            revert PraxisErrors.ArrayLengthMismatch(BPS, _maxUtilizationBps);
        }

        uint256 oldMax = maxUtilizationBps;
        maxUtilizationBps = _maxUtilizationBps;

        emit MaxUtilizationUpdated(oldMax, _maxUtilizationBps);
    }

    /**
     * @notice Update the vault address
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
        emit VaultSet(_vault);
    }
}
