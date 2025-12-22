import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import {
    mintToInterface,
    createMintInterface,
} from "@lightprotocol/compressed-token";
import { getOrCreateAtaInterface } from "@lightprotocol/compressed-token/unified";
import { homedir } from "os";
import { readFileSync } from "fs";

// Load wallet
const keypairPath = `${homedir()}/.config/solana/id.json`;
const payer = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf8")))
);

// You can use any compatible RPC endpoint
dotenv.config();
const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;

async function main() {
    const rpc = createRpc();

    const mintAuthority = payer;
    const { mint, transactionSignature } = await createMintInterface(
        rpc,
        payer,
        mintAuthority,
        null,
        9
    );

    // Mint compressed tokens to a recipient token account.
    const recipient = Keypair.generate();
    const recipientAta = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient
    );

    const txId = await mintToInterface(
        rpc,
        payer,
        mint,
        recipientAta.parsed.address,
        payer,
        1e9
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
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
