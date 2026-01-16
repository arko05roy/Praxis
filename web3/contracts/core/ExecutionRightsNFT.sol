// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

interface IReputationManager {
    function getExecutorTierConfig(address executor) external view returns (PraxisStructs.TierConfig memory);
    function getReputation(address executor) external view returns (PraxisStructs.ExecutorReputation memory);
    function isBanned(address executor) external view returns (bool);
    function getRequiredStake(address executor, uint256 capitalUsd) external view returns (uint256);
    function getMaxDrawdown(address executor) external view returns (uint16);
    function getMaxRiskLevel(address executor) external view returns (uint8);
}

interface ICircuitBreaker {
    function canMintERT() external view returns (bool);
}

/**
 * @title ExecutionRightsNFT
 * @notice ERC-721 token encoding executor permissions and constraints
 * @dev Each token represents time-bound execution rights over vault capital
 */
contract ExecutionRightsNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Minimum ERT duration (1 hour)
    uint256 public constant MIN_DURATION = 1 hours;

    /// @notice Maximum ERT duration (30 days)
    uint256 public constant MAX_DURATION = 30 days;

    /// @notice Maximum daily expiry concentration (20%)
    uint256 public constant MAX_DAILY_EXPIRY_BPS = 2000;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Next token ID
    uint256 public nextTokenId = 1;

    /// @notice Execution rights data per token
    mapping(uint256 => PraxisStructs.ExecutionRights) internal _rights;

    /// @notice Daily expiry concentration tracking
    mapping(uint256 => uint256) public dailyExpiryAmount;

    /// @notice Reference to reputation manager
    address public reputationManager;

    /// @notice Reference to execution controller
    address public executionController;

    /// @notice Reference to circuit breaker
    address public circuitBreaker;

    /// @notice Reference to execution vault
    address public executionVault;

    /// @notice Reference to settlement engine
    address public settlementEngine;

    /// @notice Whether transfers are allowed
    bool public transfersEnabled;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event TransfersToggled(bool enabled);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyController() {
        if (msg.sender != executionController) {
            revert PraxisErrors.OnlyController();
        }
        _;
    }

    modifier onlySettlement() {
        if (msg.sender != settlementEngine) {
            revert PraxisErrors.OnlySettlement();
        }
        _;
    }

    modifier whenCircuitBreakerAllows() {
        if (circuitBreaker != address(0)) {
            if (!ICircuitBreaker(circuitBreaker).canMintERT()) {
                revert PraxisErrors.CircuitBreakerActive();
            }
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the ExecutionRightsNFT
     * @param _reputationManager Address of reputation manager
     * @param _vault Address of execution vault
     */
    constructor(
        address _reputationManager,
        address _vault
    ) ERC721("PRAXIS Execution Rights", "ERT") Ownable(msg.sender) {
        if (_reputationManager == address(0)) revert PraxisErrors.ZeroAddress();
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();

        reputationManager = _reputationManager;
        executionVault = _vault;
        transfersEnabled = false; // ERTs are non-transferable by default
    }

    // =============================================================
    //                      MINT FUNCTIONS
    // =============================================================

    /**
     * @notice Mint new execution rights
     * @param executor The executor who will hold the rights
     * @param capitalLimit Maximum capital that can be deployed
     * @param duration Duration in seconds
     * @param constraints Risk constraints
     * @param fees Fee structure
     * @return tokenId The minted token ID
     */
    function mint(
        address executor,
        uint256 capitalLimit,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        PraxisStructs.FeeStructure calldata fees
    ) external payable nonReentrant whenCircuitBreakerAllows returns (uint256 tokenId) {
        // Validate executor
        IReputationManager repManager = IReputationManager(reputationManager);
        if (repManager.isBanned(executor)) {
            revert PraxisErrors.ExecutorBanned(executor);
        }

        // Get tier config
        PraxisStructs.TierConfig memory tierConfig = repManager.getExecutorTierConfig(executor);

        // Validate capital limit
        if (capitalLimit > tierConfig.maxCapital) {
            revert PraxisErrors.CapitalExceedsTierLimit(capitalLimit, tierConfig.maxCapital);
        }

        // Validate drawdown
        if (constraints.maxDrawdownBps > tierConfig.maxDrawdownBps) {
            revert PraxisErrors.DrawdownExceedsTierLimit(constraints.maxDrawdownBps, tierConfig.maxDrawdownBps);
        }

        // Validate risk level
        uint8 riskLevel = _calculateRiskLevel(constraints);
        if (riskLevel > tierConfig.allowedRiskLevel) {
            revert PraxisErrors.RiskLevelExceedsTierLimit(riskLevel, tierConfig.allowedRiskLevel);
        }

        // Validate duration
        if (duration < MIN_DURATION) {
            revert PraxisErrors.DurationTooShort(duration, MIN_DURATION);
        }
        if (duration > MAX_DURATION) {
            revert PraxisErrors.DurationTooLong(duration, MAX_DURATION);
        }

        // Validate stake
        uint256 requiredStake = repManager.getRequiredStake(executor, capitalLimit);
        if (fees.stakedAmount < requiredStake) {
            revert PraxisErrors.InsufficientStake(fees.stakedAmount, requiredStake);
        }

        // Validate msg.value matches stake
        if (msg.value < fees.stakedAmount) {
            revert PraxisErrors.InsufficientStake(msg.value, fees.stakedAmount);
        }

        // Check expiry concentration
        uint256 expiryDay = ((block.timestamp + duration) / 1 days) * 1 days;
        // Note: Would need vault total assets to calculate this properly
        // For now, just track the amount
        dailyExpiryAmount[expiryDay] += capitalLimit;

        // Mint token
        tokenId = nextTokenId++;
        _safeMint(executor, tokenId);

        // Store rights data
        _rights[tokenId] = PraxisStructs.ExecutionRights({
            tokenId: tokenId,
            executor: executor,
            vault: executionVault,
            capitalLimit: capitalLimit,
            startTime: block.timestamp,
            expiryTime: block.timestamp + duration,
            constraints: constraints,
            fees: PraxisStructs.FeeStructure({
                baseFeeAprBps: fees.baseFeeAprBps,
                profitShareBps: fees.profitShareBps,
                stakedAmount: msg.value
            }),
            status: PraxisStructs.ExecutionStatus({
                capitalDeployed: 0,
                realizedPnl: 0,
                unrealizedPnl: 0,
                highWaterMark: capitalLimit,
                maxDrawdownHit: 0
            }),
            ertStatus: PraxisStructs.ERTStatus.ACTIVE
        });

        emit PraxisEvents.RightsMinted(
            tokenId,
            executor,
            executionVault,
            capitalLimit,
            block.timestamp + duration,
            msg.value
        );
    }

    // =============================================================
    //                   UPDATE FUNCTIONS
    // =============================================================

    /**
     * @notice Update execution status (called by controller)
     * @param tokenId The token ID
     * @param capitalDeployed Current deployed capital
     * @param realizedPnl Realized PnL
     * @param unrealizedPnl Unrealized PnL
     */
    function updateStatus(
        uint256 tokenId,
        uint256 capitalDeployed,
        int256 realizedPnl,
        int256 unrealizedPnl
    ) external onlyController {
        PraxisStructs.ExecutionRights storage rights = _rights[tokenId];

        rights.status.capitalDeployed = capitalDeployed;
        rights.status.realizedPnl = realizedPnl;
        rights.status.unrealizedPnl = unrealizedPnl;

        // Update high water mark
        int256 totalValue = int256(rights.capitalLimit) + realizedPnl + unrealizedPnl;
        if (totalValue > int256(rights.status.highWaterMark)) {
            rights.status.highWaterMark = uint256(totalValue);
        }

        // Track max drawdown
        if (realizedPnl + unrealizedPnl < 0) {
            uint256 currentDrawdownBps = (uint256(-(realizedPnl + unrealizedPnl)) * BPS) / rights.capitalLimit;
            if (currentDrawdownBps > rights.status.maxDrawdownHit) {
                rights.status.maxDrawdownHit = currentDrawdownBps;
            }
        }
    }

    /**
     * @notice Settle the ERT (called by settlement engine)
     * @param tokenId The token ID
     * @param finalPnl The final PnL
     */
    function settle(uint256 tokenId, int256 finalPnl) external onlySettlement {
        PraxisStructs.ExecutionRights storage rights = _rights[tokenId];

        if (rights.ertStatus != PraxisStructs.ERTStatus.ACTIVE) {
            revert PraxisErrors.ERTNotActive(tokenId, uint8(rights.ertStatus));
        }

        rights.ertStatus = PraxisStructs.ERTStatus.SETTLED;
        rights.status.realizedPnl = finalPnl;
        rights.status.unrealizedPnl = 0;

        emit PraxisEvents.RightsSettled(tokenId, finalPnl, rights.capitalLimit);
    }

    /**
     * @notice Mark ERT as expired
     * @param tokenId The token ID
     */
    function markExpired(uint256 tokenId) external {
        PraxisStructs.ExecutionRights storage rights = _rights[tokenId];

        if (block.timestamp < rights.expiryTime) {
            revert PraxisErrors.ERTNotActive(tokenId, uint8(rights.ertStatus));
        }

        if (rights.ertStatus == PraxisStructs.ERTStatus.ACTIVE) {
            rights.ertStatus = PraxisStructs.ERTStatus.EXPIRED;
            emit PraxisEvents.RightsExpired(tokenId, rights.expiryTime);
        }
    }

    /**
     * @notice Mark ERT as liquidated (force settled)
     * @param tokenId The token ID
     */
    function markLiquidated(uint256 tokenId) external onlyController {
        PraxisStructs.ExecutionRights storage rights = _rights[tokenId];
        rights.ertStatus = PraxisStructs.ERTStatus.LIQUIDATED;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get execution rights for a token
     * @param tokenId The token ID
     * @return The execution rights data
     */
    function getRights(uint256 tokenId) external view returns (PraxisStructs.ExecutionRights memory) {
        if (_rights[tokenId].tokenId == 0) {
            revert PraxisErrors.ERTNotFound(tokenId);
        }
        return _rights[tokenId];
    }

    /**
     * @notice Check if ERT is valid and active
     * @param tokenId The token ID
     * @return Whether the ERT is valid
     */
    function isValid(uint256 tokenId) external view returns (bool) {
        PraxisStructs.ExecutionRights memory rights = _rights[tokenId];
        return rights.tokenId != 0 &&
               rights.ertStatus == PraxisStructs.ERTStatus.ACTIVE &&
               block.timestamp >= rights.startTime &&
               block.timestamp < rights.expiryTime;
    }

    /**
     * @notice Check if ERT is expired
     * @param tokenId The token ID
     * @return Whether the ERT is expired
     */
    function isExpired(uint256 tokenId) external view returns (bool) {
        return block.timestamp >= _rights[tokenId].expiryTime;
    }

    /**
     * @notice Get the executor for an ERT
     * @param tokenId The token ID
     * @return The executor address
     */
    function getExecutor(uint256 tokenId) external view returns (address) {
        return _rights[tokenId].executor;
    }

    /**
     * @notice Get constraints for an ERT
     * @param tokenId The token ID
     * @return The risk constraints
     */
    function getConstraints(uint256 tokenId) external view returns (PraxisStructs.RiskConstraints memory) {
        return _rights[tokenId].constraints;
    }

    /**
     * @notice Get fees for an ERT
     * @param tokenId The token ID
     * @return The fee structure
     */
    function getFees(uint256 tokenId) external view returns (PraxisStructs.FeeStructure memory) {
        return _rights[tokenId].fees;
    }

    /**
     * @notice Get status for an ERT
     * @param tokenId The token ID
     * @return The execution status
     */
    function getStatus(uint256 tokenId) external view returns (PraxisStructs.ExecutionStatus memory) {
        return _rights[tokenId].status;
    }

    /**
     * @notice Get all active ERTs for an executor
     * @param executor The executor address
     * @return tokenIds Array of active token IDs
     */
    function getActiveERTs(address executor) external view returns (uint256[] memory tokenIds) {
        uint256 balance = balanceOf(executor);
        uint256[] memory temp = new uint256[](balance);
        uint256 count = 0;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(executor, i);
            if (_rights[tokenId].ertStatus == PraxisStructs.ERTStatus.ACTIVE &&
                block.timestamp < _rights[tokenId].expiryTime) {
                temp[count++] = tokenId;
            }
        }

        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = temp[i];
        }
    }

    /**
     * @notice Calculate risk level from constraints
     * @param constraints The risk constraints
     * @return riskLevel 0=Conservative, 1=Moderate, 2=Aggressive
     */
    function _calculateRiskLevel(PraxisStructs.RiskConstraints memory constraints)
        internal
        pure
        returns (uint8 riskLevel)
    {
        // Aggressive if leverage > 2
        if (constraints.maxLeverage > 2) return 2;

        // Moderate if leverage > 1
        if (constraints.maxLeverage > 1) return 1;

        // Conservative
        return 0;
    }

    // =============================================================
    //                    TRANSFER OVERRIDES
    // =============================================================

    /**
     * @notice Override transfer to check if allowed
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow minting
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Allow burning
        if (to == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Check if transfers are enabled
        if (!transfersEnabled) {
            revert PraxisErrors.Unauthorized();
        }

        return super._update(to, tokenId, auth);
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the execution controller
     * @param _controller The controller address
     */
    function setExecutionController(address _controller) external onlyOwner {
        if (_controller == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = _controller;
    }

    /**
     * @notice Set the settlement engine
     * @param _settlement The settlement engine address
     */
    function setSettlementEngine(address _settlement) external onlyOwner {
        if (_settlement == address(0)) revert PraxisErrors.ZeroAddress();
        settlementEngine = _settlement;
    }

    /**
     * @notice Set the circuit breaker
     * @param _circuitBreaker The circuit breaker address
     */
    function setCircuitBreaker(address _circuitBreaker) external onlyOwner {
        circuitBreaker = _circuitBreaker;
    }

    /**
     * @notice Set the reputation manager
     * @param _reputationManager The reputation manager address
     */
    function setReputationManager(address _reputationManager) external onlyOwner {
        if (_reputationManager == address(0)) revert PraxisErrors.ZeroAddress();
        reputationManager = _reputationManager;
    }

    /**
     * @notice Toggle transfers
     * @param enabled Whether transfers should be enabled
     */
    function setTransfersEnabled(bool enabled) external onlyOwner {
        transfersEnabled = enabled;
        emit TransfersToggled(enabled);
    }

    /**
     * @notice Withdraw collected stakes (after settlement)
     * @param to Address to send stakes
     * @param amount Amount to withdraw
     */
    function withdrawStakes(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        (bool success,) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @notice Return stake to executor (called by settlement)
     * @param executor The executor address
     * @param amount The amount to return
     */
    function returnStake(address executor, uint256 amount) external onlySettlement {
        if (executor == address(0)) revert PraxisErrors.ZeroAddress();
        if (amount > 0) {
            (bool success,) = executor.call{value: amount}("");
            require(success, "Stake return failed");
        }
    }

    /**
     * @notice Receive function to accept stakes
     */
    receive() external payable {}
}
