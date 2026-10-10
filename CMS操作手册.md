# Badoudao CMS 操作手册

后台地址：**你的域名 + `/admin`**

这份手册按日常使用顺序写：第一次配置 → 日常维护 → 遇到问题怎么办。

---

# 第一部分：首次部署

## 步骤 1 · 准备代码

```bash
cd badoudao-cms
npm install
```

> 首次安装约 2–3 分钟，会下载 Next.js 和 Cloudflare 工具链。

## 步骤 2 · 创建数据库

```bash
npx wrangler d1 create badoudao
```

输出里会有一串 ID：

```
[[d1_databases]]
binding = "DB"
database_name = "badoudao"
database_id = "e4c1a2b3-xxxx-xxxx-xxxx-1234567890ab"
```

**把 `database_id` 填进 `wrangler.toml`**：

```toml
[[d1_databases]]
binding = "DB"
database_name = "badoudao"
database_id = "e4c1a2b3-xxxx-xxxx-xxxx-1234567890ab"   ← 改成你的
```

## 步骤 3 · 创建图片存储桶

```bash
npx wrangler r2 bucket create badoudao-media
```

然后在 `wrangler.toml` 里**取消注释**这三行：

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "badoudao-media"
```

> R2 免费额度：10GB 存储 + 每月 100 万次读取。产品图每张 300KB 左右，1 万张图才 3GB。

## 步骤 4 · 建表 + 灌示例数据

```bash
npm run db:migrate:remote    # 建 15 张表
npm run db:seed:remote       # 灌 6 分类 + 7 产品 + 5 内容页
```

确认成功：

```bash
npx wrangler d1 execute badoudao --remote --command "SELECT COUNT(*) FROM products"
```

返回 `7` 就对了。

## 步骤 5 · 上传邮件服务

去 [resend.com](https://resend.com) 注册 → Domains 添加域名 → 按提示在 DNS 加记录 → 状态变成 **Verified** → API Keys 里创建 Key，复制。

## 步骤 6 · 推 GitHub

```bash
cd badoudao-cms
git init
git add .
git commit -m "Badoudao CMS initial"
git branch -M main
git remote add origin https://github.com/你的用户名/badoudao-cms.git
git push -u origin main
```

> ⚠️ **必须先 `git init`**。如果你的项目目录在另一个 git 仓库里，直接 push 会把其他项目一起传上去。

## 步骤 7 · 连 Cloudflare Pages

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选 `badoudao-cms`

构建设置：

```
Framework preset:        Next.js
Build command:           npx @cloudflare/next-on-pages
Build output directory:  .vercel/output/static
```

## 步骤 8 · 设置环境变量

Settings → Environment variables → Production，加这 6 个：

| 变量名 | 值 |
|---|---|
| `ADMIN_EMAIL` | 你的邮箱 |
| `ADMIN_PASSWORD` | **设一个复杂密码** |
| `RESEND_API_KEY` | `re_xxxxx` |
| `INBOX_EMAIL` | 收询盘的邮箱 |
| `MAIL_FROM` | `Badoudao Website <website@你的域名>` |
| `SITE_URL` | `https://你的域名` |

**加完必须重新部署**：Settings → Deployments → 最新那条 → Retry deployment。

## 步骤 9 · 绑定 D1 和 R2

Settings → **Functions** → Bindings → Add：

```
Variable name:  DB             → D1 database → badoudao
Variable name:  MEDIA_BUCKET   → R2 bucket   → badoudao-media
```

**这步最容易漏**，不绑 D1 页面会报错。

## 步骤 10 · 登录后台

访问 `https://你的域名/admin`，用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录。

进去后第一件事：**改密码和联系方式**（见下一部分）。

---

# 第二部分：日常维护

## 系统设置 `/admin/settings`

改这里的内容会**自动同步到全站**——页脚、联系表单、Schema、页脚信任指标都会变。

| 字段 | 影响什么 |
|---|---|
| 联系邮箱 | 页脚、询盘通知收件地址 |
| WhatsApp / 电话 | 页脚悬浮按钮 |
| 日产能上下限 | 首页信任指标条「1-2k Units/Day」 |
| MOQ | 首页指标条、表单数量选项 |
| 报价响应时长 | 首页「12h Quote Response」文案 |
| 打样周期 | 首页指标条、FAQ 答案 |
| 品牌主色 / 辅助色 | 按钮、强调色（改完全站配色跟着变） |
| LOGO 路径 | 页头页脚标识 |

改完点「保存全部」，**立即生效，不用重新部署**。

> **LOGO 目前只能填图片路径**，不能直接上传。要换 LOGO 的话：先把文件传到图片库，然后在设置里把路径改成 `/media/xxx/xxx.svg` 这样。

## 产品管理 `/admin/products`

### 列表页

顶部 5 个数字是健康度指标：

- **缺图片** — 这些产品在 Google 几乎拿不到曝光，优先补
- **缺规格参数** — 产品页会没有参数表，影响可信度
- **草稿** — 还没上架的产品

