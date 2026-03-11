# Excel转JSON工具使用说明

## 功能说明
这个工具可以将Excel文件中的游戏数据转换为JSON格式，支持多个sheet分别转换。

## Excel文件格式要求

### 1. Sheet结构
Excel文件应该包含多个sheet，每个sheet代表一个游戏分类：
- 任天堂主机（Wiiu/Wii/NGC数据）
- NS（NS/NS乙女数据）
- 任天堂掌机（GBA/NDS/3DS数据）
- 索尼（PS1/PS2/PS3/PS4/PS vita/PSP数据）
- 其他（未匹配分类的数据）

### 2. 列名要求（必须包含以下列）
| 列名 | 说明 | 示例 |
|------|------|------|
| name | 游戏名称 | 塞尔达传说：旷野之息 |
| category | 主分类（支持多个，用逗号分隔） | 任天堂,PC及安卓 |
| subCategory | 子分类（支持多个，用逗号分隔） | NS,RPG |
| code | 提取码 | 8888 |
| unzipCode | 解压密码 | 无 |
| quarkPan | 夸克网盘链接 | https://pan.quark.cn/s/xxx |
| baiduPan | 百度网盘链接 | https://pan.baidu.com/s/xxx |
| thunderPan | 迅雷网盘链接 | https://pan.xunlei.com/s/xxx |
| updateDate | 更新日期 | 2026.3.6 |

### 3. 多分类支持
- category和subCategory字段支持多个值
- 多个值之间用英文逗号分隔
- 例如：`任天堂,PC及安卓` 或 `NS,RPG`

## 使用步骤

### 方法一：直接运行Python脚本
1. 安装Python 3.7+
2. 安装依赖：`pip install -r requirements.txt`
3. 运行脚本：`python excel_to_json_converter.py`
4. 在界面中选择Excel文件和输出目录
5. 点击"开始转换"

### 方法二：使用打包的exe文件（Windows）
1. 双击运行 `build_exe.bat` 生成exe文件
2. 在 `dist` 文件夹中找到生成的exe文件
3. 双击运行exe文件
4. 在界面中选择Excel文件和输出目录
5. 点击"开始转换"

## 输出文件
转换后会生成多个JSON文件，文件名格式为：
- `gameData_任天堂主机.json`
- `gameData_NS.json`
- `gameData_任天堂掌机.json`
- `gameData_索尼.json`
- `gameData_其他.json`

## 注意事项
1. Excel文件必须是 .xlsx 或 .xls 格式
2. 确保所有必需的列都存在
3. 空行会被自动跳过
4. 转换后的JSON文件使用UTF-8编码
5. 如果某个sheet转换失败，其他sheet仍会继续转换

## 常见问题

### Q: 转换失败怎么办？
A: 检查Excel文件格式是否正确，确保包含所有必需的列名。

### Q: 支持哪些Excel版本？
A: 支持 .xlsx（Excel 2007+）和 .xls（Excel 97-2003）格式。

### Q: 可以自定义输出文件名吗？
A: 输出文件名由sheet名称决定，格式为 `gameData_[sheet名称].json`。

### Q: 如何合并多个JSON文件？
A: 如果需要合并，可以手动编辑JSON文件，或者在Excel中将所有数据放在一个sheet中。

## 技术支持
如有问题，请联系：
- B站
- QQ群：745804936
