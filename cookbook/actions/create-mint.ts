import "dotenv/config";
import { Keypair } from "@solana/web3.js";
import { createRpc, featureFlags, VERSION } from "@lightprotocol/stateless.js";
import {
    createMintInterface,
    createTokenMetadata,
} from "@lightprotocol/compressed-token";

featureFlags.version = VERSION.V2;

async function main() {
    // 1. Connect to local test-validator (default: localhost:8899)
    // Start with: light test-validator
    const rpc = createRpc();

    // 2. Load payer keypair from local Solana config
    // For localnet, use the test keypair or airdrop SOL
    const payer = Keypair.generate();

    // Airdrop SOL to payer for localnet
    const airdropSig = await rpc.requestAirdrop(payer.publicKey, 10e9);
    await rpc.confirmTransaction(airdropSig, "confirmed");
    console.log("Payer:", payer.publicKey.toBase58());

    // 3. Generate a new mint signer keypair
    const mintSigner = Keypair.generate();

    // 4. Generate mint authority keypair
    const mintAuthority = Keypair.generate();

    // 5. Create compressed mint with token metadata
    // The SDK auto-fetches V2 tree info from local validator
    const { mint, transactionSignature } = await createMintInterface(
        rpc,
        payer,
        mintAuthority, // mintAuthority (must be Signer for compressed mints)
        null, // freezeAuthority
        9, // decimals
        mintSigner,
        { skipPreflight: true }, // confirmOptions
        undefined, // programId (defaults to CTOKEN_PROGRAM_ID)
        createTokenMetadata(
            "Example Token",
            "EXT",
            "https://example.com/metadata.json",
        ),
    );

    console.log("Mint created:", mint.toBase58());
    console.log(`Transaction: ${transactionSignature}`);
}

main().catch(console.error);
