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
    loadAta,
    getAssociatedTokenAddressInterface,
    getSplInterfaceInfos,
} from "@lightprotocol/compressed-token";
import { createUnwrapInstruction } from "@lightprotocol/compressed-token/unified";
import { createAssociatedTokenAccount } from "@solana/spl-token";
import { homedir } from "os";
import { readFileSync } from "fs";

const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;
const payer = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))
    )
);

async function main() {
    const rpc = createRpc(RPC_URL);

    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    console.log("Mint:", mint.toBase58());

    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));

    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);
    await loadAta(rpc, ctokenAta, payer, mint, payer);

    const splAta = await createAssociatedTokenAccount(rpc, payer, mint, payer.publicKey);

    const splInterfaceInfos = await getSplInterfaceInfos(rpc, mint);
    const splInterfaceInfo = splInterfaceInfos.find((info) => info.isInitialized);

    if (!splInterfaceInfo) {
        throw new Error("No SPL interface found");
    }

    const ix = createUnwrapInstruction(
        ctokenAta,
        splAta,
        payer.publicKey,
        mint,
        bn(500),
        splInterfaceInfo,
        payer.publicKey
    );

    const { blockhash } = await rpc.getLatestBlockhash();
    const additionalSigners = dedupeSigner(payer, [payer]);

    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ix],
        payer,
        blockhash,
        additionalSigners
    );

    const signature = await sendAndConfirmTx(rpc, tx);
    console.log("Unwrapped 500 tokens");
    console.log("Tx:", signature);
}

main().catch(console.error);
