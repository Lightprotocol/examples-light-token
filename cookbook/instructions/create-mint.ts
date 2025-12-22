import "dotenv/config";
import { Keypair, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
    getBatchAddressTreeInfo,
    selectStateTreeInfo,
    featureFlags,
    VERSION,
    CTOKEN_PROGRAM_ID,
    DerivationMode,
} from "@lightprotocol/stateless.js";
import {
    createMintInstruction,
    createTokenMetadata,
} from "@lightprotocol/compressed-token";

featureFlags.version = VERSION.V2;

// Inline findMintAddress since it's not exported from the package
const COMPRESSED_MINT_SEED = Buffer.from("compressed_mint");

function findMintAddress(mintSigner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [COMPRESSED_MINT_SEED, mintSigner.toBuffer()],
        CTOKEN_PROGRAM_ID,
    );
}

async function main() {
    // 1. Setup RPC connection to local validator
    const rpc = createRpc();

    // 2. Create and fund payer
    const payer = Keypair.generate();
    const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
    await rpc.confirmTransaction(airdropSig, "confirmed");
    console.log("Payer:", payer.publicKey.toBase58());

    // 3. Prepare mint parameters
    const mintSigner = Keypair.generate();
    const decimals = 9;

    // 4. Get tree infos
    // Address Merkle tree stores the mint address
    // State Merkle tree stores the mint account data
    const addressTreeInfo = getBatchAddressTreeInfo();
    const stateTreeInfo = selectStateTreeInfo(await rpc.getStateTreeInfos());

    // 5. Derive the mint PDA address
    const [mintPda] = findMintAddress(mintSigner.publicKey);

    // 6. Get validity proof for address creation
    // Proves the mint address does not exist yet
    const validityProof = await rpc.getValidityProofV2(
        [],
        [{ address: mintPda.toBytes(), treeInfo: addressTreeInfo }],
        DerivationMode.compressible,
    );

    // 7. Create instruction
    const ix = createMintInstruction(
        mintSigner.publicKey,
        decimals,
        payer.publicKey, // mintAuthority
        null, // freezeAuthority
        payer.publicKey, // payer
        validityProof,
        addressTreeInfo,
        stateTreeInfo,
        createTokenMetadata(
            "Example Token",
            "EXT",
            "https://example.com/metadata.json",
        ),
    );

    // 8. Build, sign, and send transaction
    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ix],
        payer,
        blockhash,
        [mintSigner],
    );
    const signature = await sendAndConfirmTx(rpc, tx, { skipPreflight: true });

    console.log("Mint created:", mintPda.toBase58());
    console.log("Transaction:", signature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
