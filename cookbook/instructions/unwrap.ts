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

(async function () {
    const rpc = createRpc(RPC_URL);

    // Setup: Get compressed tokens (cold storage)
    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));

    // Load compressed tokens to hot balance, then create unwrap instruction
    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);
    await loadAta(rpc, ctokenAta, payer, mint, payer);

    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        payer.publicKey
    );

    const splInterfaceInfos = await getSplInterfaceInfos(rpc, mint);
    const splInterfaceInfo = splInterfaceInfos.find(
        (info) => info.isInitialized
    );

    if (!splInterfaceInfo) throw new Error("No SPL interface found");

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
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ix],
        payer,
        blockhash
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("Tx:", signature);
})();
