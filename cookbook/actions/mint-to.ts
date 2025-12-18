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
  mintToInterface,
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

  // 2. Create a light-mint (payer is mint authority)
  const mintSigner = Keypair.generate();
  const { mint } = await createMintInterface(
    rpc,
    payer,
    payer, // mintAuthority
    null, // freezeAuthority
    9, // decimals
    mintSigner,
  );
  console.log("Mint created:", mint.toBase58());

  // 3. Create associated token account for recipient
  const recipient = Keypair.generate();
  await createAtaInterface(rpc, payer, mint, recipient.publicKey);
  console.log("Recipient ATA created for:", recipient.publicKey.toBase58());

  // 4. Mint tokens to the recipient's account
  const destination = getAssociatedTokenAddressInterface(mint, recipient.publicKey);
  const amount = 1_000_000_000; // 1 token with 9 decimals

  const txSignature = await mintToInterface(
    rpc,
    payer,
    mint,
    destination,
    payer, // mintAuthority (must be Signer)
    amount,
  );

  console.log("Minted tokens:", amount);
  console.log("Transaction:", txSignature);
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
