// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IYieldAdapter} from "../interfaces/IYieldAdapter.sol";
import {IStakingAdapter} from "../interfaces/IStakingAdapter.sol";
import {ILendingAdapter} from "../interfaces/ILendingAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title YieldRouter
 * @notice Registry and router for yield adapters (staking and lending)
 * @dev Aggregates yield options across Sceptre (staking) and Kinetic (lending)
 */
contract YieldRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Type of yield adapter
    enum AdapterType {
        STAKING,
        LENDING
    }

    /// @notice Adapter registration info
    struct AdapterInfo {
        address adapter;
        AdapterType adapterType;
        bool active;
    }

    /// @notice Array of registered adapters
    address[] public adapters;

    /// @notice Adapter info mapping
    mapping(address => AdapterInfo) public adapterInfo;

    /// @notice Maximum number of adapters to prevent gas issues
    uint256 public constant MAX_ADAPTERS = 20;

    /// @notice Events
    event YieldAdapterAdded(address indexed adapter, string name, AdapterType adapterType);
    event YieldAdapterRemoved(address indexed adapter);
    event YieldDeposited(
        address indexed user,
        address indexed adapter,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );
    event YieldWithdrawn(
        address indexed user,
        address indexed adapter,
        address indexed asset,
        uint256 shares,
        uint256 amount
    );

    /**
     * @notice Constructor
     */
    constructor() Ownable(msg.sender) {}

    // =============================================================
    //                     ADAPTER MANAGEMENT
    // =============================================================

    /**
     * @notice Add a staking adapter to the registry
     * @param adapter Address of the adapter to add
     */
    function addStakingAdapter(address adapter) external onlyOwner {
        _addAdapter(adapter, AdapterType.STAKING);
    }

    /**
     * @notice Add a lending adapter to the registry
     * @param adapter Address of the adapter to add
     */
    function addLendingAdapter(address adapter) external onlyOwner {
        _addAdapter(adapter, AdapterType.LENDING);
    }

    /**
     * @notice Internal function to add an adapter
     * @param adapter Address of the adapter
     * @param adapterType Type of adapter
     */
    function _addAdapter(address adapter, AdapterType adapterType) internal {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        if (adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (adapters.length >= MAX_ADAPTERS) {
            revert PraxisErrors.ArrayLengthMismatch(MAX_ADAPTERS, adapters.length + 1);
        }

        adapters.push(adapter);
        adapterInfo[adapter] = AdapterInfo({
            adapter: adapter,
            adapterType: adapterType,
            active: true
        });

        string memory adapterName = IYieldAdapter(adapter).name();
        emit YieldAdapterAdded(adapter, adapterName, adapterType);
    }

    /**
     * @notice Remove an adapter from the registry
     * @param adapter Address of the adapter to remove
     */
    function removeAdapter(address adapter) external onlyOwner {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();

        // Find and remove the adapter
        for (uint256 i = 0; i < adapters.length; i++) {
            if (adapters[i] == adapter) {
                adapters[i] = adapters[adapters.length - 1];
                adapters.pop();
                break;
            }
        }

        adapterInfo[adapter].active = false;
        emit YieldAdapterRemoved(adapter);
    }

    // =============================================================
    //                      YIELD QUERIES
    // =============================================================

    /**
     * @notice Get yield options from all adapters for an asset
     * @param asset Address of the asset
     * @return options Array of yield options
     */
    function getAllYieldOptions(
        address asset
    ) external view returns (PraxisStructs.YieldOption[] memory options) {
        options = new PraxisStructs.YieldOption[](adapters.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            IYieldAdapter adapter = IYieldAdapter(adapters[i]);

            try adapter.isAssetSupported(asset) returns (bool supported) {
                if (supported) {
                    try adapter.getAPY(asset) returns (uint256 apy) {
                        try adapter.getTVL(asset) returns (uint256 tvl) {
                            // Determine risk level and lock period based on adapter type
                            AdapterInfo memory info = adapterInfo[adapters[i]];
                            (PraxisStructs.RiskLevel risk, bool requiresLock, uint256 lockPeriod) =
                                _getAdapterRiskInfo(adapters[i], info.adapterType);

                            options[i] = PraxisStructs.YieldOption({
                                adapter: adapters[i],
                                name: adapter.name(),
                                apy: apy,
                                risk: risk,
                                tvl: tvl,
                                requiresLock: requiresLock,
                                lockPeriod: lockPeriod
                            });
                        } catch {
                            // TVL call failed
                        }
                    } catch {
                        // APY call failed
                    }
                }
            } catch {
                // isAssetSupported call failed
            }
        }
    }

    /**
     * @notice Find the adapter with the best yield for an asset
     * @param asset Address of the asset
     * @return bestAdapter Address of the adapter with best APY
     * @return bestAPY Best annual percentage yield in basis points
     */
    function findBestYield(
        address asset
    ) external view returns (address bestAdapter, uint256 bestAPY) {
        bestAPY = 0;
        bestAdapter = address(0);

        for (uint256 i = 0; i < adapters.length; i++) {
            IYieldAdapter adapter = IYieldAdapter(adapters[i]);

            try adapter.isAssetSupported(asset) returns (bool supported) {
                if (supported) {
                    try adapter.getAPY(asset) returns (uint256 apy) {
                        if (apy > bestAPY) {
                            bestAPY = apy;
                            bestAdapter = adapters[i];
                        }
                    } catch {
                        continue;
                    }
                }
            } catch {
                continue;
            }
        }
    }

    /**
     * @notice Get risk info for an adapter
     * @param adapter Adapter address
     * @param adapterType Type of adapter
     * @return risk Risk level
     * @return requiresLock Whether tokens are locked
     * @return lockPeriod Lock period in seconds
     */
    function _getAdapterRiskInfo(
        address adapter,
        AdapterType adapterType
    ) internal view returns (
        PraxisStructs.RiskLevel risk,
        bool requiresLock,
        uint256 lockPeriod
    ) {
        if (adapterType == AdapterType.STAKING) {
            // Staking typically has a cooldown period
            try IStakingAdapter(adapter).getCooldownPeriod() returns (uint256 cooldown) {
                requiresLock = cooldown > 0;
                lockPeriod = cooldown;
            } catch {
                requiresLock = false;
                lockPeriod = 0;
            }
            risk = PraxisStructs.RiskLevel.CONSERVATIVE;
        } else {
            // Lending is instant withdraw but has borrow risk
            requiresLock = false;
            lockPeriod = 0;
            risk = PraxisStructs.RiskLevel.MODERATE;
        }
    }

    // =============================================================
    //                      DEPOSIT/WITHDRAW
    // =============================================================

    /**
     * @notice Deposit assets through a specific adapter
     * @param adapter Address of the adapter to use
     * @param asset Address of the asset to deposit
     * @param amount Amount to deposit
     * @return shares Amount of shares/receipt tokens received
     */
    function depositViaAdapter(
        address adapter,
        address asset,
        uint256 amount
    ) external payable nonReentrant returns (uint256 shares) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Handle native token deposits (FLR)
        if (asset == address(0)) {
            if (msg.value != amount) {
                revert PraxisErrors.InsufficientBalance(amount, msg.value);
            }
            // Forward native tokens to adapter
            shares = IYieldAdapter(adapter).deposit{value: msg.value}(
                asset,
                amount,
                msg.sender
            );
        } else {
            // Pull tokens from user
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

            // Approve adapter
            IERC20(asset).forceApprove(adapter, amount);

            // Deposit via adapter
            shares = IYieldAdapter(adapter).deposit(asset, amount, msg.sender);
        }

        emit YieldDeposited(msg.sender, adapter, asset, amount, shares);
    }

    /**
     * @notice Withdraw assets through a specific adapter
     * @param adapter Address of the adapter to use
     * @param asset Address of the asset to withdraw
     * @param shares Amount of shares to redeem
     * @return amount Amount of underlying assets received
     */
    function withdrawViaAdapter(
        address adapter,
        address asset,
        uint256 shares
    ) external nonReentrant returns (uint256 amount) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (shares == 0) revert PraxisErrors.ZeroAmount();

        // Withdraw via adapter (adapter handles token transfers)
        amount = IYieldAdapter(adapter).withdraw(asset, shares, msg.sender);

        emit YieldWithdrawn(msg.sender, adapter, asset, shares, amount);
    }

    /**
     * @notice Deposit to the best yield option
     * @param asset Address of the asset
     * @param amount Amount to deposit
     * @return adapter The adapter used
     * @return shares Shares received
     */
    function depositToBestYield(
        address asset,
        uint256 amount
    ) external payable nonReentrant returns (address adapter, uint256 shares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Find best yield
        (address bestAdapter, uint256 bestAPY) = this.findBestYield(asset);
        if (bestAdapter == address(0) || bestAPY == 0) {
            revert PraxisErrors.AssetNotSupported(asset);
        }

        adapter = bestAdapter;

        // Handle native token deposits
        if (asset == address(0)) {
            if (msg.value != amount) {
                revert PraxisErrors.InsufficientBalance(amount, msg.value);
            }
            shares = IYieldAdapter(bestAdapter).deposit{value: msg.value}(
                asset,
                amount,
                msg.sender
            );
        } else {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
            IERC20(asset).forceApprove(bestAdapter, amount);
            shares = IYieldAdapter(bestAdapter).deposit(asset, amount, msg.sender);
        }

        emit YieldDeposited(msg.sender, bestAdapter, asset, amount, shares);
    }

    // =============================================================
    //                    STAKING-SPECIFIC
    // =============================================================

    /**
     * @notice Stake native tokens (FLR) via a staking adapter
     * @param adapter Address of the staking adapter
     * @return shares Amount of liquid staking tokens received
     */
    function stake(address adapter) external payable nonReentrant returns (uint256 shares) {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.STAKING) {
            revert PraxisErrors.InvalidAdapter();
        }
        if (msg.value == 0) revert PraxisErrors.ZeroAmount();

        shares = IStakingAdapter(adapter).stake{value: msg.value}(msg.value, msg.sender);

        emit YieldDeposited(msg.sender, adapter, address(0), msg.value, shares);
    }

    /**
     * @notice Request unstake from a staking adapter (initiates cooldown)
     * @param adapter Address of the staking adapter
     * @param shares Amount of liquid staking tokens to unstake
     * @return requestId Unique identifier for the withdrawal request
     */
    function requestUnstake(
        address adapter,
        uint256 shares
    ) external nonReentrant returns (uint256 requestId) {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.STAKING) {
            revert PraxisErrors.InvalidAdapter();
        }
        if (shares == 0) revert PraxisErrors.ZeroAmount();

        // Get staking token address
        address stakingToken = IStakingAdapter(adapter).stakingToken();

        // Pull staking tokens from user
        IERC20(stakingToken).safeTransferFrom(msg.sender, address(this), shares);

        // Approve adapter
        IERC20(stakingToken).forceApprove(adapter, shares);

        // Request unstake
        requestId = IStakingAdapter(adapter).requestUnstake(shares);
    }

    /**
     * @notice Complete an unstake request after cooldown
     * @param adapter Address of the staking adapter
     * @param requestId The withdrawal request identifier
     * @return amount Amount of native tokens received
     */
    function completeUnstake(
        address adapter,
        uint256 requestId
    ) external nonReentrant returns (uint256 amount) {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.STAKING) {
            revert PraxisErrors.InvalidAdapter();
        }

        // Complete unstake (sends native tokens to msg.sender)
        amount = IStakingAdapter(adapter).completeUnstake(requestId, msg.sender);
    }

    // =============================================================
    //                    LENDING-SPECIFIC
    // =============================================================

    /**
     * @notice Supply assets to a lending adapter
     * @param adapter Address of the lending adapter
     * @param asset Address of the asset to supply
     * @param amount Amount to supply
     * @return shares Amount of receipt tokens received
     */
    function supply(
        address adapter,
        address asset,
        uint256 amount
    ) external nonReentrant returns (uint256 shares) {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.LENDING) {
            revert PraxisErrors.InvalidAdapter();
        }
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Pull tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve adapter
        IERC20(asset).forceApprove(adapter, amount);

        // Supply via adapter
        shares = ILendingAdapter(adapter).supply(asset, amount, msg.sender);

        emit YieldDeposited(msg.sender, adapter, asset, amount, shares);
    }

    /**
     * @notice Borrow assets from a lending adapter
     * @param adapter Address of the lending adapter
     * @param asset Address of the asset to borrow
     * @param amount Amount to borrow
     */
    function borrow(
        address adapter,
        address asset,
        uint256 amount
    ) external nonReentrant {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.LENDING) {
            revert PraxisErrors.InvalidAdapter();
        }
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Borrow via adapter (sends tokens to msg.sender)
        ILendingAdapter(adapter).borrow(asset, amount, msg.sender);
    }

    /**
     * @notice Repay borrowed assets to a lending adapter
     * @param adapter Address of the lending adapter
     * @param asset Address of the asset to repay
     * @param amount Amount to repay (use type(uint256).max for full repay)
     * @return repaid Actual amount repaid
     */
    function repay(
        address adapter,
        address asset,
        uint256 amount
    ) external nonReentrant returns (uint256 repaid) {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.LENDING) {
            revert PraxisErrors.InvalidAdapter();
        }

        // Pull tokens from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve adapter
        IERC20(asset).forceApprove(adapter, amount);

        // Repay via adapter
        repaid = ILendingAdapter(adapter).repay(asset, amount, msg.sender);

        // Return excess if any
        uint256 excess = amount - repaid;
        if (excess > 0) {
            IERC20(asset).safeTransfer(msg.sender, excess);
        }
    }

    /**
     * @notice Enable an asset as collateral
     * @param adapter Address of the lending adapter
     * @param asset Address of the asset to enable
     */
    function enableCollateral(address adapter, address asset) external nonReentrant {
        AdapterInfo memory info = adapterInfo[adapter];
        if (!info.active) revert PraxisErrors.InvalidAdapter();
        if (info.adapterType != AdapterType.LENDING) {
            revert PraxisErrors.InvalidAdapter();
        }

        ILendingAdapter(adapter).enableCollateral(asset);
    }

    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get all registered adapters
     * @return Array of adapter addresses
     */
    function getAdapters() external view returns (address[] memory) {
        return adapters;
    }

    /**
     * @notice Get the number of registered adapters
     * @return Number of adapters
     */
    function getAdapterCount() external view returns (uint256) {
        return adapters.length;
    }

    /**
     * @notice Check if an adapter is registered and active
     * @param adapter Address of the adapter
     * @return True if adapter is active
     */
    function isAdapterActive(address adapter) external view returns (bool) {
        return adapterInfo[adapter].active;
    }

    /**
     * @notice Get adapter type
     * @param adapter Address of the adapter
     * @return adapterType Type of adapter
     */
    function getAdapterType(address adapter) external view returns (AdapterType) {
        return adapterInfo[adapter].adapterType;
    }

    /**
     * @notice Check if an asset is supported by any adapter
     * @param asset Address of the asset
     * @return supported True if at least one adapter supports the asset
     */
    function isAssetSupported(address asset) external view returns (bool supported) {
        for (uint256 i = 0; i < adapters.length; i++) {
            try IYieldAdapter(adapters[i]).isAssetSupported(asset) returns (bool isSupported) {
                if (isSupported) return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * @notice Get user's position across all adapters for an asset
     * @param asset Address of the asset
     * @param user Address of the user
     * @return positions Array of positions
     */
    function getUserPositions(
        address asset,
        address user
    ) external view returns (PraxisStructs.Position[] memory positions) {
        positions = new PraxisStructs.Position[](adapters.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            IYieldAdapter adapter = IYieldAdapter(adapters[i]);

            try adapter.isAssetSupported(asset) returns (bool supported) {
                if (supported) {
                    try adapter.getUnderlyingBalance(asset, user) returns (uint256 balance) {
                        if (balance > 0) {
                            positions[i] = PraxisStructs.Position({
                                adapter: adapters[i],
                                asset: asset,
                                shares: 0, // Would need to track separately
                                underlyingBalance: balance,
                                earnedRewards: 0 // Would need reward tracking
                            });
                        }
                    } catch {
                        // Balance query failed
                    }
                }
            } catch {
                continue;
            }
        }
    }

    // =============================================================
    //                         ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue (use address(0) for native tokens)
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert PraxisErrors.ZeroAmount();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {}
}
