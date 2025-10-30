// ERC20 Token Manager - Complete Application
// Save this as: frontend/app.js

// ==================== Global Variables ====================
window.provider = null;
window.signer = null;
window.userAddress = null;
window.tokenContract = null;
window.tokenDecimals = 18;
window.tokenSymbol = 'TOKEN';

// Swap state
let swapState = {
  fromToken: 'ETH',
  toToken: 'TOKEN',
  slippage: 1.0,
  exchangeRate: 1000, // 1 ETH = 1000 TOKEN (adjust as needed)
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// ==================== Utility Functions ====================
function updateStatus(message, isError = false) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  if (isError) {
    statusElement.classList.add('error');
  } else {
    statusElement.classList.remove('error');
  }
}

function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ==================== Wallet Connection ====================
async function connectWallet() {
  try {
    if (typeof window.ethereum === 'undefined') {
      updateStatus('MetaMask is not installed! Please install MetaMask extension.', true);
      return;
    }

    updateStatus('Connecting to wallet...');
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    window.userAddress = accounts[0];
    window.provider = new ethers.BrowserProvider(window.ethereum);
    window.signer = await window.provider.getSigner();
    
    // Get network info
    const network = await window.provider.getNetwork();
    
    // Update UI
    document.getElementById('accountDisplay').textContent = shortenAddress(window.userAddress);
    document.getElementById('networkDisplay').textContent = `${network.name} (Chain ID: ${network.chainId})`;
    document.getElementById('sidebarStatus').textContent = 'Connected';
    document.querySelector('.status-dot').style.background = 'var(--success)';
    
    updateStatus(`Connected to ${shortenAddress(window.userAddress)}\nNetwork: ${network.name}`);
    
    // Initialize swap balances
    initSwap();
    updateSwapBalances();
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    
  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(`Failed to connect: ${error.message}`, true);
  }
}

function disconnectWallet() {
  window.provider = null;
  window.signer = null;
  window.userAddress = null;
  window.tokenContract = null;
  
  document.getElementById('accountDisplay').textContent = 'Not connected';
  document.getElementById('networkDisplay').textContent = '—';
  document.getElementById('tokenInfo').innerHTML = '';
  document.getElementById('sidebarStatus').textContent = 'Disconnected';
  document.querySelector('.status-dot').style.background = 'var(--error)';
  
  updateStatus('Wallet disconnected');
}

function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else {
    window.userAddress = accounts[0];
    document.getElementById('accountDisplay').textContent = shortenAddress(window.userAddress);
    updateStatus(`Account changed to ${shortenAddress(window.userAddress)}`);
    updateSwapBalances();
  }
}

function handleChainChanged() {
  window.location.reload();
}

// ==================== Token Functions ====================
async function loadToken() {
  const tokenAddress = document.getElementById('tokenAddress').value.trim();
  
  if (!tokenAddress) {
    updateStatus('Please enter a token contract address', true);
    return;
  }
  
  if (!ethers.isAddress(tokenAddress)) {
    updateStatus('Invalid token address format', true);
    return;
  }
  
  if (!window.provider) {
    updateStatus('Please connect your wallet first', true);
    return;
  }
  
  try {
    updateStatus('Loading token contract...');
    
    window.tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, window.provider);
    
    // Get token info
    const name = await window.tokenContract.name();
    const symbol = await window.tokenContract.symbol();
    const decimals = await window.tokenContract.decimals();
    const totalSupply = await window.tokenContract.totalSupply();
    
    window.tokenDecimals = decimals;
    window.tokenSymbol = symbol;
    
    // Get user balance
    const balance = await window.tokenContract.balanceOf(window.userAddress);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    
    // Display token info
    const tokenInfoHtml = `
      <strong>Token Information:</strong><br>
      Name: ${name}<br>
      Symbol: ${symbol}<br>
      Decimals: ${decimals}<br>
      Total Supply: ${ethers.formatUnits(totalSupply, decimals)}<br>
      Your Balance: ${balanceFormatted} ${symbol}
    `;
    
    document.getElementById('tokenInfo').innerHTML = tokenInfoHtml;
    updateStatus(`Token loaded successfully: ${name} (${symbol})`);
    
    // Update swap token symbol
    updateTokenSymbol(symbol);
    
  } catch (error) {
    console.error('Load token error:', error);
    updateStatus(`Failed to load token: ${error.message}`, true);
  }
}

