// PRAXIS Private Yield Circuit
// Proves a yield action is valid without revealing protocol, amounts, or strategy
//
// What this circuit proves:
// 1. Executor owns the specified ERT
// 2. The yield adapter is in the ERT's allowed adapters list
// 3. The asset is in the ERT's allowed assets list
// 4. The amount is within the ERT's position size limit
// 5. There is sufficient available capital
// 6. The ERT has not expired
//
// What remains PRIVATE:
// - Yield protocol/adapter address
// - Asset being staked/supplied
// - Amount being deposited/withdrawn
// - Action type (stake, unstake, supply, withdraw)
//
// What is PUBLIC:
// - ERT ID
// - Timestamp
// - Action category (staking or lending - general category only)
// - Compliance attestations

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
//                    YIELD ACTION TYPES
// =============================================================

/// Yield action categories (private)
/// 0 = stake (e.g., FLR → sFLR)
/// 1 = unstake (e.g., sFLR → FLR)
/// 2 = supply (e.g., supply USDC to lending)
/// 3 = withdraw (e.g., withdraw from lending)

/// Public yield categories (revealed)
/// 0 = staking protocol
/// 1 = lending protocol

// =============================================================
//                    PRIVATE YIELD PROOF
// =============================================================

/// Private inputs (hidden from verifier)
struct PrivateYieldInputs {
    // ERT data
    ert: ERT,
    executor_private_key: Field,

    // Yield action details (ALL PRIVATE)
    adapter: Field,               // Yield protocol adapter address
    asset: Field,                 // Asset being deposited/withdrawn
    amount: Field,                // Amount of asset
    action_type: Field,           // 0=stake, 1=unstake, 2=supply, 3=withdraw

    // For withdrawals/unstaking - expected output
    min_output: Field,            // Minimum expected output

    // Merkle proofs for whitelist verification
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    asset_merkle_path: [Field; 20],
    asset_merkle_indices: [bool; 20],

    // Nonce for commitment uniqueness
    nonce: Field,
}

/// Public inputs (visible to verifier)
struct PublicYieldInputs {
    ert_id: Field,                    // Which ERT is being used
    ert_ownership_commitment: Field,  // Commitment to ERT ownership
    current_timestamp: u64,           // Current block timestamp
    protocol_category: Field,         // 0=staking, 1=lending (general only)
    action_commitment: Field,         // Commitment to the yield action
}

/// Output attestations (public)
struct YieldAttestations {
    ert_ownership_valid: bool,
    adapter_allowed: bool,
    asset_allowed: bool,
    amount_within_limit: bool,
    capital_available: bool,
    not_expired: bool,
}

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

/// Check if action is a deposit (stake or supply)
fn is_deposit_action(action_type: Field) -> bool {
    // action_type 0 (stake) or 2 (supply) are deposits
    (action_type == 0) | (action_type == 2)
}

/// Check if action is a withdrawal (unstake or withdraw)
fn is_withdrawal_action(action_type: Field) -> bool {
    // action_type 1 (unstake) or 3 (withdraw) are withdrawals
    (action_type == 1) | (action_type == 3)
}

/// Get protocol category from action type
fn get_protocol_category(action_type: Field) -> Field {
    // 0, 1 = staking (category 0)
    // 2, 3 = lending (category 1)
    if (action_type == 0) | (action_type == 1) {
        0 // staking
    } else {
        1 // lending
    }
}

// =============================================================
//                    MAIN CIRCUIT
// =============================================================

