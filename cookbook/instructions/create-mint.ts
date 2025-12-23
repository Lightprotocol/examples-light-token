import "dotenv/config";
import { Keypair, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
    getBatchAddressTreeInfo,
    selectStateTreeInfo,
    CTOKEN_PROGRAM_ID,
    DerivationMode,
} from "@lightprotocol/stateless.js";
import { createMintInstruction, createTokenMetadata } from "@lightprotocol/compressed-token";
import { homedir } from "os";
import { readFileSync } from "fs";

const COMPRESSED_MINT_SEED = Buffer.from("compressed_mint");

function findMintAddress(mintSigner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [COMPRESSED_MINT_SEED, mintSigner.toBuffer()],
        CTOKEN_PROGRAM_ID
    );
}

const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;
const payer = Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))
    )
);

(async function () {
    const rpc = createRpc(RPC_URL);

    const mintSigner = Keypair.generate();
    const addressTreeInfo = getBatchAddressTreeInfo();
    const stateTreeInfo = selectStateTreeInfo(await rpc.getStateTreeInfos());
    const [mintPda] = findMintAddress(mintSigner.publicKey);

    const validityProof = await rpc.getValidityProofV2(
        [],
        [{ address: mintPda.toBytes(), treeInfo: addressTreeInfo }],
        DerivationMode.compressible
    );

    const ix = createMintInstruction(
        mintSigner.publicKey,
        9,
        payer.publicKey,
        null,
        payer.publicKey,
        validityProof,
        addressTreeInfo,
        stateTreeInfo,
        createTokenMetadata("Example Token", "EXT", "https://example.com/metadata.json")
    );

    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ix],
        payer,
        blockhash,
        [mintSigner]
    );
    const signature = await sendAndConfirmTx(rpc, tx, { skipPreflight: true });

    console.log("Mint:", mintPda.toBase58());
    console.log("Tx:", signature);
})();
