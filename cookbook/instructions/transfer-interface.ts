import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import { createRpc, buildAndSignTx, sendAndConfirmTx } from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createAtaInterface,
    mintToInterface,
    createTransferInterfaceInstruction,
    getAssociatedTokenAddressInterface,
} from "@lightprotocol/compressed-token";
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

    const { mint } = await createMintInterface(rpc, payer, payer, null, 9);

    const sender = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, sender.publicKey);
    const senderAta = getAssociatedTokenAddressInterface(mint, sender.publicKey);
    await mintToInterface(rpc, payer, mint, senderAta, payer, 1_000_000_000);

    const recipient = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, recipient.publicKey);
    const recipientAta = getAssociatedTokenAddressInterface(mint, recipient.publicKey);

    const ix = createTransferInterfaceInstruction(senderAta, recipientAta, sender.publicKey, 500_000_000);

    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 10_000 }), ix],
        payer,
        blockhash,
        [sender]
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("Tx:", signature);
})();
