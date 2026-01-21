#!/bin/bash
# Removed set -e to prevent script from exiting on non-critical errors

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         PRAXIS Demo Environment Setup                          ║"
echo "║  Creates a warm state with ~14 days of protocol history        ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Configuration
# Primary RPC - can be overridden with FORK_RPC env var
FORK_RPC="${FORK_RPC:-https://flare-api.flare.network/ext/C/rpc}"
LOCAL_PORT=8546
CHAIN_ID=31337  # Local fork chain ID (MetaMask friendly)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB3_DIR="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$(dirname "$WEB3_DIR")/client"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo -e "${CYAN}→${NC} $1"
}

# Check if Anvil is installed
check_anvil() {
    if ! command -v anvil &> /dev/null; then
        log_error "Anvil not found. Installing Foundry..."
        curl -L https://foundry.paradigm.xyz | bash
        export PATH="$HOME/.foundry/bin:$PATH"
        foundryup

        if ! command -v anvil &> /dev/null; then
            log_error "Failed to install Anvil. Please install manually:"
            echo "  curl -L https://foundry.paradigm.xyz | bash"
            echo "  foundryup"
            exit 1
        fi
    fi
    log_success "Anvil found: $(anvil --version | head -1)"
}

# Check if Node.js and npm are installed
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js v18 or higher."
        exit 1
    fi
    log_success "Node.js found: $(node --version)"
}

# Kill any existing Anvil process on the port
kill_existing() {
    if lsof -i :$LOCAL_PORT > /dev/null 2>&1; then
        log_warn "Killing existing process on port $LOCAL_PORT"
        kill $(lsof -t -i :$LOCAL_PORT) 2>/dev/null || true
        sleep 2
    fi
}

