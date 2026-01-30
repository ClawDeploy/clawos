# ClawOS Smart Contracts

## Programs

### Skill Marketplace

The main marketplace contract that handles:
- Skill listings registration
- Purchase transactions
- License management
- Payment distribution (97.5% seller, 2.5% platform)

## Build

```bash
anchor build
```

## Test

```bash
anchor test
```

## Deploy

```bash
# Devnet
anchor deploy --provider.cluster devnet

# Mainnet
anchor deploy --provider.cluster mainnet
```

## Program ID

```
CLAWoSGaA5MzY1kzJ4k2g8fJ5v9xQzR7yTyUv9d9KdM3
```
