#!/bin/bash

# Script khởi động bot TikTok Chat
cd "$(dirname "$0")"

echo "🚀 Đang khởi động TikTok Chat Bot..."

# Dừng bot cũ nếu đang chạy
pkill -f "node indexSimple.js" 2>/dev/null

# Đợi 1 giây
sleep 1

# Khởi động bot mới
nohup node indexSimple.js > bot.log 2>&1 &

echo "✅ Bot đã được khởi động!"
echo "📝 Xem log: tail -f bot.log"
echo "🛑 Dừng bot: pkill -f 'node indexSimple.js'"
