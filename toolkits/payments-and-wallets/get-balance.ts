import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, bn } from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import {
    getAtaInterface,
    getAssociatedTokenAddressInterface,
    getOrCreateAtaInterface,
} from "@lightprotocol/compressed-token/unified";

async function main() {
    const rpc = createRpc();

    // Setup
    const payer = Keypair.generate();
    const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
    await rpc.confirmTransaction(airdropSig, "confirmed");

    const owner = Keypair.generate();
    const airdropSig2 = await rpc.requestAirdrop(owner.publicKey, 1e9);
    await rpc.confirmTransaction(airdropSig2, "confirmed");

    // Create test mint and tokens
    const mintAuthority = Keypair.generate();
    const mintKeypair = Keypair.generate();
    const { mint } = await createMint(
        rpc,
        payer,
        mintAuthority.publicKey,
        9,
        mintKeypair
    );

    // Mint tokens (creates cold balance)
    await mintTo(rpc, payer, mint, owner.publicKey, mintAuthority, bn(1000));

    // Create ATA and load cold to hot
    await getOrCreateAtaInterface(rpc, payer, mint, owner);

    // === GET BALANCE ===
    const ata = getAssociatedTokenAddressInterface(mint, owner.publicKey);
    const account = await getAtaInterface(rpc, ata, owner.publicKey, mint);

    console.log("ATA:", ata.toBase58());
    console.log("Balance:", account.parsed.amount.toString());

    // Show balance breakdown by source
    console.log("\n=== Balance Sources ===");
    for (const source of account._sources ?? []) {
        console.log(`${source.type}: ${source.amount.toString()}`);
    }
}

main().catch(console.error);
