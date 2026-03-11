#!/bin/bash

echo "=========================================="
echo "网站资源压缩脚本"
echo "=========================================="
echo ""

# 检查是否安装了必要的工具
command -v python3 >/dev/null 2>&1 || { echo "错误: 需要安装 Python 3"; exit 1; }

# 1. 分割JSON文件
echo "步骤1: 分割JSON文件..."
python3 split_json.py

echo ""
echo "=========================================="
echo "优化完成！"
echo "=========================================="
echo ""
echo "生成的文件："
echo "  data/gameData_index.json      - 索引文件（首次加载）"
echo "  data/gameData_nintendo.json   - 任天堂数据"
echo "  data/gameData_sony.json       - 索尼数据"
echo "  data/gameData_pc_android.json - PC及安卓数据"
echo "  data/gameData_other.json      - 其他平台数据"
echo ""
echo "下一步："
echo "  1. 提交 data 文件夹到 GitHub"
echo "  2. 参考 script_optimized.js 修改加载逻辑"
echo "  3. 测试网站功能"
echo ""
