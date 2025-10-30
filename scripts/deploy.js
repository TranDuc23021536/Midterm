// scripts/deploy.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const initialSupply = 1000000;

  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy(initialSupply);

  await token.waitForDeployment();

  const deployedAddress = await token.getAddress();
  console.log("MyToken deployed to:", deployedAddress);

  // OPTIONAL: Transfer some tokens to your MetaMask account
  const yourMetaMaskAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"; // Replace with YOUR address
  const amountToTransfer = ethers.parseUnits("100000", 18); // Send 100,000 tokens

  console.log(`\nTransferring ${ethers.formatUnits(amountToTransfer, 18)} tokens to ${yourMetaMaskAddress}...`);
  const transferTx = await token.transfer(yourMetaMaskAddress, amountToTransfer);
  await transferTx.wait();
  console.log("Transfer complete!");

  // Check balances
  const deployerBalance = await token.balanceOf(deployer.address);
  const recipientBalance = await token.balanceOf(yourMetaMaskAddress);
  
  console.log("\n=== Final Balances ===");
  console.log(`Deployer: ${ethers.formatUnits(deployerBalance, 18)} MTK`);
  console.log(`Your Account: ${ethers.formatUnits(recipientBalance, 18)} MTK`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });