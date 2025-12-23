import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    decompress,
    compress,
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

async function main() {
    const rpc = createRpc(RPC_URL);

    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    console.log("Mint:", mint.toBase58());

    const splAta = await createAssociatedTokenAccount(
        rpc,
        payer,
        mint,
        payer.publicKey
    );

    // Fund SPL ATA: mint compressed, then decompress
    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(10000));
    await decompress(rpc, payer, mint, bn(10000), payer, splAta);

    // Batch compress to multiple recipients
    const recipients = Array.from(
        { length: 5 },
        () => Keypair.generate().publicKey
    );
    const amounts = [bn(100), bn(200), bn(300), bn(400), bn(500)];

    const signature = await compress(
        rpc,
        payer,
        mint,
        amounts,
        payer,
        splAta,
        recipients
    );

    console.log("Batch compressed to 5 recipients");
    console.log("Tx:", signature);
}

main().catch(console.error);
