// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Groth16Verifier.sol";
import "./IZKVerifier.sol";

/**
 * @title PrivatePerpVerifier
 * @notice Verifies ZK proofs for private perpetual position operations
 * @dev Verifies that a perp action is compliant without revealing:
 *      - Position direction (long/short)
 *      - Position size
 *      - Leverage used
 *      - Entry price target
 *      - Collateral amount
 *      - Market/trading pair
 *
 * Public inputs (verified on-chain):
 *   [0] ertId - The ERT token ID
 *   [1] ertOwnershipCommitment - Hash(executor, tokenId)
 *   [2] currentTimestamp - Block timestamp
 *   [3] hasPosition - Whether position exists after action (0 or 1)
 *   [4] actionCommitment - Commitment to position action details
 */
contract PrivatePerpVerifier is Groth16Verifier, IZKVerifier {
    // Number of public inputs for this circuit
    uint256 private constant PUBLIC_INPUT_COUNT = 5;

    // Verification key components
    G1Point private immutable vkAlpha;
    G2Point private immutable vkBeta;
    G2Point private immutable vkGamma;
    G2Point private immutable vkDelta;
    G1Point[] private vkIC;

    bytes32 private immutable _verificationKeyHash;

    // Events
    event PrivatePerpVerified(
        uint256 indexed ertId,
        uint256 timestamp,
        bool hasPosition,
        bytes32 actionCommitment
    );

    /**
     * @notice Constructor sets up the verification key
     */
    constructor() {
        // Placeholder verification key values

        vkAlpha = G1Point(
            0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab,
            0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc
        );

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

        vkGamma = G2Point(
            [
                0xf1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd,
                0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde
            ],
            [
                0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
                0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1
            ]
        );

        vkDelta = G2Point(
            [
                0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12,
                0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123
            ],
            [
                0x67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234,
                0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345
            ]
        );

        // IC points (one for constant + one per public input = 6 total)
        vkIC.push(G1Point(
            0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456,
            0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567
        ));
        for (uint256 i = 0; i < PUBLIC_INPUT_COUNT; i++) {
            vkIC.push(G1Point(
                uint256(keccak256(abi.encode("perp_ic", i, "x"))) % FIELD_MODULUS,
                uint256(keccak256(abi.encode("perp_ic", i, "y"))) % FIELD_MODULUS
            ));
        }

        _verificationKeyHash = keccak256(abi.encode(
            vkAlpha.x, vkAlpha.y,
            vkBeta.x, vkBeta.y,
            vkGamma.x, vkGamma.y,
            vkDelta.x, vkDelta.y
        ));
    }

    /**
     * @notice Verifies a private perp proof
     * @param proof The encoded Groth16 proof
     * @param publicInputs Public inputs: [ertId, ownershipCommitment, timestamp, hasPosition, actionCommitment]
     * @return True if the proof is valid
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);

        // hasPosition must be 0 or 1
        require(publicInputs[3] <= 1, "Invalid hasPosition value");

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        return verifyWithKey(a, b, c, publicInputs);
    }

    /**
     * @notice Verifies and emits event for a private perp action
     */
    function verifyAndLog(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);
        require(publicInputs[3] <= 1, "Invalid hasPosition value");

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        bool success = verifyWithKey(a, b, c, publicInputs);

        if (success) {
            emit PrivatePerpVerified(
                publicInputs[0],  // ertId
                publicInputs[2],  // timestamp
                publicInputs[3] == 1,  // hasPosition
                bytes32(publicInputs[4])  // actionCommitment
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
        G1Point memory vkX = vkIC[0];

        for (uint256 i = 0; i < publicInputs.length; i++) {
            G1Point memory term = mulG1(vkIC[i + 1], publicInputs[i]);
            vkX = addG1(vkX, term);
        }

        G1Point[] memory g1Points = new G1Point[](4);
        G2Point[] memory g2Points = new G2Point[](4);

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

    function verificationKeyHash() external view override returns (bytes32) {
        return _verificationKeyHash;
    }

    function publicInputCount() external pure override returns (uint256) {
        return PUBLIC_INPUT_COUNT;
    }
}
