import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
  createRpc,
  buildAndSignTx,
  sendAndConfirmTx,
  dedupeSigner,
  bn,
} from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  loadAta,
  getAssociatedTokenAddressInterface,
  getSplInterfaceInfos,
} from "@lightprotocol/compressed-token";
import { createUnwrapInstruction } from "@lightprotocol/compressed-token/unified";
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

  // 3. Mint compressed tokens to owner
  await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
  console.log("Minted 1000 compressed tokens");

  // 4. Load compressed tokens to c-token ATA (hot balance)
  const ctokenAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  await loadAta(rpc, ctokenAta, owner, mint, payer);
  console.log("Loaded compressed tokens to c-token ATA");

  // 5. Create destination SPL ATA
  const splAta = await createAssociatedTokenAccount(
    rpc,
    payer,
    mint,
    owner.publicKey
  );
  console.log("SPL ATA:", splAta.toBase58());

  // 6. Get SPL interface info for the mint
  const splInterfaceInfos = await getSplInterfaceInfos(rpc, mint);
  const splInterfaceInfo = splInterfaceInfos.find((info) => info.isInitialized);

  if (!splInterfaceInfo) {
    throw new Error("No SPL interface found");
  }

  // 7. Create unwrap instruction
  const ix = createUnwrapInstruction(
    ctokenAta, // source: c-token ATA
    splAta, // destination: SPL token account
    owner.publicKey, // owner of source account
    mint,
    bn(500), // amount to unwrap
    splInterfaceInfo, // SPL interface info
    payer.publicKey // fee payer
  );

  // 8. Build, sign, and send transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [owner]);

  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );

  const signature = await sendAndConfirmTx(rpc, tx);
  console.log("Unwrapped 500 tokens to SPL ATA");
  console.log("Transaction:", signature);
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
