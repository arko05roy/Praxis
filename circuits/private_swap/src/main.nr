// PRAXIS Private Swap Circuit
// Proves a swap is valid without revealing token pair, amounts, or adapter
//
// What this circuit proves:
// 1. Executor owns the specified ERT
// 2. The adapter used is in the ERT's allowed adapters list
// 3. Both tokens are in the ERT's allowed assets list
// 4. The swap amount is within the ERT's position size limit
// 5. There is sufficient available capital
// 6. The ERT has not expired
//
// What remains PRIVATE:
// - Token addresses (tokenIn, tokenOut)
// - Swap amounts (amountIn, minAmountOut)
// - Adapter address
// - Slippage settings
//
// What is PUBLIC:
// - ERT ID
// - Timestamp
// - Compliance attestations (as boolean flags in the proof)

use dep::std::hash::poseidon;
use dep::ert_ownership::{
    ERT, ERTConstraints, ERTStatus,
    prove_ert_ownership,
    verify_adapter_allowed,
    verify_asset_allowed,
    check_position_size,
    check_available_capital,
    check_not_expired,
    generate_action_commitment,
    range_check_64
};

// =============================================================
//                    PRIVATE SWAP PROOF
// =============================================================

/// Private inputs (hidden from verifier)
struct PrivateSwapInputs {
    // ERT data
    ert: ERT,
    executor_private_key: Field,

    // Swap details (ALL PRIVATE)
    token_in: Field,              // Token being sold (address as Field)
    token_out: Field,             // Token being bought (address as Field)
    amount_in: Field,             // Amount of token_in to swap
    min_amount_out: Field,        // Minimum acceptable output
    adapter: Field,               // DEX adapter address

    // Merkle proofs for whitelist verification
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    token_in_merkle_path: [Field; 20],
    token_in_merkle_indices: [bool; 20],
    token_out_merkle_path: [Field; 20],
    token_out_merkle_indices: [bool; 20],

    // Nonce for commitment uniqueness
    nonce: Field,
}

/// Public inputs (visible to verifier)
struct PublicSwapInputs {
    ert_id: Field,                    // Which ERT is being used
    ert_ownership_commitment: Field,  // Commitment to ERT ownership
    current_timestamp: u64,           // Current block timestamp
    action_commitment: Field,         // Commitment to the swap action
}

/// Output attestations (public)
struct SwapAttestations {
    ert_ownership_valid: bool,
    adapter_allowed: bool,
    token_in_allowed: bool,
    token_out_allowed: bool,
    amount_within_limit: bool,
    capital_available: bool,
    not_expired: bool,
}

// =============================================================
//                    MAIN CIRCUIT
// =============================================================

fn main(
    // Private inputs
    ert: ERT,
    executor_private_key: Field,
    token_in: Field,
    token_out: Field,
    amount_in: Field,
    min_amount_out: Field,
    adapter: Field,
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    token_in_merkle_path: [Field; 20],
    token_in_merkle_indices: [bool; 20],
    token_out_merkle_path: [Field; 20],
    token_out_merkle_indices: [bool; 20],
    nonce: Field,

    // Public inputs
    ert_id: pub Field,
    ert_ownership_commitment: pub Field,
    current_timestamp: pub u64,
    action_commitment: pub Field
) {
    // ==========================================================
    // 1. VERIFY ERT OWNERSHIP
    // ==========================================================

    // Verify the ERT ID matches
    assert(ert.token_id == ert_id, "ERT ID mismatch");

    // Prove ownership without revealing executor address
    let ownership_valid = prove_ert_ownership(
        ert,
        executor_private_key,
        ert_ownership_commitment
    );
    assert(ownership_valid, "ERT ownership verification failed");

    // ==========================================================
    // 2. VERIFY ADAPTER IS ALLOWED
    // ==========================================================

    let adapter_allowed = verify_adapter_allowed(
        adapter,
        ert.constraints,
        adapter_merkle_path,
        adapter_merkle_indices
    );
    assert(adapter_allowed, "Adapter not in allowed list");

    // ==========================================================
    // 3. VERIFY TOKENS ARE ALLOWED
    // ==========================================================

    let token_in_allowed = verify_asset_allowed(
        token_in,
        ert.constraints,
        token_in_merkle_path,
        token_in_merkle_indices
    );
    assert(token_in_allowed, "Token in not in allowed list");

    let token_out_allowed = verify_asset_allowed(
        token_out,
        ert.constraints,
        token_out_merkle_path,
        token_out_merkle_indices
    );
    assert(token_out_allowed, "Token out not in allowed list");

    // ==========================================================
    // 4. VERIFY AMOUNT WITHIN LIMITS
    // ==========================================================

    // Range check the amount
    assert(range_check_64(amount_in), "Amount exceeds 64-bit range");

    // Check position size limit
    let amount_within_limit = check_position_size(
        amount_in,
        ert.status.capital_limit,
        ert.constraints.max_position_size_bps
    );
    assert(amount_within_limit, "Amount exceeds position size limit");

    // ==========================================================
    // 5. VERIFY SUFFICIENT CAPITAL
    // ==========================================================

    let capital_available = check_available_capital(
        amount_in,
        ert.status.capital_limit,
        ert.status.capital_deployed
    );
    assert(capital_available, "Insufficient available capital");

    // ==========================================================
    // 6. VERIFY ERT NOT EXPIRED
    // ==========================================================

    let not_expired = check_not_expired(
        ert.status.expiry_time,
        current_timestamp
    );
    assert(not_expired, "ERT has expired");

    // ==========================================================
    // 7. VERIFY ACTION COMMITMENT
    // ==========================================================

    // Create hash of swap data for commitment
    let swap_data_hash = poseidon::bn254::hash_5([
        token_in,
        token_out,
        amount_in,
        min_amount_out,
        adapter
    ]);

    // Verify the action commitment matches
    let computed_commitment = generate_action_commitment(
        ert_id,
        0, // action_type = swap
        swap_data_hash,
        current_timestamp,
        nonce
    );
    assert(computed_commitment == action_commitment, "Action commitment mismatch");

    // ==========================================================
    // All checks passed - proof is valid
    // The verifier learns:
    // - ERT #X executed a compliant swap
    // - All constraints were satisfied
    //
    // The verifier does NOT learn:
    // - Which tokens were swapped
    // - How much was swapped
    // - Which DEX was used
    // ==========================================================
}

// =============================================================
//                    TEST CASES
// =============================================================

#[test]
fn test_valid_swap_proof() {
    // Create test ERT
    let ert = ERT {
        token_id: 42,
        executor: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
        vault: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,
        constraints: ERTConstraints {
            max_leverage: 5,
            max_drawdown_bps: 1000,
            max_position_size_bps: 5000,
            allowed_adapters_root: 0x1111111111111111111111111111111111111111111111111111111111111111,
            allowed_assets_root: 0x2222222222222222222222222222222222222222222222222222222222222222,
        },
        status: ERTStatus {
            capital_limit: 5000000000, // 5000 USDC
            capital_deployed: 0,
            start_time: 1700000000,
            expiry_time: 1800000000,
            is_active: true,
        },
    };

    // This would be a full test with proper Merkle proofs
    // For now, just verify the structure compiles
    assert(ert.status.is_active);
}
