// PRAXIS ERT Ownership Verification
// Shared library for proving ERT ownership and constraint compliance

use std::hash::poseidon2::Poseidon2;

// =============================================================
//                    ERT CONSTRAINTS STRUCTURE
// =============================================================

/// ERT constraints that govern execution rights
struct ERTConstraints {
    max_leverage: u32,           // Maximum leverage allowed (e.g., 5 = 5x)
    max_drawdown_bps: u32,       // Maximum drawdown in basis points (e.g., 1000 = 10%)
    max_position_size_bps: u32,  // Max position as % of capital (e.g., 5000 = 50%)
    allowed_adapters_root: Field, // Merkle root of allowed adapter addresses
    allowed_assets_root: Field,   // Merkle root of allowed asset addresses
}

/// ERT status information
struct ERTStatus {
    capital_limit: Field,        // Total capital allocated to this ERT
    capital_deployed: Field,     // Currently deployed capital
    start_time: u64,             // ERT start timestamp
    expiry_time: u64,            // ERT expiry timestamp
    is_active: bool,             // Whether ERT is currently active
}

/// Complete ERT data structure
struct ERT {
    token_id: Field,             // NFT token ID
    executor: Field,             // Executor address (as field)
    vault: Field,                // Vault address (as field)
    constraints: ERTConstraints,
    status: ERTStatus,
}

// =============================================================
//                    OWNERSHIP PROOF
// =============================================================

/// Proves ownership of an ERT without revealing the executor address
/// Uses Poseidon hash for efficient in-circuit computation
pub fn prove_ert_ownership(
    ert: ERT,
    executor_private_key: Field,
    ert_ownership_commitment: Field  // Public: hash(executor, token_id)
) -> bool {
    // Derive executor address from private key (simplified)
    let derived_executor = poseidon::bn254::hash_1([executor_private_key]);

    // Verify executor matches ERT
    assert(derived_executor == ert.executor, "Executor mismatch");

    // Verify ownership commitment
    let computed_commitment = poseidon::bn254::hash_2([ert.executor, ert.token_id]);
    assert(computed_commitment == ert_ownership_commitment, "Ownership commitment mismatch");

    // Verify ERT is active
    assert(ert.status.is_active, "ERT is not active");

    true
}

// =============================================================
//                    MERKLE PROOF VERIFICATION
// =============================================================

/// Verify an address is in the allowed set using Merkle proof
pub fn verify_merkle_inclusion(
    leaf: Field,
    root: Field,
    path: [Field; 20],      // Merkle path (supports up to 2^20 leaves)
    indices: [bool; 20]     // Path direction (left = false, right = true)
) -> bool {
    let mut current = leaf;

    for i in 0..20 {
        let sibling = path[i];
        if indices[i] {
            // Current is on the right
            current = poseidon::bn254::hash_2([sibling, current]);
        } else {
            // Current is on the left
            current = poseidon::bn254::hash_2([current, sibling]);
        }
    }

    current == root
}

/// Verify an adapter is allowed for this ERT
pub fn verify_adapter_allowed(
    adapter_address: Field,
    constraints: ERTConstraints,
    merkle_path: [Field; 20],
    merkle_indices: [bool; 20]
) -> bool {
    verify_merkle_inclusion(
        adapter_address,
        constraints.allowed_adapters_root,
        merkle_path,
        merkle_indices
    )
}

/// Verify an asset is allowed for this ERT
pub fn verify_asset_allowed(
    asset_address: Field,
    constraints: ERTConstraints,
    merkle_path: [Field; 20],
    merkle_indices: [bool; 20]
) -> bool {
    verify_merkle_inclusion(
        asset_address,
        constraints.allowed_assets_root,
        merkle_path,
        merkle_indices
    )
}

// =============================================================
//                    CONSTRAINT VALIDATION
// =============================================================

/// Check if leverage is within ERT limits
pub fn check_leverage_limit(leverage: u32, constraints: ERTConstraints) -> bool {
    leverage <= constraints.max_leverage
}

/// Check if position size is within ERT limits
pub fn check_position_size(
    position_size: Field,
    capital_limit: Field,
    max_position_bps: u32
) -> bool {
    // position_size <= capital_limit * max_position_bps / 10000
    let max_size = (capital_limit * (max_position_bps as Field)) / 10000;
    // Note: Field comparison requires conversion or range check
    // For simplicity, we assume position_size fits in u64
    position_size as u64 <= max_size as u64
}

/// Check if there's sufficient available capital
pub fn check_available_capital(
    amount_needed: Field,
    capital_limit: Field,
    capital_deployed: Field
) -> bool {
    let available = capital_limit - capital_deployed;
    amount_needed as u64 <= available as u64
}

/// Check if ERT has not expired
pub fn check_not_expired(expiry_time: u64, current_time: u64) -> bool {
    current_time < expiry_time
}

// =============================================================
//                    COMMITMENT GENERATION
// =============================================================

/// Generate a commitment to an action (for later reveal if needed)
pub fn generate_action_commitment(
    ert_id: Field,
    action_type: Field,  // 0=swap, 1=yield, 2=perp, 3=settlement
    action_data_hash: Field,
    timestamp: u64,
    nonce: Field
) -> Field {
    poseidon::bn254::hash_5([
        ert_id,
        action_type,
        action_data_hash,
        timestamp as Field,
        nonce
    ])
}

// =============================================================
//                    UTILITY FUNCTIONS
// =============================================================

/// Convert address bytes to Field
pub fn address_to_field(addr_bytes: [u8; 20]) -> Field {
    let mut result: Field = 0;
    for i in 0..20 {
        result = result * 256 + (addr_bytes[i] as Field);
    }
    result
}

/// Range check for amounts (ensures value fits in specified bits)
pub fn range_check_64(value: Field) -> bool {
    value as u64 as Field == value
}

/// Safe subtraction with underflow check
pub fn safe_sub(a: Field, b: Field) -> Field {
    assert(a as u64 >= b as u64, "Underflow in subtraction");
    a - b
}

/// Calculate percentage (basis points)
pub fn calculate_bps(amount: Field, total: Field) -> u32 {
    if total == 0 {
        0
    } else {
        ((amount * 10000) / total) as u32
    }
}
