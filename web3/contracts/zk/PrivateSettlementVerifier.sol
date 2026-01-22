// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Groth16Verifier.sol";
import "./IZKVerifier.sol";

/**
 * @title PrivateSettlementVerifier
 * @notice Verifies ZK proofs for private ERT settlement operations
 * @dev Verifies that PnL and fee distribution are correct without revealing:
 *      - Individual trade history
 *      - Position entry/exit prices
 *      - Strategy details
 *      - Specific adapters used
 *      - Trade timing
 *
 * Public inputs (verified on-chain):
 *   [0] ertId - The ERT token ID
 *   [1] ertOwnershipCommitment - Hash(executor, tokenId)
 *   [2] startingCapital - Initial capital amount
 *   [3] endingCapital - Final capital amount
 *   [4] pnl - Absolute profit/loss value
 *   [5] pnlIsPositive - 1 if profit, 0 if loss
 *   [6] ftsoPriceBlock - Block number used for FTSO prices
 *   [7] lpShare - Amount going to LP
 *   [8] executorShare - Amount going to executor
 *   [9] settlementCommitment - Commitment to settlement details
 */
contract PrivateSettlementVerifier is Groth16Verifier, IZKVerifier {
    // Number of public inputs for this circuit
    uint256 private constant PUBLIC_INPUT_COUNT = 10;

    // Fee constants (must match circuit)
    uint256 private constant LP_BASE_FEE_BPS = 200;  // 2%
    uint256 private constant PERFORMANCE_FEE_BPS = 2000;  // 20%

    // Verification key components
    G1Point private immutable vkAlpha;
    G2Point private immutable vkBeta;
    G2Point private immutable vkGamma;
    G2Point private immutable vkDelta;
    G1Point[] private vkIC;

    bytes32 private immutable _verificationKeyHash;

    // Events
    event PrivateSettlementVerified(
        uint256 indexed ertId,
        uint256 startingCapital,
        uint256 endingCapital,
        int256 pnl,
        uint256 ftsoPriceBlock,
        uint256 lpShare,
        uint256 executorShare
    );

    /**
     * @notice Constructor sets up the verification key
     */
    constructor() {
        // Placeholder verification key values

        vkAlpha = G1Point(
            0xcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890a,
            0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab
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
                0xef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc,
                0xf1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd
            ],
            [
                0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde,
                0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
            ]
        );

        vkDelta = G2Point(
            [
                0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1,
                0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12
            ],
            [
                0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123,
                0x67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234
            ]
        );

        // IC points (one for constant + one per public input = 11 total)
        vkIC.push(G1Point(
            0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345,
            0x890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456
        ));
        for (uint256 i = 0; i < PUBLIC_INPUT_COUNT; i++) {
            vkIC.push(G1Point(
                uint256(keccak256(abi.encode("settlement_ic", i, "x"))) % FIELD_MODULUS,
                uint256(keccak256(abi.encode("settlement_ic", i, "y"))) % FIELD_MODULUS
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
     * @notice Verifies a private settlement proof
     * @param proof The encoded Groth16 proof
     * @param publicInputs Public inputs array
     * @return True if the proof is valid
     */
    function verify(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external view override returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);

        // Additional validation
        _validateSettlementInputs(publicInputs);

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        return verifyWithKey(a, b, c, publicInputs);
    }

    /**
     * @notice Verifies and emits event for a private settlement
     */
    function verifyAndLog(
        bytes calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool) {
        validatePublicInputs(publicInputs, PUBLIC_INPUT_COUNT);
        _validateSettlementInputs(publicInputs);

        (G1Point memory a, G2Point memory b, G1Point memory c) = decodeProof(proof);
        bool success = verifyWithKey(a, b, c, publicInputs);

        if (success) {
            int256 signedPnl = publicInputs[5] == 1
                ? int256(publicInputs[4])
                : -int256(publicInputs[4]);

            emit PrivateSettlementVerified(
                publicInputs[0],  // ertId
                publicInputs[2],  // startingCapital
                publicInputs[3],  // endingCapital
                signedPnl,        // pnl (signed)
                publicInputs[6],  // ftsoPriceBlock
                publicInputs[7],  // lpShare
                publicInputs[8]   // executorShare
            );
        }

        return success;
    }

    /**
     * @notice Validate settlement-specific constraints
     */
    function _validateSettlementInputs(uint256[] calldata publicInputs) internal pure {
        uint256 startingCapital = publicInputs[2];
        uint256 endingCapital = publicInputs[3];
        uint256 pnl = publicInputs[4];
        uint256 pnlIsPositive = publicInputs[5];
        uint256 lpShare = publicInputs[7];
        uint256 executorShare = publicInputs[8];

        // pnlIsPositive must be 0 or 1
        require(pnlIsPositive <= 1, "Invalid pnlIsPositive value");

        // Verify PnL matches capital difference
        if (pnlIsPositive == 1) {
            require(endingCapital >= startingCapital, "PnL sign mismatch");
            require(endingCapital - startingCapital == pnl, "PnL value mismatch");
        } else {
            require(startingCapital >= endingCapital, "PnL sign mismatch");
            require(startingCapital - endingCapital == pnl, "PnL value mismatch");
        }

        // Verify share distribution
        require(lpShare + executorShare == endingCapital, "Share distribution mismatch");
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
     * @notice Calculate expected LP share for verification
     * @param startingCapital The starting capital
     * @param endingCapital The ending capital
     * @param pnlIsPositive Whether the PnL is positive
     * @return Expected LP share
     */
    function calculateExpectedLpShare(
        uint256 startingCapital,
        uint256 endingCapital,
        bool pnlIsPositive
    ) external pure returns (uint256) {
        // Base fee: 2% of starting capital
        uint256 baseFee = (startingCapital * LP_BASE_FEE_BPS) / 10000;

        if (pnlIsPositive) {
            // Performance fee: 20% of profit
            uint256 profit = endingCapital - startingCapital;
            uint256 performanceFee = (profit * PERFORMANCE_FEE_BPS) / 10000;
            return baseFee + performanceFee;
        } else {
            // No performance fee on losses
            return baseFee;
        }
    }

    /**
     * @notice Get the fee structure
     * @return baseFee Base fee in basis points
     * @return performanceFee Performance fee in basis points
     */
    function getFeeStructure() external pure returns (uint256 baseFee, uint256 performanceFee) {
        return (LP_BASE_FEE_BPS, PERFORMANCE_FEE_BPS);
    }
}
