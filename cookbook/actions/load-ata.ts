import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    loadAta,
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

async function main() {
    const rpc = createRpc(RPC_URL);

    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    console.log("Mint:", mint.toBase58());

    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));

    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);

    // Load compressed tokens (cold) to hot balance, creates ATA if needed
    const signature = await loadAta(rpc, ctokenAta, payer, mint, payer);

    if (signature) {
        console.log("Loaded tokens to hot balance");
        console.log("Tx:", signature);
    } else {
        console.log("Nothing to load");
    }
}

main().catch(console.error);
