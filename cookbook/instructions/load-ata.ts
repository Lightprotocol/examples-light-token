import "dotenv/config";
import {
    Keypair,
    ComputeBudgetProgram,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import {
    createMint,
    mintTo,
    createLoadAtaInstructions,
    getAssociatedTokenAddressInterface,
} from "@lightprotocol/compressed-token";
import { homedir } from "os";
import { readFileSync } from "fs";

// devnet:
const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;
const rpc = createRpc(RPC_URL);
// localnet:
// const rpc = createRpc();

const payer = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))
    )
);

(async function () {
    // Setup: Get compressed tokens (cold storage)
    const { mint } = await createMint(rpc, payer, payer.publicKey, 9);
    await mintTo(rpc, payer, mint, payer.publicKey, payer, bn(1000));

    // Create load instructions to move tokens from cold to hot balance
    const ctokenAta = getAssociatedTokenAddressInterface(mint, payer.publicKey);

    const ixs = await createLoadAtaInstructions(
        rpc,
        ctokenAta,
        payer.publicKey,
        mint,
        payer.publicKey
    );

    if (ixs.length === 0) {
        console.log("Nothing to load");
        return;
    }

    const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
        ...ixs
    );
    const signature = await sendAndConfirmTransaction(rpc, tx, [payer]);

    console.log("Tx:", signature);
})();
