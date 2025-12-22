import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo, approve } from "@lightprotocol/compressed-token";

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

    // 2. Create mint and mint tokens to owner
    const mintAuthority = Keypair.generate();
    const mintKeypair = Keypair.generate();
    const { mint } = await createMint(
        rpc,
        payer,
        mintAuthority.publicKey,
        9,
        mintKeypair,
    );
    console.log("Mint:", mint.toBase58());

    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
    console.log("Minted 1000 compressed tokens to owner");

    // 3. Create delegate
    const delegate = Keypair.generate();
    console.log("Delegate:", delegate.publicKey.toBase58());

    // 4. Approve delegation
    const signature = await approve(
        rpc,
        payer,
        mint,
        bn(500), // amount to delegate
        owner, // owner of tokens (signer)
        delegate.publicKey, // delegate address
    );

    console.log("Approved delegation of 500 tokens");
    console.log("Transaction:", signature);

    // 5. Verify delegation
    const delegatedAccounts = await rpc.getCompressedTokenAccountsByDelegate(
        delegate.publicKey,
        { mint },
    );
    console.log("Delegated accounts:", delegatedAccounts.items.length);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
