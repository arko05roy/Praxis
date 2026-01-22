// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Groth16Verifier
 * @notice Base contract for Groth16 proof verification using BN254 curve
 * @dev This is the base verifier that all specific circuit verifiers inherit from
 *
 * Groth16 proofs consist of:
 * - pi_a: G1 point (2 field elements)
 * - pi_b: G2 point (4 field elements)
 * - pi_c: G1 point (2 field elements)
 *
 * Verification uses pairing checks on the BN254 curve.
 */
abstract contract Groth16Verifier {
    // BN254 curve field modulus
    uint256 internal constant FIELD_MODULUS =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // BN254 scalar field modulus (for public inputs)
    uint256 internal constant SCALAR_MODULUS =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // Generator point for G1
    uint256 internal constant G1_X = 1;
    uint256 internal constant G1_Y = 2;

    // Error codes
    error InvalidProofLength();
    error InvalidPublicInputCount();
    error InvalidPublicInput();
    error ProofVerificationFailed();

    /**
     * @notice Struct representing a G1 point
     */
    struct G1Point {
        uint256 x;
        uint256 y;
    }

    /**
     * @notice Struct representing a G2 point
     */
    struct G2Point {
        uint256[2] x; // x coordinate (Fq2 element)
        uint256[2] y; // y coordinate (Fq2 element)
    }

    /**
     * @notice Decodes a proof from bytes into G1/G2 points
     * @param proof The encoded proof bytes
     * @return a G1 point (pi_a)
     * @return b G2 point (pi_b)
     * @return c G1 point (pi_c)
     */
    function decodeProof(bytes calldata proof)
        internal
        pure
        returns (G1Point memory a, G2Point memory b, G1Point memory c)
    {
        if (proof.length != 256) {
            revert InvalidProofLength();
        }

        // Decode pi_a (G1 point: 2 x 32 bytes)
        a.x = uint256(bytes32(proof[0:32]));
        a.y = uint256(bytes32(proof[32:64]));

        // Decode pi_b (G2 point: 4 x 32 bytes)
        // Note: G2 point coordinates are in Fq2, represented as pairs
        b.x[0] = uint256(bytes32(proof[64:96]));
        b.x[1] = uint256(bytes32(proof[96:128]));
        b.y[0] = uint256(bytes32(proof[128:160]));
        b.y[1] = uint256(bytes32(proof[160:192]));

        // Decode pi_c (G1 point: 2 x 32 bytes)
        c.x = uint256(bytes32(proof[192:224]));
        c.y = uint256(bytes32(proof[224:256]));
    }

    /**
     * @notice Validates public inputs are in the correct range
     * @param publicInputs Array of public input values
     * @param expectedCount Expected number of public inputs
     */
    function validatePublicInputs(
        uint256[] calldata publicInputs,
        uint256 expectedCount
    ) internal pure {
        if (publicInputs.length != expectedCount) {
            revert InvalidPublicInputCount();
        }

        for (uint256 i = 0; i < publicInputs.length; i++) {
            if (publicInputs[i] >= SCALAR_MODULUS) {
                revert InvalidPublicInput();
            }
        }
    }

    /**
     * @notice Performs G1 point addition using precompile
     * @param p1 First G1 point
     * @param p2 Second G1 point
     * @return result The sum p1 + p2
     */
    function addG1(G1Point memory p1, G1Point memory p2)
        internal
        view
        returns (G1Point memory result)
    {
        uint256[4] memory input;
        input[0] = p1.x;
        input[1] = p1.y;
        input[2] = p2.x;
        input[3] = p2.y;

        bool success;
        assembly {
            success := staticcall(gas(), 6, input, 128, result, 64)
        }
        require(success, "G1 addition failed");
    }

    /**
     * @notice Performs G1 scalar multiplication using precompile
     * @param p The G1 point
     * @param s The scalar
     * @return result The product s * p
     */
    function mulG1(G1Point memory p, uint256 s)
        internal
        view
        returns (G1Point memory result)
    {
        uint256[3] memory input;
        input[0] = p.x;
        input[1] = p.y;
        input[2] = s;

        bool success;
        assembly {
            success := staticcall(gas(), 7, input, 96, result, 64)
        }
        require(success, "G1 multiplication failed");
    }

    /**
     * @notice Negates a G1 point (for pairing equation)
     * @param p The G1 point to negate
     * @return The negated point
     */
    function negateG1(G1Point memory p)
        internal
        pure
        returns (G1Point memory)
    {
        if (p.x == 0 && p.y == 0) {
            return G1Point(0, 0);
        }
        return G1Point(p.x, FIELD_MODULUS - (p.y % FIELD_MODULUS));
    }

    /**
     * @notice Performs pairing check using precompile
     * @dev Verifies: e(a1, b1) * e(a2, b2) * ... == 1
     * @param g1Points Array of G1 points
     * @param g2Points Array of G2 points
     * @return True if pairing check passes
     */
    function pairing(G1Point[] memory g1Points, G2Point[] memory g2Points)
        internal
        view
        returns (bool)
    {
        require(g1Points.length == g2Points.length, "Pairing length mismatch");

        uint256 elements = g1Points.length;
        uint256 inputSize = elements * 6 * 32; // 6 uint256s per pair
        uint256[] memory input = new uint256[](elements * 6);

        for (uint256 i = 0; i < elements; i++) {
            input[i * 6 + 0] = g1Points[i].x;
            input[i * 6 + 1] = g1Points[i].y;
            input[i * 6 + 2] = g2Points[i].x[1]; // Note: G2 x coords are swapped
            input[i * 6 + 3] = g2Points[i].x[0];
            input[i * 6 + 4] = g2Points[i].y[1];
            input[i * 6 + 5] = g2Points[i].y[0];
        }

        uint256[1] memory result;
        bool success;
        assembly {
            success := staticcall(
                gas(),
                8,                              // Pairing precompile address
                add(input, 32),                 // Input data (skip length prefix)
                inputSize,
                result,
                32
            )
        }

        return success && result[0] == 1;
    }

    /**
     * @notice To be implemented by specific verifiers with their verification keys
     * @param a Pi_a from the proof
     * @param b Pi_b from the proof
     * @param c Pi_c from the proof
     * @param publicInputs The public inputs
     * @return True if verification passes
     */
    function verifyWithKey(
        G1Point memory a,
        G2Point memory b,
        G1Point memory c,
        uint256[] calldata publicInputs
    ) internal view virtual returns (bool);
}
