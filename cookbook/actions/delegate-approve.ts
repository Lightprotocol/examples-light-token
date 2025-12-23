import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo, approve } from "@lightprotocol/compressed-token";
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

    const delegate = Keypair.generate();
    const signature = await approve(rpc, payer, mint, bn(500), payer, delegate.publicKey);

    console.log("Approved delegation of 500 tokens to:", delegate.publicKey.toBase58());
    console.log("Tx:", signature);

    const delegatedAccounts = await rpc.getCompressedTokenAccountsByDelegate(delegate.publicKey, { mint });
    console.log("Delegated accounts:", delegatedAccounts.items.length);
}

main().catch(console.error);
