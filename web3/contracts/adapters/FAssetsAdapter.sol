// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IFAssetAdapter} from "../interfaces/IFAssetAdapter.sol";
import {IFAsset} from "../interfaces/external/IFAsset.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

// Import for price feeds
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {FtsoV2Interface} from "@flarenetwork/flare-periphery-contracts/coston2/FtsoV2Interface.sol";

/**
 * @title FAssetsAdapter
 * @notice Adapter for FAsset tokens (FXRP, FBTC, FDOGE) in the PRAXIS protocol
 * @dev Handles detection, info queries, pricing, and DEX integration for FAssets
 *
 * FAssets are Flare's trustless, over-collateralized bridge tokens that enable
 * non-smart contract assets (XRP, BTC, DOGE) to participate in Flare DeFi.
 *
 * This adapter:
 * - Detects if a token is a registered FAsset
 * - Provides FAsset information and balance queries
 * - Gets USD prices from FTSO for underlying assets
 * - Delegates swaps to a SwapRouter for DEX execution
 */
contract FAssetsAdapter is IFAssetAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Maximum number of FAssets that can be registered
    uint256 public constant MAX_FASSETS = 10;

    /// @notice Precision for normalized prices (18 decimals)
    uint256 public constant PRICE_PRECISION = 1e18;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Array of registered FAsset addresses
    address[] private _fAssets;

    /// @notice Mapping from FAsset address to registration status
    mapping(address => bool) public isFAssetRegistered;

    /// @notice Mapping from FAsset address to underlying asset symbol
    mapping(address => string) public fAssetToUnderlying;

    /// @notice Mapping from FAsset address to FTSO feed ID for price
    mapping(address => bytes21) public fAssetToFeedId;

    /// @notice SwapRouter address for DEX integration
    address public swapRouter;

    /// @notice Mapping of known liquidity pools for each FAsset
    mapping(address => address[]) private _fAssetPools;

    // =============================================================
    //                          CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the FAssetsAdapter
     * @param _swapRouter Address of the SwapRouter for DEX integration
     */
    constructor(address _swapRouter) Ownable(msg.sender) {
        if (_swapRouter == address(0)) revert PraxisErrors.ZeroAddress();
        swapRouter = _swapRouter;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Register an FAsset token
     * @param fAsset Address of the FAsset token
     * @param underlying Underlying asset symbol (e.g., "XRP")
     * @param feedId FTSO feed ID for price queries
     */
    function registerFAsset(
        address fAsset,
        string calldata underlying,
        bytes21 feedId
    ) external onlyOwner {
        if (fAsset == address(0)) revert PraxisErrors.ZeroAddress();
        if (isFAssetRegistered[fAsset]) revert PraxisErrors.FAssetAlreadyRegistered(fAsset);
        if (_fAssets.length >= MAX_FASSETS) {
            revert PraxisErrors.ArrayLengthMismatch(MAX_FASSETS, _fAssets.length + 1);
        }

        _fAssets.push(fAsset);
        isFAssetRegistered[fAsset] = true;
        fAssetToUnderlying[fAsset] = underlying;
        fAssetToFeedId[fAsset] = feedId;

        string memory symbol = IERC20Metadata(fAsset).symbol();
        emit FAssetRegistered(fAsset, symbol, underlying);
        emit PraxisEvents.FAssetAdded(fAsset, symbol);
    }

    /**
     * @notice Remove an FAsset from the registry
     * @param fAsset Address of the FAsset to remove
     */
    function removeFAsset(address fAsset) external onlyOwner {
        if (!isFAssetRegistered[fAsset]) revert PraxisErrors.NotFAsset(fAsset);

        // Remove from array
        for (uint256 i = 0; i < _fAssets.length; i++) {
            if (_fAssets[i] == fAsset) {
                _fAssets[i] = _fAssets[_fAssets.length - 1];
                _fAssets.pop();
                break;
            }
        }

        // Clear mappings
        isFAssetRegistered[fAsset] = false;
        delete fAssetToUnderlying[fAsset];
        delete fAssetToFeedId[fAsset];
        delete _fAssetPools[fAsset];

        emit PraxisEvents.FAssetRemoved(fAsset);
    }

    /**
     * @notice Add a liquidity pool for an FAsset
     * @param fAsset FAsset address
     * @param pool Pool address
     */
    function addPool(address fAsset, address pool) external onlyOwner {
        if (!isFAssetRegistered[fAsset]) revert PraxisErrors.NotFAsset(fAsset);
        if (pool == address(0)) revert PraxisErrors.ZeroAddress();
        _fAssetPools[fAsset].push(pool);
    }

    /**
     * @notice Update the SwapRouter address
     * @param _swapRouter New SwapRouter address
     */
    function setSwapRouter(address _swapRouter) external onlyOwner {
        if (_swapRouter == address(0)) revert PraxisErrors.ZeroAddress();
        swapRouter = _swapRouter;
    }

    /**
     * @notice Update the FTSO feed ID for an FAsset
     * @param fAsset FAsset address
     * @param feedId New feed ID
     */
    function setFeedId(address fAsset, bytes21 feedId) external onlyOwner {
        if (!isFAssetRegistered[fAsset]) revert PraxisErrors.NotFAsset(fAsset);
        fAssetToFeedId[fAsset] = feedId;
    }

    // =============================================================
    //                      DETECTION FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IFAssetAdapter
     */
    function isFAsset(address token) external view override returns (bool) {
        return isFAssetRegistered[token];
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getAllFAssets() external view override returns (address[] memory) {
        return _fAssets;
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetCount() external view override returns (uint256) {
        return _fAssets.length;
    }

    // =============================================================
    //                      INFO FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetInfo(
        address token
    ) external view override returns (PraxisStructs.FAssetInfo memory info) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);

        info.fAssetAddress = token;
        info.symbol = IERC20Metadata(token).symbol();
        info.underlying = fAssetToUnderlying[token];
        info.totalMinted = IERC20(token).totalSupply();
        info.collateralRatio = 130; // FAssets require 1.3x collateralization
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getUnderlyingAsset(
        address token
    ) external view override returns (string memory) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        return fAssetToUnderlying[token];
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetSymbol(
        address token
    ) external view override returns (string memory) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        return IERC20Metadata(token).symbol();
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetDecimals(
        address token
    ) external view override returns (uint8) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        return IERC20Metadata(token).decimals();
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetTotalSupply(
        address token
    ) external view override returns (uint256) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        return IERC20(token).totalSupply();
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetBalance(
        address token,
        address account
    ) external view override returns (uint256) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        return IERC20(token).balanceOf(account);
    }

    // =============================================================
    //                      PRICE FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetPriceUSD(
        address token
    ) external payable override returns (uint256 price, uint256 timestamp) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);

        bytes21 feedId = fAssetToFeedId[token];
        if (feedId == bytes21(0)) {
            revert PraxisErrors.FeedNotConfigured(token);
        }

        FtsoV2Interface ftso = ContractRegistry.getFtsoV2();

        // Calculate fee for this feed
        uint256 fee = ftso.calculateFeeById(feedId);

        // Get price in wei (18 decimals)
        uint64 ts;
        (price, ts) = ftso.getFeedByIdInWei{value: fee}(feedId);
        timestamp = uint256(ts);

        if (price == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getFAssetValueUSD(
        address token,
        uint256 amount
    ) external payable override returns (uint256 valueUSD) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);
        if (amount == 0) return 0;

        bytes21 feedId = fAssetToFeedId[token];
        if (feedId == bytes21(0)) {
            revert PraxisErrors.FeedNotConfigured(token);
        }

        FtsoV2Interface ftso = ContractRegistry.getFtsoV2();
        uint256 fee = ftso.calculateFeeById(feedId);

        (uint256 priceInWei, ) = ftso.getFeedByIdInWei{value: fee}(feedId);

        if (priceInWei == 0) {
            revert PraxisErrors.InvalidPrice(feedId);
        }

        // Calculate value: amount * price, adjusting for decimals
        uint8 tokenDecimals = IERC20Metadata(token).decimals();
        valueUSD = (amount * priceInWei) / (10 ** tokenDecimals);
    }

    /**
     * @notice Calculate the fee required to get price for an FAsset
     * @param token FAsset address
     * @return fee Required fee in native token
     */
    function calculatePriceFee(address token) external view returns (uint256 fee) {
        if (!isFAssetRegistered[token]) revert PraxisErrors.NotFAsset(token);

        bytes21 feedId = fAssetToFeedId[token];
        if (feedId == bytes21(0)) {
            revert PraxisErrors.FeedNotConfigured(token);
        }

        return ContractRegistry.getFtsoV2().calculateFeeById(feedId);
    }

    // =============================================================
    //                      DEX INTEGRATION
    // =============================================================

    /**
     * @inheritdoc IFAssetAdapter
     */
    function isSwapSupported(
        address tokenIn,
        address tokenOut
    ) external view override returns (bool) {
        // At least one must be an FAsset
        if (!isFAssetRegistered[tokenIn] && !isFAssetRegistered[tokenOut]) {
            return false;
        }

        // Check if SwapRouter supports the pair
        if (swapRouter == address(0)) return false;

        // Call SwapRouter to check if pair is supported
        try ISwapRouter(swapRouter).isPairSupported(tokenIn, tokenOut) returns (
            bool supported
        ) {
            return supported;
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view override returns (uint256 amountOut, string memory route) {
        if (swapRouter == address(0)) {
            revert SwapNotSupported(tokenIn, tokenOut);
        }

        // Get best route from SwapRouter
        try ISwapRouter(swapRouter).findBestRoute(tokenIn, tokenOut, amountIn) returns (
            address bestAdapter,
            uint256 bestAmountOut
        ) {
            if (bestAdapter == address(0)) {
                revert SwapNotSupported(tokenIn, tokenOut);
            }
            amountOut = bestAmountOut;

            // Get adapter name for route description
            try IAdapter(bestAdapter).name() returns (string memory adapterName) {
                route = adapterName;
            } catch {
                route = "Unknown";
            }
        } catch {
            revert SwapNotSupported(tokenIn, tokenOut);
        }
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external override nonReentrant returns (uint256 amountOut) {
        if (swapRouter == address(0)) {
            revert SwapNotSupported(tokenIn, tokenOut);
        }
        if (amountIn == 0) revert PraxisErrors.ZeroAmount();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        // At least one must be an FAsset
        if (!isFAssetRegistered[tokenIn] && !isFAssetRegistered[tokenOut]) {
            revert SwapNotSupported(tokenIn, tokenOut);
        }

        // Pull tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve SwapRouter
        IERC20(tokenIn).forceApprove(swapRouter, amountIn);

        // Execute swap via SwapRouter
        amountOut = ISwapRouter(swapRouter).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            block.timestamp + 300 // 5 minute deadline
        );

        // Transfer output to recipient
        IERC20(tokenOut).safeTransfer(to, amountOut);

        emit FAssetSwapped(tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // =============================================================
    //                      LIQUIDITY INFO
    // =============================================================

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getPairLiquidity(
        address fAsset,
        address pairedToken
    ) external view override returns (uint256 liquidity) {
        if (!isFAssetRegistered[fAsset]) revert PraxisErrors.NotFAsset(fAsset);

        // Query liquidity from registered pools
        address[] memory pools = _fAssetPools[fAsset];

        for (uint256 i = 0; i < pools.length; i++) {
            // Try to get liquidity from pool (basic ERC20 balance check)
            try IERC20(fAsset).balanceOf(pools[i]) returns (uint256 fAssetBalance) {
                try IERC20(pairedToken).balanceOf(pools[i]) returns (uint256 pairedBalance) {
                    if (fAssetBalance > 0 && pairedBalance > 0) {
                        // Simple liquidity estimate based on paired token balance
                        // In practice, would need to convert to USD using oracle
                        liquidity += pairedBalance;
                    }
                } catch {
                    continue;
                }
            } catch {
                continue;
            }
        }
    }

    /**
     * @inheritdoc IFAssetAdapter
     */
    function getBestPools(
        address fAsset
    ) external view override returns (address[] memory pools, uint256[] memory liquidities) {
        if (!isFAssetRegistered[fAsset]) revert PraxisErrors.NotFAsset(fAsset);

        pools = _fAssetPools[fAsset];
        liquidities = new uint256[](pools.length);

        for (uint256 i = 0; i < pools.length; i++) {
            // Get FAsset balance in each pool as a liquidity proxy
            try IERC20(fAsset).balanceOf(pools[i]) returns (uint256 balance) {
                liquidities[i] = balance;
            } catch {
                liquidities[i] = 0;
            }
        }
    }

    // =============================================================
    //                      UTILITY FUNCTIONS
    // =============================================================

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Receive native tokens for FTSO fee payments
     */
    receive() external payable {}
}

// =============================================================
//                      INTERFACE IMPORTS
// =============================================================

/**
 * @notice Minimal SwapRouter interface for internal use
 */
interface ISwapRouter {
    function isPairSupported(address tokenIn, address tokenOut) external view returns (bool);
    function findBestRoute(address tokenIn, address tokenOut, uint256 amountIn)
        external view returns (address bestAdapter, uint256 bestAmountOut);
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

/**
 * @notice Minimal Adapter interface for name queries
 */
interface IAdapter {
    function name() external view returns (string memory);
}
