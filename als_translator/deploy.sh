#!/bin/bash

echo "🚀 開始部署..."

# 清理舊的建置檔案
echo "🧹 清理舊的建置檔案..."
rm -rf build

# 建立新的建置版本
echo "🔨 建立新的建置版本..."
REACT_APP_PUBLIC_URL=. npm run build

# 清理 bucket 中的舊檔案
echo "🗑️ 清理 bucket 中的舊檔案..."
gsutil -m rm -r gs://asl-translator-website/**

# 上傳新檔案
echo "📤 上傳新檔案..."
gsutil -m cp -r build/* gs://asl-translator-website/

# 設置檔案的 MIME 類型和快取控制
echo "⚙️ 設置檔案屬性..."
gsutil -m setmeta -h "Content-Type:text/html" -h "Cache-Control:no-cache" gs://asl-translator-website/*.html
gsutil -m setmeta -h "Content-Type:text/css" -h "Cache-Control:max-age=31536000" gs://asl-translator-website/static/css/*
gsutil -m setmeta -h "Content-Type:application/javascript" -h "Cache-Control:max-age=31536000" gs://asl-translator-website/static/js/*
gsutil -m setmeta -h "Content-Type:application/json" -h "Cache-Control:no-cache" gs://asl-translator-website/manifest.json

# 設置 CORS (使用現有的 cors.json 檔案)
echo "🔒 設置 CORS..."
gsutil cors set cors.json gs://asl-translator-website

# 確保檔案權限正確
echo "🔑 設置檔案權限..."
gsutil -m acl ch -r -u AllUsers:R gs://asl-translator-website/*

# 輸出結果
echo "✅ 部署完成！"
echo "🌎 網站網址：https://storage.googleapis.com/asl-translator-website/index.html"