import dotenv from "dotenv";
import { Keypair } from "@solana/web3.js";
import {
    bn,
    createRpc,
    selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";
import { getOrCreateAtaInterface } from "@lightprotocol/compressed-token/unified";
import { homedir } from "os";
import { readFileSync } from "fs";

// Load wallet
const keypairPath = `${homedir()}/.config/solana/id.json`;
const payer = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keypairPath, "utf8")))
);

// You can use any compatible RPC endpoint
dotenv.config();
const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;

async function main() {
    const rpc = createRpc(RPC_URL);
    const infos = await rpc.getStateTreeInfos();
    const treeInfo = selectStateTreeInfo(infos);
    console.log(treeInfo);

    // Create an SPL mint + enable compression.
    const mintAuthority = Keypair.generate();
    const mintSigner = Keypair.generate();
    const { mint, transactionSignature: createMintSig } = await createMint(
        rpc,
        payer,
        mintAuthority.publicKey,
        9,
        mintSigner
    );

    // Mint compressed tokens to a recipient (owner pubkey).
    const recipient = Keypair.generate();
    const amount = bn(1_000_000_000);
    const mintToSig = await mintTo(
        rpc,
        payer,
        mint,
        recipient.publicKey,
        mintAuthority,
        amount,
        treeInfo
    );

    // Create/load the recipient's c-token ATA interface (loads cold balance to hot).
    const recipientAccount = await getOrCreateAtaInterface(
        rpc,
        payer,
        mint,
        recipient
    );

    console.log(
        JSON.stringify(
            {
                payer: payer.publicKey.toBase58(),
                mint: mint.toBase58(),
                recipient: recipient.publicKey.toBase58(),
                recipientAta: recipientAccount.parsed.address.toBase58(),
                recipientBalance: recipientAccount.parsed.amount.toString(),
                createMintTx: createMintSig,
                mintTx: mintToSig,
            },
            null,
            2
        )
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
