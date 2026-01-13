// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IYieldAdapter
 * @notice Base interface for all yield adapters in the PRAXIS protocol
 * @dev All yield adapters (lending, staking) must implement this interface
 */
interface IYieldAdapter {
    /**
     * @notice Returns the name of the protocol this adapter connects to
     * @return Human-readable name (e.g., "Sceptre", "Kinetic")
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the address of the underlying protocol contract
     * @return Address of the main protocol contract
     */
    function protocol() external view returns (address);

    /**
     * @notice Deposit assets into the yield protocol
     * @param asset Address of the asset to deposit
     * @param amount Amount of assets to deposit
     * @param recipient Address to receive the yield-bearing tokens
     * @return shares Amount of yield-bearing tokens received
     */
    function deposit(
        address asset,
        uint256 amount,
        address recipient
    ) external payable returns (uint256 shares);

    /**
     * @notice Withdraw assets from the yield protocol
     * @param asset Address of the asset to withdraw
     * @param shares Amount of yield-bearing tokens to redeem
     * @param recipient Address to receive the underlying assets
     * @return amount Amount of underlying assets received
     */
    function withdraw(
        address asset,
        uint256 shares,
        address recipient
    ) external returns (uint256 amount);

    /**
     * @notice Get the current APY for an asset
     * @param asset Address of the asset
     * @return apyBps Annual percentage yield in basis points (100 = 1%)
     */
    function getAPY(address asset) external view returns (uint256 apyBps);

    /**
     * @notice Check if an asset is supported by this adapter
     * @param asset Address of the asset to check
     * @return True if the asset is supported
     */
    function isAssetSupported(address asset) external view returns (bool);

    /**
     * @notice Get user's balance in underlying asset terms
     * @param asset Address of the asset
     * @param user Address of the user
     * @return Underlying asset balance
     */
    function getUnderlyingBalance(
        address asset,
        address user
    ) external view returns (uint256);

    /**
     * @notice Get the current exchange rate between shares and underlying
     * @param asset Address of the asset
     * @return Exchange rate (scaled by 1e18)
     */
    function getExchangeRate(address asset) external view returns (uint256);

    /**
     * @notice Get the total value locked for an asset
     * @param asset Address of the asset
     * @return Total value locked in underlying terms
     */
    function getTVL(address asset) external view returns (uint256);
}
