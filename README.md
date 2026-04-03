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
│   │   ├── admin/
│   │   │   ├── page.tsx               # 管理后台
│   │   │   ├── login/page.tsx         # GitHub 登录页
│   │   │   ├── callback/page.tsx      # OAuth 回调页
│   │   │   └── components/
│   │   │       ├── constants.ts        # 共享常量
│   │   │       ├── Header.tsx         # 顶部导航栏
│   │   │       ├── StatsCards.tsx      # 分类统计卡片
│   │   │       ├── SubcategoryFilter.tsx  # 子分类筛选
│   │   │       ├── Toolbar.tsx         # 搜索和操作按钮
│   │   │       ├── GameTable.tsx       # 数据表格和分页
│   │   │       ├── EditModal.tsx       # 添加/编辑游戏弹窗
│   │   │       └── ImportModal.tsx     # Excel 导入弹窗
│   │   └── components/
│   │       ├── SearchResults/
│   │       │   ├── index.tsx          # 搜索结果容器
│   │       │   └── GameCard.tsx       # 游戏卡片（含二维码）
│   │       ├── Popups/
│   │       │   ├── GuestbookPopup.tsx  # 留言板弹窗
│   │       │   ├── EmulatorPopup.tsx  # 模拟器弹窗
│   │       │   ├── FanGroupPopup.tsx  # 粉丝群弹窗
│   │       │   ├── RewardPopup.tsx    # 打赏弹窗
│   │       │   └── UpdateRecordPopup.tsx  # 更新记录弹窗
│   │       └── QrCode/
│   │           └── QrCodeModal.tsx     # 二维码放大弹窗
│   └── lib/
│       └── supabase.ts                # 数据库客户端
│
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
| `src/app/components/Popups/RewardPopup.tsx`       | 打赏捐赠弹窗                         |
| `src/app/components/Popups/UpdateRecordPopup.tsx` | 资源更新记录弹窗                     |
| `src/app/components/QrCode/QrCodeModal.tsx`       | 二维码放大弹窗                       |

### 管理后台组件

| 文件                                             | 说明                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `src/app/admin/page.tsx`                         | 管理后台主页面                             |
| `src/app/admin/login/page.tsx`                   | GitHub OAuth 登录（仅 anyebojue / ytcwd3） |
| `src/app/admin/callback/page.tsx`                | OAuth 回调处理                             |
| `src/app/admin/components/constants.ts`          | 共享常量（分类映射、样式等）               |
| `src/app/admin/components/Header.tsx`            | 顶部导航栏                                 |
| `src/app/admin/components/StatsCards.tsx`        | 分类统计卡片                               |
| `src/app/admin/components/SubcategoryFilter.tsx` | 子分类筛选按钮                             |
| `src/app/admin/components/Toolbar.tsx`           | 搜索框和操作按钮                           |
| `src/app/admin/components/GameTable.tsx`         | 数据表格和分页                             |
| `src/app/admin/components/EditModal.tsx`         | 添加/编辑游戏弹窗                          |
| `src/app/admin/components/ImportModal.tsx`       | Excel 导入弹窗                             |

### 基础设施

| 文件                  | 说明                                       |
| --------------------- | ------------------------------------------ |
| `src/lib/supabase.ts` | Supabase 客户端，Game / Guestbook 类型定义 |
| `src/app/layout.tsx`  | 根布局                                     |
| `src/app/globals.css` | 全局样式                                   |

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
