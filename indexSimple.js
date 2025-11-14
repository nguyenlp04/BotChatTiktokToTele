/**
 * Phiên bản đơn giản sử dụng IMAP thay vì Gmail API
 * Cần bật "App Password" trong Gmail
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const GmailReaderSimple = require('./gmailReaderSimple');
const TelegramBotService = require('./telegramBot');

// File lưu trữ danh sách email đã xử lý
const PROCESSED_FILE = path.join(__dirname, 'processed_emails.json');

// Khởi tạo Telegram bot
const telegramBot = new TelegramBotService(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

// Lưu trữ các email đã xử lý
let processedEmails = new Set();

/**
 * Load danh sách email đã xử lý từ file
 */
function loadProcessedEmails() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = fs.readFileSync(PROCESSED_FILE, 'utf8');
      const emails = JSON.parse(data);
      processedEmails = new Set(emails);
      console.log(`📂 Đã load ${processedEmails.size} email đã xử lý từ file`);
    }
  } catch (error) {
    console.error('❌ Lỗi khi load processed emails:', error.message);
    processedEmails = new Set();
  }
}

/**
 * Lưu danh sách email đã xử lý vào file
 */
function saveProcessedEmails() {
  try {
    const emails = Array.from(processedEmails);
    // Chỉ lưu 1000 email gần nhất để file không quá lớn
    const recentEmails = emails.slice(-1000);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(recentEmails, null, 2));
  } catch (error) {
    console.error('❌ Lỗi khi save processed emails:', error.message);
  }
}

/**
 * Kiểm tra email mới và gửi về Telegram
 */
async function checkAndSendEmails() {
  const gmailReader = new GmailReaderSimple(
    process.env.GMAIL_EMAIL,
    process.env.GMAIL_APP_PASSWORD
  );

  try {
    console.log('🔍 Đang kiểm tra email mới...');
    
    const emails = await gmailReader.getNewEmails(10);
    
    if (emails.length === 0) {
      console.log('✅ Không có tin nhắn mới');
      return;
    }

    console.log(`📨 Tìm thấy ${emails.length} tin nhắn mới`);

    // Lọc email chưa được xử lý
    const newEmails = emails.filter(email => !processedEmails.has(email.id));

    if (newEmails.length === 0) {
      console.log('✅ Tất cả tin nhắn đã được xử lý trước đó');
      return;
    }

    // Gửi email về Telegram
    for (const email of newEmails) {
      try {
        await telegramBot.sendEmail(email);
        processedEmails.add(email.id);
        saveProcessedEmails(); // Lưu ngay sau khi xử lý mỗi email
        console.log(`✅ Đã gửi tin nhắn: ${email.subject}`);
        
        // Delay nhỏ giữa các tin nhắn
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Lỗi khi xử lý tin nhắn ${email.id}:`, error.message);
      }
    }

    console.log(`✅ Đã gửi ${newEmails.length} tin nhắn về Telegram`);
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra tin nhắn:', error.message);
  } finally {
    gmailReader.close();
  }
}

/**
 * Chạy bot
 */
async function startBot() {
  console.log('🚀 TikTok Chat Bot đang khởi động...');
  console.log('📌 Nhận tin nhắn từ:');
  console.log('   - @chat-seller-us.tiktok.com (TikTok Shop)');
  console.log('   - nguyendz2108@gmail.com');
  
  // Kiểm tra biến môi trường
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error('❌ Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong file .env');
    process.exit(1);
  }

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Thiếu GMAIL_EMAIL hoặc GMAIL_APP_PASSWORD trong file .env');
    console.log('\n📝 Hướng dẫn tạo App Password:');
    console.log('1. Vào https://myaccount.google.com/security');
    console.log('2. Bật "2-Step Verification" nếu chưa bật');
    console.log('3. Vào "App passwords"');
    console.log('4. Tạo password mới cho "Mail"');
    console.log('5. Copy password và thêm vào file .env\n');
    process.exit(1);
  }

  // Load danh sách email đã xử lý
  loadProcessedEmails();

  console.log('✅ Bot đã khởi động thành công!');
  
  // Kiểm tra ngay lập tức
  await checkAndSendEmails();

  // Thiết lập interval để kiểm tra định kỳ
  const interval = parseInt(process.env.CHECK_INTERVAL) || 300000;
  console.log(`⏰ Sẽ kiểm tra tin nhắn mới mỗi ${interval / 1000} giây`);
  
  setInterval(checkAndSendEmails, interval);
}

// Xử lý lỗi
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// Bắt đầu bot
startBot();
