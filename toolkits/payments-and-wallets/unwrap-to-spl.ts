import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import {
  getOrCreateAtaInterface,
  unwrap,
} from "@lightprotocol/compressed-token/unified";
import {
  createAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";

async function main() {
  const rpc = createRpc();

  // Setup
  const payer = Keypair.generate();
  const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
  await rpc.confirmTransaction(airdropSig, "confirmed");

  const owner = Keypair.generate();
  const airdropSig2 = await rpc.requestAirdrop(owner.publicKey, 1e9);
  await rpc.confirmTransaction(airdropSig2, "confirmed");

  // Create test mint
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

  // Mint and load to c-token ATA
  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
  const ctokenAccount = await getOrCreateAtaInterface(rpc, payer, mint, owner);
  console.log("C-token ATA:", ctokenAccount.parsed.address.toBase58());
  console.log("C-token balance:", ctokenAccount.parsed.amount.toString());

  // Create destination SPL ATA (must exist before unwrap)
  const splAta = await createAssociatedTokenAccount(
    rpc,
    payer,
    mint,
    owner.publicKey
  );
  console.log("\nSPL ATA:", splAta.toBase58());

  // === UNWRAP: c-token → SPL ===
  // Off-ramp for CEX withdrawal
  const signature = await unwrap(
    rpc,
    payer,
    splAta,
    owner,
    mint,
    bn(500)
  );

  console.log("\n=== Unwrapped 500 tokens ===");
  console.log("Transaction:", signature);

  // Check SPL balance
  const splBalance = await getAccount(rpc, splAta);
  console.log("\nSPL balance (ready for CEX):", splBalance.amount.toString());
}

main().catch(console.error);
