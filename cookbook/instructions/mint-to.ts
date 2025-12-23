import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
    bn,
    DerivationMode,
} from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createAtaInterface,
    createMintToInterfaceInstruction,
    getMintInterface,
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

(async function () {
    const rpc = createRpc(RPC_URL);

    const { mint } = await createMintInterface(rpc, payer, payer, null, 9);

    const recipient = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, recipient.publicKey);
    const destination = getAssociatedTokenAddressInterface(
        mint,
        recipient.publicKey
    );

    const mintInterface = await getMintInterface(rpc, mint);

    let validityProof;
    if (mintInterface.merkleContext) {
        validityProof = await rpc.getValidityProofV2(
            [
                {
                    hash: bn(mintInterface.merkleContext.hash),
                    leafIndex: mintInterface.merkleContext.leafIndex,
                    treeInfo: mintInterface.merkleContext.treeInfo,
                    proveByIndex: mintInterface.merkleContext.proveByIndex,
                },
            ],
            [],
            DerivationMode.compressible
        );
    }

    const ix = createMintToInterfaceInstruction(
        mintInterface,
        destination,
        payer.publicKey,
        payer.publicKey,
        1_000_000_000,
        validityProof
    );

    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ix],
        payer,
        blockhash
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("Tx:", signature);
})();
