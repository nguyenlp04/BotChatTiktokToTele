#!/bin/bash

# Script xem log bot TikTok Chat
cd "$(dirname "$0")"

if [ -f "bot.log" ]; then
    echo "📝 Bot log (nhấn Ctrl+C để thoát):"
    echo "---"
    tail -f bot.log
else
    echo "❌ Không tìm thấy file log"
    echo "💡 Bot có thể chưa được khởi động"
fi
