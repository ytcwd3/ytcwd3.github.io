# 单游仓鼠搜索站

一个游戏资源搜索网站，支持多平台游戏资源检索。

## 🌟 功能特点

- ✅ 多平台游戏搜索（任天堂、索尼、PC及安卓、其他平台）
- ✅ 分类筛选和关键词搜索
- ✅ 二维码快速分享（夸克、百度、迅雷）
- ✅ 资源更新记录
- ✅ 留言板功能（基于GitHub Discussions）
- ✅ 响应式设计，支持移动端

## 📊 性能优化

- 原始数据文件：3.3MB
- 优化后首屏加载：1.09MB（减少67%）
- 按需加载分类数据
- 预计加载时间：从3-5秒降至1-2秒

## 🚀 快速开始

### 在线访问
```
https://ytcwd3.github.io
```

### 本地开发
```bash
# 启动本地服务器
python3 -m http.server 8000

# 或使用快速启动脚本
cd tools
./start_local_server.sh

# 访问 http://localhost:8000
```

## 🔧 工具使用

### Excel转JSON工具

用于将Excel数据转换为JSON格式，支持多sheet分别转换。

**使用方法：**
```bash
# 安装依赖
cd tools
pip install -r requirements.txt

# 运行工具
python excel_to_json_converter.py
```

**Excel格式要求：**
- 每个sheet代表一个分类
- 必需列：name, category, subCategory, code, unzipCode, quarkPan, baiduPan, thunderPan, updateDate
- 支持多分类（用逗号分隔）

详细说明：[docs/Excel转JSON工具使用说明.md](docs/Excel转JSON工具使用说明.md)

### JSON分割工具

将大的JSON文件分割为多个小文件，提升加载速度。

```bash
cd tools
python split_json.py
```

生成的文件在 `data/` 文件夹中。

## 💬 留言板配置

网站使用Giscus作为留言板系统（基于GitHub Discussions）。

**配置步骤：**

1. **启用Discussions**
   - 访问仓库设置：https://github.com/ytcwd3/ytcwd3.github.io/settings
   - 勾选 "Discussions"

2. **安装Giscus App**
   - 访问：https://github.com/apps/giscus
   - 安装到你的仓库

3. **获取配置参数**
   - 访问：https://giscus.app/zh-CN
   - 输入仓库名获取 `data-repo-id` 和 `data-category-id`

4. **更新配置**
   - 编辑 `assets/js/script.js` 中的 `initGiscus()` 函数
   - 取消注释并填入配置参数

详细说明：[docs/Giscus配置指南.md](docs/Giscus配置指南.md)

## 📁 项目结构

```
ytcwd3.github.io/
├── index.html                      # 主页面
├── CNAME                           # 域名配置
├── README.md                       # 项目说明
│
├── assets/                         # 静态资源
│   ├── css/
│   │   └── style.css              # 样式表
│   └── js/
│       └── script.js              # 主脚本
│
├── data/                           # 数据文件
│   ├── gameData.json              # 原始数据（3.3MB）
│   ├── gameData_index.json        # 索引文件（1.1MB）
│   ├── gameData_nintendo.json     # 任天堂数据（2.2MB）
│   ├── gameData_sony.json         # 索尼数据（550KB）
│   ├── gameData_pc_android.json   # PC及安卓数据（499KB）
│   └── gameData_other.json        # 其他平台数据（78KB）
│
├── tools/                          # 工具脚本
│   ├── excel_to_json_converter.py # Excel转JSON工具
│   ├── split_json.py              # JSON分割工具
│   ├── requirements.txt           # Python依赖
│   ├── start_local_server.sh      # 本地服务器启动脚本
│   └── build_exe.bat              # Windows打包脚本
│
└── docs/                           # 文档
    ├── Excel转JSON工具使用说明.md
    ├── Giscus配置指南.md
    ├── 快速开始指南.md
    └── 文件清理总结.md
```

## 🎯 数据更新流程

1. **准备Excel文件**
   - 按照格式要求整理数据
   - 每个sheet对应一个分类

2. **转换为JSON**
   ```bash
   cd tools
   python excel_to_json_converter.py
   ```

3. **分割JSON文件**（可选，用于性能优化）
   ```bash
   cd tools
   python split_json.py
   ```

4. **提交更新**
   ```bash
   git add .
   git commit -m "更新游戏数据"
   git push
   ```

## 📊 数据统计

- 总游戏数：10,581条
- 任天堂：6,649条
- 索尼：1,725条
- PC及安卓：1,961条
- 其他平台：246条

## 🛠️ 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **留言板**：Giscus (GitHub Discussions)
- **工具**：Python 3.7+, pandas, openpyxl
- **部署**：GitHub Pages

## 📞 联系方式

- B站私信
- QQ群：745804936

## 📝 更新日志

### 2026-03-11
- ✅ 添加Excel转JSON工具
- ✅ 集成Giscus留言板
- ✅ 优化JSON加载（减少67%首屏加载）
- ✅ 添加详细文档

## 📄 许可

仅供学习交流使用，请勿用于商业用途。

---

**© 2026 单游仓鼠搜索站**