// ==================== Transfer Functions ====================
async function transferTokens() {
  const recipient = document.getElementById('recipientAddress').value.trim();
  const amount = document.getElementById('transferAmount').value;
  
  if (!recipient || !amount) {
    updateStatus('Please enter recipient address and amount', true);
    return;
  }
  
  if (!ethers.isAddress(recipient)) {
    updateStatus('Invalid recipient address', true);
    return;
  }
  
  if (!window.tokenContract || !window.signer) {
    updateStatus('Please connect wallet and load token first', true);
    return;
  }
  
  try {
    updateStatus('Preparing transfer...');
    
    const tokenWithSigner = window.tokenContract.connect(window.signer);
    const amountInWei = ethers.parseUnits(amount, window.tokenDecimals);
    
    updateStatus('Waiting for transaction confirmation...');
    const tx = await tokenWithSigner.transfer(recipient, amountInWei);
    
    updateStatus(`Transaction submitted!\nHash: ${tx.hash}\nWaiting for confirmation...`);
    
    const receipt = await tx.wait();
    
    updateStatus(`Transfer successful!\nSent ${amount} ${window.tokenSymbol} to ${shortenAddress(recipient)}\nBlock: ${receipt.blockNumber}`);
    
    // Clear inputs
    document.getElementById('recipientAddress').value = '';
    document.getElementById('transferAmount').value = '';
    
    // Reload token info to update balance
    await loadToken();
    
  } catch (error) {
    console.error('Transfer error:', error);
    updateStatus(`Transfer failed: ${error.message}`, true);
  }
}

