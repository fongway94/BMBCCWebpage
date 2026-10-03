# 🏛️ 场地租借申请 / Venue Booking

教会场地（雅比斯副堂、教会大堂、会议室、智慧谷、恩溢家、卡拉房、爱邻社区关怀中心…）
的线上借用申请系统。它取代原本的 Google Form，并加入**即时场地使用情况**、**重复申请阻挡**、
以及**后台审核**功能。

The venue booking system replaces the Google Form with an in-site bilingual
application form, live availability checking, double-booking prevention and an
admin review console.

---

## 1. 弟兄姐妹怎么用 / How members use it

1. 打开网站 → **资源 / Resources → 场地租借 / Venue Booking**
2. 阅读场地申请规则（与原本 Google Form 相同）
3. 选择日期与场地后，系统会显示该场地当天的时段：
   - 🔴 **已被批准** — 无法申请（避免重复使用）
   - 🟡 **已有申请待审核** — 仍可申请，但需勾选确认，同工按先后次序处理
   - ⚪ **可申请** — 点击即选取开始时间
4. 填写表格（姓名、电话、场地、用途、原因、冷气、日期、时间、时长、人数、
   已通知的服侍负责人、同意规则）
5. 提交后获得**申请编号**（例如 `VB-20261015-7K3M`），画面会提供
   「转发给教会同工 (WhatsApp)」按钮，方便直接把申请传给 018-4663128。

申请至少在**两天前**提交；同工审核后会与申请人联系确认。

---

## 2. 同工怎么管理 / How staff manage it

Admin Console → **场地租借管理 / Venue Booking Manager**

| 分页 | 功能 |
|------|------|
| **申请记录 / Applications** | 待审核数量统计、按状态/场地/日期/关键字筛选、查看详情（原因、人数、已通知负责人）、批准、拒绝（可填原因）、标记完成、重新审核、删除、WhatsApp 或致电申请人、复制申请详情 |
| **场地与规则设置 / Venue & Rules** | 启用/停用功能、提前天数、开放/关闭时间、时段间隔、最长时长、可借时长选项、联络电话、WhatsApp 号码、页面文案（中英）、可借场地清单、申请规则、服侍负责人清单 |

approve（批准）时若同时段已有另一份**已批准**的申请，系统会跳出警告，必须明确选择
「强制批准」才会通过，避免不小心重复安排场地。

侧边栏「场地租借管理」旁会出现**待审核数量**的黄色标记，提醒同工有新申请。

---

## 3. 一次性设置（Cloudflare）/ One-time setup

申请记录储存在 Cloudflare KV，绑定名称为 `BOOKINGS`。

1. Cloudflare Dashboard → **Workers & Pages → KV → Create a namespace**（例如 `bmbcc-bookings`）
2. 绑定到 Pages 项目：
   - Dashboard：**Workers & Pages → bmbcc-webpage → Settings → Functions → KV namespace bindings**
     - Variable name: `BOOKINGS` → 选择刚建立的 namespace
   - 或在 `wrangler.toml` 取消注释 `[[kv_namespaces]] binding = "BOOKINGS"` 并填入真实 id
3. 重新部署（Settings → Deployments → Retry deployment，或 push 一次）

设置完成后，`/bookings` 与 `/functions/bookings` 两个 API 路由即可使用。

**如果还没设置：** 网站不会坏。公开页面仍会显示规则与表格，但会提示线上申请系统暂时无法连接，
并提供 WhatsApp 直接提交的替代按钮；后台的申请记录分页则会显示设置说明。

> ⚠️ 这个功能需要 **Cloudflare Pages Functions**。若网站改回纯静态托管（例如 GitHub Pages），
> 申请系统不会运作，会员会看到上述 WhatsApp 替代方案。

### 本地完整测试 / Full-stack local testing

```bash
cp .dev.vars.example .dev.vars   # 设定本机 ADMIN_PASSWORD 与 JWT_SECRET
npm run dev:cf                   # 建立 dist 并在 http://localhost:8788 启动 Cloudflare 环境
```

`npm run dev:cf` 会以 `--kv=BOOKINGS` 建立本机 KV，不需真实 namespace id。
（只跑 `npm run dev` 时没有 Functions，申请系统会显示离线替代方案。）

---

## 4. API 一览 / API reference

`functions/bookings.ts`

| Method | Route | Auth | 说明 |
|--------|-------|------|------|
| `GET` | `/bookings?from=&to=` 或 `?date=` | 公开 | 传回**时段**（场地、日期、开始时间、时长、状态），不含任何个人资料 |
| `POST` | `/bookings` | 公开 | 建立申请；已批准的时段回传 `409 slot_taken`；蜜罐栏位与速率限制防滥用 |
| `GET` | `/bookings?scope=admin` | 管理员 cookie | 完整申请记录（含姓名/电话/原因） |
| `PUT` | `/bookings` | 管理员 cookie | `{ id, action: approve \| reject \| complete \| cancel \| reopen \| note, note?, force? }` |
| `DELETE` | `/bookings?id=` | 管理员 cookie | 永久删除一笔记录 |

管理员验证沿用 `/auth` 的 `bmbcc_admin` JWT cookie。

---

## 5. 相关资料 / Where things live

| 档案 | 用途 |
|------|------|
| `src/components/VenueBookingPage.jsx` | 公开申请页面（规则、时段表、表单、成功画面） |
| `src/components/VenueBookingAdmin.jsx` | 后台审核与设置界面 |
| `src/lib/bookingCore.js` | 共用纯逻辑（时间、冲突、验证、编号、WhatsApp 讯息） |
| `functions/bookings.ts` | Cloudflare Pages Function（API + KV 储存） |
| `functions/functions/bookings.ts` | `/functions/bookings` 兼容路由 |
| `src/data/initialData.js` → `venueBooking` | 所有中英文文案与设定（可由后台编辑） |
| `tests/bookingCore.test.mjs` | 纯逻辑单元测试 |
| `tests/bookingsApi.test.mjs` | API 整合测试（含审核流程、冲突阻挡、权限） |
| `tests/bookingForm.test.mjs` | 真实 DOM 互动测试（填表 → 提交 → 编号） |
| `tests/uiSmoke.test.mjs` | 组件渲染冒烟测试 |

---

## 6. 注意事项 / Notes

- **隐私**：公开 API 只回传时段，不回传申请人姓名、电话或电邮。
- **避免重复使用**：只有「已批准」的申请会阻挡新申请；「待审核」的申请会警告但仍可提交，
  由同工决定（批准时会再次检查冲突）。
- **时区**：所有日期以马来西亚时间（UTC+8）计算。
- **翻译**：所有文字都是 `{ zh, en }` 格式，跟随网站右上角的语言切换，并可在后台修改。
- **英文名称**：`恩溢家` 的英文暂译为 "Grace Overflow House"，`雅比斯副堂` 使用 Google Form 的
  "Jabez Hall"。如教会另有官方英文名，可在后台「场地与规则设置」直接修改。
