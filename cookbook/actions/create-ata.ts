import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import {
  createRpc,
  featureFlags,
  VERSION,
} from "@lightprotocol/stateless.js";
import {
  createMintInterface,
  createAtaInterface,
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

  // 3. Create associated token account for owner
  const owner = Keypair.generate();
  const txSignature = await createAtaInterface(rpc, payer, mint, owner.publicKey);
  console.log("ATA created for:", owner.publicKey.toBase58());
  console.log("Transaction:", txSignature);

  // 4. Derive the ATA address
  const ata = getAssociatedTokenAddressInterface(mint, owner.publicKey);
  console.log("ATA address:", ata.toBase58());
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