// ==================== Allowance Functions ====================
async function checkAllowances() {
  if (!window.tokenContract || !window.userAddress) {
    updateStatus('Please connect wallet and load token first', true);
    return;
  }
  
  try {
    updateStatus('Checking allowances...');
    
    // Get Approval events where owner is the connected user
    const filter = window.tokenContract.filters.Approval(window.userAddress);
    const events = await window.tokenContract.queryFilter(filter, -10000); // Last 10000 blocks
    
    // Extract unique spenders
    const spenders = [...new Set(events.map(e => e.args[1]))];
    
    if (spenders.length === 0) {
      document.getElementById('allowanceInfo').innerHTML = 
        '<p style="color: var(--text-muted); margin-top: 1rem;">No allowances found</p>';
      updateStatus('No allowances found for this token');
      return;
    }
    
    // Get current allowance for each spender
    const allowancePromises = spenders.map(async (spender) => {
      const allowance = await window.tokenContract.allowance(window.userAddress, spender);
      return {
        spender,
        allowance: ethers.formatUnits(allowance, window.tokenDecimals)
      };
    });
    
    const allowances = await Promise.all(allowancePromises);
    
    // Filter out zero allowances
    const activeAllowances = allowances.filter(a => parseFloat(a.allowance) > 0);
    
    if (activeAllowances.length === 0) {
      document.getElementById('allowanceInfo').innerHTML = 
        '<p style="color: var(--text-muted); margin-top: 1rem;">No active allowances</p>';
      updateStatus('No active allowances found');
      return;
    }
    
    // Display allowances
    let html = '<div class="allowance-list">';
    activeAllowances.forEach(({ spender, allowance }) => {
      html += `
        <div class="allowance-item">
          <div class="allowance-spender">
            <span>Spender:</span>
            <code>${spender}</code>
            <button class="copy-btn" onclick="copyToClipboard('${spender}')">Copy</button>
          </div>
          <div class="allowance-amount">
            Approved Amount: <strong>${parseFloat(allowance).toFixed(4)} ${window.tokenSymbol}</strong>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    document.getElementById('allowanceInfo').innerHTML = html;
    updateStatus(`Found ${activeAllowances.length} active allowance(s)`);
    
  } catch (error) {
    console.error('Check allowances error:', error);
    updateStatus(`Failed to check allowances: ${error.message}`, true);
  }
}

async function approveSpender() {
  const spender = document.getElementById('spenderAddress').value.trim();
  const amount = document.getElementById('approveAmount').value;
  
  if (!spender || !amount) {
    updateStatus('Please enter spender address and amount', true);
    return;
  }
  
  if (!ethers.isAddress(spender)) {
    updateStatus('Invalid spender address', true);
    return;
  }
  
  if (!window.tokenContract || !window.signer) {
    updateStatus('Please connect wallet and load token first', true);
    return;
  }
  
  try {
    updateStatus('Preparing approval...');
    
    const tokenWithSigner = window.tokenContract.connect(window.signer);
    const amountInWei = ethers.parseUnits(amount, window.tokenDecimals);
    
    updateStatus('Waiting for approval confirmation...');
    const tx = await tokenWithSigner.approve(spender, amountInWei);
    
    updateStatus(`Approval submitted!\nHash: ${tx.hash}\nWaiting for confirmation...`);
    
    const receipt = await tx.wait();
    
    updateStatus(`Approval successful!\nApproved ${amount} ${window.tokenSymbol} for ${shortenAddress(spender)}\nBlock: ${receipt.blockNumber}`);
    
    // Clear inputs
    document.getElementById('spenderAddress').value = '';
    document.getElementById('approveAmount').value = '';
    
  } catch (error) {
    console.error('Approval error:', error);
    updateStatus(`Approval failed: ${error.message}`, true);
  }
}

// ==================== Transfer History ====================
async function refreshHistory() {
  if (!window.tokenContract || !window.userAddress) {
    updateStatus('Please connect wallet and load token first', true);
    return;
  }
  
  try {
    document.getElementById('historyStatus').textContent = 'Loading history...';
    updateStatus('Fetching transfer history...');
    
    // Get Transfer events
    const sentFilter = window.tokenContract.filters.Transfer(window.userAddress);
    const receivedFilter = window.tokenContract.filters.Transfer(null, window.userAddress);
    
    const sentEvents = await window.tokenContract.queryFilter(sentFilter, -10000);
    const receivedEvents = await window.tokenContract.queryFilter(receivedFilter, -10000);
    
    // Combine and sort by block number
    const allEvents = [...sentEvents, ...receivedEvents].sort((a, b) => 
      b.blockNumber - a.blockNumber
    );
    
    if (allEvents.length === 0) {
      document.getElementById('transferHistory').innerHTML = 
        '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v4M15 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg><p>No transfer history found</p></div>';
      document.getElementById('historyStatus').textContent = '';
      updateStatus('No transfer history found');
      return;
    }
    
    // Build HTML
    let html = '<div class="history-list">';
    
    for (const event of allEvents) {
      const from = event.args[0];
      const to = event.args[1];
      const value = ethers.formatUnits(event.args[2], window.tokenDecimals);
      const isSent = from.toLowerCase() === window.userAddress.toLowerCase();
      
      html += `
        <div class="history-item ${isSent ? 'sent' : 'received'}">
          <div class="history-header">
            <span class="history-type">${isSent ? '📤 Sent' : '📥 Received'}</span>
            <span class="history-amount">${parseFloat(value).toFixed(4)} ${window.tokenSymbol}</span>
          </div>
          <div class="history-details">
            <div>From: <code>${shortenAddress(from)}</code></div>
            <div>To: <code>${shortenAddress(to)}</code></div>
            <div>Block: <code>${event.blockNumber}</code></div>
            <div>Tx: <a href="#" onclick="copyToClipboard('${event.transactionHash}'); return false;">${shortenAddress(event.transactionHash)}</a></div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    document.getElementById('transferHistory').innerHTML = html;
    document.getElementById('historyStatus').textContent = `Found ${allEvents.length} transaction(s)`;
    updateStatus(`Transfer history loaded: ${allEvents.length} transaction(s)`);
    
  } catch (error) {
    console.error('History error:', error);
    document.getElementById('historyStatus').textContent = 'Failed to load history';
    updateStatus(`Failed to load history: ${error.message}`, true);
  }
}

// ==================== Swap Functions ====================
function initSwap() {
  document.getElementById('swapDirection').addEventListener('click', flipSwapDirection);
  document.getElementById('swapFromAmount').addEventListener('input', calculateSwapAmount);
  document.getElementById('executeSwap').addEventListener('click', executeSwap);
  
  // Slippage buttons
  document.querySelectorAll('.slippage-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      swapState.slippage = parseFloat(this.dataset.value);
      calculateSwapAmount();
    });
  });
  
  // Custom slippage
  document.getElementById('customSlippage').addEventListener('input', function() {
    if (this.value) {
      document.querySelectorAll('.slippage-btn').forEach(b => b.classList.remove('active'));
      swapState.slippage = parseFloat(this.value);
      calculateSwapAmount();
    }
  });
  
  updateExchangeRate();
  updateSwapBalances();
}

