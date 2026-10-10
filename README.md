# Badoudao 自研后台版

Next.js 15 + Cloudflare Pages Functions + D1 数据库 + R2 图片存储。**不依赖 Decap CMS，登录方式为邮箱密码。**

---

## 架构

```
前台（Next.js SSR）        / 首页 / 分类页 / 产品详情页
后台（/admin）             仪表盘 / 产品 / 分类 / 博客 / 页面 / 图片库 / 询盘 / 设置 / 成员
API（Route Handlers）      /api/contact /api/products /api/media /api/inquiries /api/settings /api/auth
存储                      D1（数据）+ R2（图片）
认证                      自研：PBKDF2 密码 + HttpOnly Cookie 会话
```

### 与 Decap 版的差别

| 功能 | Decap 版 | 本版 |
|---|---|---|
| 登录 | GitHub OAuth（要单独部署 Worker） | **邮箱密码，后台内置** |
| 产品管理 | 改文本字段 | 参数表 / 阶梯价 / 定制选项分表管理 |
| 询盘管理 | 无（只有邮箱） | **列表 / 状态流转 / 报价记录 / 来源追踪** |
| 图片管理 | 上传 | 上传 + **使用追踪**（防误删）+ 尺寸解析 |
| 库存交期 | 无 | 产品字段可维护 |
| 权限 | 只能 push 的人 | **5 种角色，字段级控制** |

---

## 部署步骤

### 1. 准备 Cloudflare 资源

```bash
npm install

# 创建 D1 数据库
npx wrangler d1 create badoudao
# 输出里的 database_id 填到 wrangler.toml

# 创建 R2 存储桶（存图片）
npx wrangler r2 bucket create badoudao-media
```

把 `wrangler.toml` 里的 `YOUR_DATABASE_ID` 换成真实 ID，并**取消注释** `[[r2_buckets]]` 那一段。

### 2. 建表 + 灌入示例数据

```bash
npm run db:migrate:remote   # 建表
npm run db:seed:remote      # 灌入 6 个分类 + 7 款产品 + 参数 + 价格
```

本地开发用 `npm run db:migrate:local`，数据存在 `.wrangler/` 不影响线上。

### 3. 推到 GitHub

```bash
cd badoudao-cms
git init
git add .
git commit -m "Badoudao site"
git branch -M main
git remote add origin https://github.com/你的用户名/badoudao-cms.git
git push -u origin main
```

> 如果上级目录也是 git 仓库，**必须先在这里 `git init`**，否则会把你其他项目一起推上去。

### 4. 部署到 Cloudflare Pages

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选仓库

构建设置：

```
Framework preset:        Next.js
Build command:           npx @cloudflare/next-on-pages
Build output directory:  .vercel/output/static
```

环境变量（Settings → Environment variables → Production）：

| 变量 | 说明 | 必填 |
|---|---|---|
| `ADMIN_EMAIL` | 首个管理员账号 | ✅ |
| `ADMIN_PASSWORD` | 首个管理员密码 | ✅ |
| `RESEND_API_KEY` | 收询盘邮件 | 建议 |
| `INBOX_EMAIL` | 询盘收件箱 | 建议 |
| `MAIL_FROM` | 发件人 | 否 |
| `SITE_URL` | 站点网址 | 否 |

**首次登录用 `ADMIN_EMAIL` / `ADMIN_PASSWORD`，登录后立刻在「成员权限」里改密码。**

### 5. 本地开发

```bash
cp .dev.vars.example .dev.vars    # 填本地环境变量
npm run db:migrate:local
npm run preview                    # http://localhost:8788
```

---

## 后台功能

**仪表盘** — 询盘统计（今日/7天/待跟进/成交/超时）、待办提醒（缺图、缺参数、草稿）、产品概览

**产品管理** — 列表筛选、6 个编辑 Tab（基本信息 / 规格参数 / 定制选项 / 价格阶梯 / 图片 / 详情文案）、一键上下架、批量删除

**询盘管理** — 状态流转（新→已联系→已报价→谈判中→成交/流失）、负责人分配、报价记录留档、来源页面与 UTM 追踪、同一客户历史询盘、超 24h 未回复标红

**图片库** — 拖拽批量上传、目录与标签、**使用追踪**（被产品引用的图无法删除）、Alt 文本编辑、自动读取图片尺寸

**系统设置** — 邮箱、电话、WhatsApp、产能、MOQ 等，改完前台立即生效

**成员权限** — 5 种角色，字段级控制：

| 角色 | 可见 |
|---|---|
| admin | 全部 |
| sales | 售价（看不到成本）、询盘读写 |
| content | 产品/内容/图片读写，看不到成本 |
| factory | 库存与交期，**看不到售价** |
| viewer | 只读 |

---

## 表单防垃圾

五层保护：蜜罐字段 / 3 秒时间戳校验 / 16KB 请求体限制 / 每 IP 每小时 5 条 / 输入清洗 + 白名单校验。

**关键**：邮件发送失败时不影响询盘入库——询盘已经存在 D1，不会静默丢失。

---

## 常见问题

**D1 binding 报错**
Cloudflare Pages → Settings → Functions → 绑定 `DB` → 选你的 D1 数据库。

**图片上传报 503**
R2 绑定没配。`wrangler.toml` 里取消注释 `[[r2_buckets]]` 并填 bucket name，同时在 Pages 设置里绑定 `MEDIA_BUCKET`。

**构建报 lock 文件不同步**
删掉 `node_modules` 和 `package-lock.json`，重新 `npm install` 后提交。

**新建产品后前台不显示**
状态是「草稿」。改成「已上架」才会显示在分类页。

**忘记密码**
在 Cloudflare 环境变量里改 `ADMIN_PASSWORD`，然后删掉 `users` 表里对应记录重新初始化——或者直接在数据库执行：
```sql
DELETE FROM users;
DELETE FROM sessions;
```
下次请求会用环境变量里的账号重建。

**绑了自定义域名**
需要同步改三处：环境变量 `SITE_URL`、D1 的 `settings` 表里 `siteUrl`、`public/robots.txt` 里的 sitemap 地址。