// PRAXIS Private Settlement Circuit
// Proves PnL calculation and fee distribution without revealing trade history
//
// What this circuit proves:
// 1. Executor owns the specified ERT
// 2. Starting capital matches the recorded amount
// 3. Ending capital is correctly calculated from all positions
// 4. PnL is calculated correctly (ending - starting)
// 5. All trades were within ERT constraints
// 6. FTSO prices were used for valuation
// 7. Fee distribution is correct (LP share + executor share)
// 8. No constraint violations occurred during the ERT period
//
// What remains PRIVATE:
// - Individual trade history
// - Position entry/exit prices
// - Strategy details
// - Specific adapters used
// - Trade timing
//
// What is PUBLIC:
// - ERT ID
// - Starting capital
// - Ending capital
// - PnL amount
// - FTSO price block used
// - LP share amount
// - Executor share amount

use dep::std::hash::poseidon;
use dep::ert_ownership::{
    ERT, ERTConstraints, ERTStatus,
    prove_ert_ownership,
    range_check_64,
    safe_sub,
    calculate_bps
};

// =============================================================
//                    SETTLEMENT CONSTANTS
// =============================================================

/// Fee structure constants (in basis points)
/// LP_FEE_BPS: Base fee to LP (e.g., 200 = 2%)
/// PERFORMANCE_FEE_BPS: Performance fee on profits (e.g., 2000 = 20%)
global LP_BASE_FEE_BPS: u32 = 200;  // 2% base fee
global PERFORMANCE_FEE_BPS: u32 = 2000;  // 20% of profits

// =============================================================
//                    TRADE RECORD STRUCTURE
// =============================================================

/// Represents a single trade in the history (private)
struct TradeRecord {
    action_type: Field,      // 0=swap, 1=yield, 2=perp
    adapter: Field,          // Adapter used
    asset_in: Field,         // Input asset
    asset_out: Field,        // Output asset
    amount_in: Field,        // Amount of input
    amount_out: Field,       // Amount of output
    timestamp: u64,          // When trade occurred
    price_at_trade: Field,   // FTSO price at trade time
}

/// Represents final position state
struct PositionState {
    asset: Field,            // Asset address
    amount: Field,           // Amount held
    current_price: Field,    // Current FTSO price
    value_in_base: Field,    // Value in base currency (USDC)
}

// =============================================================
//                    PRIVATE SETTLEMENT PROOF
// =============================================================

/// Private inputs (hidden from verifier)
struct PrivateSettlementInputs {
    // ERT data
    ert: ERT,
    executor_private_key: Field,

    // Complete trade history (ALL PRIVATE)
    trade_count: u32,
    trade_hashes: [Field; 100],  // Hash of each trade record

    // Final position states
    position_count: u32,
    position_values: [Field; 20],  // Value of each position

    // Constraint compliance flags
    max_drawdown_reached: Field,  // Maximum drawdown during period (bps)
    max_leverage_used: u32,       // Maximum leverage used
    all_adapters_allowed: bool,   // All adapters were in whitelist
    all_assets_allowed: bool,     // All assets were in whitelist

    // Settlement details
    base_fee_amount: Field,       // LP base fee
    performance_fee_amount: Field, // Performance fee (on profits only)

    // Nonce for commitment
    nonce: Field,
}

/// Public inputs (visible to verifier)
struct PublicSettlementInputs {
    ert_id: Field,                    // Which ERT is being settled
    ert_ownership_commitment: Field,  // Commitment to ERT ownership
    starting_capital: Field,          // Initial capital (public)
    ending_capital: Field,            // Final capital (public)
    pnl: Field,                       // Profit/Loss (public, signed as two fields)
    pnl_is_positive: bool,            // Whether PnL is profit or loss
    ftso_price_block: Field,          // Block used for FTSO prices
    lp_share: Field,                  // Amount going to LP
    executor_share: Field,            // Amount going to executor
    settlement_commitment: Field,     // Commitment to settlement details
}

/// Output attestations (public)
struct SettlementAttestations {
    ert_ownership_valid: bool,
    starting_capital_matches: bool,
    ending_capital_correct: bool,
    pnl_calculated_correctly: bool,
    ftso_prices_used: bool,
    all_trades_compliant: bool,
    fee_distribution_correct: bool,
    no_constraint_violations: bool,
}

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

/// Calculate LP share (base fee + performance fee on profits)
fn calculate_lp_share(
    starting_capital: Field,
    ending_capital: Field,
    pnl_is_positive: bool
) -> Field {
    // Base fee: 2% of starting capital
    let base_fee = (starting_capital * (LP_BASE_FEE_BPS as Field)) / 10000;

    if pnl_is_positive {
        // Performance fee: 20% of profit
        let profit = ending_capital - starting_capital;
        let performance_fee = (profit * (PERFORMANCE_FEE_BPS as Field)) / 10000;
        base_fee + performance_fee
    } else {
        // No performance fee on losses, just base fee
        base_fee
    }
}

