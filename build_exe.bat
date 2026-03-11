@echo off
echo ========================================
echo Excel转JSON工具 - 打包脚本
echo ========================================
echo.

echo 正在安装依赖...
pip install -r requirements.txt

echo.
echo 正在打包exe文件...
pyinstaller --onefile --windowed --name="Excel转JSON工具" --icon=NONE excel_to_json_converter.py

echo.
echo ========================================
echo 打包完成！
echo 生成的exe文件在 dist 文件夹中
echo ========================================
pause
