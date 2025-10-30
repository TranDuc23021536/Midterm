// scripts/swapTokenToEth.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // --- CONFIGURATION ---
  const SWAP_ADDRESS = "0xYourSwapContractAddress"; // Replace with deployed swap address
  const TOKEN_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  // Amount of tokens to swap for ETH
  const TOKEN_AMOUNT = "100"; // 100 tokens
  // ---------------------

  // Get signers (seller will be account #1 for testing)
  const [owner, seller] = await ethers.getSigners();
  
  console.log("=== Token to ETH Swap ===");
  console.log(`Seller: ${seller.address}`);
  console.log(`Swap Contract: ${SWAP_ADDRESS}`);
  console.log(`Tokens to swap: ${TOKEN_AMOUNT}`);

  // Connect to contracts
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const swap = TokenSwap.attach(SWAP_ADDRESS);
  
  const Token = await ethers.getContractFactory("MyToken");
  const token = Token.attach(TOKEN_ADDRESS);

  const tokenAmountWei = ethers.parseUnits(TOKEN_AMOUNT, 18);

  // Check exchange rate
  const rate = await swap.rate();
  const expectedEth = await swap.getEthForTokens(tokenAmountWei);
  
  console.log(`\nExchange Rate: 1 ETH = ${ethers.formatUnits(rate, 18)} MTK`);
  console.log(`You will receive: ${ethers.formatEther(expectedEth)} ETH`);

  // Check contract liquidity
  const [ethLiq, tokenLiq] = await swap.getContractBalances();
  console.log(`\nContract Liquidity:`);
  console.log(`  ETH: ${ethers.formatEther(ethLiq)}`);
  console.log(`  Tokens: ${ethers.formatUnits(tokenLiq, 18)} MTK`);

  if (ethLiq < expectedEth) {
    console.error("\n❌ Insufficient ETH liquidity in contract!");
    return;
  }

  // Check seller's balance
  const sellerTokenBalance = await token.balanceOf(seller.address);
  if (sellerTokenBalance < tokenAmountWei) {
    console.error(`\n❌ Insufficient token balance! You have ${ethers.formatUnits(sellerTokenBalance, 18)} MTK`);
    return;
  }

  // Check seller's initial balances
  const sellerEthBefore = await ethers.provider.getBalance(seller.address);
  const sellerTokenBefore = await token.balanceOf(seller.address);
  
  console.log(`\nSeller's balance before swap:`);
  console.log(`  ETH: ${ethers.formatEther(sellerEthBefore)}`);
  console.log(`  Tokens: ${ethers.formatUnits(sellerTokenBefore, 18)} MTK`);

  // Step 1: Approve tokens for swap contract
  console.log(`\n📝 Approving ${TOKEN_AMOUNT} tokens for swap contract...`);
  const approveTx = await token.connect(seller).approve(SWAP_ADDRESS, tokenAmountWei);
  await approveTx.wait();
  console.log(`✅ Approval successful`);

  // Step 2: Perform the swap (seller calls sellTokens)
  console.log(`\n🔄 Executing swap...`);
  const swapTx = await swap.connect(seller).sellTokens(tokenAmountWei);
  const receipt = await swapTx.wait();
  
  console.log(`✅ Swap successful! Tx: ${receipt.hash}`);

  // Check seller's final balances
  const sellerEthAfter = await ethers.provider.getBalance(seller.address);
  const sellerTokenAfter = await token.balanceOf(seller.address);
  
  console.log(`\nSeller's balance after swap:`);
  console.log(`  ETH: ${ethers.formatEther(sellerEthAfter)}`);
  console.log(`  Tokens: ${ethers.formatUnits(sellerTokenAfter, 18)} MTK`);

  console.log(`\n📊 Changes:`);
  console.log(`  ETH received: ${ethers.formatEther(sellerEthAfter - sellerEthBefore)} (minus gas)`);
  console.log(`  Tokens spent: ${ethers.formatUnits(sellerTokenBefore - sellerTokenAfter, 18)} MTK`);

  // Check updated contract balances
  const [ethLiqAfter, tokenLiqAfter] = await swap.getContractBalances();
  console.log(`\nContract Liquidity After Swap:`);
  console.log(`  ETH: ${ethers.formatEther(ethLiqAfter)} (- ${ethers.formatEther(ethLiq - ethLiqAfter)})`);
  console.log(`  Tokens: ${ethers.formatUnits(tokenLiqAfter, 18)} MTK (+ ${ethers.formatUnits(tokenLiqAfter - tokenLiq, 18)})`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });