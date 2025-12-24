import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import { createMintInterface, createTokenMetadata } from "@lightprotocol/compressed-token";
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

    const { mint, transactionSignature } = await createMintInterface(
        rpc,
        payer,
        payer,
        null,
        9,
        undefined,
        undefined,
        undefined,
        createTokenMetadata("Example Token", "EXT", "https://example.com/metadata.json")
    );

    console.log("Mint:", mint.toBase58());
    console.log("Tx:", transactionSignature);
})();
