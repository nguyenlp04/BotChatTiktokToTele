const { google } = require('googleapis');
const { getAuthClient } = require('./gmailAuth');

/**
 * Đọc email mới từ Gmail
 */
async function getNewEmails(maxResults = 10) {
  try {
    const auth = await getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    // Lấy danh sách email chưa đọc
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread', // Chỉ lấy email chưa đọc
      maxResults: maxResults,
    });

    const messages = res.data.messages;
    if (!messages || messages.length === 0) {
      return [];
    }

    // Lấy chi tiết từng email
    const emailPromises = messages.map(message => getEmailDetails(gmail, message.id));
    const emails = await Promise.all(emailPromises);

    return emails;
  } catch (error) {
    console.error('Lỗi khi đọc email:', error.message);
    throw error;
  }
}

/**
 * Lấy chi tiết một email
 */
async function getEmailDetails(gmail, messageId) {
  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const message = res.data;
    const headers = message.payload.headers;

    // Lấy thông tin từ headers
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || 'Unknown';

    // Lấy nội dung email
    let body = '';
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload.parts) {
      const textPart = message.payload.parts.find(
        part => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    // Loại bỏ HTML tags nếu có
    body = body.replace(/<[^>]*>/g, '').trim();
    // Giới hạn độ dài body
    if (body.length > 500) {
      body = body.substring(0, 500) + '...';
    }

    return {
      id: messageId,
      subject,
      from,
      date,
      body,
      snippet: message.snippet
    };
  } catch (error) {
    console.error(`Lỗi khi lấy chi tiết email ${messageId}:`, error.message);
    return null;
  }
}

/**
 * Đánh dấu email đã đọc
 */
async function markAsRead(messageId) {
  try {
    const auth = await getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    console.log(`Email ${messageId} đã được đánh dấu là đã đọc`);
  } catch (error) {
    console.error('Lỗi khi đánh dấu email đã đọc:', error.message);
  }
}

module.exports = {
  getNewEmails,
  markAsRead
};
