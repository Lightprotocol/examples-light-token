# Payments & Wallets Toolkit

## SPL vs Light

| Operation | SPL | Light |
|-----------|-----|-------|
| Get/Create ATA | `getOrCreateAssociatedTokenAccount()` | `getOrCreateAtaInterface()` |
| Derive ATA | `getAssociatedTokenAddress()` | `getAssociatedTokenAddressInterface()` |
| Transfer | `transferChecked()` | `transferInterface()` |
| Get Balance | `getAccount()` | `getAtaInterface()` |
| Tx History | `getSignaturesForAddress()` | `rpc.getSignaturesForOwnerInterface()` |
| Exit to SPL | N/A | `unwrap()` |

## Scripts

| File | Description | Key Function |
|------|-------------|--------------|
| `send-and-receive.ts` | Send/receive payments | `getOrCreateAtaInterface`, `transferInterface` |
| `get-balance.ts` | Check token balance | `getAtaInterface` |
| `get-history.ts` | Transaction history | `getSignaturesForOwnerInterface` |
| `wrap-from-spl.ts` | On-ramp from CEX (SPL → light-token) | `wrap` |
| `unwrap-to-spl.ts` | Off-ramp to CEX (light-token → SPL) | `unwrap` |


## Get Started

```bash
npm install -g @lightprotocol/zk-compression-cli@alpha
```

```bash
pnpm install

# Start local test-validator
light test-validator

# Run any script
pnpm run send-and-receive
pnpm run get-balance
pnpm run get-history
pnpm run wrap-from-spl
pnpm run unwrap-to-spl
```