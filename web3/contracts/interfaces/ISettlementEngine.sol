// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title ISettlementEngine
 * @notice Interface for the PRAXIS Settlement Engine
 * @dev Handles ERT settlement, PnL calculation, and fee distribution
 */
interface ISettlementEngine {
    // =============================================================
    //                           EVENTS
    // =============================================================

    /**
     * @notice Emitted when an ERT is successfully settled
     * @param ertId The settled ERT ID
     * @param executor The executor address
     * @param totalPnl The total profit/loss
     * @param lpFees Total fees paid to LPs (base + profit share)
     * @param executorProfit Profit retained by executor
     * @param insuranceCollected Amount collected by insurance fund
     */
    event ERTSettled(
        uint256 indexed ertId,
        address indexed executor,
        int256 totalPnl,
        uint256 lpFees,
        uint256 executorProfit,
        uint256 insuranceCollected
    );

    /**
     * @notice Emitted when positions are unwound during settlement
     * @param ertId The ERT ID
     * @param positionsUnwound Number of positions closed
     * @param capitalRecovered Total capital recovered from unwinding
     */
    event PositionsUnwound(
        uint256 indexed ertId,
        uint256 positionsUnwound,
        uint256 capitalRecovered
    );

    /**
     * @notice Emitted when a force settlement is triggered
     * @param ertId The ERT ID
     * @param triggeredBy Address that triggered the force settlement
     * @param reason Reason for force settlement
     */
    event ForceSettlementTriggered(
        uint256 indexed ertId,
        address indexed triggeredBy,
        string reason
    );

    // =============================================================
    //                      SETTLEMENT FUNCTIONS
    // =============================================================

    /**
     * @notice Settle an ERT and distribute PnL
     * @dev Only the ERT holder can settle before expiry
     * @param ertId The ERT ID to settle
     * @return result The settlement result containing PnL breakdown
     */
    function settle(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Settle an ERT early (before expiry)
     * @dev Only the ERT holder can settle early
     * @param ertId The ERT ID to settle
     * @return result The settlement result
     */
    function settleEarly(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Force settle an expired ERT
     * @dev Anyone can force settle an expired ERT
     * @param ertId The ERT ID to force settle
     * @return result The settlement result
     */
    function forceSettle(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Force settle an ERT due to drawdown breach
     * @dev Called by ExecutionController when drawdown limit is breached
     * @param ertId The ERT ID to liquidate
     * @return result The settlement result
     */
    function liquidate(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Estimate the settlement result for an ERT
     * @dev Does not actually settle, just calculates expected result
     * @param ertId The ERT ID to estimate
     * @return result The estimated settlement result
     */
    function estimateSettlement(uint256 ertId) external view returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Calculate current PnL for an ERT
     * @param ertId The ERT ID
     * @return pnl The current profit/loss
     */
    function calculatePnl(uint256 ertId) external view returns (int256 pnl);

    /**
     * @notice Check if an ERT can be settled
     * @param ertId The ERT ID
     * @return canSettle Whether settlement is possible
     * @return reason Reason if cannot settle
     */
    function canSettle(uint256 ertId) external view returns (bool canSettle, string memory reason);

    /**
     * @notice Check if an ERT can be force settled
     * @param ertId The ERT ID
     * @return canForceSettle Whether force settlement is possible
     */
    function canForceSettle(uint256 ertId) external view returns (bool canForceSettle);

    /**
     * @notice Get the fee breakdown for a given PnL
     * @param ertId The ERT ID
     * @param pnl The profit/loss amount
     * @return lpBaseFee Base fee to LP
     * @return lpProfitShare Profit share to LP
     * @return executorProfit Profit to executor
     * @return insuranceFee Fee to insurance fund
     * @return stakeSlashed Amount slashed from stake (if loss)
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
    );
}
