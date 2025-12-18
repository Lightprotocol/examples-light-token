import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  decompress,
  wrap,
  getAssociatedTokenAddressInterface,
  createAtaInterfaceIdempotent,
} from "@lightprotocol/compressed-token";
import { createAssociatedTokenAccount, getAccount } from "@solana/spl-token";

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

  // Create SPL ATA and fund it
  // (Simulates receiving tokens from CEX)
  const splAta = await createAssociatedTokenAccount(
    rpc,
    payer,
    mint,
    owner.publicKey
  );
  console.log("SPL ATA:", splAta.toBase58());

  // Mint compressed, then decompress to SPL (simulates CEX deposit)
  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
  await decompress(rpc, payer, mint, bn(1000), owner, splAta);

  const splBalanceBefore = await getAccount(rpc, splAta);
  console.log("SPL balance before wrap:", splBalanceBefore.amount.toString());

  // Create c-token ATA (destination)
  const ctokenAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  await createAtaInterfaceIdempotent(rpc, payer, mint, owner.publicKey);
  console.log("C-token ATA:", ctokenAta.toBase58());

  // === WRAP: SPL → c-token ===
  // On-ramp from CEX
  const signature = await wrap(
    rpc,
    payer,
    splAta,
    ctokenAta,
    owner,
    mint,
    bn(500)
  );

  console.log("\n=== Wrapped 500 tokens ===");
  console.log("Transaction:", signature);

  // Check balances after
  const splBalanceAfter = await getAccount(rpc, splAta);
  console.log("\nSPL balance after:", splBalanceAfter.amount.toString());
  console.log("C-token ATA now has 500 tokens ready for payments");
}

main().catch(console.error);
