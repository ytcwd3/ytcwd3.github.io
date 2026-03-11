# Giscus留言板配置指南

## 什么是Giscus？
Giscus是一个基于GitHub Discussions的评论系统，完全免费，无需后端服务器。

## 配置步骤

### 1. 准备GitHub仓库
确保你的GitHub仓库满足以下条件：
- ✅ 仓库是公开的（public）
- ✅ 已安装[giscus app](https://github.com/apps/giscus)
- ✅ 仓库已启用Discussions功能

### 2. 启用Discussions
1. 进入你的GitHub仓库：`https://github.com/ytcwd3/ytcwd3.github.io`
2. 点击 Settings（设置）
3. 向下滚动找到 Features（功能）部分
4. 勾选 ✅ Discussions

### 3. 安装Giscus App
1. 访问：https://github.com/apps/giscus
2. 点击 "Install"
3. 选择你的仓库 `ytcwd3/ytcwd3.github.io`
4. 点击 "Install & Authorize"

### 4. 获取配置参数
1. 访问：https://giscus.app/zh-CN
2. 在"配置"部分填写：
   - 仓库：`ytcwd3/ytcwd3.github.io`
   - 页面 ↔️ discussions 映射关系：选择 `pathname`
   - Discussion 分类：选择 `General` 或创建新分类
3. 页面会自动生成配置代码，找到以下参数：
   - `data-repo-id`：仓库ID
   - `data-category-id`：分类ID

### 5. 更新网站配置
打开 `script.js` 文件，找到 `initGiscus()` 函数，更新以下参数：

```javascript
script.setAttribute('data-repo', 'ytcwd3/ytcwd3.github.io'); // 你的仓库
script.setAttribute('data-repo-id', 'YOUR_REPO_ID'); // 替换为实际的repo-id
script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID'); // 替换为实际的category-id
```

### 6. 完整配置示例

```javascript
function initGiscus() {
  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.setAttribute('data-repo', 'ytcwd3/ytcwd3.github.io');
  script.setAttribute('data-repo-id', 'R_kgDOxxxxxx'); // 从giscus.app获取
  script.setAttribute('data-category', 'General');
  script.setAttribute('data-category-id', 'DIC_kwDOxxxxxx'); // 从giscus.app获取
  script.setAttribute('data-mapping', 'pathname');
  script.setAttribute('data-strict', '0');
  script.setAttribute('data-reactions-enabled', '1');
  script.setAttribute('data-emit-metadata', '0');
  script.setAttribute('data-input-position', 'top');
  script.setAttribute('data-theme', 'light');
  script.setAttribute('data-lang', 'zh-CN');
  script.setAttribute('data-loading', 'lazy');
  script.crossOrigin = 'anonymous';
  script.async = true;

  document.getElementById('giscus-container').appendChild(script);
}
```

## 配置选项说明

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| data-repo | GitHub仓库 | ytcwd3/ytcwd3.github.io |
| data-repo-id | 仓库ID | 从giscus.app获取 |
| data-category | Discussion分类 | General |
| data-category-id | 分类ID | 从giscus.app获取 |
| data-mapping | 映射方式 | pathname |
| data-reactions-enabled | 启用表情反应 | 1 |
| data-input-position | 输入框位置 | top |
| data-theme | 主题 | light |
| data-lang | 语言 | zh-CN |

## 主题自定义

如果想要深色主题，可以修改：
```javascript
script.setAttribute('data-theme', 'dark');
```

可选主题：
- `light` - 浅色
- `dark` - 深色
- `preferred_color_scheme` - 跟随系统
- `transparent_dark` - 透明深色
- `noborder_light` - 无边框浅色
- `noborder_dark` - 无边框深色

## 测试留言板

配置完成后：
1. 提交代码到GitHub
2. 等待GitHub Pages部署完成（通常1-2分钟）
3. 访问你的网站
4. 点击"留言板"按钮
5. 使用GitHub账号登录并测试留言

## 常见问题

### Q: 留言板不显示？
A: 检查以下几点：
1. 仓库是否公开
2. Discussions是否已启用
3. Giscus App是否已安装
4. repo-id和category-id是否正确

### Q: 需要登录GitHub才能留言吗？
A: 是的，Giscus基于GitHub Discussions，用户需要GitHub账号才能留言。

### Q: 留言数据存储在哪里？
A: 所有留言存储在GitHub Discussions中，完全免费，无需担心数据丢失。

### Q: 可以管理留言吗？
A: 可以！在GitHub仓库的Discussions页面可以管理所有留言，包括删除、编辑等。

### Q: 有访问限制吗？
A: GitHub Discussions没有访问次数限制，完全免费使用。

## 优势

✅ 完全免费，无需后端
✅ 数据存储在GitHub，安全可靠
✅ 支持Markdown格式
✅ 支持表情反应
✅ 支持回复和嵌套评论
✅ 自动防垃圾评论
✅ 可以在GitHub管理所有留言

## 技术支持

如有问题，可以：
1. 查看Giscus官方文档：https://giscus.app/zh-CN
2. 联系B站或QQ群：745804936
