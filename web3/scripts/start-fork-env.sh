#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         PRAXIS Fork Environment Setup                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Configuration
FORK_RPC="https://flare-api.flare.network/ext/C/rpc"
LOCAL_PORT=8546
CHAIN_ID=31337  # Local fork chain ID (different from Flare mainnet to avoid MetaMask confusion)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB3_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    log_info "Starting Anvil fork on port $LOCAL_PORT..."

    # Create log directory
    mkdir -p /tmp/praxis

    anvil \
        --fork-url $FORK_RPC \
        --port $LOCAL_PORT \
        --chain-id $CHAIN_ID \
        --block-time 1 \
        --accounts 10 \
        --balance 10000 \
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

# Deploy contracts
deploy_contracts() {
    log_info "Deploying PRAXIS contracts..."

    cd "$WEB3_DIR"

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Run deployment
    npx hardhat run scripts/deploy/mega-fork-deploy.ts --network anvilFork

    if [ $? -eq 0 ]; then
        log_success "Deployment complete!"
    else
        log_error "Deployment failed!"
        exit 1
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              Environment Ready!                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Anvil RPC:      http://127.0.0.1:$LOCAL_PORT"
    echo "Chain ID:       $CHAIN_ID"
    echo "Anvil PID:      $(cat /tmp/praxis/anvil.pid)"
    echo ""
    echo "Addresses:      $WEB3_DIR/deployed-addresses.json"
    echo "Anvil Logs:     /tmp/praxis/anvil.log"
    echo ""
    echo "To stop Anvil:  kill \$(cat /tmp/praxis/anvil.pid)"
    echo "Or run:         $SCRIPT_DIR/stop-fork-env.sh"
    echo ""
    echo "Test accounts (10000 FLR each):"
    echo "  Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    echo "  Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    echo "  Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    echo ""
    echo "Private keys (for MetaMask/testing):"
    echo "  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo "  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    echo "  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    echo ""
}

# Main execution
main() {
    check_anvil
    check_node
    kill_existing
    start_anvil
    deploy_contracts
    print_summary
}

main "$@"
