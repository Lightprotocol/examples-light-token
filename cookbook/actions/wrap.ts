import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    decompress,
    wrap,
    getAssociatedTokenAddressInterface,
    createAtaInterfaceIdempotent,
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

    const splAta = await createAssociatedTokenAccount(rpc, payer, mint, payer.publicKey);

    // Fund SPL ATA: mint compressed, then decompress
    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));
    await decompress(rpc, payer, mint, bn(1000), payer, splAta);

    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);
    await createAtaInterfaceIdempotent(rpc, payer, mint, payer.publicKey);

    const signature = await wrap(rpc, payer, splAta, ctokenAta, payer, mint, bn(500));

    console.log("Wrapped 500 tokens to c-token ATA:", ctokenAta.toBase58());
    console.log("Tx:", signature);
}

main().catch(console.error);
