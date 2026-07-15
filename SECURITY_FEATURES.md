# 🔒 安全功能说明 / Security Features

## 功能概述 / Overview

为了增强网站安全性，我们实施了以下安全功能：

1. **隐藏登录按钮** - 默认情况下，导航栏中的管理员登录按钮已隐藏
2. **网址直接访问** - 管理员可以通过特定网址直接访问后台
3. **构建时密码注入** - 管理员密码通过环境变量在构建时注入，**不再硬编码在源码中**
4. **Cloudflare Pages 边缘认证** - 真正的服务端认证，HttpOnly Cookie 会话，跨设备持久化
5. **登录尝试限制** - 连续 5 次失败锁定 15 分钟，防止暴力破解（边缘层执行）
6. **最小密码长度验证** - 客户端验证密码至少 8 位字符
7. **安全响应头** - CSP-ready, X-Frame-Options, XSS Protection 等

---

## 🌐 部署架构对比 / Deployment Architecture

| 特性 | GitHub Pages (旧) | Cloudflare Pages + Functions (新) |
|------|------------------|----------------------------------|
| **认证方式** | 纯客户端 localStorage | 边缘服务端 + HttpOnly Cookie |
| **密码存储** | 构建时注入到 JS bundle | Cloudflare 加密环境变量 |
| **会话持久** | 仅当前浏览器，清除即失效 | 跨设备/浏览器，24小时有效 |
| **暴力破解防护** | 客户端限流（可绕过） | 边缘层强制限流（不可绕过） |
| **密码修改生效** | 需重新构建部署 | 更新环境变量即时生效 |
| **CORS/CSRF** | 无防护 | SameSite=Lax, Secure, HttpOnly |

---

## 1. 隐藏登录按钮 / Hidden Login Button

### 默认设置 / Default Setting
- 登录按钮默认**隐藏**，普通访客无法看到
- 提高安全性，避免恶意尝试登录

### 显示登录按钮 / Show Login Button
如需在导航栏显示登录按钮：

1. 通过网址 `#/admin` 访问后台管理
2. 使用管理员密码登录
3. 进入 **基本设置 & 配色** (General Settings)
4. 找到 **显示登录按钮 / Show Login Button** 选项
5. 点击按钮切换显示状态
   - ✓ 登录按钮已显示 (绿色) = 导航栏可见
   - ✗ 登录按钮已隐藏 (灰色) = 导航栏隐藏

### 影响范围 / Affected Areas
此设置同时控制以下位置的登录按钮：
- ✅ 桌面导航栏 (Desktop Navbar)
- ✅ 移动端菜单 (Mobile Menu)
- ✅ 页脚导航 (Footer Navigation)

**注意**：即使按钮隐藏，已登录的管理员仍能看到"后台"按钮以便操作。

---

## 2. 网址直接访问 / Direct URL Access

### 访问方式 / Access Methods

管理员可以通过以下任一方式访问后台：

#### 方法一：使用哈希路由（推荐）
```
https://your-site.com/#/admin
```
或
```
https://your-site.com/#admin
```

#### 方法二：使用路径（需要服务器配置）
```
https://your-site.com/admin
```

### 自动检测 / Auto-Detection
当访问上述网址时，系统会：
1. 自动跳转到后台管理页面
2. 清理网址中的哈希部分
3. 显示登录界面

### 使用场景 / Use Cases

**场景 1：隐藏登录按钮时**
- 导航栏无登录入口
- 管理员记住网址 `yoursite.com/#/admin`
- 直接输入网址访问后台
- 安全性更高

**场景 2：显示登录按钮时**
- 导航栏显示登录按钮
- 可以像以前一样点击按钮访问
- 也可以使用网址直接访问
- 两种方式都可用

---

## 3. Cloudflare Pages 边缘认证系统 / Edge Authentication

### 核心优势
- **真正的服务端验证** - 密码从不暴露给客户端
- **HttpOnly Cookie 会话** - 防 XSS，自动随请求发送
- **边缘分布式执行** - 全球 300+ 数据中心，延迟极低
- **环境变量隔离** - 密码仅存在 Cloudflare 加密存储，不在代码库
- **即时生效** - 修改密码无需重新部署

### 架构流程
```
用户访问 /#/admin
    │
    ▼
React App 调用 POST /functions/auth (credentials: include)
    │
    ▼
Cloudflare Edge Function (functions/auth.ts)
    │
    ├── 验证密码 vs ADMIN_PASSWORD (环境变量)
    ├── 签发 HS256 JWT (JWT_SECRET 环境变量)
    └── 设置 HttpOnly; Secure; SameSite=Lax Cookie
    │
    ▼
后续请求自动携带 Cookie → GET /functions/auth 验证会话
```

### 部署配置

#### Cloudflare Pages Dashboard 设置
1. **Settings → Environment variables** 添加：
   | Variable | Value | Type |
   |----------|-------|------|
   | `ADMIN_PASSWORD` | `your-strong-password-min-12-chars` | **Secret** |
   | `JWT_SECRET` | `openssl rand -base64 32` output | **Secret** |

2. **Build 设置**：
   - Build command: `npm run build`
   - Output directory: `dist`
   - Root directory: (留空)

#### 自动部署
```bash
git push origin main
# Cloudflare Pages 自动检测推送 → 构建 → 部署边缘函数
```

### 密码轮换（零停机）
1. 生成新密码: `openssl rand -base64 18`
2. Cloudflare Dashboard → Pages → Settings → Environment variables
3. 更新 `ADMIN_PASSWORD` secret → **Save**
4. 自动触发重新部署（~1分钟）
5. 所有设备立即使用新密码，**无需重新构建前端**

---

## 4. 构建时密码配置 / Build-Time Password (兼容性层)

### 说明
前端构建时仍需 `VITE_ADMIN_PASSWORD` 作为**兼容性回退**（本地开发、GitHub Pages 备选），但生产环境真正生效的是 Cloudflare 边缘认证。

### 本地开发
```bash
cp .env.example .env.local
# 编辑 .env.local
VITE_ADMIN_PASSWORD=your-super-strong-password-min-12-chars
npm run dev
```

### 生成强密码
```bash
openssl rand -base64 18  # 给 VITE_ADMIN_PASSWORD 和 ADMIN_PASSWORD 用同一个
openssl rand -base64 32  # 给 JWT_SECRET
```

---

## 5. 登录安全强化 / Login Security Hardening

### 边缘层限流（不可绕过）
- 最大尝试次数：**5 次**
- 锁定时长：**15 分钟**
- 存储在边缘 KV/内存，**不依赖客户端 localStorage**
- 显式登出调用 `DELETE /functions/auth` 清除 Cookie

### 客户端最小长度检查
- 登录前检查：密码必须 ≥ 8 字符
- 防止无效请求浪费边缘配额

### 密码强度要求
- 构建时强制：≥ 12 字符
- 建议：大小写 + 数字 + 符号

---

## 6. 安全响应头 / Security Headers

通过 `public/_headers` 自动应用：

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | 防点击劫持 |
| `X-Content-Type-Options` | `nosniff` | 防 MIME 嗅探 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 限制 Referer 泄露 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 禁用敏感权限 |
| `X-XSS-Protection` | `1; mode=block` | 传统 XSS 过滤 |
| `Access-Control-Allow-Credentials` | `true` (仅 `/functions/auth*`) | 允许 Cookie 跨源 |

---

## 安全建议 / Security Recommendations

### 必须执行 / Must Do
1. **使用 Cloudflare Pages 部署** - 获得真正的服务端认证
2. **设置强密码** - `openssl rand -base64 18` 生成，同时配置 `VITE_ADMIN_PASSWORD` 和 `ADMIN_PASSWORD`
3. **生成 JWT_SECRET** - `openssl rand -base64 32`，仅在 Cloudflare 设置
4. **启用 HTTPS** - Cloudflare 自动提供，自定义域名需开启 "Always Use HTTPS"
5. **定期轮换密码** - Cloudflare Dashboard 更新 `ADMIN_PASSWORD` 即时生效

### 推荐做法 / Best Practices
1. **保持登录按钮隐藏** - 减少攻击面
2. **书签管理网址** - `https://yoursite.com/#/admin`，勿分享
3. **及时登出** - 点击"安全退出后台"清除 HttpOnly Cookie
4. **避免公共电脑** - 或使用无痕模式
5. **启用 GitHub Auto-Save（可选）** - 仅 Fine-grained PAT，最小权限

