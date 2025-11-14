#!/bin/bash

echo "🚀 Bắt đầu deploy..."

# Pull code mới
echo "📥 Đang pull code mới..."
git pull origin main

# Cài đặt dependencies
echo "📦 Đang cài đặt dependencies..."
npm install --production

# Restart PM2
echo "🔄 Đang restart services..."
pm2 restart ecosystem.config.js

# Hiển thị status
echo "✅ Deploy hoàn tất!"
pm2 status

echo ""
echo "📊 Xem logs:"
echo "  pm2 logs tiktok-web"
echo "  pm2 logs gmail-bot"