fn main(
    // Private inputs
    ert: ERT,
    executor_private_key: Field,
    adapter: Field,
    asset: Field,
    amount: Field,
    action_type: Field,
    min_output: Field,
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    asset_merkle_path: [Field; 20],
    asset_merkle_indices: [bool; 20],
    nonce: Field,

    // Public inputs
    ert_id: pub Field,
    ert_ownership_commitment: pub Field,
    current_timestamp: pub u64,
    protocol_category: pub Field,
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
    assert(adapter_allowed, "Yield adapter not in allowed list");

    // ==========================================================
    // 3. VERIFY ASSET IS ALLOWED
    // ==========================================================

    let asset_allowed = verify_asset_allowed(
        asset,
        ert.constraints,
        asset_merkle_path,
        asset_merkle_indices
    );
    assert(asset_allowed, "Asset not in allowed list");

    // ==========================================================
    // 4. VERIFY ACTION TYPE IS VALID
    // ==========================================================

    // Action type must be 0, 1, 2, or 3
    assert(
        (action_type == 0) | (action_type == 1) | (action_type == 2) | (action_type == 3),
        "Invalid action type"
    );

    // Verify the public protocol category matches the action
    let computed_category = get_protocol_category(action_type);
    assert(computed_category == protocol_category, "Protocol category mismatch");

    // ==========================================================
    // 5. VERIFY AMOUNT WITHIN LIMITS
    // ==========================================================

    // Range check the amount
    assert(range_check_64(amount), "Amount exceeds 64-bit range");

    // Check position size limit
    let amount_within_limit = check_position_size(
        amount,
        ert.status.capital_limit,
        ert.constraints.max_position_size_bps
    );
    assert(amount_within_limit, "Amount exceeds position size limit");

    // ==========================================================
    // 6. VERIFY CAPITAL CONSTRAINTS
    // ==========================================================

    // For deposits, check available capital
    // For withdrawals, we just verify the action is valid
    if is_deposit_action(action_type) {
        let capital_available = check_available_capital(
            amount,
            ert.status.capital_limit,
            ert.status.capital_deployed
        );
        assert(capital_available, "Insufficient available capital for deposit");
    }

    // For withdrawals, verify min_output is reasonable (non-zero)
    if is_withdrawal_action(action_type) {
        assert(min_output != 0, "Withdrawal must have non-zero min output");
    }

    // ==========================================================
    // 7. VERIFY ERT NOT EXPIRED
    // ==========================================================

    let not_expired = check_not_expired(
        ert.status.expiry_time,
        current_timestamp
    );
    assert(not_expired, "ERT has expired");

    // ==========================================================
    // 8. VERIFY ACTION COMMITMENT
    // ==========================================================

    // Create hash of yield action data for commitment
    let yield_data_hash = poseidon::bn254::hash_5([
        adapter,
        asset,
        amount,
        action_type,
        min_output
    ]);

    // Verify the action commitment matches
    let computed_commitment = generate_action_commitment(
        ert_id,
        1, // action_type = yield (in action commitment context)
        yield_data_hash,
        current_timestamp,
        nonce
    );
    assert(computed_commitment == action_commitment, "Action commitment mismatch");

    // ==========================================================
    // All checks passed - proof is valid
    // The verifier learns:
    // - ERT #X executed a compliant yield action
    // - It was either staking or lending (general category)
    // - All constraints were satisfied
    //
    // The verifier does NOT learn:
    // - Which yield protocol was used
    // - Which asset was deposited/withdrawn
    // - How much was involved
    // - Specific action (stake vs unstake, etc.)
    // ==========================================================
}

// =============================================================
//                    TEST CASES
// =============================================================

#[test]
fn test_valid_stake_proof() {
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
            capital_deployed: 1000000000, // 1000 USDC already deployed
            start_time: 1700000000,
            expiry_time: 1800000000,
            is_active: true,
        },
    };

    // Verify structure compiles and basic checks
    assert(ert.status.is_active);
    assert(is_deposit_action(0)); // stake is deposit
    assert(is_deposit_action(2)); // supply is deposit
    assert(is_withdrawal_action(1)); // unstake is withdrawal
    assert(is_withdrawal_action(3)); // withdraw is withdrawal
    assert(get_protocol_category(0) == 0); // stake -> staking
    assert(get_protocol_category(1) == 0); // unstake -> staking
    assert(get_protocol_category(2) == 1); // supply -> lending
    assert(get_protocol_category(3) == 1); // withdraw -> lending
}

#[test]
fn test_action_type_validation() {
    // Test valid action types
    assert(is_deposit_action(0) == true);
    assert(is_deposit_action(2) == true);
    assert(is_withdrawal_action(1) == true);
    assert(is_withdrawal_action(3) == true);

    // Test category mapping
    assert(get_protocol_category(0) == 0);
    assert(get_protocol_category(1) == 0);
    assert(get_protocol_category(2) == 1);
    assert(get_protocol_category(3) == 1);
}