右上角搜索框支持产品名、型号、slug 模糊搜索。

### 产品编辑页（6 个 Tab）

**① 基本信息**

- 型号/SKU 创建后**不能改**（询盘关联着它）
- 短描述 150 字符内，会用在列表卡片和 SEO 描述
- 工艺难度是给**工厂内部看的**标记，方便统计不同款式的产能占用，不会显示在前台

**② 规格参数**

一行一个参数，显示成前台的产品参数表。

```
参数名(Diameter)          值(12 inch / 30.5 cm)
Case material             ABS plastic
Movement                  Quartz, step second hand
```

留空的行自动忽略。**建议每个产品至少 8 个参数**——参数越全，越容易被 Google 认为这是有价值的页面。

**③ 定制选项**

比如「LOGO 印刷 +$0.08」「彩盒 +$0.55」。

**这些会直接显示在前台产品页，而且买家在询盘表单里能勾选**——不用你二次配置。

**④ 价格阶梯**

| 起始数量 | 结束数量 | 单价 |
|---|---|---|
| 500 | 2999 | 2.85 |
| 3000 | 9999 | 2.40 |
| 10000 | 不限 | 2.15 |

留空表示该档不显示。前台产品页**只显示价格区间**（如 $2.15–2.85），阶梯明细要等买家询盘才给——这是策略，避免买家拿着明细去比价。

**⑤ 图片**

第一张是主图。点已添加的图片**移除它**，点图片库里的图**添加它**。

> 上传图片要去「图片库」，那里能批量拖拽上传。

**⑥ 详情文案**

支持 HTML。正文超过 200 字才会被 Google 收录完整内容，建议 600–900 词。

**状态选择**：

| 状态 | 前台可见 |
|---|---|
| 已上架 published | ✅ 分类页、产品页、搜索都能找到 |
| 草稿 draft | ❌ 只有你能看到预览 |
| 已归档 archived | ❌ 从前台移除但保留数据 |

---

## 分类管理 `/admin/categories`

产品页 URL 是 `/products/{分类ID}/{产品slug}/`。

**分类 ID 创建后不能改**——改了所有产品的 URL 都会失效。

列表里显示每个分类的产品数。**有产品的分类禁止删除**，会提示是哪几个产品挡住了你。先把产品移到别的分类。

---

## 图片库 `/admin/media`

### 上传

直接把图片**拖进虚线框**，或者点「选择文件」。支持一次多选，一次最多 12 张。

上传后自动完成：
- 读取图片宽高
- 存入 R2，生成 `/media/{目录}/{id}.jpg` 路径
- 记录文件大小

### 使用追踪

图片右下角有「被 N 个产品使用」标记。

**被引用的图片不能删除**——这是防止误删导致前台图裂。图片库里的「删除」按钮会自动隐藏。

### Alt 文本

每张图下面有个输入框，写**这张图在说什么**。

- ✅ `12 inch round white plastic quartz wall clock with glass lens`
- ❌ `图片1` / `IMG_2345.jpg`

Alt 文本会被读屏软件（视障用户）和搜索引擎读。改完点输入框外就自动保存。

### 目录管理

上传时可以选目录（默认 `uploads`）。建议按用途分：

```
uploads/wall-clocks
uploads/clock-parts
uploads/factory
```

---

## 询盘管理 `/admin/inquiries`

**这是后台最重要的模块。**

### 仪表盘统计

| 数字 | 含义 | 行动 |
|---|---|---|
| 今日新增 | 0 点之后的询盘 | — |
| 近 7 天 | 滚动 7 天 | 对比判断流量变化 |
| 待跟进 | 状态是"新"或"已联系" | 逐条处理 |
| 近 7 天成交 | 状态是"成交" | 核心指标 |
| **超 24h 未回复** | 超时未处理的 | **红色，优先处理** |

承诺 12 小时回复，实际超时的询盘转化率明显下降。**这个数字应该是 0**。

### 列表页

- 顶部黄底行 = 超时未回复
- 「未分配」= 没人认领
- 「认领」按钮一键标记负责人并把状态推进到「已联系」

### 询盘详情

**顶部 6 个状态块**（新询盘 → 已联系 → 已报价 → 谈判中 → 成交 / 流失），点哪个状态就切到哪个。

**左侧**显示客户信息、留言原文、来源页面、IP 归属地。

> **来源页面**告诉你是从哪个产品页来的。如果某个产品页持续带来询盘，那个页就是你的核心产品，值得投入更多内容。

**右侧两个功能**：

*跟进* — 填负责人和内部备注（买家看不到），点保存

*报价记录* — 每次报价都填：
```
数量 1000    单价 2.45    交期 25 天    备注 含运费
```
系统自动算总额（1000 × 2.45 = $2,450），并保存历史。**下次客户来谈，你能查到上次报了多少。**

记录报价会自动把状态推进到「已报价」。

