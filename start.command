#!/bin/zsh
cd -- "$(dirname -- "$0")"
print '投资 X Buddy 本地预览：http://127.0.0.1:4173'
print '请在浏览器打开上方地址。关闭本窗口即可停止。'
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
