import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  loadAta,
  getAssociatedTokenAddressInterface,
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

  // 2. Create mint and mint compressed tokens (cold)
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
  console.log("Minted 1000 compressed tokens (cold)");

  // 3. Get c-token ATA address
  const ctokenAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  console.log("c-token ATA:", ctokenAta.toBase58());

  // 4. Load compressed tokens to hot balance
  // Creates ATA if needed, returns null if nothing to load
  const signature = await loadAta(
    rpc,
    ctokenAta, // c-token ATA address
    owner, // owner (signer)
    mint,
    payer // optional: fee payer
  );

  if (signature) {
    console.log("Loaded tokens to hot balance");
    console.log("Transaction:", signature);
  } else {
    console.log("Nothing to load");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
