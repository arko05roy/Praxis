// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Groth16Verifier.sol";
import "./IZKVerifier.sol";

/**
 * @title PrivateSwapVerifier
 * @notice Verifies ZK proofs for private swap operations
 * @dev Verifies that a swap is compliant without revealing:
 *      - Token addresses (tokenIn, tokenOut)
 *      - Swap amounts (amountIn, minAmountOut)
 *      - Adapter address
 *
 * Public inputs (verified on-chain):
 *   [0] ertId - The ERT token ID
 *   [1] ertOwnershipCommitment - Hash(executor, tokenId)
 *   [2] currentTimestamp - Block timestamp
 *   [3] actionCommitment - Commitment to swap details
 */
contract PrivateSwapVerifier is Groth16Verifier, IZKVerifier {
    // Number of public inputs for this circuit
    uint256 private constant PUBLIC_INPUT_COUNT = 4;

    // Verification key components (to be set after circuit compilation)
    // These are placeholder values - replace with actual VK after compiling the Noir circuit

    // Alpha (G1 point)
    G1Point private immutable vkAlpha;

    // Beta (G2 point)
    G2Point private immutable vkBeta;

    // Gamma (G2 point)
    G2Point private immutable vkGamma;

    // Delta (G2 point)
    G2Point private immutable vkDelta;

    // IC (input commitment G1 points) - one for constant, plus one per public input
    G1Point[] private vkIC;

    // Verification key hash for identification
    bytes32 private immutable _verificationKeyHash;

    // Events
    event PrivateSwapVerified(
        uint256 indexed ertId,
        uint256 timestamp,
        bytes32 actionCommitment
    );

    /**
     * @notice Constructor sets up the verification key
     * @dev In production, these values come from the circuit's verification key
     */
    constructor() {
        // Placeholder verification key values
        // These will be replaced when the actual circuit is compiled

        // Alpha = G1 generator (placeholder)
        vkAlpha = G1Point(
            0x2260e724844bca5251829571f28f95tried2f3ae1a5e90a76d4813bf12d1c43e,
            0x23a7d2e7c5eb8e6b9e8f0b4c6d7a9e5f3b2c8d4e6f7a8b9c0d1e2f3a4b5c6d7e
        );

        // Beta = G2 point (placeholder)
        vkBeta = G2Point(
            [
                0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2,
                0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed
            ],
            [
                0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b,
                0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa
            ]
        );

        // Gamma = G2 point (placeholder)
        vkGamma = G2Point(
            [
                0x25f83c8b6ab9de74e7da488ef02645c5a16a6652c3c71a15dc37fe3a5dcb7e78,
                0x22aabb730cde9f39a50c8de47b47c07ebe01e6b00c9d1b8de2d3e4f5a6b7c8d9
            ],
            [
                0x2b09b3c2a1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4,
                0x15d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9
            ]
        );

        // Delta = G2 point (placeholder)
        vkDelta = G2Point(
            [
                0x28f9d0d8e7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0,
                0x17e8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8
            ],
            [
                0x2c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0,
                0x1a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9
            ]
        );

        // IC points (placeholder - one for constant + one per public input)
        vkIC.push(G1Point(
            0x1f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8,
            0x2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1
        ));
        vkIC.push(G1Point(
            0x0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9,
            0x1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0
        ));
        vkIC.push(G1Point(
            0x2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1,
            0x0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9
        ));
        vkIC.push(G1Point(
            0x1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0,
            0x2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1
        ));
        vkIC.push(G1Point(
            0x0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9,
            0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
        ));

        // Calculate verification key hash
        _verificationKeyHash = keccak256(abi.encode(
            vkAlpha.x, vkAlpha.y,
            vkBeta.x, vkBeta.y,
            vkGamma.x, vkGamma.y,
            vkDelta.x, vkDelta.y
        ));
    }

    /**
     * @notice Verifies a private swap proof
     * @param proof The encoded Groth16 proof
     * @param publicInputs Public inputs: [ertId, ownershipCommitment, timestamp, actionCommitment]
     * @return True if the proof is valid
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        // Validate public inputs
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);

        // Decode the proof
        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);

        // Verify the proof
        bool success = verifyWithKey(a, b, c, publicInputs);

        return success;
    }

    /**
     * @notice Verifies and emits event for a private swap
     * @param proof The encoded Groth16 proof
     * @param publicInputs Public inputs
     * @return True if verification succeeded
     */
    function verifyAndLog(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);
        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);

        bool success = verifyWithKey(a, b, c, publicInputs);

        if (success) {
            emit PrivateSwapVerified(
                publicInputs[0],  // ertId
                publicInputs[2],  // timestamp
                bytes32(publicInputs[3])  // actionCommitment
            );
        }

        return success;
    }

    /**
     * @notice Internal verification with the specific verification key
     */
    function verifyWithKey(
        G1Point memory a,
        G2Point memory b,
        G1Point memory c,
        uint256[] calldata publicInputs
    ) internal view override returns (bool) {
        // Calculate vk_x = IC[0] + sum(IC[i+1] * publicInputs[i])
        G1Point memory vkX = vkIC[0];

        for (uint256 i = 0; i < publicInputs.length; i++) {
            G1Point memory term = mulG1(vkIC[i + 1], publicInputs[i]);
            vkX = addG1(vkX, term);
        }

        // Prepare pairing inputs
        G1Point[] memory g1Points = new G1Point[](4);
        G2Point[] memory g2Points = new G2Point[](4);

        // Pairing check: e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
        g1Points[0] = negateG1(a);
        g2Points[0] = b;

        g1Points[1] = vkAlpha;
        g2Points[1] = vkBeta;

        g1Points[2] = vkX;
        g2Points[2] = vkGamma;

        g1Points[3] = c;
        g2Points[3] = vkDelta;

        return pairing(g1Points, g2Points);
    }

    /**
     * @notice Returns the verification key hash
     */
    function verificationKeyHash() external view override returns (bytes32) {
        return _verificationKeyHash;
    }

    /**
     * @notice Returns the number of public inputs
     */
    function publicInputCount() external pure override returns (uint256) {
        return PUBLIC_INPUT_COUNT;
    }
}
