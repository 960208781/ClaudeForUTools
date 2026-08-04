#!/bin/bash
# uTools 插件打包准备脚本
# 临时移出非插件文件（.git 等），打包完成后自动恢复
# 用法: ./build.sh

set -e

ROOT="/Users/chaoyang/WorkSpace/ClaudeForUTools"
BACKUP="$ROOT/.pack-backup"

# 需要临时移出的文件/目录（不属于插件包）
EXCLUDE=(".git" ".codely" ".codely-cli" ".gitignore" "CODELY.md" "build.sh" "dist" "mem-log" "screenshots" ".DS_Store")

echo "📦 准备 uTools 插件打包环境..."

# 清理旧的备份
rm -rf "$BACKUP"
mkdir -p "$BACKUP"

# 移出非插件文件
for item in "${EXCLUDE[@]}"; do
  if [ -e "$ROOT/$item" ]; then
    mv "$ROOT/$item" "$BACKUP/"
    echo "   移出: $item"
  fi
done

echo ""
echo "✅ 目录已清理，仅保留插件文件"
echo ""
echo "📋 下一步:"
echo "   1. 打开 uTools 开发者工具"
echo "   2. 打包目录选择: $ROOT"
echo "   3. 版本号填写: 1.0.1"
echo ""
echo "⚠️  打包完成后，按回车键恢复文件..."
read -r

# 恢复
for item in "${EXCLUDE[@]}"; do
  if [ -e "$BACKUP/$item" ]; then
    mv "$BACKUP/$item" "$ROOT/"
    echo "   恢复: $item"
  fi
done

rm -rf "$BACKUP"
echo ""
echo "✅ 文件已全部恢复!"
