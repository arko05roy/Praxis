// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IYieldAdapter} from "./IYieldAdapter.sol";

/**
 * @title ILendingAdapter
 * @notice Interface for lending protocol adapters in the PRAXIS protocol
 * @dev Extends IYieldAdapter with lending-specific functionality
 */
interface ILendingAdapter is IYieldAdapter {
    /**
     * @notice Supply assets to the lending pool
     * @param asset Address of the asset to supply
     * @param amount Amount of assets to supply
     * @param recipient Address to receive the receipt tokens
     * @return shares Amount of receipt tokens (e.g., kTokens) received
     */
    function supply(
        address asset,
        uint256 amount,
        address recipient
    ) external returns (uint256 shares);

    /**
     * @notice Withdraw supplied assets from the lending pool
     * @param asset Address of the asset to withdraw
     * @param shares Amount of receipt tokens to redeem
     * @param recipient Address to receive the underlying assets
     * @return amount Amount of underlying assets received
     */
    function withdrawSupply(
        address asset,
        uint256 shares,
        address recipient
    ) external returns (uint256 amount);

    /**
     * @notice Borrow assets from the lending pool
     * @param asset Address of the asset to borrow
     * @param amount Amount of assets to borrow
     * @param recipient Address to receive the borrowed assets
     * @return debtShares Amount of debt shares created
     */
    function borrow(
        address asset,
        uint256 amount,
        address recipient
    ) external returns (uint256 debtShares);

    /**
     * @notice Repay borrowed assets
     * @param asset Address of the asset to repay
     * @param amount Amount of assets to repay (use type(uint256).max for full repayment)
     * @param borrower Address of the borrower
     * @return repaidAmount Actual amount repaid
     */
    function repay(
        address asset,
        uint256 amount,
        address borrower
    ) external returns (uint256 repaidAmount);

    /**
     * @notice Enable an asset as collateral
     * @param asset Address of the asset to enable
     */
    function enableCollateral(address asset) external;

    /**
     * @notice Disable an asset as collateral
     * @param asset Address of the asset to disable
     */
    function disableCollateral(address asset) external;

    /**
     * @notice Get the supply APY for an asset
     * @param asset Address of the asset
     * @return Supply APY in basis points (100 = 1%)
     */
    function getSupplyAPY(address asset) external view returns (uint256);

    /**
     * @notice Get the borrow APY for an asset
     * @param asset Address of the asset
     * @return Borrow APY in basis points (100 = 1%)
     */
    function getBorrowAPY(address asset) external view returns (uint256);

    /**
     * @notice Get account liquidity information
     * @param account Address of the account
     * @return collateralValue Total collateral value in USD (scaled by 1e18)
     * @return borrowValue Total borrow value in USD (scaled by 1e18)
     * @return availableBorrow Amount available to borrow in USD (scaled by 1e18)
     */
    function getAccountLiquidity(
        address account
    ) external view returns (
        uint256 collateralValue,
        uint256 borrowValue,
        uint256 availableBorrow
    );

    /**
     * @notice Get the health factor for an account
     * @param account Address of the account
     * @return Health factor scaled by 1e18 (1e18 = 100%, liquidation below this)
     */
    function getHealthFactor(address account) external view returns (uint256);

    /**
     * @notice Get the borrow balance for a user and asset
     * @param asset Address of the asset
     * @param user Address of the user
     * @return Current borrow balance including accrued interest
     */
    function getBorrowBalance(
        address asset,
        address user
    ) external view returns (uint256);

    /**
     * @notice Get the receipt token (kToken) for an underlying asset
     * @param asset Address of the underlying asset
     * @return Address of the receipt token
     */
    function getReceiptToken(address asset) external view returns (address);
}
