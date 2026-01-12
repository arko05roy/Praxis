// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IUniswapV3Factory
 * @notice Interface for Uniswap V3 style factory (used by SparkDEX V3 and Enosys)
 */
interface IUniswapV3Factory {
    /**
     * @notice Returns the pool address for a given pair of tokens and a fee
     * @param tokenA First token of the pair
     * @param tokenB Second token of the pair
     * @param fee The fee amount of the pool in hundredths of a bip (100 = 0.01%)
     * @return pool The pool address (zero address if doesn't exist)
     */
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);

    /**
     * @notice Returns the current owner of the factory
     */
    function owner() external view returns (address);

    /**
     * @notice Returns the tick spacing for a given fee amount
     * @param fee The fee amount
     * @return tickSpacing The tick spacing
     */
    function feeAmountTickSpacing(uint24 fee) external view returns (int24);
}
