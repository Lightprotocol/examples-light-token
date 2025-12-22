import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    bn,
    buildAndSignTx,
    sendAndConfirmTx,
    dedupeSigner,
} from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    createLoadAtaInstructions,
    getAssociatedTokenAddressInterface,
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

    // 2. Create mint and mint compressed tokens
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
    console.log("Minted 1000 compressed tokens (cold)");

    // 3. Get c-token ATA address
    const ctokenAta = getAssociatedTokenAddressInterface(mint, owner.publicKey);
    console.log("c-token ATA:", ctokenAta.toBase58());

    // 4. Create load instructions
    const ixs = await createLoadAtaInstructions(
        rpc,
        ctokenAta,
        owner.publicKey,
        mint,
        payer.publicKey,
    );

    if (ixs.length === 0) {
        console.log("Nothing to load");
        return;
    }

    console.log("Created", ixs.length, "load instructions");

    // 5. Build, sign, and send transaction
    const { blockhash } = await rpc.getLatestBlockhash();
    const additionalSigners = dedupeSigner(payer, [owner]);

    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ...ixs],
        payer,
        blockhash,
        additionalSigners,
    );

    const signature = await sendAndConfirmTx(rpc, tx);
    console.log("Loaded tokens to hot balance");
    console.log("Transaction:", signature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
