// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title InsuranceFund
 * @notice Collects fees from profits and covers losses during black swan events
 * @dev Acts as a buffer between executor losses and LP capital
 */
contract InsuranceFund is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Default insurance fee on profits (2%)
    uint256 public constant DEFAULT_INSURANCE_FEE_BPS = 200;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Insurance fee on profits in basis points
    uint256 public insuranceFeeBps;

    /// @notice Current fund balance
    uint256 public fundBalance;

    /// @notice The base asset used by the vault
    address public baseAsset;

    /// @notice Reference to the execution vault
    address public vault;

    /// @notice Reference to the settlement engine
    address public settlementEngine;

    /// @notice Timelock for emergency withdrawals
    uint256 public constant EMERGENCY_TIMELOCK = 2 days;

    /// @notice Pending emergency withdrawal
    struct PendingWithdrawal {
        address to;
        uint256 amount;
        uint256 unlockTime;
    }
    PendingWithdrawal public pendingWithdrawal;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event InsuranceFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyWithdrawalInitiated(address to, uint256 amount, uint256 unlockTime);
    event EmergencyWithdrawalExecuted(address to, uint256 amount);
    event EmergencyWithdrawalCancelled();
    event DirectDeposit(address indexed from, uint256 amount);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlySettlement() {
        if (msg.sender != settlementEngine) {
            revert PraxisErrors.OnlySettlement();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the InsuranceFund
     * @param _vault Address of the execution vault
     * @param _baseAsset Address of the base asset (e.g., USDC)
     */
    constructor(address _vault, address _baseAsset) Ownable(msg.sender) {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        if (_baseAsset == address(0)) revert PraxisErrors.ZeroAddress();

        vault = _vault;
        baseAsset = _baseAsset;
        insuranceFeeBps = DEFAULT_INSURANCE_FEE_BPS;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Collect insurance fee from a profitable settlement
     * @param profit The total profit amount
     * @return collected The amount collected for insurance
     */
    function collectFromProfit(uint256 profit) external onlySettlement nonReentrant returns (uint256 collected) {
        collected = (profit * insuranceFeeBps) / BPS;

        if (collected > 0) {
            // Transfer from settlement engine
            IERC20(baseAsset).safeTransferFrom(msg.sender, address(this), collected);
            fundBalance += collected;
            emit PraxisEvents.InsuranceCollected(collected, fundBalance);
        }
    }

    /**
     * @notice Cover a loss from the insurance fund
     * @param lossAmount The total loss amount to cover
     * @return covered The amount actually covered (may be less if fund is insufficient)
     */
    function coverLoss(uint256 lossAmount) external onlySettlement nonReentrant returns (uint256 covered) {
        covered = lossAmount > fundBalance ? fundBalance : lossAmount;

        if (covered > 0) {
            fundBalance -= covered;

            // Transfer to vault to offset the loss
            IERC20(baseAsset).safeTransfer(vault, covered);

            emit PraxisEvents.LossCovered(lossAmount, covered, fundBalance);
        }
    }

    /**
     * @notice Direct deposit to increase fund balance
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        IERC20(baseAsset).safeTransferFrom(msg.sender, address(this), amount);
        fundBalance += amount;

        emit DirectDeposit(msg.sender, amount);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get current fund status
     * @param totalVaultAssets Current total vault assets
     * @return balance Current fund balance
     * @return coverageRatioBps Coverage as percentage of vault assets
     */
    function fundStatus(uint256 totalVaultAssets)
        external
        view
        returns (uint256 balance, uint256 coverageRatioBps)
    {
        balance = fundBalance;
        if (totalVaultAssets > 0) {
            coverageRatioBps = (fundBalance * BPS) / totalVaultAssets;
        }
    }

    /**
     * @notice Check if fund can cover a potential loss
     * @param lossAmount The potential loss amount
     * @return canCover Whether the fund can fully cover the loss
     * @return shortfall The amount the fund cannot cover (if any)
     */
    function canCoverLoss(uint256 lossAmount)
        external
        view
        returns (bool canCover, uint256 shortfall)
    {
        if (fundBalance >= lossAmount) {
            return (true, 0);
        }
        return (false, lossAmount - fundBalance);
    }

    /**
     * @notice Calculate insurance fee for a given profit
     * @param profit The profit amount
     * @return The insurance fee amount
     */
    function calculateInsuranceFee(uint256 profit) external view returns (uint256) {
        return (profit * insuranceFeeBps) / BPS;
    }

    /**
     * @notice Get the actual token balance (for verification)
     * @return The actual token balance in the contract
     */
    function actualBalance() external view returns (uint256) {
        return IERC20(baseAsset).balanceOf(address(this));
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the settlement engine address
     * @param _settlementEngine The settlement engine address
     */
    function setSettlementEngine(address _settlementEngine) external onlyOwner {
        if (_settlementEngine == address(0)) revert PraxisErrors.ZeroAddress();
        settlementEngine = _settlementEngine;
    }

    /**
     * @notice Update the vault address
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
    }

    /**
     * @notice Update the insurance fee percentage
     * @param _insuranceFeeBps New fee in basis points
     */
    function setInsuranceFee(uint256 _insuranceFeeBps) external onlyOwner {
        if (_insuranceFeeBps > 1000) { // Max 10%
            revert PraxisErrors.ArrayLengthMismatch(1000, _insuranceFeeBps);
        }

        uint256 oldFee = insuranceFeeBps;
        insuranceFeeBps = _insuranceFeeBps;

        emit InsuranceFeeUpdated(oldFee, _insuranceFeeBps);
    }

    /**
     * @notice Initiate emergency withdrawal (timelocked)
     * @param to Address to send funds to
     * @param amount Amount to withdraw
     */
    function initiateEmergencyWithdrawal(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        if (amount > fundBalance) {
            revert PraxisErrors.InsufficientBalance(amount, fundBalance);
        }

        pendingWithdrawal = PendingWithdrawal({
            to: to,
            amount: amount,
            unlockTime: block.timestamp + EMERGENCY_TIMELOCK
        });

        emit EmergencyWithdrawalInitiated(to, amount, pendingWithdrawal.unlockTime);
    }

    /**
     * @notice Execute pending emergency withdrawal
     */
    function executeEmergencyWithdrawal() external onlyOwner nonReentrant {
        PendingWithdrawal memory pending = pendingWithdrawal;

        if (pending.to == address(0)) revert PraxisErrors.ZeroAddress();
        if (block.timestamp < pending.unlockTime) {
            revert PraxisErrors.CooldownNotElapsed(pending.unlockTime, block.timestamp);
        }
        if (pending.amount > fundBalance) {
            revert PraxisErrors.InsufficientBalance(pending.amount, fundBalance);
        }

        // Clear pending withdrawal
        delete pendingWithdrawal;

        // Execute transfer
        fundBalance -= pending.amount;
        IERC20(baseAsset).safeTransfer(pending.to, pending.amount);

        emit EmergencyWithdrawalExecuted(pending.to, pending.amount);
    }

    /**
     * @notice Cancel pending emergency withdrawal
     */
    function cancelEmergencyWithdrawal() external onlyOwner {
        delete pendingWithdrawal;
        emit EmergencyWithdrawalCancelled();
    }

    /**
     * @notice Sync fund balance with actual token balance
     * @dev Used if tokens are sent directly without using deposit()
     */
    function syncBalance() external onlyOwner {
        fundBalance = IERC20(baseAsset).balanceOf(address(this));
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue (must not be baseAsset)
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        if (token == baseAsset) revert PraxisErrors.InvalidAdapter();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }
}
