/**
 * Phương pháp đơn giản hơn: Sử dụng IMAP để đọc Gmail
 * Không cần OAuth phức tạp
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');

class GmailReaderSimple {
  constructor(email, appPassword) {
    this.imap = new Imap({
      user: email,
      password: appPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
  }

  /**
   * Đọc email mới
   */
  async getNewEmails(maxEmails = 10) {
    return new Promise((resolve, reject) => {
      const emails = [];

      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // Tìm TẤT CẢ email (cả đã đọc và chưa đọc)
          // Lấy 50 email gần nhất
          this.imap.search(['ALL'], (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              this.imap.end();
              resolve([]);
              return;
            }

            // Lấy 50 email mới nhất
            const emailIds = results.slice(-50);
            const fetch = this.imap.fetch(emailIds, { bodies: '' });

            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) {
                    console.error('Lỗi parse email:', err);
                    return;
                  }

                  // Kiểm tra email từ TikTok hoặc nguyendz2108@gmail.com
                  const fromEmail = parsed.from?.value?.[0]?.address || parsed.from?.text || '';
                  const allowedSenders = [
                    '@chat-seller-us.tiktok.com',
                    'nguyendz2108@gmail.com'
                  ];
                  
                  const isAllowed = allowedSenders.some(sender => fromEmail.includes(sender));
                  
                  if (!isAllowed) {
                    console.log(`⏭️  Bỏ qua email từ: ${fromEmail}`);
                    return;
                  }

                  // Lấy nội dung text, loại bỏ HTML
                  let bodyText = parsed.text || '';
                  if (!bodyText && parsed.html) {
                    // Loại bỏ HTML tags
                    bodyText = parsed.html.replace(/<[^>]*>/g, '');
                  }
                  
                  emails.push({
                    id: parsed.messageId,
                    subject: parsed.subject || 'No Subject',
                    from: fromEmail,
                    date: parsed.date ? parsed.date.toLocaleString('vi-VN') : 'Unknown',
                    body: bodyText,
                    snippet: bodyText.substring(0, 300)
                  });
                });
              });
            });

            fetch.once('error', (err) => {
              reject(err);
            });

            fetch.once('end', () => {
              this.imap.end();
              resolve(emails);
            });
          });
        });
      });

      this.imap.once('error', (err) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  /**
   * Đóng kết nối
   */
  close() {
    if (this.imap) {
      this.imap.end();
    }
  }
}

module.exports = GmailReaderSimple;
