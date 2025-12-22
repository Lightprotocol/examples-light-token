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
    decompress,
    createWrapInstruction,
    getAssociatedTokenAddressInterface,
    createAtaInterfaceIdempotent,
    getSplInterfaceInfos,
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

    // 3. Create SPL ATA and fund it
    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        owner.publicKey,
    );
    console.log("SPL ATA:", splAta.toBase58());

    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));
    await decompress(rpc, payer, mint, bn(1000), owner, splAta);
    console.log("Funded SPL ATA with 1000 tokens");

    // 4. Create c-token ATA (destination)
    const ctokenAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
    await createAtaInterfaceIdempotent(rpc, payer, mint, owner.publicKey);
    console.log("c-token ATA:", ctokenAta.toBase58());

    // 5. Get SPL interface info for the mint
    const splInterfaceInfos = await getSplInterfaceInfos(rpc, mint);
    const splInterfaceInfo = splInterfaceInfos.find(
        (info) => info.isInitialized,
    );

    if (!splInterfaceInfo) {
        throw new Error("No SPL interface found");
    }

    // 6. Create wrap instruction
    const ix = createWrapInstruction(
        splAta, // source: SPL token account
        ctokenAta, // destination: c-token ATA
        owner.publicKey, // owner of source account
        mint,
        bn(500), // amount to wrap
        splInterfaceInfo, // SPL interface info
        payer.publicKey, // fee payer
    );

    // 7. Build, sign, and send transaction
    const { blockhash } = await rpc.getLatestBlockhash();
    const additionalSigners = dedupeSigner(payer, [owner]);

    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ix],
        payer,
        blockhash,
        additionalSigners,
    );

    const signature = await sendAndConfirmTx(rpc, tx);
    console.log("Wrapped 500 tokens to c-token ATA");
    console.log("Transaction:", signature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
