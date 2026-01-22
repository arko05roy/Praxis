// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Groth16Verifier.sol";
import "./IZKVerifier.sol";

/**
 * @title PrivateYieldVerifier
 * @notice Verifies ZK proofs for private yield operations (staking/lending)
 * @dev Verifies that a yield action is compliant without revealing:
 *      - Yield protocol/adapter address
 *      - Asset being staked/supplied
 *      - Amount being deposited/withdrawn
 *      - Specific action (stake, unstake, supply, withdraw)
 *
 * Public inputs (verified on-chain):
 *   [0] ertId - The ERT token ID
 *   [1] ertOwnershipCommitment - Hash(executor, tokenId)
 *   [2] currentTimestamp - Block timestamp
 *   [3] protocolCategory - 0=staking, 1=lending (general category only)
 *   [4] actionCommitment - Commitment to yield action details
 */
contract PrivateYieldVerifier is Groth16Verifier, IZKVerifier {
    // Number of public inputs for this circuit
    uint256 private constant PUBLIC_INPUT_COUNT = 5;

    // Protocol categories
    uint256 private constant CATEGORY_STAKING = 0;
    uint256 private constant CATEGORY_LENDING = 1;

    // Verification key components
    G1Point private immutable vkAlpha;
    G2Point private immutable vkBeta;
    G2Point private immutable vkGamma;
    G2Point private immutable vkDelta;
    G1Point[] private vkIC;

    bytes32 private immutable _verificationKeyHash;

    // Events
    event PrivateYieldVerified(
        uint256 indexed ertId,
        uint256 timestamp,
        uint256 protocolCategory,
        bytes32 actionCommitment
    );

    /**
     * @notice Constructor sets up the verification key
     */
    constructor() {
        // Placeholder verification key values

        vkAlpha = G1Point(
            0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef12345678,
            0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
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
                0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab,
                0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd
            ],
            [
                0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
                0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12
            ]
        );

        vkDelta = G2Point(
            [
                0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234,
                0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345
            ],
            [
                0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456,
                0x0abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567
            ]
        );

        // IC points (one for constant + one per public input = 6 total)
        vkIC.push(G1Point(
            0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678,
            0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789
        ));
        for (uint256 i = 0; i < PUBLIC_INPUT_COUNT; i++) {
            vkIC.push(G1Point(
                uint256(keccak256(abi.encode("yield_ic", i, "x"))) % FIELD_MODULUS,
                uint256(keccak256(abi.encode("yield_ic", i, "y"))) % FIELD_MODULUS
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
     * @notice Verifies a private yield proof
     * @param proof The encoded Groth16 proof
     * @param publicInputs Public inputs: [ertId, ownershipCommitment, timestamp, protocolCategory, actionCommitment]
     * @return True if the proof is valid
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);

        // Validate protocol category
        require(
            publicInputs[3] == CATEGORY_STAKING || publicInputs[3] == CATEGORY_LENDING,
            "Invalid protocol category"
        );

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        return verifyWithKey(a, b, c, publicInputs);
    }

    /**
     * @notice Verifies and emits event for a private yield action
     */
    function verifyAndLog(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);
        require(
            publicInputs[3] == CATEGORY_STAKING || publicInputs[3] == CATEGORY_LENDING,
            "Invalid protocol category"
        );

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        bool success = verifyWithKey(a, b, c, publicInputs);

        if (success) {
            emit PrivateYieldVerified(
                publicInputs[0],  // ertId
                publicInputs[2],  // timestamp
                publicInputs[3],  // protocolCategory
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

    /**
     * @notice Helper to check if a category is staking
     */
    function isStakingCategory(uint256 category) external pure returns (bool) {
        return category == CATEGORY_STAKING;
    }

    /**
     * @notice Helper to check if a category is lending
     */
    function isLendingCategory(uint256 category) external pure returns (bool) {
        return category == CATEGORY_LENDING;
    }
}
