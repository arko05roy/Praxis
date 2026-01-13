// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IKineticComptroller
 * @notice Interface for the Kinetic Comptroller (Compound V2 style)
 * @dev Manages markets, collateral factors, and account liquidity
 *      Address on Flare Mainnet: 0xeC7e541375D70c37262f619162502dB9131d6db5
 */
interface IKineticComptroller {
    // =============================================================
    //                         MARKET ENTRY/EXIT
    // =============================================================

    /**
     * @notice Enter markets to enable them as collateral
     * @param kTokens Array of kToken addresses to enter
     * @return Array of error codes (0 = success)
     */
    function enterMarkets(address[] calldata kTokens) external returns (uint256[] memory);

    /**
     * @notice Exit a market (disable as collateral)
     * @param kToken Address of the kToken to exit
     * @return 0 on success, otherwise an error code
     */
    function exitMarket(address kToken) external returns (uint256);

    // =============================================================
    //                         ACCOUNT LIQUIDITY
    // =============================================================

    /**
     * @notice Get account liquidity in terms of collateral and borrow
     * @param account Address to check
     * @return error 0 on success
     * @return liquidity Excess collateral in USD (if positive)
     * @return shortfall Collateral deficit in USD (if positive)
     */
    function getAccountLiquidity(address account) external view returns (
        uint256 error,
        uint256 liquidity,
        uint256 shortfall
    );

    /**
     * @notice Get hypothetical account liquidity after a transaction
     * @param account Address to check
     * @param kTokenModify kToken being modified
     * @param redeemTokens kTokens to redeem
     * @param borrowAmount Amount to borrow
     * @return error 0 on success
     * @return liquidity Hypothetical excess collateral
     * @return shortfall Hypothetical collateral deficit
     */
    function getHypotheticalAccountLiquidity(
        address account,
        address kTokenModify,
        uint256 redeemTokens,
        uint256 borrowAmount
    ) external view returns (
        uint256 error,
        uint256 liquidity,
        uint256 shortfall
    );

    // =============================================================
    //                         MARKET INFO
    // =============================================================

    /**
     * @notice Get all markets (kTokens)
     * @return Array of all kToken addresses
     */
    function getAllMarkets() external view returns (address[] memory);

    /**
     * @notice Get markets the account has entered
     * @param account Address to check
     * @return Array of kToken addresses the account is in
     */
    function getAssetsIn(address account) external view returns (address[] memory);

    /**
     * @notice Check if account is in a market
     * @param account Address to check
     * @param kToken Market to check
     * @return True if account has entered the market
     */
    function checkMembership(address account, address kToken) external view returns (bool);

    /**
     * @notice Get market data
     * @param kToken Address of the kToken
     * @return isListed Whether the market is listed
     * @return collateralFactorMantissa Collateral factor scaled by 1e18
     * @return isComped Whether COMP rewards are active
     */
    function markets(address kToken) external view returns (
        bool isListed,
        uint256 collateralFactorMantissa,
        bool isComped
    );

    // =============================================================
    //                         POLICY HOOKS
    // =============================================================

    /**
     * @notice Check if mint is allowed
     * @param kToken kToken to mint
     * @param minter Address minting
     * @param mintAmount Amount to mint
     * @return 0 if allowed, otherwise error code
     */
    function mintAllowed(
        address kToken,
        address minter,
        uint256 mintAmount
    ) external returns (uint256);

    /**
     * @notice Check if redeem is allowed
     * @param kToken kToken to redeem
     * @param redeemer Address redeeming
     * @param redeemTokens Amount of kTokens to redeem
     * @return 0 if allowed, otherwise error code
     */
    function redeemAllowed(
        address kToken,
        address redeemer,
        uint256 redeemTokens
    ) external returns (uint256);

    /**
     * @notice Check if borrow is allowed
     * @param kToken kToken to borrow from
     * @param borrower Address borrowing
     * @param borrowAmount Amount to borrow
     * @return 0 if allowed, otherwise error code
     */
    function borrowAllowed(
        address kToken,
        address borrower,
        uint256 borrowAmount
    ) external returns (uint256);

    /**
     * @notice Check if repay is allowed
     * @param kToken kToken to repay
     * @param payer Address paying
     * @param borrower Address whose debt is being repaid
     * @param repayAmount Amount to repay
     * @return 0 if allowed, otherwise error code
     */
    function repayBorrowAllowed(
        address kToken,
        address payer,
        address borrower,
        uint256 repayAmount
    ) external returns (uint256);

    /**
     * @notice Check if liquidation is allowed
     * @param kTokenBorrowed kToken borrowed
     * @param kTokenCollateral kToken used as collateral
     * @param liquidator Address liquidating
     * @param borrower Address being liquidated
     * @param repayAmount Amount being repaid
     * @return 0 if allowed, otherwise error code
     */
    function liquidateBorrowAllowed(
        address kTokenBorrowed,
        address kTokenCollateral,
        address liquidator,
        address borrower,
        uint256 repayAmount
    ) external returns (uint256);

    // =============================================================
    //                         PROTOCOL PARAMETERS
    // =============================================================

    /**
     * @notice Get the price oracle
     * @return Address of the price oracle
     */
    function oracle() external view returns (address);

    /**
     * @notice Get the close factor (max % of borrow that can be repaid in liquidation)
     * @return Close factor scaled by 1e18
     */
    function closeFactorMantissa() external view returns (uint256);

    /**
     * @notice Get the liquidation incentive
     * @return Liquidation incentive scaled by 1e18
     */
    function liquidationIncentiveMantissa() external view returns (uint256);

    /**
     * @notice Check if protocol is paused
     * @return True if mint is paused
     */
    function mintGuardianPaused(address kToken) external view returns (bool);

    /**
     * @notice Check if borrow is paused
     * @return True if borrow is paused
     */
    function borrowGuardianPaused(address kToken) external view returns (bool);
}
