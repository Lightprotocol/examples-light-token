import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo, mergeTokenAccounts } from "@lightprotocol/compressed-token";
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

    // Mint multiple times to create multiple compressed accounts
    for (let i = 0; i < 5; i++) {
        await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(100));
    }

    const accountsBefore = await rpc.getCompressedTokenAccountsByOwner(payer.publicKey, { mint });
    console.log("Accounts before merge:", accountsBefore.items.length);

    const signature = await mergeTokenAccounts(rpc, payer, mint, payer);

    console.log("Tx:", signature);

    const accountsAfter = await rpc.getCompressedTokenAccountsByOwner(payer.publicKey, { mint });
    console.log("Accounts after merge:", accountsAfter.items.length);
}

main().catch(console.error);
