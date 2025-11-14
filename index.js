require('dotenv').config();
const { getNewEmails, markAsRead } = require('./gmailReader');
const TelegramBotService = require('./telegramBot');

// Khởi tạo Telegram bot
const telegramBot = new TelegramBotService(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.TELEGRAM_CHAT_ID
);

// Lưu trữ các email đã xử lý để tránh gửi lại
const processedEmails = new Set();

/**
 * Kiểm tra email mới và gửi về Telegram
 */
async function checkAndSendEmails() {
  try {
    console.log('🔍 Đang kiểm tra email mới...');
    
    const emails = await getNewEmails(10);
    
    if (emails.length === 0) {
      console.log('✅ Không có email mới');
      return;
    }

    console.log(`📨 Tìm thấy ${emails.length} email mới`);

    // Lọc email chưa được xử lý
    const newEmails = emails.filter(email => !processedEmails.has(email.id));

    if (newEmails.length === 0) {
      console.log('✅ Tất cả email đã được xử lý trước đó');
      return;
    }

    // Gửi email về Telegram
    for (const email of newEmails) {
      try {
        await telegramBot.sendEmail(email);
        processedEmails.add(email.id);
        
        // Đánh dấu email đã đọc (tùy chọn)
        // await markAsRead(email.id);
        
        console.log(`✅ Đã gửi email: ${email.subject}`);
      } catch (error) {
        console.error(`❌ Lỗi khi xử lý email ${email.id}:`, error.message);
      }
    }

    console.log(`✅ Đã gửi ${newEmails.length} email về Telegram`);
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra email:', error.message);
  }
}

/**
 * Chạy bot
 */
async function startBot() {
  console.log('🚀 Bot đang khởi động...');
  
  // Kiểm tra biến môi trường
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error('❌ Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong file .env');
    process.exit(1);
  }

  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error('❌ Thiếu GMAIL_CLIENT_ID hoặc GMAIL_CLIENT_SECRET trong file .env');
    process.exit(1);
  }

  console.log('✅ Bot đã khởi động thành công!');
  
  // Kiểm tra ngay lập tức
  await checkAndSendEmails();

  // Thiết lập interval để kiểm tra định kỳ
  const interval = parseInt(process.env.CHECK_INTERVAL) || 300000; // 5 phút
  console.log(`⏰ Sẽ kiểm tra email mỗi ${interval / 1000} giây`);
  
  setInterval(checkAndSendEmails, interval);
}

// Xử lý lỗi không bắt được
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

// Bắt đầu bot
startBot();
