import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
  createRpc,
  buildAndSignTx,
  sendAndConfirmTx,
  featureFlags,
  VERSION,
} from "@lightprotocol/stateless.js";
import {
  createMintInterface,
  createAtaInterface,
  mintToInterface,
  createTransferInterfaceInstruction,
  getAssociatedTokenAddressInterface,
} from "@lightprotocol/compressed-token";

featureFlags.version = VERSION.V2;

async function main() {
  // 1. Setup RPC and fund payer
  const rpc = createRpc();
  const payer = Keypair.generate();
  const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
  await rpc.confirmTransaction(airdropSig, "confirmed");
  console.log("Payer:", payer.publicKey.toBase58());

  // 2. Create a light-mint
  const mintSigner = Keypair.generate();
  const { mint } = await createMintInterface(
    rpc,
    payer,
    payer,
    null,
    9,
    mintSigner
  );
  console.log("Mint:", mint.toBase58());

  // 3. Create sender's ATA and mint tokens
  const sender = Keypair.generate();
  await createAtaInterface(rpc, payer, mint, sender.publicKey);
  const senderAta = getAssociatedTokenAddressInterface(mint, sender.publicKey);
  await mintToInterface(rpc, payer, mint, senderAta, payer, 1_000_000_000);
  console.log("Sender ATA:", senderAta.toBase58());

  // 4. Create recipient's ATA
  const recipient = Keypair.generate();
  await createAtaInterface(rpc, payer, mint, recipient.publicKey);
  const recipientAta = getAssociatedTokenAddressInterface(
    mint,
    recipient.publicKey
  );
  console.log("Recipient ATA:", recipientAta.toBase58());

  // 5. Create transfer instruction
  const amount = 500_000_000;
  const ix = createTransferInterfaceInstruction(
    senderAta, // source
    recipientAta, // destination
    sender.publicKey, // owner
    amount
  );

  // 6. Build, sign, and send transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 10_000 }), ix],
    payer,
    blockhash,
    [sender]
  );
  const signature = await sendAndConfirmTx(rpc, tx);

  console.log("Transferred 0.5 tokens");
  console.log("Transaction:", signature);
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
