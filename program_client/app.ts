import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, } from "@solana/web3.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import {
    burnSendAndConfirm,
    CslSplTokenPDAs,
    deriveTicketMetadataPDA,
    getTicketMetadata,
    initializeClient,
    mintSendAndConfirm,
    transferSendAndConfirm,
} from "./index";
import { getMinimumBalanceForRentExemptAccount, getMint, TOKEN_PROGRAM_ID, } from "@solana/spl-token";

async function main(feePayer: Keypair) {
    const args = process.argv.slice(2);
    const connection = new Connection("http://127.0.0.1:8899/", {
        commitment: "confirmed",
    });

    const progId = new PublicKey(args[0]!);

    initializeClient(progId, connection);

    // Create a keypair to mint the NFT to
    const mint = Keypair.generate();
    console.info("+==== Mint Address  ===+");
    console.info(mint.publicKey.toBase58());

    // Generate two wallets to transfer the NFT between
    const vWallet = Keypair.generate();
    const johnnySilverhandWallet = Keypair.generate();
    console.info("+==== Wallet Information ===+");
    console.info(`V's Wallet: ${vWallet.publicKey.toBase58()}`);
    console.info(`Johnny Silverhand's Wallet: ${johnnySilverhandWallet.publicKey.toBase58()}`);

    const rent = await getMinimumBalanceForRentExemptAccount(connection);

    await sendAndConfirmTransaction(
        connection,
        new Transaction()
            .add(
                SystemProgram.createAccount({
                    fromPubkey: feePayer.publicKey,
                    newAccountPubkey: vWallet.publicKey,
                    space: 0,
                    lamports: rent,
                    programId: SystemProgram.programId,
                }),
            )
            .add(
                SystemProgram.createAccount({
                    fromPubkey: feePayer.publicKey,
                    newAccountPubkey: johnnySilverhandWallet.publicKey,
                    space: 0,
                    lamports: rent,
                    programId: SystemProgram.programId,
                }),
            ),
        [feePayer, vWallet, johnnySilverhandWallet],
    );

    // Derive the Ticket Metadata PDA
    console.info("+==== Ticket Metadata Address ====+");
    const [TicketPub] = deriveTicketMetadataPDA(
        {
            mint: mint.publicKey,
        },
        progId,
    );
    console.info(TicketPub.toBase58());

    /**
     * Derive the V's Associated Token Account, this account will be
     * holding the minted NFT.
     */
    const [vATA] = CslSplTokenPDAs.deriveAccountPDA({
        wallet: vWallet.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    });
    console.info("+==== V ATA ====+");
    console.info(vATA.toBase58());

    /**
     * Derive the Johnny Silverhand's Associated Token Account, this account will be
     * holding the minted NFT when V transfer it
     */
    const [johnnySilverhandATA] = CslSplTokenPDAs.deriveAccountPDA({
        wallet: johnnySilverhandWallet.publicKey,
        mint: mint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
    });
    console.info("+==== Johnny Silverhand ATA ====+");
    console.info(johnnySilverhandATA.toBase58());

    /**
     * Mint a new NFT into John's wallet (technically, the Associated Token Account)
     */
    console.info("+==== Minting... ====+");
    await mintSendAndConfirm({
        wallet: vWallet.publicKey,
        assocTokenAccount: vATA,
        eventName: "E3 2077",
        eventDate: "2077-01-01T00:00:00.000Z",
        eventLocation: "Night City",
        ticketType: "CyberVIP",
        ticketSeat: "Cyberdeck Lounge",
        briefDescription: "Bask in the neon glow of Night City at the E3 Night City Showcase 2077! With CyberVIP Access, explore cutting-edge gaming tech in the Cyberdeck Lounge. Dive into the future of gaming!",
        signers: {
            feePayer: feePayer,
            funding: feePayer,
            mint: mint,
            owner: vWallet,
        },
    });
    console.info("+==== Minted ====+");

    /**
     * Get the minted token
     */
    let mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    /**
     * Get the Ticket Metadata
     */
    let Ticket = await getTicketMetadata(TicketPub);
    console.info("+==== Ticket Metadata ====+");
    console.info(Ticket);
    console.assert(Ticket!.assocAccount!.toBase58(), vATA.toBase58());

    /**
     * Transfer V's NFT to Johnny Silverhand Wallet (technically, the Associated Token Account)
     */
    console.info("+==== Transferring... ====+");
    await transferSendAndConfirm({
        wallet: johnnySilverhandWallet.publicKey,
        assocTokenAccount: johnnySilverhandATA,
        mint: mint.publicKey,
        source: vATA,
        destination: johnnySilverhandATA,
        signers: {
            feePayer: feePayer,
            funding: feePayer,
            authority: vWallet,
        },
    });
    console.info("+==== Transferred ====+");

    /**
     * Get the minted token
     */
    mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    /**
     * Get the Ticket Metadata
     */
    Ticket = await getTicketMetadata(TicketPub);
    console.info("+==== Ticket Metadata ====+");
    console.info(Ticket);
    console.assert(Ticket!.assocAccount!.toBase58(), johnnySilverhandATA.toBase58());

    /**
     * Burn the NFT
     */
    console.info("+==== Burning... ====+");
    await burnSendAndConfirm({
        mint: mint.publicKey,
        wallet: johnnySilverhandWallet.publicKey,
        signers: {
            feePayer: feePayer,
            owner: johnnySilverhandWallet,
        },
    });
    console.info("+==== Burned ====+");

    /**
     * Get the minted token
     */
    mintAccount = await getMint(connection, mint.publicKey);
    console.info("+==== Mint ====+");
    console.info(mintAccount);

    /**
     * Get the Ticket Metadata
     */
    Ticket = await getTicketMetadata(TicketPub);
    console.info("+==== Ticket Metadata ====+");
    console.info(Ticket);
    console.assert(typeof Ticket!.assocAccount, "undefined");
}

fs.readFile(path.join(os.homedir(), ".config/solana/id.json")).then((file) =>
    main(Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())))),
);