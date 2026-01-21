// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAdapter} from "../adapters/IAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockSimpleDEX
 * @notice Simple mock DEX for Coston2 testnet demo
 * @dev Uses admin-seeded liquidity pools with constant product formula (x*y=k)
 *      Implements IAdapter interface for SwapRouter compatibility
 */
contract MockSimpleDEX is IAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Pool liquidity for token pairs
    /// @dev poolLiquidity[tokenA][tokenB] = liquidity amount of tokenA
    mapping(address => mapping(address => uint256)) public poolLiquidity;

    /// @notice Fee in basis points (default 30 = 0.3%)
    uint256 public feeBps = 30;

    /// @notice Gas estimate for swaps
    uint256 public constant GAS_ESTIMATE = 150000;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address to);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor() Ownable(msg.sender) {}

    // =============================================================
    //                    IAdapter IMPLEMENTATION
    // =============================================================

    function name() external pure override returns (string memory) {
        return "MockSimpleDEX";
    }

    function router() external view override returns (address) {
        return address(this);
    }

    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view override returns (uint256 amountOut, uint256 gasEstimate) {
        amountOut = _getAmountOut(tokenIn, tokenOut, amountIn);
        gasEstimate = GAS_ESTIMATE;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata /* extraData */
    ) external override nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "MockSimpleDEX: ZERO_AMOUNT");
        require(to != address(0), "MockSimpleDEX: ZERO_ADDRESS");

        amountOut = _getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "MockSimpleDEX: INSUFFICIENT_OUTPUT");

        // Pull input tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Update pool state
        poolLiquidity[tokenIn][tokenOut] += amountIn;
        poolLiquidity[tokenOut][tokenIn] -= amountOut;

        // Transfer output tokens to recipient
        IERC20(tokenOut).safeTransfer(to, amountOut);

        emit Swap(tokenIn, tokenOut, amountIn, amountOut, to);
    }

    function isPoolAvailable(
        address tokenIn,
        address tokenOut
    ) external view override returns (bool) {
        return poolLiquidity[tokenIn][tokenOut] > 0 && poolLiquidity[tokenOut][tokenIn] > 0;
    }

    // =============================================================
    //                    INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Calculate output amount using constant product formula
     * @dev Applies fee before calculation: amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
     */
    function _getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 amountOut) {
        uint256 reserveIn = poolLiquidity[tokenIn][tokenOut];
        uint256 reserveOut = poolLiquidity[tokenOut][tokenIn];

        require(reserveIn > 0 && reserveOut > 0, "MockSimpleDEX: NO_LIQUIDITY");

        // Apply fee (e.g., 0.3% = 30 bps)
        uint256 amountInWithFee = amountIn * (10000 - feeBps);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    // =============================================================
    //                    ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Add liquidity to a pool (admin only)
     * @param tokenA First token
     * @param tokenB Second token
     * @param amountA Amount of tokenA to add
     * @param amountB Amount of tokenB to add
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner {
        require(tokenA != address(0) && tokenB != address(0), "MockSimpleDEX: ZERO_ADDRESS");
        require(amountA > 0 && amountB > 0, "MockSimpleDEX: ZERO_AMOUNT");

        // Transfer tokens from admin
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        // Update pool liquidity (bidirectional)
        poolLiquidity[tokenA][tokenB] += amountA;
        poolLiquidity[tokenB][tokenA] += amountB;

        emit LiquidityAdded(tokenA, tokenB, amountA, amountB);
    }

    /**
     * @notice Add liquidity without transferring tokens (for seeding with pre-minted tokens)
     * @param tokenA First token
     * @param tokenB Second token
     * @param amountA Amount of tokenA in pool
     * @param amountB Amount of tokenB in pool
     */
    function seedLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner {
        require(tokenA != address(0) && tokenB != address(0), "MockSimpleDEX: ZERO_ADDRESS");
        require(amountA > 0 && amountB > 0, "MockSimpleDEX: ZERO_AMOUNT");

        // Update pool liquidity (bidirectional) - assumes tokens are already in contract
        poolLiquidity[tokenA][tokenB] = amountA;
        poolLiquidity[tokenB][tokenA] = amountB;

        emit LiquidityAdded(tokenA, tokenB, amountA, amountB);
    }

    /**
     * @notice Remove liquidity from a pool (admin only)
     * @param tokenA First token
     * @param tokenB Second token
     * @param amountA Amount of tokenA to remove
     * @param amountB Amount of tokenB to remove
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner {
        require(poolLiquidity[tokenA][tokenB] >= amountA, "MockSimpleDEX: INSUFFICIENT_A");
        require(poolLiquidity[tokenB][tokenA] >= amountB, "MockSimpleDEX: INSUFFICIENT_B");

        poolLiquidity[tokenA][tokenB] -= amountA;
        poolLiquidity[tokenB][tokenA] -= amountB;

        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB);
    }

    /**
     * @notice Update the swap fee
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function setFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "MockSimpleDEX: FEE_TOO_HIGH");

        uint256 oldFee = feeBps;
        feeBps = newFeeBps;

        emit FeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Rescue tokens accidentally sent to the contract
     * @param token Token to rescue
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get pool reserves for a token pair
     * @param tokenA First token
     * @param tokenB Second token
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(
        address tokenA,
        address tokenB
    ) external view returns (uint256 reserveA, uint256 reserveB) {
        reserveA = poolLiquidity[tokenA][tokenB];
        reserveB = poolLiquidity[tokenB][tokenA];
    }

    /**
     * @notice Get expected output for a swap
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Input amount
     * @return amountOut Expected output amount
     */
    function getExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        return _getAmountOut(tokenIn, tokenOut, amountIn);
    }
}
