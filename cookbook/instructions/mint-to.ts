import "dotenv/config";
import { Keypair, ComputeBudgetProgram } from "@solana/web3.js";
import {
    createRpc,
    buildAndSignTx,
    sendAndConfirmTx,
    bn,
    DerivationMode,
    featureFlags,
    VERSION,
} from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createAtaInterface,
    createMintToInterfaceInstruction,
    getMintInterface,
    getAssociatedTokenAddressInterface,
} from "@lightprotocol/compressed-token";

featureFlags.version = VERSION.V2;

async function main() {
    // 1. Setup RPC and fund payer
    const rpc = createRpc();
    const payer = Keypair.generate();
    const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
    await rpc.confirmTransaction(airdropSig, "confirmed");
    console.log("Payer:", payer.publicKey.toBase58());

    // 2. Create a light-mint (payer is mint authority)
    const mintSigner = Keypair.generate();
    const { mint } = await createMintInterface(
        rpc,
        payer,
        payer,
        null,
        9,
        mintSigner,
    );
    console.log("Mint created:", mint.toBase58());

    // 3. Create associated token account for recipient
    const recipient = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, recipient.publicKey);
    const destination = getAssociatedTokenAddressInterface(
        mint,
        recipient.publicKey,
    );
    console.log("Recipient ATA created:", destination.toBase58());

    // 4. Get mint interface (includes merkle context for c-tokens)
    const mintInterface = await getMintInterface(rpc, mint);

    // 5. Get validity proof for the mint (required for c-token mints)
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
            DerivationMode.compressible,
        );
    }

    // 6. Create instruction
    const amount = 1_000_000_000;
    const ix = createMintToInterfaceInstruction(
        mintInterface,
        destination,
        payer.publicKey, // authority
        payer.publicKey, // payer
        amount,
        validityProof,
    );

    // 7. Build, sign, and send transaction
    const { blockhash } = await rpc.getLatestBlockhash();
    const tx = buildAndSignTx(
        [ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }), ix],
        payer,
        blockhash,
    );
    const signature = await sendAndConfirmTx(rpc, tx);

    console.log("Minted tokens:", amount);
    console.log("Transaction:", signature);
}

main().catch(console.error);
