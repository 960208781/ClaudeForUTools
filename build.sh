#!/bin/bash
# uTools 插件打包脚本 — 生成干净的 dist/ 目录
# 用法: ./build.sh
# 然后在 uTools 开发者工具中，打包目录选择 dist/

set -e

ROOT="/Users/chaoyang/WorkSpace/ClaudeForUTools"
DIST="$ROOT/dist"

echo "📦 构建 uTools 插件包..."

# 清理旧的 dist
rm -rf "$DIST"
mkdir -p "$DIST"

# 复制插件必需文件
cp "$ROOT/index.html"     "$DIST/"
cp "$ROOT/preload.js"     "$DIST/"
cp "$ROOT/plugin.json"    "$DIST/"
cp "$ROOT/logo.png"       "$DIST/"
cp "$ROOT/logo.svg"       "$DIST/"
cp "$ROOT/README.md"       "$DIST/"

# 复制目录
cp -R "$ROOT/css"          "$DIST/"
cp -R "$ROOT/js"            "$DIST/"

# 排除不需要的文件
rm -f "$DIST/.DS_Store"

# 统计大小
SIZE=$(du -sh "$DIST" | awk '{print $1}')
FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ 构建完成!"
echo "   目录: $DIST"
echo "   大小: $SIZE"
echo "   文件数: $FILES"
echo ""
echo "📋 下一步:"
echo "   1. 打开 uTools 开发者工具"
echo "   2. 打包目录选择: $DIST"
echo "   3. 版本号填写: 1.0.1 (如被拒绝需升版本号)"