# Start Anvil fork
start_anvil() {
    log_step "Starting Anvil fork on port $LOCAL_PORT with chain ID $CHAIN_ID..."

    # Create log directory
    mkdir -p /tmp/praxis

    anvil \
        --fork-url $FORK_RPC \
        --port $LOCAL_PORT \
        --chain-id $CHAIN_ID \
        --block-time 1 \
        --accounts 10 \
        --balance 10000 \
        --timeout 120000 \
        --retries 5 \
        --no-rate-limit \
        --compute-units-per-second 1000 \
        > /tmp/praxis/anvil.log 2>&1 &

    ANVIL_PID=$!
    echo $ANVIL_PID > /tmp/praxis/anvil.pid

    log_info "Anvil PID: $ANVIL_PID"
    log_info "Logs: /tmp/praxis/anvil.log"

    # Wait for Anvil to start
    log_info "Waiting for Anvil to initialize..."

    MAX_RETRIES=30
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if cast block-number --rpc-url http://127.0.0.1:$LOCAL_PORT 2>/dev/null; then
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 1
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Anvil failed to start. Check /tmp/praxis/anvil.log"
        cat /tmp/praxis/anvil.log
        exit 1
    fi

    BLOCK=$(cast block-number --rpc-url http://127.0.0.1:$LOCAL_PORT)
    log_success "Fork running at block $BLOCK"
}

# Deploy contracts with warm state
deploy_warm_state() {
    log_step "Deploying PRAXIS contracts with warm state (this may take a minute)..."

    cd "$WEB3_DIR"

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Run warm state deployment
    npx hardhat run scripts/deploy/warm-state-seed.ts --network anvilFork

    if [ $? -eq 0 ]; then
        log_success "Warm state deployment complete!"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

# Update client with deployed addresses
update_client_addresses() {
    log_step "Updating client with deployed addresses..."

    if [ -f "$WEB3_DIR/deployed-addresses.json" ]; then
        log_success "Deployed addresses saved to: $WEB3_DIR/deployed-addresses.json"
        echo ""
        echo "To use in the client, copy addresses to:"
        echo "  $CLIENT_DIR/lib/contracts/addresses.ts"
        echo ""
        echo "Or set environment variable:"
        echo "  NEXT_PUBLIC_USE_LOCAL_FORK=true"
    fi
}

# Print summary and MetaMask instructions
print_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              Demo Environment Ready!                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    ANVIL RPC DETAILS"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  RPC URL:      http://127.0.0.1:$LOCAL_PORT"
    echo "  Chain ID:     $CHAIN_ID"
    echo "  Currency:     FLR"
    echo "  Anvil PID:    $(cat /tmp/praxis/anvil.pid)"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "              ADD TO METAMASK (Manual Steps)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  1. Open MetaMask → Settings → Networks → Add Network"
    echo ""
    echo "  2. Fill in these details:"
    echo "     ┌─────────────────────────────────────────────────┐"
    echo "     │ Network Name:    Flare Fork (Local)            │"
    echo "     │ RPC URL:         http://127.0.0.1:8546         │"
    echo "     │ Chain ID:        31337                          │"
    echo "     │ Currency Symbol: FLR                            │"
    echo "     │ Block Explorer:  (leave blank)                  │"
    echo "     └─────────────────────────────────────────────────┘"
    echo ""
    echo "  3. Import test account (with 10,000 FLR):"
    echo "     Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    TEST ACCOUNTS"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  All accounts have 10,000 FLR"
    echo ""
    echo "  Account 0 (Deployer/LP1):"
    echo "    Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    echo "    Key:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo ""
    echo "  Account 1 (LP2):"
    echo "    Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    echo "    Key:     0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    echo ""
    echo "  Account 2 (LP3):"
    echo "    Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    echo "    Key:     0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    echo ""
    echo "  Account 3 (Executor1 - VERIFIED tier):"
    echo "    Address: 0x90F79bf6EB2c4f870365E785982E1f101E93b906"
    echo "    Key:     0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
    echo ""
    echo "  Account 4 (Executor2 - NOVICE tier):"
    echo "    Address: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
    echo "    Key:     0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    echo ""
    echo "  Account 5 (Executor3 - UNVERIFIED tier):"
    echo "    Address: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
    echo "    Key:     0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    START THE FRONTEND"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  cd $CLIENT_DIR"
    echo "  NEXT_PUBLIC_USE_LOCAL_FORK=true npm run dev"
    echo ""
    echo "  Then open: http://localhost:3000"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    PROTOCOL STATE"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  The protocol has been running for ~14 simulated days:"
    echo ""
    echo "  Vault TVL:        ~\$650,000 USDC"
    echo "  Insurance Fund:   ~\$5,000 USDC"
    echo "  Active Executors: 3 (with varying reputation)"
    echo ""
    echo "  Executor Tiers:"
    echo "    - Account 3: VERIFIED (15 settlements)"
    echo "    - Account 4: NOVICE (5 settlements)"
    echo "    - Account 5: UNVERIFIED (new)"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                    STOP THE ENVIRONMENT"
    echo "═══════════════════════════════════════════════════════════════"
    echo "  kill \$(cat /tmp/praxis/anvil.pid)"
    echo "  # or"
    echo "  $SCRIPT_DIR/stop-fork-env.sh"
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    log_info "Shutting down Anvil..."
    if [ -f /tmp/praxis/anvil.pid ]; then
        kill $(cat /tmp/praxis/anvil.pid) 2>/dev/null || true
        rm /tmp/praxis/anvil.pid
    fi
    log_success "Cleanup complete"
    exit 0
}

# Main execution
main() {
    check_anvil
    check_node
    kill_existing
    start_anvil
    deploy_warm_state
    update_client_addresses
    print_summary

    # Keep the script running and show Anvil logs
    echo ""
    log_info "Demo environment is running. Press Ctrl+C to stop."
    log_info "Tailing Anvil logs..."
    echo ""

    # Set up cleanup trap
    trap cleanup SIGINT SIGTERM

    # Tail the Anvil logs to keep the script running
    tail -f /tmp/praxis/anvil.log
}

main "$@"
