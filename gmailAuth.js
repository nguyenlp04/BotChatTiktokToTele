const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = path.join(__dirname, 'token.json');

/**
 * Tạo OAuth2 client từ credentials
 */
function createOAuth2Client() {
  const credentials = {
    client_id: process.env.GMAIL_CLIENT_ID,
    client_secret: process.env.GMAIL_CLIENT_SECRET,
    redirect_uris: [process.env.GMAIL_REDIRECT_URI]
  };

  const { client_id, client_secret, redirect_uris } = credentials;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

/**
 * Lấy OAuth2 client đã được authorize
 */
async function getAuthClient() {
  const oAuth2Client = createOAuth2Client();

  try {
    // Kiểm tra xem đã có token chưa
    const token = await fs.readFile(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (error) {
    // Nếu chưa có token, sử dụng refresh token từ .env
    if (process.env.GMAIL_REFRESH_TOKEN) {
      oAuth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });
      return oAuth2Client;
    }
    throw new Error('Chưa có token. Vui lòng chạy getAuthUrl() để lấy authorization URL');
  }
}

/**
 * Lấy URL để authorize (chỉ cần chạy lần đầu)
 */
function getAuthUrl() {
  const oAuth2Client = createOAuth2Client();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  return authUrl;
}

/**
 * Lưu token sau khi nhận được authorization code
 */
async function saveToken(code) {
  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  
  // Lưu token vào file
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  console.log('Token đã được lưu vào', TOKEN_PATH);
  console.log('Refresh token:', tokens.refresh_token);
  
  return tokens;
}

module.exports = {
  getAuthClient,
  getAuthUrl,
  saveToken
};
