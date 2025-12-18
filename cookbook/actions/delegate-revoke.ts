import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  approve,
  revoke,
} from "@lightprotocol/compressed-token";

async function main() {
  // 1. Setup RPC and fund accounts
  const rpc = createRpc();
  const payer = Keypair.generate();
  const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
  await rpc.confirmTransaction(airdropSig, "confirmed");
  console.log("Payer:", payer.publicKey.toBase58());

  const owner = Keypair.generate();
  const airdropSig2 = await rpc.requestAirdrop(owner.publicKey, 1e9);
  await rpc.confirmTransaction(airdropSig2, "confirmed");

  // 2. Create mint and mint tokens
  const mintAuthority = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const { mint } = await createMint(
    rpc,
    payer,
    mintAuthority.publicKey,
    9,
    mintKeypair
  );
  console.log("Mint:", mint.toBase58());

  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
  console.log("Minted 1000 compressed tokens to owner");

  // 3. Approve delegation
  const delegate = Keypair.generate();
  console.log("Delegate:", delegate.publicKey.toBase58());
  await approve(rpc, payer, mint, bn(500), owner, delegate.publicKey);
  console.log("Approved delegation of 500 tokens");

  // 4. Get delegated accounts
  const delegatedAccounts = await rpc.getCompressedTokenAccountsByDelegate(
    delegate.publicKey,
    { mint }
  );
  console.log("Before revoke:", delegatedAccounts.items.length, "accounts");

  // 5. Revoke delegation
  const signature = await revoke(
    rpc,
    payer,
    delegatedAccounts.items, // accounts to revoke
    owner // owner (signer)
  );

  console.log("Revoked delegation");
  console.log("Transaction:", signature);

  // 6. Verify revocation
  const afterRevoke = await rpc.getCompressedTokenAccountsByDelegate(
    delegate.publicKey,
    { mint }
  );
  console.log("After revoke:", afterRevoke.items.length, "accounts");
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
