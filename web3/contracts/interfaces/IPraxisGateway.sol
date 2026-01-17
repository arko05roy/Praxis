// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IPraxisGateway
 * @notice Interface for the PRAXIS Gateway - unified entry point for all protocol interactions
 * @dev This is a thin facade that forwards calls to underlying contracts without holding state
 */
interface IPraxisGateway {
    // =============================================================
    //                           STRUCTS
    // =============================================================

    /**
     * @notice Vault information for LPs
     * @param totalAssets Total assets in the vault
     * @param totalShares Total shares issued
     * @param allocatedCapital Capital currently allocated to ERTs
     * @param availableCapital Capital available for new ERTs
     * @param utilizationRate Current utilization percentage (in BPS)
     */
    struct VaultInfo {
        uint256 totalAssets;
        uint256 totalShares;
        uint256 allocatedCapital;
        uint256 availableCapital;
        uint16 utilizationRate;
    }

    /**
     * @notice Action for executor to perform
     * @param adapter Target adapter address
     * @param data Encoded function call data
     * @param value Native token value (if any)
     */
    struct Action {
        address adapter;
        bytes data;
        uint256 value;
    }

    /**
     * @notice Fee structure for ERT request
     * @param baseFeeAprBps Base fee APR in basis points
     * @param profitShareBps Profit share percentage in basis points
     */
    struct FeeParams {
        uint16 baseFeeAprBps;
        uint16 profitShareBps;
    }

    // =============================================================
    //                           EVENTS
    // =============================================================

    /**
     * @notice Emitted when LP deposits into vault
     * @param depositor The depositor address
     * @param amount Amount deposited
     * @param shares Shares received
     */
    event LPDeposit(
        address indexed depositor,
        uint256 amount,
        uint256 shares
    );

    /**
     * @notice Emitted when LP withdraws from vault
     * @param withdrawer The withdrawer address
     * @param shares Shares burned
     * @param amount Amount received
     */
    event LPWithdraw(
        address indexed withdrawer,
        uint256 shares,
        uint256 amount
    );

    /**
     * @notice Emitted when executor requests execution rights
     * @param executor The executor address
     * @param ertId The minted ERT ID
     * @param capitalNeeded Capital requested
     * @param duration Duration in seconds
     */
    event ExecutionRightsRequested(
        address indexed executor,
        uint256 indexed ertId,
        uint256 capitalNeeded,
        uint256 duration
    );

    /**
     * @notice Emitted when executor executes actions
     * @param executor The executor address
     * @param ertId The ERT ID used
     * @param actionCount Number of actions executed
     */
    event ActionsExecuted(
        address indexed executor,
        uint256 indexed ertId,
        uint256 actionCount
    );

    /**
     * @notice Emitted when ERT is settled through gateway
     * @param executor The executor address
     * @param ertId The settled ERT ID
     * @param pnl Total profit/loss
     */
    event ExecutionRightsSettled(
        address indexed executor,
        uint256 indexed ertId,
        int256 pnl
    );

    /**
     * @notice Emitted when self-execution deposit and execute is performed
     * @param user The user address
     * @param depositAmount Amount deposited
     * @param ertId The ERT ID created
     */
    event DepositAndExecute(
        address indexed user,
        uint256 depositAmount,
        uint256 indexed ertId
    );

    // =============================================================
    //                        LP FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit assets into the vault
     * @dev Requires prior approval of the asset token
     * @param amount Amount of assets to deposit
     * @return shares Amount of shares received
     */
    function deposit(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Deposit assets into the vault with permit
     * @dev Uses ERC-2612 permit for gasless approvals
     * @param amount Amount of assets to deposit
     * @param deadline Permit deadline
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     * @return shares Amount of shares received
     */
    function depositWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 shares);

    /**
     * @notice Withdraw assets from the vault
     * @param shares Amount of shares to redeem
     * @return amount Amount of assets received
     */
    function withdraw(uint256 shares) external returns (uint256 amount);

