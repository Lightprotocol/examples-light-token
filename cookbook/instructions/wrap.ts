import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
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
import { homedir } from "os";
import { readFileSync } from "fs";

const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;
const payer = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))
    )
);

(async function () {
    const rpc = createRpc(RPC_URL);

    // Setup: Get SPL tokens (needed to wrap)
    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        payer.publicKey
    );
    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));
    await decompress(rpc, payer, mint, bn(1000), payer, splAta);

    // Create wrap instruction
    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);
    await createAtaInterfaceIdempotent(rpc, payer, mint, payer.publicKey);

    const splInterfaceInfos = await getSplInterfaceInfos(rpc, mint);
    const splInterfaceInfo = splInterfaceInfos.find(
        (info) => info.isInitialized
    );

    if (!splInterfaceInfo) throw new Error("No SPL interface found");

    const ix = createWrapInstruction(
        splAta,
        ctokenAta,
        payer.publicKey,
        mint,
        bn(500),
        splInterfaceInfo,
        payer.publicKey
    );

    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ix],
        payer,
        blockhash
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("Tx:", signature);
})();
