const { ethers } = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
const bridgeAbi = require("./bridgeAbi");
dotenv.config();

const {
  HOLESKY_RPC_URL,
  TARGET_CHAIN_RPC_URL,
  HOLESKY_BRIDGE_ADDRESS,
  TARGET_CHAIN_BRIDGE_ADDRESS,
  PRIVATE_KEY,
  HOLESKY_CONFIRMATION_BLOCKS = "15",
  TARGET_CHAIN_CONFIRMATION_BLOCKS = "15"
} = process.env;

const providerHolesky = new ethers.JsonRpcProvider(HOLESKY_RPC_URL);
const providerSepolia = new ethers.JsonRpcProvider(TARGET_CHAIN_RPC_URL);
const walletHolesky = new ethers.Wallet(PRIVATE_KEY, providerHolesky);
const walletSepolia = new ethers.Wallet(PRIVATE_KEY, providerSepolia);

const holeskyBridge = new ethers.Contract(HOLESKY_BRIDGE_ADDRESS, bridgeAbi, walletHolesky);
const sepoliaBridge = new ethers.Contract(TARGET_CHAIN_BRIDGE_ADDRESS, bridgeAbi, walletSepolia);

const statePath = "./scripts/state.json";
let state = { processedHolesky: [], processedSepolia: [] };
if (fs.existsSync(statePath)) {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
}
function saveState() {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

const pollInterval = 10000; // 10s
let lastHoleskyBlock = 0;
let lastSepoliaBlock = 0;

async function waitForFinality(provider, fromBlock, confirmations, chain) {
  const targetBlock = fromBlock + parseInt(confirmations);
  let latest = await provider.getBlockNumber();
  while (latest < targetBlock) {
    console.log(`🔁 [${chain}] Waiting finality... (${latest}/${targetBlock})`);
    await new Promise((r) => setTimeout(r, 5000));
    latest = await provider.getBlockNumber();
  }
}

async function processDepositEvent(event, fromChain, toChain, confirmations, stateKey, bridgeWriter) {
  const { args, blockNumber } = event;
  const { token, from, to, amount, nonce } = args;
  if (state[stateKey].includes(nonce.toNumber())) return;

  console.log(`📥 [${fromChain}] Deposit:`, { from, to, amount: amount.toString(), nonce: nonce.toNumber() });
  await waitForFinality(fromChain === "Holesky" ? providerHolesky : providerSepolia, blockNumber, confirmations, fromChain);

  try {
    const tx = await bridgeWriter.distribute(token, to, amount, nonce);
    console.log(`🚀 [${fromChain}→${fromChain === "Holesky" ? "Sepolia" : "Holesky"}] Distribute tx:`, tx.hash);
    await tx.wait();
    console.log("✅ Distribution confirmed.");
    state[stateKey].push(nonce.toNumber());
    saveState();
  } catch (err) {
    console.error("❌ Distribution error:", err);
  }
}

async function processSwapEvent(event, fromChain, toChain, confirmations, stateKey, bridgeWriter) {
  const { args, blockNumber } = event;
  const { fromToken, toToken, recipient, amount, nonce } = args;
  if (state[stateKey].includes(nonce.toNumber())) return;

  console.log(`🔁 [${fromChain}] Swap:`, { fromToken, toToken, recipient, amount: amount.toString(), nonce: nonce.toNumber() });
  await waitForFinality(fromChain === "Holesky" ? providerHolesky : providerSepolia, blockNumber, confirmations, fromChain);

  try {
    const tx = await bridgeWriter.distribute(toToken, recipient, amount, nonce);
    console.log(`🚀 [${fromChain}→${fromChain === "Holesky" ? "Sepolia" : "Holesky"}] Swap distribute tx:`, tx.hash);
    await tx.wait();
    console.log("✅ Swap distribute confirmed.");
    state[stateKey].push(nonce.toNumber());
    saveState();
  } catch (err) {
    console.error("❌ Swap distribute error:", err);
  }
}

async function pollHolesky() {
  const latest = await providerHolesky.getBlockNumber();
  const fromBlock = lastHoleskyBlock || latest - 10;

  const depositEvents = await holeskyBridge.queryFilter("Deposit", fromBlock, latest);
  for (const e of depositEvents) {
    await processDepositEvent(e, "Holesky", providerSepolia, HOLESKY_CONFIRMATION_BLOCKS, "processedHolesky", sepoliaBridge);
  }

  const swapEvents = await holeskyBridge.queryFilter("DepositSwap", fromBlock, latest);
  for (const e of swapEvents) {
    await processSwapEvent(e, "Holesky", providerSepolia, HOLESKY_CONFIRMATION_BLOCKS, "processedHolesky", sepoliaBridge);
  }

  lastHoleskyBlock = latest + 1;
}

async function pollSepolia() {
  const latest = await providerSepolia.getBlockNumber();
  const fromBlock = lastSepoliaBlock || latest - 10;

  const depositEvents = await sepoliaBridge.queryFilter("Deposit", fromBlock, latest);
  for (const e of depositEvents) {
    await processDepositEvent(e, "Sepolia", providerHolesky, TARGET_CHAIN_CONFIRMATION_BLOCKS, "processedSepolia", holeskyBridge);
  }

  const swapEvents = await sepoliaBridge.queryFilter("DepositSwap", fromBlock, latest);
  for (const e of swapEvents) {
    await processSwapEvent(e, "Sepolia", providerHolesky, TARGET_CHAIN_CONFIRMATION_BLOCKS, "processedSepolia", holeskyBridge);
  }

  lastSepoliaBlock = latest + 1;
}

async function startPolling() {
  console.log("🚀 Bidirectional swap+deposit indexer started...");
  setInterval(pollHolesky, pollInterval);
  setInterval(pollSepolia, pollInterval);
}

startPolling();

process.on("SIGINT", () => {
  console.log("🛑 Stopping indexer, saving state...");
  saveState();
  process.exit();
});
