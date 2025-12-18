# Payments & Wallets Toolkit

| File | Description | Key Function |
|------|-------------|--------------|
| `send-and-receive.ts` | Send/receive payments | `getOrCreateAtaInterface`, `transferInterface` |
| `get-balance.ts` | Check token balance | `getAtaInterface` |
| `get-history.ts` | Transaction history | `getSignaturesForOwnerInterface` |
| `wrap-from-spl.ts` | On-ramp from CEX (SPL → c-token) | `wrap` |
| `unwrap-to-spl.ts` | Off-ramp to CEX (c-token → SPL) | `unwrap` |

## Run

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