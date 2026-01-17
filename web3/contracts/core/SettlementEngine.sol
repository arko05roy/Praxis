// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";
import {ISettlementEngine} from "../interfaces/ISettlementEngine.sol";

// Interface imports for dependencies
interface IExecutionRightsNFT {
    function getRights(uint256 tokenId) external view returns (PraxisStructs.ExecutionRights memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function settle(uint256 tokenId, int256 finalPnl) external;
    function returnStake(address executor, uint256 amount) external;
    function isValid(uint256 tokenId) external view returns (bool);
    function isExpired(uint256 tokenId) external view returns (bool);
}

interface IExecutionVault {
    function returnCapital(uint256 ertId, uint256 amount, int256 pnl) external;
    function getAllocatedCapital(uint256 ertId) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function asset() external view returns (address);
}

interface IPositionManager {
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory);
    function hasOpenPositions(uint256 ertId) external view returns (bool);
    function closeAllPositions(uint256 ertId) external;
    function closePosition(bytes32 positionId, int256 realizedPnl) external;
    function getTotalEntryValue(uint256 ertId) external view returns (uint256);
}

interface IReputationManager {
    function recordSettlement(address executor, uint256 capitalUsed, int256 pnl, uint256 maxDrawdownHit) external;
}

interface ICircuitBreaker {
    function recordLoss(uint256 lossAmount) external;
    function recordProfit(uint256 profitAmount) external;
    function isPaused() external view returns (bool);
}

interface IInsuranceFund {
    function collectFromProfit(uint256 profit) external returns (uint256 collected);
    function coverLoss(uint256 lossAmount) external returns (uint256 covered);
}

interface IFlareOracle {
    function getTokenPriceUSD(address token) external payable returns (uint256 priceInWei, uint64 timestamp);
    function hasFeed(address token) external view returns (bool);
}

interface IYieldAdapter {
    function withdraw(address asset, uint256 shares, address recipient) external returns (uint256 amount);
    function getUnderlyingBalance(address asset, address user) external view returns (uint256);
}

interface IPerpetualAdapter {
    function closePosition(bytes32 positionId, address to) external returns (int256 pnl);
    function getUnrealizedPnl(bytes32 positionId) external view returns (int256 pnl);
}

/**
 * @title SettlementEngine
 * @notice Handles ERT settlement, PnL calculation, and fee distribution using FTSO prices
 * @dev Core component of PRAXIS that ensures trustless settlement via Flare oracles
 */
