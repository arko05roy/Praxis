// PRAXIS Private Perpetual Position Circuit
// Proves a perpetual position action is valid without revealing direction, size, or leverage
//
// What this circuit proves:
// 1. Executor owns the specified ERT
// 2. The perp adapter is in the ERT's allowed adapters list
// 3. The market/asset is in the ERT's allowed assets list
// 4. The leverage is within the ERT's max leverage limit
// 5. The position size is within limits
// 6. There is sufficient collateral/margin
// 7. The ERT has not expired
//
// What remains PRIVATE:
// - Position direction (long/short)
// - Position size
// - Leverage used
// - Entry price target
// - Collateral amount
// - Market/trading pair
//
// What is PUBLIC:
// - ERT ID
// - Timestamp
// - Whether position exists (boolean)
// - Compliance attestations

use dep::std::hash::poseidon;
use dep::ert_ownership::{
    ERT, ERTConstraints, ERTStatus,
    prove_ert_ownership,
    verify_adapter_allowed,
    verify_asset_allowed,
    check_leverage_limit,
    check_position_size,
    check_available_capital,
    check_not_expired,
    generate_action_commitment,
    range_check_64,
    calculate_bps
};

// =============================================================
//                    PERP ACTION TYPES
// =============================================================

/// Perp action types (private)
/// 0 = open_long
/// 1 = open_short
/// 2 = close_long
/// 3 = close_short
/// 4 = increase_position
/// 5 = decrease_position
/// 6 = add_collateral
/// 7 = remove_collateral

// =============================================================
//                    PRIVATE PERP PROOF
// =============================================================

/// Private inputs (hidden from verifier)
struct PrivatePerpInputs {
    // ERT data
    ert: ERT,
    executor_private_key: Field,

    // Position details (ALL PRIVATE)
    adapter: Field,               // Perp protocol adapter address
    market: Field,                // Trading pair/market (e.g., FLR-USD)
    size: Field,                  // Position size in base units
    leverage: u32,                // Leverage multiplier (e.g., 5 = 5x)
    is_long: bool,                // Position direction
    collateral: Field,            // Collateral/margin amount
    action_type: Field,           // Action being performed

    // Price parameters (private)
    entry_price: Field,           // Desired entry price
    take_profit: Field,           // Take profit price (0 if none)
    stop_loss: Field,             // Stop loss price (0 if none)

    // Merkle proofs for whitelist verification
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    market_merkle_path: [Field; 20],
    market_merkle_indices: [bool; 20],

    // Nonce for commitment uniqueness
    nonce: Field,
}

/// Public inputs (visible to verifier)
struct PublicPerpInputs {
    ert_id: Field,                    // Which ERT is being used
    ert_ownership_commitment: Field,  // Commitment to ERT ownership
    current_timestamp: u64,           // Current block timestamp
    has_position: bool,               // Whether a position exists after action
    action_commitment: Field,         // Commitment to the position action
}

/// Output attestations (public)
struct PerpAttestations {
    ert_ownership_valid: bool,
    adapter_allowed: bool,
    market_allowed: bool,
    leverage_within_limit: bool,
    size_within_limit: bool,
    collateral_sufficient: bool,
    not_expired: bool,
}

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

/// Check if action opens a new position
fn is_open_action(action_type: Field) -> bool {
    (action_type == 0) | (action_type == 1)
}

/// Check if action closes a position
fn is_close_action(action_type: Field) -> bool {
    (action_type == 2) | (action_type == 3)
}

/// Check if action modifies position size
fn is_size_modification(action_type: Field) -> bool {
    (action_type == 4) | (action_type == 5)
}

/// Check if action modifies collateral
fn is_collateral_modification(action_type: Field) -> bool {
    (action_type == 6) | (action_type == 7)
}

/// Check if action requires capital (opening or increasing)
fn requires_capital(action_type: Field) -> bool {
    (action_type == 0) | (action_type == 1) | (action_type == 4) | (action_type == 6)
}

/// Calculate required collateral for a leveraged position
fn calculate_required_collateral(size: Field, leverage: u32) -> Field {
    // collateral = size / leverage
    size / (leverage as Field)
}

/// Verify collateral is sufficient for the position
fn verify_collateral_sufficient(
    collateral: Field,
    size: Field,
    leverage: u32
) -> bool {
    let required = calculate_required_collateral(size, leverage);
    collateral as u64 >= required as u64
}

// =============================================================
//                    MAIN CIRCUIT
// =============================================================

fn main(
    // Private inputs
    ert: ERT,
    executor_private_key: Field,
    adapter: Field,
    market: Field,
    size: Field,
    leverage: u32,
    is_long: bool,
    collateral: Field,
    action_type: Field,
    entry_price: Field,
    take_profit: Field,
    stop_loss: Field,
    adapter_merkle_path: [Field; 20],
    adapter_merkle_indices: [bool; 20],
    market_merkle_path: [Field; 20],
    market_merkle_indices: [bool; 20],
    nonce: Field,

    // Public inputs
    ert_id: pub Field,
    ert_ownership_commitment: pub Field,
    current_timestamp: pub u64,
    has_position: pub bool,
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
    assert(adapter_allowed, "Perp adapter not in allowed list");

    // ==========================================================
    // 3. VERIFY MARKET IS ALLOWED
    // ==========================================================

    let market_allowed = verify_asset_allowed(
        market,
        ert.constraints,
        market_merkle_path,
        market_merkle_indices
    );
    assert(market_allowed, "Market not in allowed list");

    // ==========================================================
    // 4. VERIFY ACTION TYPE IS VALID
    // ==========================================================

    // Action type must be 0-7
    assert(
        (action_type == 0) | (action_type == 1) | (action_type == 2) | (action_type == 3) |
        (action_type == 4) | (action_type == 5) | (action_type == 6) | (action_type == 7),
        "Invalid action type"
    );

    // Verify has_position consistency
    // After open: has_position should be true
    // After close: has_position should be false
    if is_open_action(action_type) {
        assert(has_position, "has_position must be true after opening");
    }
    if is_close_action(action_type) {
        assert(!has_position, "has_position must be false after closing");
    }

    // ==========================================================
    // 5. VERIFY LEVERAGE WITHIN LIMITS
    // ==========================================================

    let leverage_within_limit = check_leverage_limit(leverage, ert.constraints);
    assert(leverage_within_limit, "Leverage exceeds ERT limit");

    // Leverage must be at least 1x
    assert(leverage >= 1, "Leverage must be at least 1x");

    // ==========================================================
    // 6. VERIFY POSITION SIZE WITHIN LIMITS
    // ==========================================================

    // Range check the size
    assert(range_check_64(size), "Size exceeds 64-bit range");

    // Check position size as percentage of capital
    let size_within_limit = check_position_size(
        size,
        ert.status.capital_limit,
        ert.constraints.max_position_size_bps
    );
    assert(size_within_limit, "Position size exceeds limit");

    // ==========================================================
    // 7. VERIFY COLLATERAL REQUIREMENTS
    // ==========================================================

    // Range check collateral
    assert(range_check_64(collateral), "Collateral exceeds 64-bit range");

    // Verify collateral is sufficient for the leveraged position
    let collateral_sufficient = verify_collateral_sufficient(
        collateral,
        size,
        leverage
    );
    assert(collateral_sufficient, "Insufficient collateral for position");

    // For actions that require capital, verify availability
    if requires_capital(action_type) {
        let capital_available = check_available_capital(
            collateral,
            ert.status.capital_limit,
            ert.status.capital_deployed
        );
        assert(capital_available, "Insufficient available capital");
    }

    // ==========================================================
    // 8. VERIFY ERT NOT EXPIRED
    // ==========================================================

    let not_expired = check_not_expired(
        ert.status.expiry_time,
        current_timestamp
    );
    assert(not_expired, "ERT has expired");

    // ==========================================================
    // 9. VERIFY PRICE PARAMETERS (optional validation)
    // ==========================================================

    // Entry price must be non-zero for open actions
    if is_open_action(action_type) {
        assert(entry_price != 0, "Entry price required for opening position");
    }

    // If take_profit is set, it should be on the right side of entry
    // (For longs: take_profit > entry, for shorts: take_profit < entry)
    // This is handled by the protocol, we just verify they're valid fields

    // ==========================================================
    // 10. VERIFY ACTION COMMITMENT
    // ==========================================================

    // Create hash of perp action data for commitment
    // Include all private position details
    let direction_field: Field = if is_long { 1 } else { 0 };

    let position_data_hash = poseidon::bn254::hash_5([
        market,
        size,
        leverage as Field,
        direction_field,
        collateral
    ]);

    let action_data_hash = poseidon::bn254::hash_5([
        adapter,
        action_type,
        position_data_hash,
        entry_price,
        take_profit
    ]);

    // Verify the action commitment matches
    let computed_commitment = generate_action_commitment(
        ert_id,
        2, // action_type = perp (in action commitment context)
        action_data_hash,
        current_timestamp,
        nonce
    );
    assert(computed_commitment == action_commitment, "Action commitment mismatch");

    // ==========================================================
    // All checks passed - proof is valid
    // The verifier learns:
    // - ERT #X executed a compliant perp action
    // - Whether they have a position or not
    // - All constraints were satisfied
    //
    // The verifier does NOT learn:
    // - Long or short direction
    // - Position size
    // - Leverage used
    // - Entry/exit prices
    // - Which market is being traded
    // ==========================================================
}

// =============================================================
//                    TEST CASES
// =============================================================

#[test]
fn test_valid_perp_position() {
    // Create test ERT with leverage limits
    let ert = ERT {
        token_id: 42,
        executor: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,
        vault: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890,
        constraints: ERTConstraints {
            max_leverage: 10,  // Max 10x leverage
            max_drawdown_bps: 2000, // 20% max drawdown
            max_position_size_bps: 5000, // 50% max position
            allowed_adapters_root: 0x1111111111111111111111111111111111111111111111111111111111111111,
            allowed_assets_root: 0x2222222222222222222222222222222222222222222222222222222222222222,
        },
        status: ERTStatus {
            capital_limit: 10000000000, // 10000 USDC
            capital_deployed: 2000000000, // 2000 USDC deployed
            start_time: 1700000000,
            expiry_time: 1800000000,
            is_active: true,
        },
    };

    // Verify structure and helper functions
    assert(ert.status.is_active);
    assert(ert.constraints.max_leverage == 10);

    // Test action type helpers
    assert(is_open_action(0)); // open_long
    assert(is_open_action(1)); // open_short
    assert(is_close_action(2)); // close_long
    assert(is_close_action(3)); // close_short
    assert(is_size_modification(4)); // increase
    assert(is_size_modification(5)); // decrease
    assert(is_collateral_modification(6)); // add collateral
    assert(is_collateral_modification(7)); // remove collateral

    // Test capital requirement check
    assert(requires_capital(0)); // open_long needs capital
    assert(requires_capital(1)); // open_short needs capital
    assert(!requires_capital(2)); // close doesn't need new capital
    assert(!requires_capital(3)); // close doesn't need new capital
}

#[test]
fn test_leverage_validation() {
    let constraints = ERTConstraints {
        max_leverage: 5,
        max_drawdown_bps: 1000,
        max_position_size_bps: 5000,
        allowed_adapters_root: 0,
        allowed_assets_root: 0,
    };

    // Test leverage within limits
    assert(check_leverage_limit(1, constraints));
    assert(check_leverage_limit(5, constraints));
    assert(!check_leverage_limit(6, constraints));
    assert(!check_leverage_limit(10, constraints));
}

#[test]
fn test_collateral_calculation() {
    // 1000 size with 5x leverage = 200 required collateral
    let required = calculate_required_collateral(1000, 5);
    assert(required == 200);

    // Verify collateral sufficiency
    assert(verify_collateral_sufficient(200, 1000, 5)); // Exactly enough
    assert(verify_collateral_sufficient(300, 1000, 5)); // More than enough
    assert(!verify_collateral_sufficient(100, 1000, 5)); // Not enough
}
