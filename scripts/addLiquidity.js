// scripts/addLiquidity.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  
  // --- CONFIGURATION ---
  const TOKEN_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  const SWAP_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with deployed swap address
  
  // Amount of tokens to add as liquidity
  const TOKEN_AMOUNT = "100000"; // 100,000 tokens
  
  // Amount of ETH to add to the contract (optional)
  const ETH_AMOUNT = "10"; // 10 ETH
  // ---------------------

  console.log("Adding liquidity from:", owner.address);
  console.log(`Token: ${TOKEN_ADDRESS}`);
  console.log(`Swap Contract: ${SWAP_ADDRESS}`);

  // Get contract instances
  const Token = await ethers.getContractFactory("MyToken");
  const token = Token.attach(TOKEN_ADDRESS);
  
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const swap = TokenSwap.attach(SWAP_ADDRESS);

  const tokenAmountWei = ethers.parseUnits(TOKEN_AMOUNT, 18);
  const ethAmountWei = ethers.parseEther(ETH_AMOUNT);

  // Check current balance
  const balance = await token.balanceOf(owner.address);
  console.log(`\nYour token balance: ${ethers.formatUnits(balance, 18)} MTK`);

  if (balance < tokenAmountWei) {
    console.error(`❌ Insufficient balance. You need ${TOKEN_AMOUNT} tokens.`);
    return;
  }

  // Step 1: Approve tokens
  console.log(`\nApproving ${TOKEN_AMOUNT} tokens for swap contract...`);
  const approveTx = await token.approve(SWAP_ADDRESS, tokenAmountWei);
  await approveTx.wait();
  console.log("✅ Approval successful");

  // Step 2: Add token liquidity
  console.log(`\nAdding ${TOKEN_AMOUNT} tokens to liquidity pool...`);
  const addLiqTx = await swap.addLiquidity(tokenAmountWei);
  await addLiqTx.wait();
  console.log("✅ Token liquidity added");

  // Step 3: Add ETH liquidity (optional)
  if (parseFloat(ETH_AMOUNT) > 0) {
    console.log(`\nAdding ${ETH_AMOUNT} ETH to liquidity pool...`);
    const addEthTx = await owner.sendTransaction({
      to: SWAP_ADDRESS,
      value: ethAmountWei
    });
    await addEthTx.wait();
    console.log("✅ ETH liquidity added");
  }

  // Check final balances
  const [ethBalance, tokenBalance] = await swap.getContractBalances();
  console.log("\n=== Swap Contract Balances ===");
  console.log(`ETH: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`Tokens: ${ethers.formatUnits(tokenBalance, 18)} MTK`);

  // Show exchange info
  const rate = await swap.rate();
  console.log(`\nExchange Rate: 1 ETH = ${ethers.formatUnits(rate, 18)} MTK`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });