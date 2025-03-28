# 🌉 Cross-Chain Token Bridge

Welcome to the `cross_chain_bridge` project! This repository contains a functional implementation of a cross-chain token bridge between Ethereum Holesky and Sepolia testnets. It includes smart contracts, deployment scripts, and an automated event indexer.

---

## 🚀 Features

- 🔒 **Secure token deposits** with ownership and pause control
- 📦 **Token distribution** across chains
- 🔁 **Bidirectional bridging** (Holesky ↔ Sepolia)
- 🧠 **Finality-aware indexer** using confirmation thresholds
- 🪙 **Multi-token support**
- 💱 **Swap functionality** via token mappings *(implemented in code, not deployed)*

---

## 🧱 Project Structure

```
/cross_chain_bridge    
├── /scripts         # Deployment and indexer scripts
├── /src             # contracts
├── /test            #testing files
├── foundry.toml     # Forge config
├── tsconfig.json    # TypeScript config
├── package.json
├── package-lock.json 
├── .env             # Runtime variables (private key, RPC URLs, etc.)
```

---

## 📜 Workshop Objectives (Completed ✅)

- [x] Deploy bridge contracts to Holesky and Sepolia
- [x] Handle deposits and distributions
- [x] Build a resilient event indexer (listens on both chains)
- [x] Verify transaction finality before triggering actions
- [x] Process tokens in both directions
- [x] Add support for multiple tokens

---

## 🧪 Optional (Implemented in Code, Not Deployed)

- [x] `setTokenMapping(fromToken, toToken)` to link ERC20s across chains
- [x] `depositAndSwap()` to swap `TokenA` for `TokenB` cross-chain
- [ ] Final deployment of the swap-ready contract (skipped for simplicity)

> 🔎 The contract logic is complete and tested locally — only deployment was skipped.

---

## 🧪 How to Test Locally

1. Install dependencies:
```bash
npm install
forge install
```

2. Compile contracts:
```bash
forge build
```

3. Deploy bridge (if needed):
```bash
forge script script/DeployTokenBridge.s.sol:DeployTokenBridge \
  --rpc-url $HOLESKY_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

4. Run indexer:
```bash
npm run indexer
```

5. Use `cast` to interact:
```bash
cast send <token> "approve(address,uint256)" <bridge> <amount> --rpc-url $RPC --private-key $KEY
cast send <bridge> "deposit(address,uint256,address)" ...
```

---

## 🔐 Security Considerations

> This project is for educational purposes only.

In production, you should:
- Use multi-sig or access control for critical functions
- Verify tokens via checksums or allowlists
- Limit deposits / add rate limiting
- Integrate Chainlink oracles for dynamic swaps

---

### Holesky Addresses
- Bridge : `0x38b4B2602bb087df7fa4508344837775d51e3261`
- Token TST : `0xbC4cAe667fbA05a1206742581E6908bfB224f505`

### Sepolia
- Bridge : `0x48F1A795B903eE7b705009C0AAc8d56BAa359705`
- Token TST : `0xacB0399DE3c433bF0b7aaF2B844cB642D89105Ae`

