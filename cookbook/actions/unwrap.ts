import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import { unwrap } from "@lightprotocol/compressed-token/unified";
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

    const splAta = await createAssociatedTokenAccount(rpc, payer, mint, payer.publicKey);

    // Unwrap auto-loads compressed tokens to hot balance first
    const signature = await unwrap(rpc, payer, splAta, payer, mint, bn(500));

    console.log("Unwrapped 500 tokens to SPL ATA");
    console.log("Tx:", signature);
}

main().catch(console.error);
