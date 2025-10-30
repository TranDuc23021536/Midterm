// scripts/deploySwap.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TokenSwap contract from:", deployer.address);

  // --- CONFIGURATION ---
  // Replace with your deployed MyToken address
  const TOKEN_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  // Exchange rate: tokens per 1 ETH
  // Example: 1000 means 1 ETH = 1000 tokens
  const EXCHANGE_RATE = ethers.parseUnits("1000", 18);
  // ---------------------

  console.log(`Token Address: ${TOKEN_ADDRESS}`);
  console.log(`Exchange Rate: 1 ETH = ${ethers.formatUnits(EXCHANGE_RATE, 18)} tokens`);

  // Deploy the swap contract
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const swap = await TokenSwap.deploy(TOKEN_ADDRESS, EXCHANGE_RATE);

  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();

  console.log("\n✅ TokenSwap deployed to:", swapAddress);
  console.log("\nNext steps:");
  console.log("1. Approve the swap contract to spend your tokens:");
  console.log(`   token.approve("${swapAddress}", amount)`);
  console.log("2. Add liquidity to the swap contract:");
  console.log(`   npx hardhat run scripts/addLiquidity.js --network localhost`);
  console.log("3. Users can now swap ETH for tokens!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });