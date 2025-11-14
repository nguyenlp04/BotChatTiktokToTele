/**
 * Script để setup Gmail OAuth lần đầu
 * Chạy: node setup.js
 */

require('dotenv').config();
const { getAuthUrl, saveToken } = require('./gmailAuth');
const readline = require('readline');

async function setup() {
  console.log('=== SETUP GMAIL API ===\n');

  // Bước 1: Lấy authorization URL
  const authUrl = getAuthUrl();
  console.log('1. Truy cập URL này để authorize ứng dụng:');
  console.log('\n' + authUrl + '\n');
  console.log('2. Sau khi authorize, bạn sẽ được chuyển hướng đến một URL.');
  console.log('3. Copy authorization code từ URL đó và paste vào đây.\n');

  // Bước 2: Nhập authorization code
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Nhập authorization code: ', async (code) => {
    try {
      const tokens = await saveToken(code);
      console.log('\n✅ Setup thành công!');
      console.log('\nThêm dòng này vào file .env của bạn:');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\nBây giờ bạn có thể chạy: npm start');
    } catch (error) {
      console.error('\n❌ Lỗi:', error.message);
    }
    rl.close();
  });
}

setup();
