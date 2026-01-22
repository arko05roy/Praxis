// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVerifier {
    function verify(bytes calldata proof, uint256[] calldata publicInputs) external view returns (bool);
}

interface IDEX {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata data
    ) external returns (uint256);
}

/**
 * @title ZKExecutor
 * @notice Adapter that enforces ZK proof verification before executing swaps
 * @dev Implements the swap signature expected by ExecutionController
 */
contract ZKExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STORAGE
    // =============================================================

    IVerifier public immutable verifier;
    address public immutable targetDEX;

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor(address _verifier, address _targetDEX) Ownable(msg.sender) {
        require(_verifier != address(0), "Zero address verifier");
        require(_targetDEX != address(0), "Zero address DEX");
        verifier = IVerifier(_verifier);
        targetDEX = _targetDEX;
    }

    // =============================================================
    //                       EXECUTION
    // =============================================================

    /**
     * @notice Execute swap with ZK verification
     * @dev Signature matches what ExecutionController calls on adapters
     * @param extraData encoded (bytes proof, uint256[] publicInputs)
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata extraData
    ) external nonReentrant returns (uint256 amountOut) {
        // 1. Decode Proof and Public Inputs
        (bytes memory proof, uint256[] memory publicInputs) = abi.decode(extraData, (bytes, uint256[]));

        // 2. Verify Proof
        // Note: In production, we'd also verify that publicInputs match the transaction params
        // (e.g. publicInputs contains commitment to tokenIn, tokenOut, amountIn)
        // For this demo, the verifier is permissive, but we ensure the call happens.
        require(verifier.verify(proof, publicInputs), "Invalid ZK Proof");

        // 3. Pull tokens from caller (The Execution Vault)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 4. Approve DEX
        IERC20(tokenIn).forceApprove(targetDEX, amountIn);

        // 5. Execute Real Swap
        amountOut = IDEX(targetDEX).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            to, // Send output directly to Vault (to)
            ""
        );

        // 6. Safety check (MockSimpleDEX does this, but good practice)
        require(amountOut >= minAmountOut, "Slippage exceeded");
    }

    // =============================================================
    //                    AUXILIARY VIEWS
    // =============================================================

    function name() external pure returns (string memory) {
        return "ZKExecutorAdapter";
    }
}
