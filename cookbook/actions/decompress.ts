import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    decompress,
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

    // 3. Mint compressed tokens (cold storage)
    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
    console.log("Minted 1000 compressed tokens");

    // 4. Create destination SPL ATA (must exist before decompressing)
    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        owner.publicKey,
    );
    console.log("SPL ATA:", splAta.toBase58());

    // 5. Decompress to SPL ATA
    const signature = await decompress(
        rpc,
        payer,
        mint,
        bn(500), // amount to decompress
        owner, // owner of compressed tokens (signer)
        splAta, // destination SPL token account
    );

    console.log("Decompressed 500 tokens to SPL ATA");
    console.log("Transaction:", signature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