    /**
     * @notice Get vault information
     * @return info The vault information struct
     */
    function getVaultInfo() external view returns (VaultInfo memory info);

    // =============================================================
    //                     EXECUTOR FUNCTIONS
    // =============================================================

    /**
     * @notice Request execution rights (mint ERT)
     * @dev Requires stake to be sent as msg.value
     * @param capitalNeeded Amount of capital needed
     * @param duration Duration of the execution rights in seconds
     * @param constraints Risk constraints for execution
     * @param fees Fee structure for the ERT
     * @return ertId The minted ERT ID
     */
    function requestExecutionRights(
        uint256 capitalNeeded,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        FeeParams calldata fees
    ) external payable returns (uint256 ertId);

    /**
     * @notice Execute actions with ERT
     * @dev Only the ERT holder can call this
     * @param ertId The ERT ID to use
     * @param actions Array of actions to execute
     * @return results Array of return data from each action
     */
    function executeWithRights(
        uint256 ertId,
        Action[] calldata actions
    ) external returns (bytes[] memory results);

    /**
     * @notice Settle execution rights
     * @dev Only the ERT holder can settle before expiry
     * @param ertId The ERT ID to settle
     * @return result The settlement result
     */
    function settleRights(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Force settle expired execution rights
     * @dev Anyone can call for expired ERTs
     * @param ertId The ERT ID to force settle
     * @return result The settlement result
     */
    function forceSettleRights(uint256 ertId) external returns (PraxisStructs.SettlementResult memory result);

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get execution rights details
     * @param ertId The ERT ID
     * @return rights The execution rights struct
     */
    function getExecutionRights(uint256 ertId) external view returns (PraxisStructs.ExecutionRights memory rights);

    /**
     * @notice Get all positions for an ERT
     * @param ertId The ERT ID
     * @return positions Array of tracked positions
     */
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory positions);

    /**
     * @notice Estimate current PnL for an ERT
     * @param ertId The ERT ID
     * @return pnl Estimated profit/loss
     */
    function estimatePnl(uint256 ertId) external view returns (int256 pnl);

    /**
     * @notice Estimate settlement result
     * @param ertId The ERT ID
     * @return result Estimated settlement result
     */
    function estimateSettlement(uint256 ertId) external view returns (PraxisStructs.SettlementResult memory result);

    /**
     * @notice Check if an address is an authorized executor
     * @param executor The address to check
     * @return isAuthorized Whether the address is authorized
     * @return tier The executor's reputation tier
     */
    function checkExecutor(address executor) external view returns (bool isAuthorized, PraxisStructs.ExecutorTier tier);

    /**
     * @notice Get required stake for an executor at given capital level
     * @param executor The executor address
     * @param capitalNeeded The capital amount
     * @return requiredStake The required stake amount
     */
    function getRequiredStake(address executor, uint256 capitalNeeded) external view returns (uint256 requiredStake);

    // =============================================================
    //                    CONVENIENCE FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit and execute in a single transaction (for self-execution)
     * @dev User becomes both LP and executor
     * @param depositAmount Amount to deposit as LP
     * @param capitalNeeded Capital needed for execution (can be <= depositAmount)
     * @param duration Duration of execution rights
     * @param constraints Risk constraints
     * @param fees Fee structure
     * @param actions Actions to execute immediately
     * @return ertId The created ERT ID
     * @return results Results from action execution
     */
    function depositAndExecute(
        uint256 depositAmount,
        uint256 capitalNeeded,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        FeeParams calldata fees,
        Action[] calldata actions
    ) external payable returns (uint256 ertId, bytes[] memory results);

    // =============================================================
    //                       ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Update the settlement engine address
     * @param newSettlementEngine New settlement engine address
     */
    function setSettlementEngine(address newSettlementEngine) external;

    /**
     * @notice Update the execution controller address
     * @param newController New controller address
     */
    function setExecutionController(address newController) external;

    /**
     * @notice Pause the gateway
     */
    function pause() external;

    /**
     * @notice Unpause the gateway
     */
    function unpause() external;
}