---

## 故障排除 / Troubleshooting

### 无法访问后台
| 现象 | 排查 |
|------|------|
| 404 / 空白页 | 确认 `_redirects` 有 `/* /index.html 200` |
| 登录 401 | 核对 `ADMIN_PASSWORD` 环境变量完全一致 |
| Cookie 未设置 | 检查浏览器是否阻止第三方 Cookie / 无痕模式 |
| 会话丢失 | 确认 `JWT_SECRET` 已设置且未变更 |

### 登录被锁定
- 等待 15 分钟自动解锁（边缘层计时）
- 或清除浏览器所有 Cookie / 无痕模式尝试

### 构建失败
| 错误 | 解决 |
|------|------|
| `VITE_ADMIN_PASSWORD required` | `.env.local` 或 CI/CD 设置该变量 |
| `Password < 12 chars` | 使用 `openssl rand -base64 18` 生成 |

### 本地开发 vs 生产差异
| 功能 | 本地 (`npm run dev`) | 生产 |
|------|---------------------|------|
| 认证 | localStorage 模拟 | 边缘 HttpOnly Cookie |
| 限流 | 客户端内存 | 边缘强制 |
| 密码源 | `VITE_ADMIN_PASSWORD` | `ADMIN_PASSWORD` (环境变量) |

---

## 技术细节 / Technical Details

### 边缘认证实现 (`functions/auth.ts`)
```typescript
// 关键点：
// 1. 使用 Web Crypto API (Edge 兼容) 签发/验证 HS256 JWT
// 2. HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
// 3. credentials: 'include' 确保 Cookie 双向传输
// 4. 速率限制在 Edge 执行，绕过客户端
```

### 会话验证流程
```
GET /functions/auth (credentials: include)
    │
    ▼
解析 Cookie → 验证 JWT 签名 (JWT_SECRET)
    │
    ├── 有效且未过期 → { isAdmin: true }
    └── 无效/过期 → { isAdmin: false } → 前端重定向登录
```

### 密码注入机制 (兼容层)
```javascript
// src/data/initialData.js
const ADMIN_PASSWORD = (() => {
  const pwd = import.meta.env?.VITE_ADMIN_PASSWORD;
  if (!pwd) throw new Error('[SECURITY ERROR] VITE_ADMIN_PASSWORD required!');
  if (pwd.length < 12) throw new Error('[SECURITY ERROR] Password ≥ 12 chars!');
  return pwd;
})();
```

---

## 更新日志 / Changelog

**2026-07-15 (重大更新：Cloudflare Pages 迁移)**
- ✅ 迁移至 Cloudflare Pages + Functions 边缘认证
- ✅ HttpOnly Cookie 会话，跨设备持久化
- ✅ 服务端速率限制（不可绕过）
- ✅ 密码环境变量隔离（不在代码库）
- ✅ 零停机密码轮换（更新 env var 即时生效）
- ✅ 安全响应头完整配置
- ✅ JWT HS256 签名 (Web Crypto API)
- ✅ SameSite=Lax CSRF 防护

**2026-07-15 (早期更新)**
- ✅ 移除源码硬编码默认密码
- ✅ 构建时环境变量密码注入
- ✅ 客户端登录限流 + 最小长度验证

**2026-07-14**
- ✅ 隐藏登录按钮 + 直接 URL 访问
- ✅ 默认隐藏，三处同步控制

---

## 相关文件 / Related Files

| 文件 | 说明 |
|------|------|
| `functions/auth.ts` | 边缘认证处理器 |
| `public/_headers` | 安全响应头 + CORS |
| `public/_redirects` | SPA 路由 + API 透传 |
| `wrangler.toml` | Cloudflare Pages 配置 |
| `src/App.jsx` | 前端调用 `/functions/auth` |
| `src/data/initialData.js` | 构建时密码注入 (兼容层) |
| `.env.example` | 环境变量模板 |
| `CLOUDFLARE_DEPLOYMENT.md` | 完整部署指南 |

---

**如有问题或建议，请联系网站管理员。**

**For issues or suggestions, please contact the website administrator.**