import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    bn,
    buildAndSignTx,
    sendAndConfirmTx,
    dedupeSigner,
} from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    createLoadAtaInstructions,
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

    const ixs = await createLoadAtaInstructions(rpc, ctokenAta, payer.publicKey, mint, payer.publicKey);

    if (ixs.length === 0) {
        console.log("Nothing to load");
        return;
    }

    const { blockhash } = await rpc.getLatestBlockhash();
    const additionalSigners = dedupeSigner(payer, [payer]);

    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ...ixs],
        payer,
        blockhash,
        additionalSigners
    );

    const signature = await sendAndConfirmTx(rpc, tx);
    console.log("Loaded tokens to hot balance");
    console.log("Tx:", signature);
}

main().catch(console.error);
