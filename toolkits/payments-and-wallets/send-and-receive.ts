import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import {
    getOrCreateAtaInterface,
    getAssociatedTokenAddressInterface,
    transferInterface,
} from "@lightprotocol/compressed-token/unified";

async function main() {
    const rpc = createRpc();

    // Setup wallets
    const payer = Keypair.generate();
    const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
    await rpc.confirmTransaction(airdropSig, "confirmed");

    const sender = Keypair.generate();
    const airdropSig2 = await rpc.requestAirdrop(sender.publicKey, 1e9);
    await rpc.confirmTransaction(airdropSig2, "confirmed");

    const recipient = Keypair.generate();
    const airdropSig3 = await rpc.requestAirdrop(recipient.publicKey, 1e9);
    await rpc.confirmTransaction(airdropSig3, "confirmed");

    console.log("Sender:", sender.publicKey.toBase58());
    console.log("Recipient:", recipient.publicKey.toBase58());

    // Create a test mint (in production, use existing stablecoin mint)
    const mintAuthority = Keypair.generate();
    const mintKeypair = Keypair.generate();
    const { mint } = await createMint(
        rpc,
        payer,
        mintAuthority.publicKey,
        9,
        mintKeypair,
    );
    console.log("Mint:", mint.toBase58());

    // Mint tokens to sender
    await mintTo(rpc, payer, mint, sender.publicKey, mintAuthority, bn(1000));
    console.log("Minted 1000 tokens to sender");

    // === RECEIVE: Get/create sender's ATA ===
    // This creates the ATA and loads any cold balance to hot
    const senderAccount = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        sender, // Signer enables auto-load
    );
    console.log("\nSender ATA:", senderAccount.parsed.address.toBase58());
    console.log("Sender balance:", senderAccount.parsed.amount.toString());

    // === RECEIVE: Get/create recipient's ATA ===
    const recipientAccount = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient,
    );
    console.log("\nRecipient ATA:", recipientAccount.parsed.address.toBase58());
    console.log(
        "Recipient balance before:",
        recipientAccount.parsed.amount.toString(),
    );

    // === SEND: Transfer tokens ===
    const sourceAta = getAssociatedTokenAddressInterface(
        mint,
        sender.publicKey,
    );
    const destinationAta = getAssociatedTokenAddressInterface(
        mint,
        recipient.publicKey,
    );

    const signature = await transferInterface(
        rpc,
        payer,
        sourceAta,
        mint,
        destinationAta,
        sender,
        bn(500),
    );

    console.log("\nTransferred 500 tokens");
    console.log("Transaction:", signature);

    // Check final balances
    const senderFinal = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        sender.publicKey,
    );
    const recipientFinal = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient.publicKey,
    );

    console.log("\n=== Final Balances ===");
    console.log("Sender:", senderFinal.parsed.amount.toString());
    console.log("Recipient:", recipientFinal.parsed.amount.toString());
}

main().catch(console.error);
