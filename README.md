# Gmail to Telegram Bot

Bot tự động đọc email từ Gmail và gửi về Telegram.

## Tính năng

- ✅ Đọc email mới từ Gmail
- ✅ Gửi thông báo email về Telegram
- ✅ Tự động kiểm tra email định kỳ
- ✅ Đánh dấu email đã đọc (tùy chọn)

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi `/newbot` và làm theo hướng dẫn
3. Lưu lại **Bot Token**
4. Để lấy Chat ID:
   - Gửi tin nhắn cho bot của bạn
   - Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Tìm `chat.id` trong response

### 3. Tạo Gmail API Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Gmail API:
   - Vào "APIs & Services" > "Library"
   - Tìm "Gmail API" và nhấn "Enable"
4. Tạo OAuth credentials:
   - Vào "APIs & Services" > "Credentials"
   - Nhấn "Create Credentials" > "OAuth client ID"
   - Chọn "Desktop app" hoặc "Web application"
   - Nếu chọn Web application, thêm `http://localhost:3000/oauth2callback` vào Authorized redirect URIs
   - Lưu lại **Client ID** và **Client Secret**

### 4. Cấu hình file .env

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Gmail API Configuration
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Check interval (5 phút)
CHECK_INTERVAL=300000
```

### 5. Authorize Gmail API (chỉ chạy lần đầu)

```bash
node setup.js
```

- Truy cập URL được hiển thị
- Đăng nhập Gmail và authorize
- Copy authorization code và paste vào terminal
- Thêm `GMAIL_REFRESH_TOKEN` vào file `.env`

## Sử dụng

### Chạy bot

```bash
npm start
```

### Chạy ở chế độ development (auto-reload)

```bash
npm run dev
```

## Cấu trúc project

```
.
├── index.js           # File chính chạy bot
├── gmailAuth.js       # Xử lý authentication với Gmail
├── gmailReader.js     # Đọc email từ Gmail
├── telegramBot.js     # Gửi tin nhắn về Telegram
├── setup.js           # Script setup OAuth lần đầu
├── package.json       # Dependencies
├── .env              # Cấu hình (không commit)
└── README.md         # Hướng dẫn
```

## Tùy chỉnh

### Thay đổi khoảng thời gian kiểm tra email

Chỉnh sửa `CHECK_INTERVAL` trong file `.env` (đơn vị: milliseconds)

```env
CHECK_INTERVAL=300000  # 5 phút
CHECK_INTERVAL=60000   # 1 phút
CHECK_INTERVAL=3600000 # 1 giờ
```

### Đánh dấu email đã đọc

Mở file `index.js` và bỏ comment dòng này:

```javascript
// await markAsRead(email.id);
```

### Lọc email theo tiêu chí

Chỉnh sửa query trong `gmailReader.js`:

```javascript
// Chỉ email từ một người gửi cụ thể
q: 'is:unread from:example@gmail.com'

// Email có chứa từ khóa
q: 'is:unread subject:urgent'

// Email trong khoảng thời gian
q: 'is:unread after:2024/1/1'
```

## Xử lý lỗi

### Lỗi "invalid_grant"

- Token đã hết hạn, chạy lại `node setup.js`

### Lỗi "Unauthorized"

- Kiểm tra lại Client ID và Client Secret
- Đảm bảo Gmail API đã được bật

### Bot không nhận được tin nhắn

- Kiểm tra Bot Token và Chat ID
- Đảm bảo đã gửi `/start` cho bot

## License

ISC
# BotChatTiktokToTele
