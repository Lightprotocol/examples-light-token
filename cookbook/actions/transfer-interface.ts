import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, featureFlags, VERSION } from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createAtaInterface,
    mintToInterface,
    transferInterface,
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

    // 2. Create a light-mint
    const mintSigner = Keypair.generate();
    const { mint } = await createMintInterface(
        rpc,
        payer,
        payer,
        null,
        9,
        mintSigner,
    );
    console.log("Mint:", mint.toBase58());

    // 3. Create sender's ATA and mint tokens
    const sender = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, sender.publicKey);
    const senderAta = getAssociatedTokenAddressInterface(
        mint,
        sender.publicKey,
    );
    await mintToInterface(rpc, payer, mint, senderAta, payer, 1_000_000_000);
    console.log("Sender ATA:", senderAta.toBase58());

    // 4. Create recipient's ATA
    const recipient = Keypair.generate();
    await createAtaInterface(rpc, payer, mint, recipient.publicKey);
    const recipientAta = getAssociatedTokenAddressInterface(
        mint,
        recipient.publicKey,
    );
    console.log("Recipient ATA:", recipientAta.toBase58());

    // 5. Transfer tokens
    const txSignature = await transferInterface(
        rpc,
        payer,
        senderAta,
        mint,
        recipientAta,
        sender, // owner (must be Signer)
        500_000_000, // amount to transfer
    );

    console.log("Transferred 0.5 tokens");
    console.log("Transaction:", txSignature);
}

main().catch((err) => {
    console.error("Error:", err);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
