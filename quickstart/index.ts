import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import {
    mintToInterface,
    createMintInterface,
    getOrCreateAtaInterface,
    getAccountInterface,
    getAtaInterface,
} from "@lightprotocol/compressed-token";
import { homedir } from "os";
import { readFileSync } from "fs";

// Load wallet
const payer = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))
    )
);

// Use a compatible RPC provider, such as Helius and Triton.
// Enable to use Devnet:
dotenv.config();
const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;

(async function () {
    const rpc = createRpc(RPC_URL);

    // 1. create test mint
    const mintAuthority = payer;
    const { mint, transactionSignature } = await createMintInterface(
        rpc,
        payer,
        mintAuthority,
        null,
        9
    );

    // 2. get recipient's associated token account
    const recipient = Keypair.generate();
    let recipientAta = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient
    );

    // 3. mint to recipient
    const txId = await mintToInterface(
        rpc,
        payer,
        mint,
        recipientAta.parsed.address,
        payer,
        1e9
    );

    // 4. fetch state
    recipientAta = await getAtaInterface(
        rpc,
        recipientAta.parsed.address,
        recipient.publicKey,
        mint
    );

    console.log(
        JSON.stringify(
            {
                payer: payer.publicKey.toBase58(),
                mint: mint.toBase58(),
                recipient: recipient.publicKey.toBase58(),
                recipientAta: recipientAta.parsed.address.toBase58(),
                recipientBalance: recipientAta.parsed.amount.toString(),
                createMintTx: transactionSignature,
                mintTx: txId,
            },
            null,
            2
        )
    );
})();
