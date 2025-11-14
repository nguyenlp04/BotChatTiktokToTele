const TelegramBot = require('node-telegram-bot-api');

class TelegramBotService {
  constructor(token, chatId) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  /**
   * Gửi tin nhắn về Telegram
   */
  async sendMessage(text, options = {}) {
    try {
      await this.bot.sendMessage(this.chatId, text, {
        parse_mode: 'HTML',
        ...options
      });
      console.log('Đã gửi tin nhắn về Telegram');
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn Telegram:', error.message);
      throw error;
    }
  }

  /**
   * Format email thành tin nhắn Telegram
   */
  formatEmailMessage(email) {
    // Kiểm tra nguồn email
    const isTikTok = email.from.includes('@chat-seller-us.tiktok.com');
    const icon = isTikTok ? '🛍️' : '📧';
    const title = isTikTok ? 'TikTok Chat Mới' : 'Email Mới';
    
    return `
${icon} <b>${title}</b>

<b>Đến:</b> ${this.escapeHtml(email.to)}
<b>Từ:</b> ${this.escapeHtml(email.from)}
<b>Tiêu đề:</b> ${this.escapeHtml(email.subject)}
<b>Thời gian:</b> ${this.escapeHtml(email.date)}
    `.trim();
  }

  /**
   * Escape HTML để tránh lỗi khi gửi Telegram
   */
  escapeHtml(text) {
    if (!text) return '';
    // Chuyển đổi sang string nếu không phải string
    const str = String(text);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Gửi email về Telegram
   */
  async sendEmail(email) {
    const message = this.formatEmailMessage(email);
    await this.sendMessage(message);
  }

  /**
   * Gửi nhiều email về Telegram
   */
  async sendEmails(emails) {
    for (const email of emails) {
      await this.sendEmail(email);
      // Delay nhỏ giữa các tin nhắn để tránh spam
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

module.exports = TelegramBotService;
