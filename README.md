# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

## Running the ERC20 allowance UI

The `frontend/` directory contains a standalone web page for managing ERC20 allowances with MetaMask.

1. Install dependencies if you have not already:

   ```shell
   npm install
   ```

2. Start a simple static server from the project root (pick any port you like). Using `npx serve` is the quickest option:

   ```shell
   npx serve frontend -l 5173
   ```

   You can use any other static file server (`python -m http.server`, `npx http-server`, etc.) as long as the files are served over HTTP/HTTPS—MetaMask will not inject `window.ethereum` when the page is opened directly from the filesystem.

3. Open the printed URL (for the command above it will be <http://localhost:5173>) in a desktop browser where MetaMask is installed.

4. Click **Connect Wallet** to authorize the site, enter your ERC20 token address, and manage spender approvals through the interface.

If you are using a local Hardhat network, make sure the network is running (`npx hardhat node`) and that MetaMask is connected to that same network before interacting with the UI.