# NFT Ticket

## Description

This project create NFTs that represent tickets for events. The NFTs are minted by the event organizer.

NFT contains the following information:

- Event name
- Event date
- Event location
- Ticket type (VIP, Regular, etc.)
- Ticket seat
- Brief description of the event

## Functions

**Mint:** The event organizer can mint NFTs for the event. The organizer can mint multiple NFTs for the same event.

**Transfer:** The NFTs can be transferred to other accounts.

**Burn:** The NFTs can be burned by the owner.

## Installation

### Build

```bash
cd program && cargo-build-sbf
```

### Validator

To test the program with `solana-test-validator`:

- First we have to start the validator
- And then we have to configure the CLI Tool Suite to target the local cluster.

```bash
solana-test-validator
```

```bash
solana config set --url http://127.0.0.1:8899
```

To verift the validator is running:

```bash
solana genesis hash
```

If the result matches the hash in `solana-test-validator` output, then the validator is running.

### Deploy

```bash
solana program deploy ./target/deploy/nft.so
```

This will return the program id, which we will use to interact with the program.

### Frontend Testing

```bash
cd program_client && yarn add @solana/spl-token ts-node
```

```bash
yarn ts-node app.ts $program_id
```