**右侧下方**显示该客户的历史询盘——同一邮箱的过往记录，方便判断诚意。

---

## 博客管理 `/admin/posts`

### 怎么写

1. 点「+ 新建文章」
2. **先填「目标关键词」**——这篇要抢的搜索词
3. 标题包含关键词，但别堆砌
4. 正文围绕它展开，每段回答买家一个具体问题

**关键：文章里要链到产品页和分类页。**

写"如何选择石英钟厂家"这类内容，买家看完会想看你的产品——没链接就流失了。

### 发布

草稿状态下前台看不见。点「发布」后前台 `/blog/` 立刻能看到。

`published_at` 在**第一次发布时自动记录**，后续修改不会改这个时间（对 SEO 有利）。

### 建议写什么

按优先级：

1. *How to Choose a Quartz Clock Manufacturer: 9 Things to Check*
2. *What Is the MOQ for Custom Clocks? An Honest Breakdown*
3. *Do Quartz Clocks Need CE Certification? An Honest Answer*
4. *Why Small-Batch Clock Manufacturing Works for Growing Brands*
5. *How Long Does Clock Production Actually Take?*

**第 3 篇特别重要**——搜这个问题的人带着疑虑，正面回答能成交；回避他就去问别家。

---

## 页面管理 `/admin/pages`

改 About、Factory、Quality、Certification 这些固定页面。

正文支持 HTML，也支持 `<h2>` `<h3>` `<ul>` `<table>` 等标签。

**这是采购决策页，不是博客**——写的时候回答买家关心的问题，不要写行业新闻和泛科普。

---

# 第三部分：常见问题

## 部署类

**页面报错 "D1 binding DB is not configured"**
Settings → Functions → Bindings 没加 `DB`。加上并重新部署。

**图片上传报 503**
R2 没绑。`wrangler.toml` 里取消注释 `[[r2_buckets]]`，然后在 Pages 的 Functions 里绑定 `MEDIA_BUCKET`。

**构建失败报 lock 文件不同步**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix lockfile"
```

**改了代码但线上没变**
检查 Cloudflare 的部署记录。如果 Build command 填的不是 `npx @cloudflare/next-on-pages`，代码不会重新构建。

**环境变量加了但不生效**
必须**重新部署**。Settings → Deployments → Retry deployment。

## 后台操作类

**忘记密码**
两个办法：
1. 改环境变量 `ADMIN_PASSWORD`，然后在 D1 Studio 执行：
   ```sql
   DELETE FROM sessions;
   ```
2. 或者直接执行 `DELETE FROM users;`，下次访问会用环境变量重建账号

**产品不显示在前台**
检查状态是不是「草稿」。草稿只有你能看到。

**分类页打开 404**
分类 ID 和产品里的 category 字段对不上。检查产品编辑页第一屏的分类下拉框。

**图片显示裂图**
检查 `wrangler.toml` 里 R2 是否绑定，以及 Pages Functions 里的 `MEDIA_BUCKET`。

**询盘收到了但没收到邮件**
D1 里的数据是完整的，只是邮件没发出来。检查：
1. `RESEND_API_KEY` 和 `INBOX_EMAIL` 都配了吗
2. Resend 域名状态是 Verified 吗
3. Cloudflare Pages → Logs → Functions，看有没有报错

## 数据类

**怎么备份**
每月在 D1 Studio 里导出 SQL。或者用命令：
```bash
npx wrangler d1 export badoudao --remote --output backup-2026-10.sql
```

**能导出 CSV 给客户吗**
询盘管理页目前没有导出按钮。用 D1 Studio 查询后手动复制，或者直接加一个导出功能（需要改代码）。

**能不能多人协作**
当前设计是单管理员。数据库支持多用户（`users` 表），界面上的成员管理还没做。如果你需要，告诉我我加上。

---

# 第四部分：上线后待办

**必做**（上线第一周）

- [ ] 改掉 `ADMIN_PASSWORD`
- [ ] 填真实的产品数据（现在是示例）
- [ ] 上传产品真实图片
- [ ] 修改系统设置里的真实联系方式
- [ ] **提交表单测试，确认收到邮件**
- [ ] Search Console 提交 `sitemap.xml`

**建议做**（上线第一个月）

- [ ] 绑自定义域名，然后改 3 处：`SITE_URL` 环境变量、设置页里的 `siteUrl`、`public/robots.txt`
- [ ] 写 3 篇博客（上面列的优先级 1/2/3）
- [ ] 补齐内容页正文（工厂、质量、认证）
- [ ] 把缺图片和缺参数的产品补全

**关键提醒**

**第一个月不要用流量增长做 KPI。** 石英钟是小众品类，搜索量本来就小。用**询盘数**衡量，排名和流量都是辅助指标。

每月的核心动作只有一个：**把产品数据做扎实，把该写的文章写完**。SEO 需要时间，3 个月能见效，但前提是这三个月内容要够。