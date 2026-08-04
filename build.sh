#!/bin/bash
# 清理 dist/ 目录，供 uTools 打包使用
# 用法: ./build.sh

set -e

DIST="/Users/chaoyang/WorkSpace/ClaudeForUTools/dist"

echo "🧹 清理 dist/ 目录..."
find "$DIST" -name '.DS_Store' -delete

SIZE=$(du -sh "$DIST" | awk '{print $1}')
FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ dist/ 已就绪!"
echo "   大小: $SIZE  文件数: $FILES"
echo ""
echo "📋 下一步:"
echo "   1. 打开 uTools 开发者工具"
echo "   2. 打包目录选择: $DIST"
echo "   3. 版本号填写: 1.0.1"
