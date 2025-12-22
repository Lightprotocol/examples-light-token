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
        mintKeypair,
    );
    console.log("Mint:", mint.toBase58());

    // 3. Create SPL ATA and fund it with SPL tokens
    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        owner.publicKey,
    );
    console.log("SPL ATA:", splAta.toBase58());

    // Mint compressed then decompress to get SPL tokens
    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
    await decompress(rpc, payer, mint, bn(1000), owner, splAta);
    console.log("Funded SPL ATA with 1000 tokens");

    // 4. Compress SPL tokens to cold storage
    const recipient = Keypair.generate();

    const signature = await compress(
        rpc,
        payer,
        mint,
        bn(500), // amount to compress
        owner, // owner of SPL account (signer)
        splAta, // source SPL token account
        recipient.publicKey, // recipient of compressed tokens
    );

    console.log("Compressed 500 tokens to cold storage");
    console.log("Recipient:", recipient.publicKey.toBase58());
    console.log("Transaction:", signature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
