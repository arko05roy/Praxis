// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFdcVerification} from "@flarenetwork/flare-periphery-contracts/coston2/IFdcVerification.sol";
import {IEVMTransaction} from "@flarenetwork/flare-periphery-contracts/coston2/IEVMTransaction.sol";
import {IPayment} from "@flarenetwork/flare-periphery-contracts/coston2/IPayment.sol";
import {IAddressValidity} from "@flarenetwork/flare-periphery-contracts/coston2/IAddressValidity.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title FDCVerifier
 * @notice Contract for verifying Flare Data Connector (FDC) proofs
 * @dev Wraps FDC verification for cross-chain attestations (EVM transactions, payments, address validity)
 */
contract FDCVerifier {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Attestation type ID for EVM Transaction
    bytes32 public constant EVM_TRANSACTION_TYPE =
        keccak256(abi.encode("EVMTransaction"));

    /// @notice Attestation type ID for Payment
    bytes32 public constant PAYMENT_TYPE = keccak256(abi.encode("Payment"));

    /// @notice Attestation type ID for Address Validity
    bytes32 public constant ADDRESS_VALIDITY_TYPE =
        keccak256(abi.encode("AddressValidity"));

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Contract owner
    address public owner;

    /// @notice Mapping of verified transaction hashes to prevent replay
    mapping(bytes32 => bool) public verifiedTransactions;

    /// @notice Mapping of verified payment transaction IDs
    mapping(bytes32 => bool) public verifiedPayments;

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert PraxisErrors.OnlyOwner();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor() {
        owner = msg.sender;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Get the FDC Verification contract from registry
     * @return IFdcVerification The FDC verification contract
     */
    function getFdcVerification() public view returns (IFdcVerification) {
        return ContractRegistry.getFdcVerification();
    }

    /**
     * @notice Verify an EVM transaction proof
     * @param proof The proof structure containing merkle proof and response data
     * @return proved Whether the proof is valid
     */
    function verifyEVMTransaction(
        IEVMTransaction.Proof calldata proof
    ) external returns (bool proved) {
        IFdcVerification fdcVerification = getFdcVerification();

        proved = fdcVerification.verifyEVMTransaction(proof);

        if (!proved) {
            revert PraxisErrors.ProofVerificationFailed();
        }

        // Mark transaction as verified
        bytes32 txHash = proof.data.requestBody.transactionHash;
        verifiedTransactions[txHash] = true;

        emit PraxisEvents.EVMTransactionVerified(
            txHash,
            proof.data.sourceId,
            proof.data.votingRound
        );

        return proved;
    }

    /**
     * @notice Verify an EVM transaction proof without state changes (view function)
     * @param proof The proof structure
     * @return proved Whether the proof is valid
     */
    function verifyEVMTransactionView(
        IEVMTransaction.Proof calldata proof
    ) external view returns (bool proved) {
        return getFdcVerification().verifyEVMTransaction(proof);
    }

    /**
     * @notice Verify a payment proof (for BTC, DOGE, XRP)
     * @param proof The payment proof structure
     * @return proved Whether the proof is valid
     */
    function verifyPayment(
        IPayment.Proof calldata proof
    ) external returns (bool proved) {
        IFdcVerification fdcVerification = getFdcVerification();

        proved = fdcVerification.verifyPayment(proof);

        if (!proved) {
            revert PraxisErrors.ProofVerificationFailed();
        }

        // Mark payment as verified
        bytes32 txId = proof.data.requestBody.transactionId;
        verifiedPayments[txId] = true;

        emit PraxisEvents.PaymentVerified(txId, proof.data.sourceId);

        return proved;
    }

    /**
     * @notice Verify a payment proof without state changes (view function)
     * @param proof The payment proof structure
     * @return proved Whether the proof is valid
     */
    function verifyPaymentView(
        IPayment.Proof calldata proof
    ) external view returns (bool proved) {
        return getFdcVerification().verifyPayment(proof);
    }

    /**
     * @notice Verify an address validity proof
     * @param proof The address validity proof structure
     * @return proved Whether the proof is valid
     */
    function verifyAddressValidity(
        IAddressValidity.Proof calldata proof
    ) external view returns (bool proved) {
        return getFdcVerification().verifyAddressValidity(proof);
    }

    // =============================================================
    //                      HELPER FUNCTIONS
    // =============================================================

    /**
     * @notice Extract EVM transaction response data from a verified proof
     * @param proof The verified proof
     * @return response The response body containing transaction details
     */
    function extractEVMTransactionData(
        IEVMTransaction.Proof calldata proof
    ) external view returns (IEVMTransaction.ResponseBody memory response) {
        // Verify the proof first
        if (!getFdcVerification().verifyEVMTransaction(proof)) {
            revert PraxisErrors.ProofVerificationFailed();
        }

        return proof.data.responseBody;
    }

    /**
     * @notice Extract payment response data from a verified proof
     * @param proof The verified proof
     * @return response The response body containing payment details
     */
    function extractPaymentData(
        IPayment.Proof calldata proof
    ) external view returns (IPayment.ResponseBody memory response) {
        // Verify the proof first
        if (!getFdcVerification().verifyPayment(proof)) {
            revert PraxisErrors.ProofVerificationFailed();
        }

        return proof.data.responseBody;
    }

    /**
     * @notice Extract address validity response from a verified proof
     * @param proof The verified proof
     * @return response The response body containing address validity info
     */
    function extractAddressValidityData(
        IAddressValidity.Proof calldata proof
    )
        external
        view
        returns (IAddressValidity.ResponseBody memory response)
    {
        // Verify the proof first
        if (!getFdcVerification().verifyAddressValidity(proof)) {
            revert PraxisErrors.ProofVerificationFailed();
        }

        return proof.data.responseBody;
    }

    /**
     * @notice Check if a transaction has already been verified
     * @param transactionHash The transaction hash to check
     * @return verified Whether the transaction was previously verified
     */
    function isTransactionVerified(
        bytes32 transactionHash
    ) external view returns (bool verified) {
        return verifiedTransactions[transactionHash];
    }

    /**
     * @notice Check if a payment has already been verified
     * @param transactionId The payment transaction ID to check
     * @return verified Whether the payment was previously verified
     */
    function isPaymentVerified(
        bytes32 transactionId
    ) external view returns (bool verified) {
        return verifiedPayments[transactionId];
    }

    /**
     * @notice Get the FDC protocol ID
     * @return protocolId The FDC protocol identifier
     */
    function getFdcProtocolId() external view returns (uint8 protocolId) {
        return getFdcVerification().fdcProtocolId();
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert PraxisErrors.ZeroAddress();
        }

        address oldOwner = owner;
        owner = newOwner;

        emit PraxisEvents.OwnershipTransferred(oldOwner, newOwner);
    }
}
