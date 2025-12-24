import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    getOrCreateAtaInterface,
    transferInterface,
    createMintInterface,
    mintToInterface,
    getAtaInterface,
} from "@lightprotocol/compressed-token/unified";
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

    // Setup: mint tokens
    const { mint } = await createMintInterface(
        rpc,
        payer,
        payer.publicKey,
        null,
        9
    );
    await mintToInterface(rpc, payer, mint, payer.publicKey, payer, bn(1000));

    // Create ATA for payer
    const { parsed: sourceAta } = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        payer
    );

    // Create ATA for recipient
    const recipient = Keypair.generate();
    const { parsed: recipientAta } = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient
    );

    const txId = await transferInterface(
        rpc,
        payer,
        sourceAta.address,
        mint,
        recipientAta.address,
        payer,
        bn(100)
    );

    console.log("Tx:", txId);
})();
