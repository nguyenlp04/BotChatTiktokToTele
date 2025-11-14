# Hướng dẫn Deploy lên Host

## Tổng quan
Hệ thống bao gồm 2 phần:
1. **Web Manager** (server.js) - Chạy trên port 3000
2. **Gmail Bot** (indexSimple.js) - Chạy background

## Chuẩn bị

### 1. File cần thiết
Đảm bảo có đầy đủ các file:
```
BotChatTiktokToTele/
├── server.js              # Web server
├── indexSimple.js         # Gmail bot
├── gmailReaderSimple.js   # IMAP reader
├── telegramBot.js         # Telegram sender
├── public/                # Frontend
│   ├── index.html
│   ├── script.js
│   └── style.css
├── account.xlsx           # Database
├── package.json
├── .env                   # Config (tạo mới trên host)
└── .gitignore
```

### 2. Tạo repository GitHub (nếu chưa có)
```bash
cd /Users/mac/Documents/BotChatTiktokToTele

# Khởi tạo Git
git init

# Add files
git add .

# Commit
git commit -m "Initial commit"

# Push lên GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Option 1: Deploy lên VPS (Ubuntu/Debian)

### Bước 1: Kết nối VPS
```bash
ssh root@your-vps-ip
```

### Bước 2: Cài đặt Node.js
```bash
# Cập nhật system
sudo apt update && sudo apt upgrade -y

# Cài Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra
node --version
npm --version
```

### Bước 3: Clone project
```bash
# Clone từ GitHub
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git tiktok-shop
cd tiktok-shop

# Hoặc upload qua SCP từ máy local
# scp -r /Users/mac/Documents/BotChatTiktokToTele root@your-vps-ip:/var/www/tiktok-shop
```

### Bước 4: Cài đặt dependencies
```bash
npm install --production
```

### Bước 5: Tạo file .env
```bash
nano .env
```

Paste nội dung:
```env
# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

Lưu: `Ctrl + X`, `Y`, `Enter`

### Bước 6: Upload file account.xlsx
```bash
# Từ máy local
scp /Users/mac/Documents/BotChatTiktokToTele/account.xlsx root@your-vps-ip:/var/www/tiktok-shop/
```

### Bước 7: Cài đặt PM2
```bash
sudo npm install -g pm2

# Chạy Web Manager
pm2 start server.js --name "tiktok-web"

# Chạy Gmail Bot
pm2 start indexSimple.js --name "gmail-bot"

# Lưu cấu hình
pm2 save

# Auto start khi reboot
pm2 startup
# Copy và chạy lệnh được hiển thị

# Kiểm tra status
pm2 status
pm2 logs
```

### Bước 8: Cấu hình Firewall
```bash
# Mở port 3000
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Bước 9: Cài đặt Nginx (tùy chọn)
```bash
# Cài Nginx
sudo apt install nginx -y

# Tạo config
sudo nano /etc/nginx/sites-available/tiktok-shop
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Hoặc IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable và restart:
```bash
sudo ln -s /etc/nginx/sites-available/tiktok-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Bước 10: Cài SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

**✅ Xong! Truy cập:**
- `http://your-domain.com` hoặc `http://your-vps-ip:3000`

## Option 2: Deploy lên Railway.app (Miễn phí)

### Bước 1: Tạo tài khoản
1. Truy cập https://railway.app
2. Đăng ký bằng GitHub

### Bước 2: Deploy
1. Click **New Project** → **Deploy from GitHub repo**
2. Chọn repository của bạn
3. Railway sẽ tự động detect Node.js

### Bước 3: Cấu hình
1. Click vào project → **Variables**
2. Thêm các biến:
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

### Bước 4: Upload file Excel
1. Click **Data** → **Add Volume**
2. Mount path: `/app`
3. Upload `account.xlsx`

