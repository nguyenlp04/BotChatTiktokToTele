#!/bin/bash

# Script dừng bot TikTok Chat
echo "🛑 Đang dừng TikTok Chat Bot..."

pkill -f "node indexSimple.js"

if [ $? -eq 0 ]; then
    echo "✅ Bot đã được dừng!"
else
    echo "❌ Không tìm thấy bot đang chạy"
fi
