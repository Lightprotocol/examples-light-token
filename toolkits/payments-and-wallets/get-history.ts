import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import {
  getOrCreateAtaInterface,
  getAssociatedTokenAddressInterface,
  transferInterface,
} from "@lightprotocol/compressed-token/unified";

async function main() {
  const rpc = createRpc();

  // Setup
  const payer = Keypair.generate();
  const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
  await rpc.confirmTransaction(airdropSig, "confirmed");

  const owner = Keypair.generate();
  const airdropSig2 = await rpc.requestAirdrop(owner.publicKey, 1e9);
  await rpc.confirmTransaction(airdropSig2, "confirmed");

  const recipient = Keypair.generate();
  const airdropSig3 = await rpc.requestAirdrop(recipient.publicKey, 1e9);
  await rpc.confirmTransaction(airdropSig3, "confirmed");

  // Create test mint and tokens
  const mintAuthority = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const { mint } = await createMint(
    rpc,
    payer,
    mintAuthority.publicKey,
    9,
    mintKeypair
  );

  // Mint and create ATAs
  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
  await getOrCreateAtaInterface(rpc, payer, mint, owner);
  await getOrCreateAtaInterface(rpc, payer, mint, recipient);

  // Make a transfer to create transaction history
  const sourceAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  const destAta = getAssociatedTokenAddressInterface(mint, recipient.publicKey);

  await transferInterface(rpc, payer, sourceAta, mint, destAta, owner, bn(100));
  await transferInterface(rpc, payer, sourceAta, mint, destAta, owner, bn(200));

  // === GET TRANSACTION HISTORY ===
  const result = await rpc.getSignaturesForOwnerInterface(owner.publicKey);

  console.log("=== Transaction History ===");
  console.log("Total signatures:", result.signatures.length);
  console.log("On-chain txs:", result.solana.length);
  console.log("Compressed txs:", result.compressed.length);

  console.log("\n=== Recent Transactions ===");
  for (const sig of result.signatures.slice(0, 5)) {
    console.log(sig.signature);
  }
}

main().catch(console.error);