### Bước 5: Chạy cả 2 services
Tạo file `railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Để chạy bot, tạo service thứ 2:
1. **New** → **Empty Service**
2. Connect same repo
3. Settings → Start Command: `node indexSimple.js`

**✅ Xong! Railway sẽ cung cấp URL public**

## Option 3: Deploy lên Render.com (Miễn phí)

### Bước 1: Tạo tài khoản
1. Truy cập https://render.com
2. Đăng ký bằng GitHub

### Bước 2: Tạo Web Service
1. **New** → **Web Service**
2. Connect repository
3. Cấu hình:
   - **Name**: tiktok-shop-web
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

### Bước 3: Thêm Environment Variables
1. Click **Environment**
2. Thêm tất cả biến từ `.env`

### Bước 4: Tạo Background Worker (cho bot)
1. **New** → **Background Worker**
2. Connect same repo
3. Cấu hình:
   - **Name**: gmail-bot
   - **Build Command**: `npm install`
   - **Start Command**: `node indexSimple.js`
   - **Plan**: Free

### Bước 5: Upload Excel
Sử dụng Render Disk (trả phí) hoặc dùng database

**✅ Xong! Render cung cấp URL: `https://your-app.onrender.com`**

## Option 4: Deploy lên Heroku

### Bước 1: Cài Heroku CLI
```bash
brew install heroku/brew/heroku  # MacOS
```

### Bước 2: Tạo file Procfile
```bash
cd /Users/mac/Documents/BotChatTiktokToTele
echo "web: node server.js" > Procfile
echo "worker: node indexSimple.js" >> Procfile
```

### Bước 3: Deploy
```bash
# Login
heroku login

# Tạo app
heroku create tiktok-shop-manager

# Set config
heroku config:set GMAIL_USER=your-email@gmail.com
heroku config:set GMAIL_APP_PASSWORD=your-password
heroku config:set TELEGRAM_BOT_TOKEN=your-token
heroku config:set TELEGRAM_CHAT_ID=your-chat-id

# Push code
git push heroku main

# Scale dyno
heroku ps:scale web=1 worker=1

# Xem logs
heroku logs --tail
```

**✅ URL: `https://tiktok-shop-manager.herokuapp.com`**

## Quản lý sau khi deploy

### PM2 Commands (VPS)
```bash
# Xem status
pm2 status

# Xem logs
pm2 logs

# Restart
pm2 restart all

# Stop
pm2 stop all

# Xóa
pm2 delete all

# Monitoring
pm2 monit
```

### Update code (VPS)
```bash
cd /var/www/tiktok-shop
git pull
npm install
pm2 restart all
```

### Backup dữ liệu
```bash
# Backup Excel
scp root@your-vps-ip:/var/www/tiktok-shop/account.xlsx ~/Desktop/backup.xlsx

# Restore
scp ~/Desktop/backup.xlsx root@your-vps-ip:/var/www/tiktok-shop/account.xlsx
pm2 restart tiktok-web
```

## Troubleshooting

### Port đã được sử dụng
```bash
# Tìm process
lsof -i :3000

# Kill
kill -9 <PID>
```

### Gmail Bot không hoạt động
- Kiểm tra App Password
- Kiểm tra IMAP đã bật
- Xem log: `pm2 logs gmail-bot`

### Lỗi kết nối database
- Kiểm tra file `account.xlsx` tồn tại
- Kiểm tra quyền file: `chmod 644 account.xlsx`

## Khuyến nghị

### Production
- ✅ Sử dụng VPS với PM2
- ✅ Cài Nginx reverse proxy
- ✅ Cài SSL certificate
- ✅ Setup auto backup
- ✅ Monitor với PM2 hoặc tools khác

### Free Hosting
- ✅ Railway.app (tốt nhất cho free tier)
- ⚠️ Render.com (free tier có giới hạn)
- ⚠️ Heroku (không còn free tier)

---

**Hỗ trợ:** Liên hệ nếu gặp vấn đề!
