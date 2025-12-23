import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo, approve, revoke } from "@lightprotocol/compressed-token";
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
    await approve(rpc, payer, mint, bn(500), payer, delegate.publicKey);
    console.log("Approved delegation to:", delegate.publicKey.toBase58());

    const delegatedAccounts = await rpc.getCompressedTokenAccountsByDelegate(delegate.publicKey, { mint });
    console.log("Delegated accounts:", delegatedAccounts.items.length);

    const signature = await revoke(rpc, payer, delegatedAccounts.items, payer);

    console.log("Revoked delegation");
    console.log("Tx:", signature);

    const afterRevoke = await rpc.getCompressedTokenAccountsByDelegate(delegate.publicKey, { mint });
    console.log("After revoke:", afterRevoke.items.length, "accounts");
}

main().catch(console.error);
