// ZK Compression Quickstart - DevNet
// 1. Load wallet and connect to DevNet via Helius RPC
// 2. Create SPL mint with token pool for compression via createMint()
// 3. Mint compressed tokens to recipient account via mintTo()
// 4. Verify compressed token balance via getCompressedTokenAccountsByOwner

import "dotenv/config";
import { createRpc } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";

// Step 1: Load wallet from filesystem
const keypairPath =
  process.env.KEYPAIR_PATH?.replace("~", homedir()) ||
  `${homedir()}/.config/solana/id.json`;
const payer = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf8")))
);

// Helius exposes Solana and compression RPC endpoints through a single URL
const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${process.env.api_key}`;
const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

const main = async () => {
  console.log("Payer:", payer.publicKey.toBase58());

  // Step 2: Create SPL mint with token pool for compression
  console.log("\nCreating SPL mint with token pool for compression...");
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey, // mintAuthority
    9 // decimals
  );

  console.log(`Mint address: ${mint.toBase58()}`);
  console.log(
    `Create mint tx: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );

  // Step 3: Mint compressed tokens to payer account
  console.log("\nMinting compressed tokens...");
  const mintAmount = 1_000_000_000; // 1 token with 9 decimals
  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey, // destination
    payer, // mintAuthority
    mintAmount
  );

  console.log(`Minted ${mintAmount / 1e9} token`);
  console.log(
    `Mint tx: https://explorer.solana.com/tx/${mintToTxId}?cluster=devnet`
  );

  // Step 4: Verify compressed token balance
  const tokenAccounts = await connection.getCompressedTokenAccountsByOwner(
    payer.publicKey,
    { mint }
  );

  console.log("\nCompressed token accounts:", tokenAccounts.items.length);
  console.log(
    "Balance:",
    tokenAccounts.items.reduce((acc, ta) => acc + Number(ta.parsed.amount), 0) /
      1e9,
    "tokens"
  );
};

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