function flipSwapDirection() {
  const temp = swapState.fromToken;
  swapState.fromToken = swapState.toToken;
  swapState.toToken = temp;
  
  // Update UI
  document.getElementById('fromTokenBtn').querySelector('.token-symbol').textContent = swapState.fromToken;
  document.getElementById('toTokenBtn').querySelector('.token-symbol').textContent = swapState.toToken;
  
  // Clear amounts
  document.getElementById('swapFromAmount').value = '';
  document.getElementById('swapToAmount').value = '';
  
  updateExchangeRate();
  updateSwapBalances();
}

function calculateSwapAmount() {
  const fromAmount = parseFloat(document.getElementById('swapFromAmount').value);
  
  if (!fromAmount || fromAmount <= 0) {
    document.getElementById('swapToAmount').value = '';
    document.getElementById('minReceived').textContent = '0 ' + swapState.toToken;
    return;
  }
  
  let toAmount;
  if (swapState.fromToken === 'ETH') {
    toAmount = fromAmount * swapState.exchangeRate;
  } else {
    toAmount = fromAmount / swapState.exchangeRate;
  }
  
  const minReceived = toAmount * (1 - swapState.slippage / 100);
  
  document.getElementById('swapToAmount').value = toAmount.toFixed(6);
  document.getElementById('minReceived').textContent = 
    minReceived.toFixed(6) + ' ' + swapState.toToken;
  
  updatePriceImpact(fromAmount);
}

function updateExchangeRate() {
  if (swapState.fromToken === 'ETH') {
    document.getElementById('exchangeRate').textContent = 
      `1 ETH = ${swapState.exchangeRate} ${swapState.toToken}`;
  } else {
    document.getElementById('exchangeRate').textContent = 
      `1 ${swapState.fromToken} = ${(1/swapState.exchangeRate).toFixed(8)} ETH`;
  }
}

function updatePriceImpact(amount) {
  const impactElement = document.getElementById('priceImpact');
  let impact = (amount / 10) * 0.1;
  
  if (impact < 0.01) {
    impactElement.textContent = '< 0.01%';
    impactElement.className = 'impact-low';
  } else if (impact < 1) {
    impactElement.textContent = impact.toFixed(2) + '%';
    impactElement.className = 'impact-low';
  } else if (impact < 3) {
    impactElement.textContent = impact.toFixed(2) + '%';
    impactElement.className = 'impact-medium';
  } else {
    impactElement.textContent = impact.toFixed(2) + '%';
    impactElement.className = 'impact-high';
  }
}

