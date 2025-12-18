import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
  createMint,
  mintTo,
  mergeTokenAccounts,
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

  // 2. Create mint
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

  // 3. Mint multiple times to create multiple compressed accounts
  console.log("Minting 5 times to create multiple accounts...");
  for (let i = 0; i < 5; i++) {
    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(100));
  }
  console.log("Minted 500 total tokens across 5 accounts");

  // 4. Check accounts before merge
  const accountsBefore = await rpc.getCompressedTokenAccountsByOwner(
    owner.publicKey,
    { mint }
  );
  console.log("Accounts before merge:", accountsBefore.items.length);

  // 5. Merge token accounts
  const signature = await mergeTokenAccounts(
    rpc,
    payer,
    mint,
    owner // owner (signer)
  );

  console.log("Merged token accounts");
  console.log("Transaction:", signature);

  // 6. Check accounts after merge
  const accountsAfter = await rpc.getCompressedTokenAccountsByOwner(
    owner.publicKey,
    { mint }
  );
  console.log("Accounts after merge:", accountsAfter.items.length);

  // 7. Verify total balance unchanged
  const totalBefore = accountsBefore.items.reduce(
    (sum, acc) => sum.add(acc.parsed.amount),
    bn(0)
  );
  const totalAfter = accountsAfter.items.reduce(
    (sum, acc) => sum.add(acc.parsed.amount),
    bn(0)
  );
  console.log("Total balance before:", totalBefore.toString());
  console.log("Total balance after:", totalAfter.toString());
  console.log(
    "Balance preserved:",
    totalBefore.toString() === totalAfter.toString()
  );
}

main().catch((err) => {
  console.error("Error:", err);
  if (err.logs) console.error("Logs:", err.logs);
  process.exit(1);
});
