import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  decompress,
  compress,
} from "@lightprotocol/compressed-token";
import { createAssociatedTokenAccount } from "@solana/spl-token";

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

  // 2. Create SPL mint with token pool
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

  // 3. Create SPL ATA and fund it
  const splAta = await createAssociatedTokenAccount(
    rpc,
    payer,
    mint,
    owner.publicKey
  );
  console.log("SPL ATA:", splAta.toBase58());

  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(10000));
  await decompress(rpc, payer, mint, bn(10000), owner, splAta);
  console.log("Funded SPL ATA with 10000 tokens");

  // 4. Batch compress to multiple recipients (max 10 for V2 trees)
  const recipients = Array.from({ length: 5 }, () => Keypair.generate().publicKey);
  const amounts = [bn(100), bn(200), bn(300), bn(400), bn(500)];

  const signature = await compress(
    rpc,
    payer,
    mint,
    amounts, // array of amounts
    owner,
    splAta,
    recipients // array of recipients (same length as amounts)
  );

  console.log("Batch compressed to 5 recipients");
  console.log("Amounts:", amounts.map((a) => a.toString()).join(", "));
  console.log("Transaction:", signature);
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
