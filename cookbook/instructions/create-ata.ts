import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
    CTOKEN_PROGRAM_ID,
} from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createAssociatedTokenAccountInterfaceInstruction,
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

    const { mint } = await createMintInterface(rpc, payer, payer, null, 9);
    console.log("Mint:", mint.toBase58());

    const owner = Keypair.generate();
    const associatedToken = getAssociatedTokenAddressInterface(mint, owner.publicKey);

    const ix = createAssociatedTokenAccountInterfaceInstruction(
        payer.publicKey,
        associatedToken,
        owner.publicKey,
        mint,
        CTOKEN_PROGRAM_ID
    );

    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }), ix],
        payer,
        blockhash
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("ATA:", associatedToken.toBase58());
    console.log("Tx:", signature);
}

main().catch(console.error);
