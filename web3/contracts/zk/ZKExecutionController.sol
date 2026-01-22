// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IZKVerifier.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ZKExecutionController
 * @notice Main controller for ZK-verified private executions in PRAXIS
 * @dev Coordinates all verifier contracts and manages private execution flow
 *
 * This contract:
 * 1. Validates ZK proofs before executing any action
 * 2. Records execution commitments for audit trails
 * 3. Integrates with the PRAXIS Gateway for actual execution
 * 4. Tracks execution history without revealing private details
 */
contract ZKExecutionController is Ownable, ReentrancyGuard {
    // =============================================================
    //                    STATE VARIABLES
    // =============================================================

    // Verifier contracts
    IZKVerifier public swapVerifier;
    IZKVerifier public yieldVerifier;
    IZKVerifier public perpVerifier;
    IZKVerifier public settlementVerifier;

    // PRAXIS Gateway address
    address public praxisGateway;

    // Execution tracking
    mapping(bytes32 => bool) public usedCommitments;  // Prevent replay
    mapping(uint256 => uint256) public ertExecutionCount;  // Executions per ERT
    mapping(uint256 => bytes32[]) public ertExecutionHistory;  // Commitment history per ERT

    // Configuration
    bool public paused;
    uint256 public maxExecutionsPerBlock;

    // Execution counts per block (for rate limiting)
    mapping(uint256 => uint256) public blockExecutionCount;

    // =============================================================
    //                    EVENTS
    // =============================================================

    event VerifierUpdated(string indexed verifierType, address indexed oldVerifier, address indexed newVerifier);
    event PrivateSwapExecuted(uint256 indexed ertId, bytes32 actionCommitment, uint256 timestamp);
    event PrivateYieldExecuted(uint256 indexed ertId, bytes32 actionCommitment, uint256 protocolCategory, uint256 timestamp);
    event PrivatePerpExecuted(uint256 indexed ertId, bytes32 actionCommitment, bool hasPosition, uint256 timestamp);
    event PrivateSettlementExecuted(uint256 indexed ertId, bytes32 settlementCommitment, int256 pnl, uint256 timestamp);
    event GatewayUpdated(address indexed oldGateway, address indexed newGateway);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // =============================================================
    //                    ERRORS
    // =============================================================

    error ContractPaused();
    error InvalidVerifier();
    error InvalidGateway();
    error ProofVerificationFailed();
    error CommitmentAlreadyUsed();
    error RateLimitExceeded();
    error InvalidErtId();
    error ExecutionFailed();

    // =============================================================
    //                    CONSTRUCTOR
    // =============================================================

    constructor(
        address _swapVerifier,
        address _yieldVerifier,
        address _perpVerifier,
        address _settlementVerifier,
        address _praxisGateway
    ) Ownable(msg.sender) {
        swapVerifier = IZKVerifier(_swapVerifier);
        yieldVerifier = IZKVerifier(_yieldVerifier);
        perpVerifier = IZKVerifier(_perpVerifier);
        settlementVerifier = IZKVerifier(_settlementVerifier);
        praxisGateway = _praxisGateway;

        maxExecutionsPerBlock = 100;  // Default rate limit
    }

    // =============================================================
    //                    MODIFIERS
    // =============================================================

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier rateLimited() {
        if (blockExecutionCount[block.number] >= maxExecutionsPerBlock) {
            revert RateLimitExceeded();
        }
        blockExecutionCount[block.number]++;
        _;
    }

    modifier validCommitment(bytes32 commitment) {
        if (usedCommitments[commitment]) revert CommitmentAlreadyUsed();
        usedCommitments[commitment] = true;
        _;
    }

    // =============================================================
    //                    PRIVATE SWAP
    // =============================================================

    /**
     * @notice Execute a private swap with ZK proof
     * @param proof The Groth16 proof
     * @param publicInputs [ertId, ownershipCommitment, timestamp, actionCommitment]
     * @param executionData Encrypted execution data for the gateway
     */
    function executePrivateSwap(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        bytes calldata executionData
    )
        external
        nonReentrant
        whenNotPaused
        rateLimited
        validCommitment(bytes32(publicInputs[3]))
    {
        // Verify the proof
        bool valid = swapVerifier.verify(proof, publicInputs);
        if (!valid) revert ProofVerificationFailed();

        uint256 ertId = publicInputs[0];
        bytes32 actionCommitment = bytes32(publicInputs[3]);

        // Record execution
        ertExecutionCount[ertId]++;
        ertExecutionHistory[ertId].push(actionCommitment);

        // Execute through gateway (the actual swap happens privately)
        // The gateway decrypts executionData using executor's key
        _executeViaGateway(executionData);

        emit PrivateSwapExecuted(ertId, actionCommitment, block.timestamp);
    }

    // =============================================================
    //                    PRIVATE YIELD
    // =============================================================

    /**
     * @notice Execute a private yield action with ZK proof
     * @param proof The Groth16 proof
     * @param publicInputs [ertId, ownershipCommitment, timestamp, protocolCategory, actionCommitment]
     * @param executionData Encrypted execution data for the gateway
     */
    function executePrivateYield(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        bytes calldata executionData
    )
        external
        nonReentrant
        whenNotPaused
        rateLimited
        validCommitment(bytes32(publicInputs[4]))
    {
        bool valid = yieldVerifier.verify(proof, publicInputs);
        if (!valid) revert ProofVerificationFailed();

        uint256 ertId = publicInputs[0];
        uint256 protocolCategory = publicInputs[3];
        bytes32 actionCommitment = bytes32(publicInputs[4]);

        ertExecutionCount[ertId]++;
        ertExecutionHistory[ertId].push(actionCommitment);

        _executeViaGateway(executionData);

        emit PrivateYieldExecuted(ertId, actionCommitment, protocolCategory, block.timestamp);
    }

    // =============================================================
    //                    PRIVATE PERP
    // =============================================================

    /**
     * @notice Execute a private perpetual position action with ZK proof
     * @param proof The Groth16 proof
     * @param publicInputs [ertId, ownershipCommitment, timestamp, hasPosition, actionCommitment]
     * @param executionData Encrypted execution data for the gateway
     */
    function executePrivatePerp(
        bytes calldata proof,
        uint256[] calldata publicInputs,
        bytes calldata executionData
    )
        external
        nonReentrant
        whenNotPaused
        rateLimited
        validCommitment(bytes32(publicInputs[4]))
    {
        bool valid = perpVerifier.verify(proof, publicInputs);
        if (!valid) revert ProofVerificationFailed();

        uint256 ertId = publicInputs[0];
        bool hasPosition = publicInputs[3] == 1;
        bytes32 actionCommitment = bytes32(publicInputs[4]);

        ertExecutionCount[ertId]++;
        ertExecutionHistory[ertId].push(actionCommitment);

        _executeViaGateway(executionData);

        emit PrivatePerpExecuted(ertId, actionCommitment, hasPosition, block.timestamp);
    }

    // =============================================================
    //                    PRIVATE SETTLEMENT
    // =============================================================

    /**
     * @notice Execute a private settlement with ZK proof
     * @param proof The Groth16 proof
     * @param publicInputs [ertId, ownershipCommitment, startingCapital, endingCapital,
     *                      pnl, pnlIsPositive, ftsoPriceBlock, lpShare, executorShare, settlementCommitment]
     */
    function executePrivateSettlement(
        bytes calldata proof,
        uint256[] calldata publicInputs
    )
        external
        nonReentrant
        whenNotPaused
        validCommitment(bytes32(publicInputs[9]))
    {
        bool valid = settlementVerifier.verify(proof, publicInputs);
        if (!valid) revert ProofVerificationFailed();

        uint256 ertId = publicInputs[0];
        int256 pnl = publicInputs[5] == 1
            ? int256(publicInputs[4])
            : -int256(publicInputs[4]);
        bytes32 settlementCommitment = bytes32(publicInputs[9]);

        // Record settlement
        ertExecutionHistory[ertId].push(settlementCommitment);

        // Distribute funds
        _distributeSettlement(
            ertId,
            publicInputs[7],  // lpShare
            publicInputs[8]   // executorShare
        );

        emit PrivateSettlementExecuted(ertId, settlementCommitment, pnl, block.timestamp);
    }

    // =============================================================
    //                    INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Execute action through the PRAXIS gateway
     * @param executionData Encrypted execution data
     */
    function _executeViaGateway(bytes calldata executionData) internal {
        // In production, this calls the PRAXIS Gateway to execute the action
        // The gateway has access to the encrypted execution details
        // For demo, we just validate the call would succeed

        if (praxisGateway == address(0)) revert InvalidGateway();

        // Gateway call would go here
        // (bool success, ) = praxisGateway.call(executionData);
        // if (!success) revert ExecutionFailed();
    }

    /**
     * @notice Distribute settlement funds
     * @param ertId The ERT ID
     * @param lpShare Amount for LP
     * @param executorShare Amount for executor
     */
    function _distributeSettlement(
        uint256 ertId,
        uint256 lpShare,
        uint256 executorShare
    ) internal {
        // In production, this transfers funds to LP and executor
        // For demo, we just emit the event
    }

    // =============================================================
    //                    VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get execution count for an ERT
     */
    function getExecutionCount(uint256 ertId) external view returns (uint256) {
        return ertExecutionCount[ertId];
    }

    /**
     * @notice Get execution history for an ERT
     */
    function getExecutionHistory(uint256 ertId) external view returns (bytes32[] memory) {
        return ertExecutionHistory[ertId];
    }

    /**
     * @notice Check if a commitment has been used
     */
    function isCommitmentUsed(bytes32 commitment) external view returns (bool) {
        return usedCommitments[commitment];
    }

    /**
     * @notice Get all verifier addresses
     */
    function getVerifiers() external view returns (
        address swap,
        address yield,
        address perp,
        address settlement
    ) {
        return (
            address(swapVerifier),
            address(yieldVerifier),
            address(perpVerifier),
            address(settlementVerifier)
        );
    }

    // =============================================================
    //                    ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Update the swap verifier
     */
    function setSwapVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifier();
        address old = address(swapVerifier);
        swapVerifier = IZKVerifier(_verifier);
        emit VerifierUpdated("swap", old, _verifier);
    }

    /**
     * @notice Update the yield verifier
     */
    function setYieldVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifier();
        address old = address(yieldVerifier);
        yieldVerifier = IZKVerifier(_verifier);
        emit VerifierUpdated("yield", old, _verifier);
    }

    /**
     * @notice Update the perp verifier
     */
    function setPerpVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifier();
        address old = address(perpVerifier);
        perpVerifier = IZKVerifier(_verifier);
        emit VerifierUpdated("perp", old, _verifier);
    }

    /**
     * @notice Update the settlement verifier
     */
    function setSettlementVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifier();
        address old = address(settlementVerifier);
        settlementVerifier = IZKVerifier(_verifier);
        emit VerifierUpdated("settlement", old, _verifier);
    }

    /**
     * @notice Update the PRAXIS gateway
     */
    function setGateway(address _gateway) external onlyOwner {
        address old = praxisGateway;
        praxisGateway = _gateway;
        emit GatewayUpdated(old, _gateway);
    }

    /**
     * @notice Set rate limit
     */
    function setMaxExecutionsPerBlock(uint256 _max) external onlyOwner {
        maxExecutionsPerBlock = _max;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