async function updateSwapBalances() {
  if (!window.userAddress || !window.provider) return;
  
  try {
    const ethBalance = await window.provider.getBalance(window.userAddress);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    
    let tokenBalance = '0';
    if (window.tokenContract) {
      const balance = await window.tokenContract.balanceOf(window.userAddress);
      tokenBalance = ethers.formatUnits(balance, window.tokenDecimals);
    }
    
    if (swapState.fromToken === 'ETH') {
      document.getElementById('fromBalance').textContent = 
        `Balance: ${parseFloat(ethBalanceFormatted).toFixed(4)} ETH`;
      document.getElementById('toBalance').textContent = 
        `Balance: ${parseFloat(tokenBalance).toFixed(4)} ${swapState.toToken}`;
    } else {
      document.getElementById('fromBalance').textContent = 
        `Balance: ${parseFloat(tokenBalance).toFixed(4)} ${swapState.fromToken}`;
      document.getElementById('toBalance').textContent = 
        `Balance: ${parseFloat(ethBalanceFormatted).toFixed(4)} ETH`;
    }
  } catch (error) {
    console.error('Error updating balances:', error);
  }
}

async function executeSwap() {
  const fromAmount = parseFloat(document.getElementById('swapFromAmount').value);
  
  if (!fromAmount || fromAmount <= 0) {
    updateStatus('Please enter a valid amount', true);
    return;
  }
  
  if (!window.userAddress) {
    updateStatus('Please connect your wallet first', true);
    return;
  }
  
  if (!window.tokenContract) {
    updateStatus('Please load a token contract first', true);
    return;
  }
  
  try {
    updateStatus('⚠️ DEMO MODE: Swap functionality requires DEX integration\n\n' +
      `You want to swap: ${fromAmount} ${swapState.fromToken}\n` +
      `You will receive: ~${document.getElementById('swapToAmount').value} ${swapState.toToken}\n\n` +
      'To implement real swaps, you need to:\n' +
      '1. Deploy or connect to a DEX (Uniswap/SushiSwap)\n' +
      '2. Add liquidity pool for your token\n' +
      '3. Integrate DEX Router contract\n' +
      '4. Use swapExactETHForTokens() or swapExactTokensForETH()');
    
  } catch (error) {
    console.error('Swap error:', error);
    updateStatus(`Swap failed: ${error.message}`, true);
  }
}

function updateTokenSymbol(symbol) {
  swapState.toToken = symbol;
  document.getElementById('tokenSymbolDisplay').textContent = symbol;
  if (swapState.fromToken !== 'ETH') {
    document.getElementById('fromTokenBtn').querySelector('.token-symbol').textContent = symbol;
  }
  updateExchangeRate();
  updateSwapBalances();
}

// ==================== Helper Functions ====================
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    updateStatus(`Copied to clipboard: ${text}`);
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

// ==================== Event Listeners ====================
document.addEventListener('DOMContentLoaded', () => {
  // Wallet buttons
  document.getElementById('connectWallet').addEventListener('click', connectWallet);
  document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
  
  // Token functions
  document.getElementById('loadToken').addEventListener('click', loadToken);
  
  // Transfer
  document.getElementById('transferBtn').addEventListener('click', transferTokens);
  
  // Allowance
  document.getElementById('checkAllowance').addEventListener('click', checkAllowances);
  document.getElementById('approve').addEventListener('click', approveSpender);
  
  // History
  document.getElementById('refreshHistory').addEventListener('click', refreshHistory);
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-content="${tab}"]`).classList.add('active');
    });
  });
  
  updateStatus('Welcome! Please connect your wallet to get started.');
});