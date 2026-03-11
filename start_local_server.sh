#!/bin/bash

echo "=========================================="
echo "本地开发服务器启动脚本"
echo "=========================================="
echo ""

# 检查端口是否被占用
PORT=8000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  端口 $PORT 已被占用，尝试使用端口 8001..."
    PORT=8001
fi

echo "🚀 启动本地服务器..."
echo "📂 项目目录: $(pwd)"
echo "🌐 访问地址: http://localhost:$PORT"
echo ""
echo "💡 提示："
echo "  - 按 Ctrl+C 停止服务器"
echo "  - 修改代码后刷新浏览器即可看到效果"
echo "  - 打开浏览器开发者工具（F12）查看错误信息"
echo ""
echo "=========================================="
echo ""

# 启动服务器
python3 -m http.server $PORT