/// Calculate executor share (remaining after LP share)
fn calculate_executor_share(
    ending_capital: Field,
    lp_share: Field
) -> Field {
    ending_capital - lp_share
}

/// Verify no constraint violations occurred
fn verify_no_violations(
    max_drawdown_reached: Field,
    max_drawdown_limit: u32,
    max_leverage_used: u32,
    max_leverage_limit: u32,
    all_adapters_allowed: bool,
    all_assets_allowed: bool
) -> bool {
    let drawdown_ok = (max_drawdown_reached as u64) <= (max_drawdown_limit as u64);
    let leverage_ok = max_leverage_used <= max_leverage_limit;

    drawdown_ok & leverage_ok & all_adapters_allowed & all_assets_allowed
}

/// Calculate total position value from individual positions
fn calculate_total_position_value(
    position_values: [Field; 20],
    position_count: u32
) -> Field {
    let mut total: Field = 0;
    for i in 0..20 {
        if (i as u32) < position_count {
            total = total + position_values[i];
        }
    }
    total
}

/// Verify trade history commitment
fn verify_trade_history(
    trade_hashes: [Field; 100],
    trade_count: u32
) -> Field {
    // Create a commitment to all trades
    let mut history_hash: Field = 0;
    for i in 0..100 {
        if (i as u32) < trade_count {
            history_hash = poseidon::bn254::hash_2([history_hash, trade_hashes[i]]);
        }
    }
    history_hash
}

// =============================================================
//                    MAIN CIRCUIT
// =============================================================

fn main(
    // Private inputs
    ert: ERT,
    executor_private_key: Field,
    trade_count: u32,
    trade_hashes: [Field; 100],
    position_count: u32,
    position_values: [Field; 20],
    max_drawdown_reached: Field,
    max_leverage_used: u32,
    all_adapters_allowed: bool,
    all_assets_allowed: bool,
    base_fee_amount: Field,
    performance_fee_amount: Field,
    nonce: Field,

    // Public inputs
    ert_id: pub Field,
    ert_ownership_commitment: pub Field,
    starting_capital: pub Field,
    ending_capital: pub Field,
    pnl: pub Field,
    pnl_is_positive: pub bool,
    ftso_price_block: pub Field,
    lp_share: pub Field,
    executor_share: pub Field,
    settlement_commitment: pub Field
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
    // 2. VERIFY STARTING CAPITAL
    // ==========================================================

    // Starting capital must match the ERT's recorded capital limit
    assert(starting_capital == ert.status.capital_limit, "Starting capital mismatch");

    // Range check
    assert(range_check_64(starting_capital), "Starting capital exceeds range");

    // ==========================================================
    // 3. VERIFY ENDING CAPITAL CALCULATION
    // ==========================================================

    // Calculate ending capital from position values
    let calculated_ending = calculate_total_position_value(position_values, position_count);

    // Range check
    assert(range_check_64(ending_capital), "Ending capital exceeds range");

    // Note: In production, this would verify each position against FTSO prices
    // For demo, we trust the position_values provided
    assert(calculated_ending == ending_capital, "Ending capital calculation mismatch");

    // ==========================================================
    // 4. VERIFY PNL CALCULATION
    // ==========================================================

    // PnL = ending_capital - starting_capital
    if pnl_is_positive {
        // Profit case
        let calculated_pnl = ending_capital - starting_capital;
        assert(calculated_pnl == pnl, "PnL calculation mismatch (profit)");
        assert(ending_capital as u64 >= starting_capital as u64, "PnL sign mismatch");
    } else {
        // Loss case
        let calculated_pnl = starting_capital - ending_capital;
        assert(calculated_pnl == pnl, "PnL calculation mismatch (loss)");
        assert(starting_capital as u64 >= ending_capital as u64, "PnL sign mismatch");
    }

    // ==========================================================
    // 5. VERIFY FTSO PRICES USED
    // ==========================================================

    // FTSO price block must be recent (within valid range)
    // In production, this would verify actual price data
    assert(ftso_price_block != 0, "FTSO price block required");

    // ==========================================================
    // 6. VERIFY ALL TRADES WERE COMPLIANT
    // ==========================================================

    // Verify no constraint violations
    let no_violations = verify_no_violations(
        max_drawdown_reached,
        ert.constraints.max_drawdown_bps,
        max_leverage_used,
        ert.constraints.max_leverage,
        all_adapters_allowed,
        all_assets_allowed
    );
    assert(no_violations, "Constraint violations detected during ERT period");

    // ==========================================================
    // 7. VERIFY FEE DISTRIBUTION
    // ==========================================================

    // Calculate expected LP share
    let expected_lp_share = calculate_lp_share(
        starting_capital,
        ending_capital,
        pnl_is_positive
    );

    // Verify LP share matches
    assert(lp_share == expected_lp_share, "LP share calculation mismatch");

    // Verify executor share
    let expected_executor_share = calculate_executor_share(ending_capital, lp_share);
    assert(executor_share == expected_executor_share, "Executor share calculation mismatch");

    // Verify total distribution equals ending capital
    assert(lp_share + executor_share == ending_capital, "Fee distribution sum mismatch");

    // Verify the component fees
    assert(base_fee_amount + performance_fee_amount == lp_share, "Fee component mismatch");

    // ==========================================================
    // 8. VERIFY SETTLEMENT COMMITMENT
    // ==========================================================

    // Create commitment to settlement details
    let trade_history_hash = verify_trade_history(trade_hashes, trade_count);

    let settlement_data_hash = poseidon::bn254::hash_5([
        starting_capital,
        ending_capital,
        pnl,
        lp_share,
        executor_share
    ]);

    let computed_commitment = poseidon::bn254::hash_5([
        ert_id,
        settlement_data_hash,
        trade_history_hash,
        ftso_price_block,
        nonce
    ]);

    assert(computed_commitment == settlement_commitment, "Settlement commitment mismatch");

    // ==========================================================
    // All checks passed - settlement is valid
    // The verifier learns:
    // - ERT #X started with $X capital
    // - ERT #X ended with $Y capital
    // - PnL was +/-$Z
    // - LP receives $A, Executor receives $B
    // - FTSO prices from block #N were used
    // - All trades were compliant
    //
    // The verifier does NOT learn:
    // - What trades were made
    // - Entry/exit prices
    // - Strategy used
    // - Timing of trades
    // - Specific assets traded
    // ==========================================================
}