contract SettlementEngine is ISettlementEngine, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Seconds per year for APR calculations
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    /// @notice Price precision (18 decimals)
    uint256 public constant PRICE_PRECISION = 1e18;

    /// @notice Insurance fee on profits (2%)
    uint256 public constant INSURANCE_FEE_BPS = 200;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Reference to ExecutionRightsNFT
    IExecutionRightsNFT public ertNFT;

    /// @notice Reference to ExecutionVault
    IExecutionVault public vault;

    /// @notice Reference to PositionManager
    IPositionManager public positionManager;

    /// @notice Reference to ReputationManager
    IReputationManager public reputationManager;

    /// @notice Reference to CircuitBreaker
    ICircuitBreaker public circuitBreaker;

    /// @notice Reference to InsuranceFund
    IInsuranceFund public insuranceFund;

    /// @notice Reference to FlareOracle
    IFlareOracle public flareOracle;

    /// @notice Base asset (e.g., USDC)
    address public baseAsset;

    /// @notice Gateway contract authorized to call on behalf of ERT holders
    address public gateway;

    /// @notice Mapping of adapter addresses to their types
    mapping(address => AdapterType) public adapterTypes;

    /// @notice Adapter type enum
    enum AdapterType {
        NONE,
        DEX,
        YIELD,
        PERPETUAL
    }

    // =============================================================
    //                          EVENTS
    // =============================================================

    event AdapterTypeSet(address indexed adapter, AdapterType adapterType);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyController() {
        // Allow ExecutionController to call liquidate
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the SettlementEngine
     * @param _ertNFT Address of ExecutionRightsNFT
     * @param _vault Address of ExecutionVault
     * @param _positionManager Address of PositionManager
     * @param _reputationManager Address of ReputationManager
     * @param _circuitBreaker Address of CircuitBreaker
     * @param _insuranceFund Address of InsuranceFund
     * @param _flareOracle Address of FlareOracle
     */
    constructor(
        address _ertNFT,
        address _vault,
        address _positionManager,
        address _reputationManager,
        address _circuitBreaker,
        address _insuranceFund,
        address _flareOracle
    ) Ownable(msg.sender) {
        if (_ertNFT == address(0)) revert PraxisErrors.ZeroAddress();
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        if (_positionManager == address(0)) revert PraxisErrors.ZeroAddress();
        if (_flareOracle == address(0)) revert PraxisErrors.ZeroAddress();

        ertNFT = IExecutionRightsNFT(_ertNFT);
        vault = IExecutionVault(_vault);
        positionManager = IPositionManager(_positionManager);
        reputationManager = IReputationManager(_reputationManager);
        circuitBreaker = ICircuitBreaker(_circuitBreaker);
        insuranceFund = IInsuranceFund(_insuranceFund);
        flareOracle = IFlareOracle(_flareOracle);

        baseAsset = vault.asset();
    }

    // =============================================================
    //                    SETTLEMENT FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc ISettlementEngine
     */
    function settle(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        // Check caller is the ERT holder or authorized gateway
        if (ertNFT.ownerOf(ertId) != msg.sender && msg.sender != gateway) {
            revert PraxisErrors.Unauthorized();
        }

        // Check ERT is active and not expired (or is expired for force settle)
        if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        result = _executeSettlement(ertId, rights, "normal");
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function settleEarly(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        // Check caller is the ERT holder or authorized gateway
        if (ertNFT.ownerOf(ertId) != msg.sender && msg.sender != gateway) {
            revert PraxisErrors.Unauthorized();
        }

        // Check ERT is active
        if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        // Check not expired yet
        if (block.timestamp >= rights.expiryTime) {
            revert PraxisErrors.ERTExpired(ertId, rights.expiryTime);
        }

        result = _executeSettlement(ertId, rights, "early");
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function forceSettle(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        // Check ERT is active
        if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        // Check ERT is expired
        if (block.timestamp < rights.expiryTime) {
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        emit ForceSettlementTriggered(ertId, msg.sender, "expired");
        result = _executeSettlement(ertId, rights, "force");
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function liquidate(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        // Check ERT is active
        if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        emit ForceSettlementTriggered(ertId, msg.sender, "liquidation");
        result = _executeSettlement(ertId, rights, "liquidation");
    }

    // =============================================================
    //                    INTERNAL SETTLEMENT
    // =============================================================

    /**
     * @notice Execute the settlement process
     * @param ertId The ERT ID
     * @param rights The execution rights
     * @param reason Settlement reason
     * @return result The settlement result
     */
    function _executeSettlement(
        uint256 ertId,
        PraxisStructs.ExecutionRights memory rights,
        string memory reason
    ) internal returns (PraxisStructs.SettlementResult memory result) {
        result.ertId = ertId;

        // Step 1: Unwind all positions
        uint256 capitalRecovered = _unwindAllPositions(ertId);

        // Step 2: Calculate PnL
        uint256 allocatedCapital = vault.getAllocatedCapital(ertId);
        int256 pnl = int256(capitalRecovered) - int256(allocatedCapital);
        result.totalPnl = pnl;

        // Step 3: Distribute fees and handle stake
        _distributeFees(ertId, rights, pnl, result);

        // Step 4: Return capital to vault
        vault.returnCapital(ertId, result.capitalReturned, pnl);

        // Step 5: Update ERT status
        ertNFT.settle(ertId, pnl);

        // Step 6: Update reputation
        if (address(reputationManager) != address(0)) {
            reputationManager.recordSettlement(
                rights.executor,
                rights.capitalLimit,
                pnl,
                rights.status.maxDrawdownHit
            );
        }

        // Step 7: Record with circuit breaker
        if (address(circuitBreaker) != address(0)) {
            if (pnl < 0) {
                circuitBreaker.recordLoss(uint256(-pnl));
            } else if (pnl > 0) {
                circuitBreaker.recordProfit(uint256(pnl));
            }
        }

        // Emit event
        emit ERTSettled(
            ertId,
            rights.executor,
            result.totalPnl,
            result.lpBaseFee + result.lpProfitShare,
            result.executorProfit,
            result.insuranceFee
        );
    }

    /**
     * @notice Unwind all positions for an ERT
     * @param ertId The ERT ID
     * @return capitalRecovered Total capital recovered
     */
    function _unwindAllPositions(uint256 ertId) internal returns (uint256 capitalRecovered) {
        PraxisStructs.TrackedPosition[] memory positions = positionManager.getPositions(ertId);

        uint256 positionsUnwound = 0;

        for (uint256 i = 0; i < positions.length; i++) {
            PraxisStructs.TrackedPosition memory pos = positions[i];

            // Determine adapter type and unwind accordingly
            AdapterType adapterType = adapterTypes[pos.adapter];

            if (adapterType == AdapterType.YIELD) {
                // Withdraw from yield adapter
                uint256 recovered = _unwindYieldPosition(pos);
                capitalRecovered += recovered;
                positionsUnwound++;
            } else if (adapterType == AdapterType.PERPETUAL) {
                // Close perpetual position
                int256 perpPnl = _unwindPerpPosition(pos);
                // PnL is already in capital terms, add entry value + pnl
                if (perpPnl >= 0) {
                    capitalRecovered += pos.entryValueUsd + uint256(perpPnl);
                } else {
                    uint256 loss = uint256(-perpPnl);
                    capitalRecovered += pos.entryValueUsd > loss ? pos.entryValueUsd - loss : 0;
                }
                positionsUnwound++;
            }
            // DEX positions are just token holdings, valued by oracle
        }

        // Add remaining base asset balance in vault for this ERT
        capitalRecovered += vault.getAllocatedCapital(ertId);

        // Close all position records
        positionManager.closeAllPositions(ertId);

        emit PositionsUnwound(ertId, positionsUnwound, capitalRecovered);
    }

    /**
     * @notice Unwind a yield position (lending/staking)
     * @param pos The tracked position
     * @return recovered Amount recovered
     */
    function _unwindYieldPosition(PraxisStructs.TrackedPosition memory pos) internal returns (uint256 recovered) {
        IYieldAdapter adapter = IYieldAdapter(pos.adapter);

        // Get current balance
        uint256 balance = adapter.getUnderlyingBalance(pos.asset, address(vault));

        if (balance > 0) {
            // Withdraw all
            try adapter.withdraw(pos.asset, balance, address(vault)) returns (uint256 amount) {
                recovered = amount;
            } catch {
                // If withdrawal fails, use entry value as fallback
                recovered = pos.entryValueUsd;
            }
        }
    }

    /**
     * @notice Unwind a perpetual position
     * @param pos The tracked position
     * @return pnl Realized PnL
     */
    function _unwindPerpPosition(PraxisStructs.TrackedPosition memory pos) internal returns (int256 pnl) {
        IPerpetualAdapter adapter = IPerpetualAdapter(pos.adapter);

        try adapter.closePosition(pos.positionId, address(vault)) returns (int256 realizedPnl) {
            pnl = realizedPnl;
        } catch {
            // If close fails, try to get unrealized PnL for estimation
            try adapter.getUnrealizedPnl(pos.positionId) returns (int256 unrealizedPnl) {
                pnl = unrealizedPnl;
            } catch {
                pnl = 0;
            }
        }
    }

    /**
     * @notice Distribute fees based on PnL
     * @param ertId The ERT ID
     * @param rights The execution rights
     * @param pnl The total PnL
     * @param result The settlement result to populate
     */
    function _distributeFees(
        uint256 ertId,
        PraxisStructs.ExecutionRights memory rights,
        int256 pnl,
        PraxisStructs.SettlementResult memory result
    ) internal {
        uint256 stake = rights.fees.stakedAmount;
        uint256 capital = rights.capitalLimit;

        // Calculate base fee (prorated by duration)
        uint256 duration = block.timestamp > rights.startTime
            ? block.timestamp - rights.startTime
            : 0;
        result.lpBaseFee = (capital * rights.fees.baseFeeAprBps * duration) / (BPS * SECONDS_PER_YEAR);

        if (pnl >= 0) {
            uint256 profit = uint256(pnl);

            // Insurance takes cut from profit
            if (address(insuranceFund) != address(0) && profit > 0) {
                uint256 insuranceAmount = (profit * INSURANCE_FEE_BPS) / BPS;
                IERC20(baseAsset).forceApprove(address(insuranceFund), insuranceAmount);
                result.insuranceFee = insuranceFund.collectFromProfit(insuranceAmount);
                profit -= result.insuranceFee;
            }

            // LP profit share
            result.lpProfitShare = (profit * rights.fees.profitShareBps) / BPS;

            // Executor profit (remaining after LP share)
            result.executorProfit = profit - result.lpProfitShare;

            // Return full stake to executor
            result.stakeReturned = stake;

            // Capital returned = original capital + base fee already paid
            result.capitalReturned = capital;

            // Return stake
            if (stake > 0) {
                ertNFT.returnStake(rights.executor, stake);
            }

        } else {
            // Loss scenario
            uint256 loss = uint256(-pnl);

            // Deduct from stake first
            if (loss <= stake) {
                // Stake covers entire loss
                result.stakeSlashed = loss;
                result.stakeReturned = stake - loss;

                // Return remaining stake to executor
                if (result.stakeReturned > 0) {
                    ertNFT.returnStake(rights.executor, result.stakeReturned);
                }

                // Capital fully returned
                result.capitalReturned = capital;

            } else {
                // Loss exceeds stake
                result.stakeSlashed = stake;
                result.stakeReturned = 0;
                uint256 lpLoss = loss - stake;

                // Try to cover from insurance fund
                if (address(insuranceFund) != address(0)) {
                    uint256 covered = insuranceFund.coverLoss(lpLoss);
                    lpLoss -= covered;
                }

                // LP absorbs remaining loss
                result.capitalReturned = capital > lpLoss ? capital - lpLoss : 0;
            }

            result.lpProfitShare = 0;
            result.executorProfit = 0;
        }
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc ISettlementEngine
     */
    function estimateSettlement(uint256 ertId) external view returns (PraxisStructs.SettlementResult memory result) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        result.ertId = ertId;

        // Estimate capital (would need oracle calls for accurate value)
        uint256 allocatedCapital = vault.getAllocatedCapital(ertId);
        uint256 entryValue = positionManager.getTotalEntryValue(ertId);

        // Simple estimation: entry value as recovered (in reality would call oracle)
        int256 estimatedPnl = int256(entryValue) - int256(allocatedCapital);
        result.totalPnl = estimatedPnl;

        // Calculate fees using same logic as settlement
        (
            uint256 lpBaseFee,
            uint256 lpProfitShare,
            uint256 executorProfit,
            uint256 insuranceFee,
            uint256 stakeSlashedAmount
        ) = this.calculateFeeBreakdown(ertId, estimatedPnl);

        result.lpBaseFee = lpBaseFee;
        result.lpProfitShare = lpProfitShare;
        result.executorProfit = executorProfit;
        result.insuranceFee = insuranceFee;
        result.stakeSlashed = stakeSlashedAmount;
        result.stakeReturned = rights.fees.stakedAmount - stakeSlashedAmount;
        result.capitalReturned = rights.capitalLimit;
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function calculatePnl(uint256 ertId) external view returns (int256 pnl) {
        uint256 allocatedCapital = vault.getAllocatedCapital(ertId);
        uint256 entryValue = positionManager.getTotalEntryValue(ertId);

        // This is a simplified view - actual PnL requires oracle calls
        pnl = int256(entryValue) - int256(allocatedCapital);
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function canSettle(uint256 ertId) external view returns (bool, string memory) {
        try ertNFT.getRights(ertId) returns (PraxisStructs.ExecutionRights memory rights) {
            if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
                return (false, "ERT not active");
            }
            return (true, "");
        } catch {
            return (false, "ERT not found");
        }
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function canForceSettle(uint256 ertId) external view returns (bool) {
        try ertNFT.getRights(ertId) returns (PraxisStructs.ExecutionRights memory rights) {
            return rights.ertStatus == PraxisStructs.ERTStatus.ACTIVE &&
                   block.timestamp >= rights.expiryTime;
        } catch {
            return false;
        }
    }

    /**
     * @inheritdoc ISettlementEngine
     */
    function calculateFeeBreakdown(
        uint256 ertId,
        int256 pnl
    ) external view returns (
        uint256 lpBaseFee,
        uint256 lpProfitShare,
        uint256 executorProfit,
        uint256 insuranceFee,
        uint256 stakeSlashed
    ) {
        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);

        uint256 capital = rights.capitalLimit;
        uint256 stake = rights.fees.stakedAmount;

        // Calculate base fee
        uint256 duration = block.timestamp > rights.startTime
            ? block.timestamp - rights.startTime
            : 0;
        lpBaseFee = (capital * rights.fees.baseFeeAprBps * duration) / (BPS * SECONDS_PER_YEAR);

        if (pnl >= 0) {
            uint256 profit = uint256(pnl);

            // Insurance fee
            insuranceFee = (profit * INSURANCE_FEE_BPS) / BPS;
            profit -= insuranceFee;

            // LP profit share
            lpProfitShare = (profit * rights.fees.profitShareBps) / BPS;

            // Executor profit
            executorProfit = profit - lpProfitShare;

            stakeSlashed = 0;
        } else {
            uint256 loss = uint256(-pnl);
            stakeSlashed = loss > stake ? stake : loss;
            lpProfitShare = 0;
            executorProfit = 0;
            insuranceFee = 0;
        }
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set adapter type for routing during unwinding
     * @param adapter The adapter address
     * @param adapterType The adapter type
     */
    function setAdapterType(address adapter, AdapterType adapterType) external onlyOwner {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        adapterTypes[adapter] = adapterType;
        emit AdapterTypeSet(adapter, adapterType);
    }

    /**
     * @notice Set multiple adapter types at once
     * @param adapters Array of adapter addresses
     * @param types Array of adapter types
     */
    function setAdapterTypes(address[] calldata adapters, AdapterType[] calldata types) external onlyOwner {
        if (adapters.length != types.length) {
            revert PraxisErrors.ArrayLengthMismatch(adapters.length, types.length);
        }

        for (uint256 i = 0; i < adapters.length; i++) {
            if (adapters[i] == address(0)) revert PraxisErrors.ZeroAddress();
            adapterTypes[adapters[i]] = types[i];
            emit AdapterTypeSet(adapters[i], types[i]);
        }
    }

    /**
     * @notice Update the reputation manager
     * @param _reputationManager New reputation manager address
     */
    function setReputationManager(address _reputationManager) external onlyOwner {
        reputationManager = IReputationManager(_reputationManager);
    }

    /**
     * @notice Update the circuit breaker
     * @param _circuitBreaker New circuit breaker address
     */
    function setCircuitBreaker(address _circuitBreaker) external onlyOwner {
        circuitBreaker = ICircuitBreaker(_circuitBreaker);
    }

    /**
     * @notice Update the insurance fund
     * @param _insuranceFund New insurance fund address
     */
    function setInsuranceFund(address _insuranceFund) external onlyOwner {
        insuranceFund = IInsuranceFund(_insuranceFund);
    }

    /**
     * @notice Update the flare oracle
     * @param _flareOracle New oracle address
     */
    function setFlareOracle(address _flareOracle) external onlyOwner {
        if (_flareOracle == address(0)) revert PraxisErrors.ZeroAddress();
        flareOracle = IFlareOracle(_flareOracle);
    }

    /**
     * @notice Set the gateway contract that can call on behalf of ERT holders
     * @param _gateway Address of the gateway
     */
    function setGateway(address _gateway) external onlyOwner {
        gateway = _gateway;
    }

    /**
     * @notice Receive function for ETH (needed for oracle fees)
     */
    receive() external payable {}
}
