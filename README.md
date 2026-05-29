# 单游仓鼠搜索站

一个游戏资源检索网站，基于 Next.js + Supabase 构建。

## 快速访问

- 网站：[https://danyoucangshu.xyz/](https://danyoucangshu.xyz/)
- 管理后台：[https://ytcwd3.github.io/admin](https://ytcwd3.github.io/admin)

## 项目结构

```bash
ytcwd3.github.io/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 首页 - 游戏搜索
│   │   ├── layout.tsx                  # 根布局
│   │   ├── globals.css                 # 全局样式
│   │   ├── error.tsx                   # 错误边界
│   │   ├── admin/
│   │   │   ├── page.tsx                # 管理后台主页
│   │   │   ├── login/page.tsx         # GitHub 登录页
│   │   │   ├── callback/page.tsx      # OAuth 回调页
│   │   │   ├── categories/page.tsx    # 分类管理页
│   │   │   ├── links/page.tsx         # 站点链接管理页
│   │   │   └── components/
│   │   │       ├── constants.ts       # 共享常量
│   │   │       ├── Header.tsx         # 顶部导航栏
│   │   │       ├── StatsCards.tsx     # 分类统计卡片
│   │   │       ├── SubcategoryFilter.tsx # 子分类筛选
│   │   │       ├── Toolbar.tsx        # 搜索和操作按钮
│   │   │       ├── GameTable.tsx      # 数据表格和分页
│   │   │       ├── EditModal.tsx      # 添加/编辑游戏弹窗
│   │   │       ├── ImportModal.tsx    # Excel 导入弹窗
│   │   │       ├── DatabaseCategoryManager.tsx # 数据库分类管理
│   │   │       ├── SiteLinksManager.tsx # 站点链接管理
│   │   │       ├── ImageMatchModal.tsx # 图片匹配弹窗
│   │   │       └── ConfirmModal.tsx    # 确认弹窗
│   │   └── components/
│   │       ├── AuthGuard.tsx           # 路由守卫
│   │       ├── ImageHoverPreview.tsx   # 图片悬停预览
│   │       ├── SearchResults/
│   │       │   ├── index.tsx          # 搜索结果容器
│   │       │   └── GameCard.tsx       # 游戏卡片（含二维码）
│   │       ├── Popups/
│   │       │   ├── GuestbookPopup.tsx  # 留言板弹窗
│   │       │   ├── EmulatorPopup.tsx  # 模拟器弹窗
│   │       │   ├── FanGroupPopup.tsx  # 粉丝群弹窗
│   │       │   ├── RewardPopup.tsx    # 打赏弹窗
│   │       │   ├── ToolPatchPopup.tsx  # 工具补丁弹窗
│   │       │   ├── HelpCenterPopup.tsx # 帮助中心弹窗
│   │       │   └── UpdateRecordPopup.tsx  # 更新记录弹窗
│   │       └── QrCode/
│   │           └── QrCodeModal.tsx     # 二维码放大弹窗
│   └── lib/
│       ├── supabase.ts                # Supabase 客户端
│       ├── categories.ts              # categories 父分类
│       ├── subcategories.ts           # subcategories 子分类
│       ├── category_operation_logs.ts # 分类管理操作记录
│       ├── games.ts                   # games 游戏表
│       ├── download_events.ts         # download_events 下载统计
│       ├── guestbook.ts               # guestbook 评论表
│       └── site_links.ts              # site_links 链接管理
│   └── api/
│       ├── match-images/route.ts      # 图片匹配 API
│       └── track-download/route.ts    # 下载追踪 API
├── 自己分.xlsx                         # 游戏数据源文件
├── package.json                       # npm 依赖
├── package-lock.json                  # 依赖锁定
├── next.config.js                    # Next.js 配置
├── tsconfig.json                     # TypeScript 配置
├── next-env.d.ts                     # Next.js 类型声明
├── .gitignore                        # Git 忽略规则
└── CNAME                             # 自定义域名
```

## 文件说明

### 首页组件

| 文件                                              | 说明                                 |
| ------------------------------------------------- | ------------------------------------ |
| `src/app/page.tsx`                                | 首页，分类标签、搜索框、底部弹窗入口 |
| `src/app/components/SearchResults/index.tsx`      | 搜索结果容器，含加载更多             |
| `src/app/components/SearchResults/GameCard.tsx`   | 游戏卡片，含夸克/百度/迅雷二维码     |
| `src/app/components/Popups/GuestbookPopup.tsx`    | 留言板弹窗                           |
| `src/app/components/Popups/EmulatorPopup.tsx`     | 模拟器大全弹窗                       |
| `src/app/components/Popups/FanGroupPopup.tsx`     | 粉丝群弹窗                           |
| `src/app/components/Popups/RewardPopup.tsx`       | 打赏弹窗                             |
| `src/app/components/Popups/UpdateRecordPopup.tsx` | 资源更新记录弹窗                     |
| `src/app/components/Popups/ToolPatchPopup.tsx`     | 工具补丁弹窗                         |
| `src/app/components/Popups/HelpCenterPopup.tsx`  | 帮助中心弹窗                        |
| `src/app/components/QrCode/QrCodeModal.tsx`       | 二维码放大弹窗                       |
| `src/app/components/ImageHoverPreview.tsx`        | 游戏卡片图片悬停预览                 |

### 管理后台组件

| 文件                                                      | 说明                                       |
| -------------------------------------------------------- | ------------------------------------------ |
| `src/app/admin/page.tsx`                                 | 管理后台主页面                             |
| `src/app/admin/login/page.tsx`                           | GitHub OAuth 登录（仅 anyebojue / ytcwd3） |
| `src/app/admin/callback/page.tsx`                        | OAuth 回调处理                             |
| `src/app/admin/categories/page.tsx`                      | 分类管理页（数据库分类管理）               |
| `src/app/admin/links/page.tsx`                           | 站点链接管理页                            |
| `src/app/admin/components/constants.ts`                 | 共享常量（分类映射、样式等）               |
| `src/app/admin/components/Header.tsx`                    | 顶部导航栏                                 |
| `src/app/admin/components/StatsCards.tsx`               | 分类统计卡片                               |
| `src/app/admin/components/SubcategoryFilter.tsx`         | 子分类筛选按钮                             |
| `src/app/admin/components/Toolbar.tsx`                  | 搜索框和操作按钮                           |
| `src/app/admin/components/GameTable.tsx`                | 数据表格和分页                             |
| `src/app/admin/components/EditModal.tsx`                | 添加/编辑游戏弹窗                          |
| `src/app/admin/components/ImportModal.tsx`              | Excel 导入弹窗                             |
| `src/app/admin/components/DatabaseCategoryManager.tsx`  | 数据库分类管理（categories/subcategories） |
| `src/app/admin/components/SiteLinksManager.tsx`         | 站点链接管理                               |
| `src/app/admin/components/ImageMatchModal.tsx`          | 图片匹配弹窗                               |
| `src/app/admin/components/ConfirmModal.tsx`             | 确认弹窗                                   |

### 基础设施

| 文件                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| `src/lib/supabase.ts` | Supabase 客户端 |
| `src/lib/categories.ts` | categories 父分类 |
| `src/lib/subcategories.ts` | subcategories 子分类 |
| `src/lib/category_operation_logs.ts` | 分类管理操作记录 |
| `src/lib/games.ts` | games 游戏表 |
| `src/lib/download_events.ts` | download_events 下载统计 |
| `src/lib/guestbook.ts` | guestbook 评论表 |
| `src/lib/site_links.ts` | site_links 链接管理 |
| `src/app/layout.tsx`  | 根布局 |
| `src/app/globals.css` | 全局样式 |
| `src/app/error.tsx`   | 错误边界 |

### API 路由

| 文件                          | 说明           |
| ----------------------------- | -------------- |
| `src/app/api/match-images/`   | 图片匹配接口   |
| `src/app/api/track-download/` | 下载追踪接口   |

## 管理后台使用方法

1. 访问 `/admin`，未登录则跳转 GitHub 登录
2. 支持按平台/子分类筛选、关键词搜索、分页浏览、导入 Excel、编辑/删除数据

### 导入 Excel 格式

Excel 列对应字段：name, 平台1, 平台2, 子分类1, 子分类2, 提取码, 夸克链接, 百度链接, 迅雷链接, 解压密码, 更新日期

导入时自动映射 UI 分类为 DB 存储格式（PC及安卓 → PC、任天堂 → NS、索尼 → 索尼、其他平台 → Ohter）

## 技术栈

Next.js 15 (App Router) · Supabase (PostgreSQL) · CSS3 + Glassmorphism · qrcode.react · XLSX · Vercel

## 本地开发

```bash
npm install
npm run dev      # 开发
npm run build    # 构建
```

## 数据更新流程

1. 在 `自己分.xlsx` 中更新游戏数据
2. 登录管理后台 `/admin`
3. 使用「导入 Excel」功能上传
4. 提交并推送到 GitHub 自动部署

## 联系方式

B站私信 · QQ群：1092295162

---

仅供学习交流使用，请勿用于商业用途。
