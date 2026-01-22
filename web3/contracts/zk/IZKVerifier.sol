// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IZKVerifier
 * @notice Interface for ZK proof verifiers in PRAXIS
 * @dev All verifier contracts must implement this interface
 */
interface IZKVerifier {
    /**
     * @notice Verifies a ZK proof with public inputs
     * @param proof The proof bytes (encoded Groth16 proof)
     * @param publicInputs Array of public input values
     * @return bool True if the proof is valid
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view returns (bool);

    /**
     * @notice Returns the verification key hash for this verifier
     * @return bytes32 The verification key hash
     */
    function verificationKeyHash() external view returns (bytes32);

    /**
     * @notice Returns the number of expected public inputs
     * @return uint256 Number of public inputs
     */
    function publicInputCount() external pure returns (uint256);
}
