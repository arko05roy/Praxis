// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IBlazeSwapFactory
 * @notice Interface for BlazeSwap Factory (Uniswap V2 style)
 */
interface IBlazeSwapFactory {
    /**
     * @notice Returns the address of the pair for tokenA and tokenB
     * @param tokenA First token of the pair
     * @param tokenB Second token of the pair
     * @return pair Address of the pair contract (zero address if doesn't exist)
     */
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);

    /**
     * @notice Returns all pairs created by the factory
     * @param index Index of the pair
     * @return pair Address of the pair
     */
    function allPairs(uint256 index) external view returns (address pair);

    /**
     * @notice Returns the total number of pairs
     */
    function allPairsLength() external view returns (uint256);

    /**
     * @notice Returns the fee recipient address
     */
    function feeTo() external view returns (address);

    /**
     * @notice Returns the fee setter address
     */
    function feeToSetter() external view returns (address);
}
