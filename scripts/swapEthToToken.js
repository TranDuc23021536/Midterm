// scripts/swapEthToToken.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  // --- CONFIGURATION ---
  const SWAP_ADDRESS = "0xYourSwapContractAddress"; // Replace with deployed swap address
  const TOKEN_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  // Amount of ETH to swap
  const ETH_AMOUNT = "0.1"; // 0.1 ETH
  // ---------------------

  // Get signers (buyer will be account #1 for testing)
  const [owner, buyer] = await ethers.getSigners();
  
  console.log("=== ETH to Token Swap ===");
  console.log(`Buyer: ${buyer.address}`);
  console.log(`Swap Contract: ${SWAP_ADDRESS}`);
  console.log(`ETH to swap: ${ETH_AMOUNT}`);

  // Connect to contracts
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const swap = TokenSwap.attach(SWAP_ADDRESS);
  
  const Token = await ethers.getContractFactory("MyToken");
  const token = Token.attach(TOKEN_ADDRESS);

  const ethAmountWei = ethers.parseEther(ETH_AMOUNT);

  // Check exchange rate
  const rate = await swap.rate();
  const expectedTokens = await swap.getTokensForEth(ethAmountWei);
  
  console.log(`\nExchange Rate: 1 ETH = ${ethers.formatUnits(rate, 18)} MTK`);
  console.log(`You will receive: ${ethers.formatUnits(expectedTokens, 18)} MTK`);

  // Check contract liquidity
  const [ethLiq, tokenLiq] = await swap.getContractBalances();
  console.log(`\nContract Liquidity:`);
  console.log(`  ETH: ${ethers.formatEther(ethLiq)}`);
  console.log(`  Tokens: ${ethers.formatUnits(tokenLiq, 18)} MTK`);

  if (tokenLiq < expectedTokens) {
    console.error("\n❌ Insufficient token liquidity in contract!");
    return;
  }

  // Check buyer's initial balances
  const buyerEthBefore = await ethers.provider.getBalance(buyer.address);
  const buyerTokenBefore = await token.balanceOf(buyer.address);
  
  console.log(`\nBuyer's balance before swap:`);
  console.log(`  ETH: ${ethers.formatEther(buyerEthBefore)}`);
  console.log(`  Tokens: ${ethers.formatUnits(buyerTokenBefore, 18)} MTK`);

  // Perform the swap (buyer calls buyTokens)
  console.log(`\n🔄 Executing swap...`);
  const swapTx = await swap.connect(buyer).buyTokens({ value: ethAmountWei });
  const receipt = await swapTx.wait();
  
  console.log(`✅ Swap successful! Tx: ${receipt.hash}`);

  // Check buyer's final balances
  const buyerEthAfter = await ethers.provider.getBalance(buyer.address);
  const buyerTokenAfter = await token.balanceOf(buyer.address);
  
  console.log(`\nBuyer's balance after swap:`);
  console.log(`  ETH: ${ethers.formatEther(buyerEthAfter)}`);
  console.log(`  Tokens: ${ethers.formatUnits(buyerTokenAfter, 18)} MTK`);

  console.log(`\n📊 Changes:`);
  console.log(`  ETH spent: ${ethers.formatEther(buyerEthBefore - buyerEthAfter)} (includes gas)`);
  console.log(`  Tokens received: ${ethers.formatUnits(buyerTokenAfter - buyerTokenBefore, 18)} MTK`);

  // Check updated contract balances
  const [ethLiqAfter, tokenLiqAfter] = await swap.getContractBalances();
  console.log(`\nContract Liquidity After Swap:`);
  console.log(`  ETH: ${ethers.formatEther(ethLiqAfter)} (+ ${ethers.formatEther(ethLiqAfter - ethLiq)})`);
  console.log(`  Tokens: ${ethers.formatUnits(tokenLiqAfter, 18)} MTK (- ${ethers.formatUnits(tokenLiq - tokenLiqAfter, 18)})`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });