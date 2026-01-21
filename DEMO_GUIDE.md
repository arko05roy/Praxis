# PRAXIS Demo Video Guide

This guide walks you through setting up and recording a demo video for PRAXIS - the Execution Rights Protocol.

## Quick Start (5 minutes)

### Step 1: Start the Demo Environment

```bash
cd /Users/arkoroy/Desktop/praxis/web3
./scripts/start-demo-env.sh
```

This script will:
- Start Anvil (Flare mainnet fork)
- Deploy all PRAXIS contracts
- Create a "warm" state with ~14 days of protocol history
- Set up test accounts with FLR and USDC

### Step 2: Add Network to MetaMask

**Manual Setup:**

1. Open MetaMask
2. Click the network dropdown at the top
3. Click "Add network" → "Add a network manually"
4. Enter these details:

| Field | Value |
|-------|-------|
| Network Name | `Flare Fork (Local)` |
| RPC URL | `http://127.0.0.1:8546` |
| Chain ID | `31337` |
| Currency Symbol | `FLR` |
| Block Explorer | (leave blank) |

5. Click "Save"

### Step 3: Import Test Account

1. In MetaMask, click the account icon → "Import Account"
2. Select "Private Key"
3. Paste this private key:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
4. Click "Import"

This account has:
- 10,000 FLR (native token)
- ~1,000,000 USDC (from warm state setup)
- Is both an LP and can act as an executor

### Step 4: Start the Frontend

```bash
cd /Users/arkoroy/Desktop/praxis/client

# Create .env.local with local fork enabled
echo "NEXT_PUBLIC_USE_LOCAL_FORK=true" > .env.local

# Install dependencies if needed
npm install

# Start the dev server
npm run dev
```

Open: http://localhost:3000

### Step 5: Connect Wallet

1. Click "Connect Wallet" button
2. Select MetaMask
3. Choose "Flare Fork (Local)" network if prompted
4. Approve the connection

---

## Demo Video Script (Recommended Order)

### Scene 1: Introduction (30 seconds)

**Show:** Landing page at http://localhost:3000

**Talk about:**
- "PRAXIS is an Execution Rights Protocol"
- "It enables collateral-free access to DeFi capital"
- "Instead of lending assets, we lease execution power"

### Scene 2: Dashboard Overview (1 minute)

**Navigate to:** `/dashboard`

**Show:**
- Portfolio overview showing ~$650k TVL
- Active contracts count
- Total P&L stats
- Quick actions panel

**Talk about:**
- "The protocol has been running for about 2 weeks"
- "LPs have deposited over $650,000 in capital"
- "Multiple executors are actively trading"

### Scene 3: LP Portal - Deposit Flow (2 minutes)

**Navigate to:** `/dashboard/lp-portal`

**Show:**
- Vault info panel (utilization, APY projections)
- Current LP balance
- Deposit form

**Demo:**
1. Enter deposit amount (e.g., 10,000 USDC)
2. Click "Approve" then "Deposit"
3. Show transaction in MetaMask
4. Show updated balance after deposit

**Talk about:**
- "LPs deposit stablecoins into the vault"
- "They earn 2% base APR plus 20% of executor profits"
- "Capital never leaves the vault - it's always protected"
- "30% is always kept in reserve (utilization cap)"

### Scene 4: Executor Portal - Reputation System (2 minutes)

**Navigate to:** `/dashboard/executor`

**Show:**
- Executor status card
- Reputation dashboard
- Tier progression (UNVERIFIED → NOVICE → VERIFIED → ESTABLISHED → ELITE)
- Tier requirements

**Talk about:**
- "Executors must build reputation over time"
- "New executors start at Tier 0 with $100 max capital"
- "They need to prove themselves with profitable trades"
- "Higher tiers unlock more capital with lower stake requirements"

**Show the tier progression:**
- Tier 0 (UNVERIFIED): $100 max, 50% stake
- Tier 1 (NOVICE): $1,000 max, 25% stake
- Tier 2 (VERIFIED): $10,000 max, 15% stake
- Tier 3 (ESTABLISHED): $100,000 max, 10% stake
- Tier 4 (ELITE): $500,000 max, 5% stake

### Scene 5: DEX Aggregator (1.5 minutes)

**Navigate to:** `/dashboard/swap`

**Show:**
- Multi-DEX quote comparison (SparkDEX, BlazeSwap, Enosys)
- Price impact indicators
- Best route selection

**Demo:**
1. Select FLR → USDC swap
2. Enter amount (e.g., 1000 FLR)
3. Show quotes from different DEXes
4. Highlight the best route
5. (Optional) Execute the swap

**Talk about:**
- "PRAXIS integrates with all major Flare DEXes"
- "Smart routing finds the best prices automatically"
- "Executors can access this through their ERTs"

### Scene 6: Yield Hub (1.5 minutes)

**Navigate to:** `/dashboard/yield`

**Show:**
- Sceptre staking card (sFLR liquid staking)
- Kinetic lending card
- Yield comparison table

**Talk about:**
- "Executors can deploy capital to yield strategies"
- "Sceptre offers ~4% APY for FLR staking"
- "Kinetic enables lending with variable rates"
- "All constrained by ERT permissions"

### Scene 7: Trading Terminal (1 minute)

**Navigate to:** `/dashboard/terminal`

**Show:**
- ERT selector dropdown
- Constraint checker panel
- Quick trade interface

**Talk about:**
- "This is where executors manage their active positions"
- "Every action is validated against ERT constraints"
- "The system enforces drawdown limits, leverage caps, and asset whitelists"

### Scene 8: Perpetuals (1 minute)

**Navigate to:** `/dashboard/perps`

**Show:**
- Market selector (ETH-USD, BTC-USD, FLR-USD, etc.)
- Order form
- Position panel
- Oracle status indicator

**Talk about:**
- "PRAXIS integrates with SparkDEX Eternal for perpetuals"
- "Executors can open leveraged positions"
- "All positions are tracked and validated against ERT constraints"

### Scene 9: System Health (1 minute)

**Navigate to:** `/dashboard/health`

**Show:**
- Circuit breaker status
- Insurance fund balance (~$5k)
- Exposure breakdown by asset

**Talk about:**
- "PRAXIS has multiple safety mechanisms"
- "Circuit breaker triggers at 5% daily vault loss"
- "Insurance fund covers losses before LPs"
- "30% max exposure per asset ensures diversification"

### Scene 10: ERT Management (1 minute)

**Navigate to:** `/dashboard/erts`

**Show:**
- Active ERTs list
- ERT details (capital allocated, time remaining, constraints)
- P&L tracking

**Talk about:**
- "Execution Rights Tokens are NFTs that encode permissions"
- "Each ERT has specific constraints"
- "When time expires, positions are automatically settled"

### Scene 11: Conclusion (30 seconds)

**Show:** Dashboard overview

**Summary points:**
- "PRAXIS enables collateral-free DeFi access"
- "Capital stays safe in the vault"
- "Executors prove themselves through reputation"
- "Multiple safety mechanisms protect LPs"
- "Built on Flare with native FTSO and FDC integration"

---

## Test Accounts Reference

| Account | Role | Address | Private Key |
|---------|------|---------|-------------|
| Account 0 | Deployer/LP | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974...f2ff80` |
| Account 1 | LP2 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c699...78690d` |
| Account 2 | LP3 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de411...ab365a` |
| Account 3 | Executor (VERIFIED) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c8521...007a6` |
| Account 4 | Executor (NOVICE) | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179...34926a` |
| Account 5 | Executor (UNVERIFIED) | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a35...1564e` |

---

## Protocol State (After Warm-State Setup)

| Metric | Value |
|--------|-------|
| Total Vault TVL | ~$650,000 USDC |
| Insurance Fund | ~$5,000 USDC |
| Simulated Days | ~14 days |
| LP Count | 4 |
| Executor Count | 3 |

**Executor Reputation:**
- Executor 1: Tier 2 (VERIFIED) - 15 profitable settlements
- Executor 2: Tier 1 (NOVICE) - 5 settlements (60% profitable)
- Executor 3: Tier 0 (UNVERIFIED) - No history

---

## Troubleshooting

### MetaMask: "Nonce too high" error
```bash
# In MetaMask: Settings → Advanced → Clear activity tab data
```

### MetaMask: RPC error
Make sure Anvil is running:
```bash
curl -X POST http://127.0.0.1:8546 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Contract addresses not showing
Copy addresses from `web3/deployed-addresses.json` to `client/lib/contracts/addresses.ts`

### Stop the demo environment
```bash
kill $(cat /tmp/praxis/anvil.pid)
# or
./scripts/stop-fork-env.sh
```

---

## Files Modified for Demo

| File | Purpose |
|------|---------|
| `web3/scripts/start-demo-env.sh` | One-command demo setup |
| `web3/scripts/deploy/warm-state-seed.ts` | Creates realistic protocol state |
| `client/app/config.ts` | Added local fork chain support |
| `client/lib/contracts/addresses.ts` | Added chain ID 31337 |
| `client/.env.local.example` | Environment template |

---

## Recording Tips

1. **Resolution:** Record at 1920x1080 or higher
2. **Browser:** Use Chrome with DevTools closed
3. **MetaMask:** Pin extension for easy access
4. **Clear cache:** Start with fresh browser state
5. **Zoom:** Use browser zoom (Cmd/Ctrl + +) if UI is small
6. **Slow down:** Pause after each transaction for viewers to follow
