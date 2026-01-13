// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IKToken
 * @notice Interface for Kinetic kTokens (Compound V2 style cTokens)
 * @dev kTokens are the receipt tokens for supplied assets in Kinetic
 *      Similar to Compound's cTokens, they represent a share of the underlying pool
 */
interface IKToken {
    // =============================================================
    //                         SUPPLY FUNCTIONS
    // =============================================================

    /**
     * @notice Supply underlying tokens and mint kTokens
     * @param mintAmount Amount of underlying tokens to supply
     * @return 0 on success, otherwise an error code
     */
    function mint(uint256 mintAmount) external returns (uint256);

    /**
     * @notice Redeem kTokens for underlying tokens
     * @param redeemTokens Amount of kTokens to redeem
     * @return 0 on success, otherwise an error code
     */
    function redeem(uint256 redeemTokens) external returns (uint256);

    /**
     * @notice Redeem kTokens for a specific amount of underlying
     * @param redeemAmount Amount of underlying tokens to receive
     * @return 0 on success, otherwise an error code
     */
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    // =============================================================
    //                         BORROW FUNCTIONS
    // =============================================================

    /**
     * @notice Borrow underlying tokens
     * @param borrowAmount Amount of underlying tokens to borrow
     * @return 0 on success, otherwise an error code
     */
    function borrow(uint256 borrowAmount) external returns (uint256);

    /**
     * @notice Repay borrowed tokens
     * @param repayAmount Amount to repay (use type(uint256).max for full repayment)
     * @return 0 on success, otherwise an error code
     */
    function repayBorrow(uint256 repayAmount) external returns (uint256);

    /**
     * @notice Repay borrowed tokens on behalf of another user
     * @param borrower Address of the borrower
     * @param repayAmount Amount to repay
     * @return 0 on success, otherwise an error code
     */
    function repayBorrowBehalf(address borrower, uint256 repayAmount) external returns (uint256);

    // =============================================================
    //                       EXCHANGE RATE FUNCTIONS
    // =============================================================

    /**
     * @notice Get the current exchange rate (accrues interest first)
     * @return Exchange rate scaled by 1e18
     */
    function exchangeRateCurrent() external returns (uint256);

    /**
     * @notice Get the stored exchange rate (does not accrue)
     * @return Stored exchange rate scaled by 1e18
     */
    function exchangeRateStored() external view returns (uint256);

    /**
     * @notice Accrue interest and update the exchange rate
     * @return 0 on success
     */
    function accrueInterest() external returns (uint256);

    // =============================================================
    //                         BALANCE FUNCTIONS
    // =============================================================

    /**
     * @notice Get kToken balance
     * @param account Address to check
     * @return kToken balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Get underlying token balance (accrues interest first)
     * @param account Address to check
     * @return Underlying token balance
     */
    function balanceOfUnderlying(address account) external returns (uint256);

    /**
     * @notice Get current borrow balance (accrues interest first)
     * @param account Address to check
     * @return Current borrow balance including interest
     */
    function borrowBalanceCurrent(address account) external returns (uint256);

    /**
     * @notice Get stored borrow balance (does not accrue)
     * @param account Address to check
     * @return Stored borrow balance
     */
    function borrowBalanceStored(address account) external view returns (uint256);

    /**
     * @notice Get account snapshot without modifying state
     * @param account Address to check
     * @return error 0 on success
     * @return kTokenBalance kToken balance
     * @return borrowBalance Current borrow balance
     * @return exchangeRateMantissa Current exchange rate
     */
    function getAccountSnapshot(address account) external view returns (
        uint256 error,
        uint256 kTokenBalance,
        uint256 borrowBalance,
        uint256 exchangeRateMantissa
    );

    // =============================================================
    //                         INTEREST RATES
    // =============================================================

    /**
     * @notice Get current supply interest rate per block
     * @return Supply rate per block scaled by 1e18
     */
    function supplyRatePerBlock() external view returns (uint256);

    /**
     * @notice Get current borrow interest rate per block
     * @return Borrow rate per block scaled by 1e18
     */
    function borrowRatePerBlock() external view returns (uint256);

    // =============================================================
    //                         MARKET DATA
    // =============================================================

    /**
     * @notice Get the underlying asset address
     * @return Address of the underlying token
     */
    function underlying() external view returns (address);

    /**
     * @notice Get total amount of underlying tokens in the market
     * @return Total cash
     */
    function getCash() external view returns (uint256);

    /**
     * @notice Get total amount borrowed
     * @return Total borrows
     */
    function totalBorrows() external view returns (uint256);

    /**
     * @notice Get total reserves
     * @return Total reserves
     */
    function totalReserves() external view returns (uint256);

    /**
     * @notice Get reserve factor
     * @return Reserve factor scaled by 1e18
     */
    function reserveFactorMantissa() external view returns (uint256);

    /**
     * @notice Get the comptroller address
     * @return Address of the comptroller
     */
    function comptroller() external view returns (address);

    // =============================================================
    //                         ERC20 FUNCTIONS
    // =============================================================

    /**
     * @notice Get total supply of kTokens
     * @return Total kToken supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Transfer kTokens
     * @param to Recipient
     * @param amount Amount
     * @return True if successful
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Transfer kTokens from another address
     * @param from Sender
     * @param to Recipient
     * @param amount Amount
     * @return True if successful
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Approve spender
     * @param spender Address to approve
     * @param amount Amount to approve
     * @return True if successful
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Get allowance
     * @param owner Token owner
     * @param spender Approved spender
     * @return Remaining allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @notice Get token decimals
     * @return Number of decimals (usually 8)
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Get token symbol
     * @return Token symbol (e.g., kUSDC)
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Get token name
     * @return Token name
     */
    function name() external view returns (string memory);
}