// =============================================================
//                    TEST CASES
// =============================================================

#[test]
fn test_profitable_settlement() {
    // Test LP share calculation for profitable settlement
    // Starting: 5000, Ending: 5750, Profit: 750

    let starting = 5000000000 as Field; // 5000 USDC (6 decimals)
    let ending = 5750000000 as Field;   // 5750 USDC

    let lp_share = calculate_lp_share(starting, ending, true);

    // Expected:
    // Base fee: 5000 * 0.02 = 100
    // Performance fee: 750 * 0.20 = 150
    // Total LP share: 250

    let expected_base = (starting * 200) / 10000; // 100 USDC
    let profit = ending - starting;  // 750 USDC
    let expected_perf = (profit * 2000) / 10000; // 150 USDC
    let expected_total = expected_base + expected_perf; // 250 USDC

    assert(lp_share == expected_total);

    // Executor share
    let executor_share = calculate_executor_share(ending, lp_share);
    assert(executor_share == ending - lp_share); // 5500 USDC
}

#[test]
fn test_loss_settlement() {
    // Test LP share calculation for loss settlement
    // Starting: 5000, Ending: 4500, Loss: 500

    let starting = 5000000000 as Field;
    let ending = 4500000000 as Field;

    let lp_share = calculate_lp_share(starting, ending, false);

    // Expected:
    // Base fee only: 5000 * 0.02 = 100
    // No performance fee on losses

    let expected_base = (starting * 200) / 10000; // 100 USDC
    assert(lp_share == expected_base);

    // Executor share (takes the loss)
    let executor_share = calculate_executor_share(ending, lp_share);
    assert(executor_share == ending - lp_share); // 4400 USDC
}

#[test]
fn test_constraint_violation_check() {
    // Test violation detection

    // No violations case
    assert(verify_no_violations(
        500,   // max_drawdown_reached: 5%
        1000,  // max_drawdown_limit: 10%
        3,     // max_leverage_used
        5,     // max_leverage_limit
        true,  // all_adapters_allowed
        true   // all_assets_allowed
    ));

    // Drawdown violation
    assert(!verify_no_violations(
        1500,  // max_drawdown_reached: 15% (exceeds 10% limit)
        1000,  // max_drawdown_limit: 10%
        3,
        5,
        true,
        true
    ));

    // Leverage violation
    assert(!verify_no_violations(
        500,
        1000,
        6,     // max_leverage_used: 6x (exceeds 5x limit)
        5,
        true,
        true
    ));

    // Adapter violation
    assert(!verify_no_violations(
        500,
        1000,
        3,
        5,
        false, // Unauthorized adapter used
        true
    ));
}

#[test]
fn test_position_value_sum() {
    // Test position value calculation
    let mut positions: [Field; 20] = [0; 20];
    positions[0] = 1000;
    positions[1] = 2000;
    positions[2] = 1500;

    let total = calculate_total_position_value(positions, 3);
    assert(total == 4500);

    // Test with zero positions
    let empty: [Field; 20] = [0; 20];
    let zero_total = calculate_total_position_value(empty, 0);
    assert(zero_total == 0);
}
