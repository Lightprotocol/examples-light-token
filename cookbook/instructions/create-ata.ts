import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
  createRpc,
  buildAndSignTx,
  sendAndConfirmTx,
  featureFlags,
  VERSION,
  CTOKEN_PROGRAM_ID,
} from "@lightprotocol/stateless.js";
import {
  createMintInterface,
  createAssociatedTokenAccountInterfaceInstruction,
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
    payer, // mintAuthority
    null, // freezeAuthority
    9, // decimals
    mintSigner
  );
  console.log("Mint:", mint.toBase58());

  // 3. Derive the ATA address
  const owner = Keypair.generate();
  const associatedToken = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  console.log("Owner:", owner.publicKey.toBase58());
  console.log("ATA address:", associatedToken.toBase58());

  // 4. Create the instruction
  const ix = createAssociatedTokenAccountInterfaceInstruction(
    payer.publicKey, // payer
    associatedToken, // associatedToken
    owner.publicKey, // owner
    mint, // mint
    CTOKEN_PROGRAM_ID // programId (cToken)
  );

  // 5. Build, sign, and send transaction
  const { blockhash } = await rpc.getLatestBlockhash();
  const tx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }), ix],
    payer,
    blockhash
  );
  const signature = await sendAndConfirmTx(rpc, tx);

  console.log("ATA created");
  console.log("Transaction:", signature);
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
