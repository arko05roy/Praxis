// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/**
 * @title IExecutionVault
 * @notice Interface for the PRAXIS Execution Vault
 * @dev Extends ERC-4626 with PRAXIS-specific functions
 */
interface IExecutionVault is IERC4626 {
    /**
     * @notice Get total capital currently allocated to ERTs
     * @return The total allocated capital
     */
    function totalAllocated() external view returns (uint256);

    /**
     * @notice Get available capital for new ERT allocations
     * @return The available capital
     */
    function availableCapital() external view returns (uint256);

    /**
     * @notice Get capital allocated to a specific ERT
     * @param ertId The ERT ID
     * @return The allocated capital
     */
    function ertCapitalAllocated(uint256 ertId) external view returns (uint256);

    /**
     * @notice Allocate capital to an ERT
     * @param ertId The ERT ID
     * @param amount The amount to allocate
     */
    function allocateCapital(uint256 ertId, uint256 amount) external;

    /**
     * @notice Return capital from an ERT to the vault
     * @param ertId The ERT ID
     * @param amount The amount to return
     */
    function returnCapital(uint256 ertId, uint256 amount) external;

    /**
     * @notice Return capital with PnL from an ERT
     * @param ertId The ERT ID
     * @param baseAmount Original capital amount
     * @param pnl Profit or loss (negative for loss)
     */
    function returnCapitalWithPnl(uint256 ertId, uint256 baseAmount, int256 pnl) external;
}
