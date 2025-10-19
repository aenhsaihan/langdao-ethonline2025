// simulate-pinger.js
require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');

async function run() {
  const hbUrl = process.env.HEARTBEAT_URL || 'http://localhost:4000/ping';
  const sessionId = process.env.SESSION_ID || '1';
  const privateKey = process.env.PRIVATE_KEY_SIM || '0x' + '2'.repeat(64); // independent local test key
  const wallet = new ethers.Wallet(privateKey);
  console.log('Using wallet', wallet.address);

  // send ping every 5s
  const interval = setInterval(async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${sessionId}:${timestamp}`;
    const signature = await wallet.signMessage(message);

    try {
      const res = await axios.post(hbUrl, {
        sessionId,
        wallet: wallet.address,
        timestamp,
        signature
      });
      console.log('Ping OK', res.data);
    } catch (err) {
      console.error('Ping error', err.response ? err.response.data : err.message);
      clearInterval(interval);
    }
  }, 5000);

  // stop after 60s for demo
  setTimeout(() => { clearInterval(interval); console.log('Stopped pinger process'); }, 60000);
}

run();

