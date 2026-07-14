# 🔒 安全功能说明 / Security Features

## 功能概述 / Overview

为了增强网站安全性，我们实施了以下两项安全功能：

1. **隐藏登录按钮** - 默认情况下，导航栏中的管理员登录按钮已隐藏
2. **网址直接访问** - 管理员可以通过特定网址直接访问后台

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

## 安全建议 / Security Recommendations

### 最佳实践 / Best Practices

1. **保持登录按钮隐藏**
   - 默认设置已隐藏，建议保持
   - 减少被发现的风险

2. **使用强密码**
   - 修改默认密码 `bmbccadmin123`
   - 使用包含字母、数字、符号的复杂密码
   - 定期更换密码

3. **记住访问网址**
   - 将 `yoursite.com/#/admin` 加入书签
   - 不要分享给非管理员人员

4. **及时登出**
   - 完成管理后点击"安全退出后台"
   - 避免在公共电脑上保持登录状态

### 密码安全 / Password Security

修改密码步骤：
1. 访问 `yoursite.com/#/admin`
2. 输入当前密码登录
3. 进入 **基本设置 & 配色**
4. 找到 **修改后台管理密码** 字段
5. 输入新密码并保存

**重要提醒**：
- 密码保存在浏览器本地存储中
- 清除浏览器数据会重置为默认密码
- 建议使用 JSON 备份功能定期备份数据

## 故障排除 / Troubleshooting

### 无法访问后台 / Cannot Access Admin

**问题**：输入 `#/admin` 后没有反应

**解决方案**：
1. 确认网址格式正确：`https://yoursite.com/#/admin`
2. 清除浏览器缓存后重试
3. 检查是否被浏览器扩展阻止
4. 尝试使用无痕/隐私模式

### 登录后立即退出 / Logged Out Immediately

**问题**：登录后刷新页面就退出

**原因**：浏览器本地存储被清除

**解决方案**：
1. 检查浏览器设置，确保允许本地存储
2. 不要使用"退出时清除数据"功能
3. 将网站添加到浏览器白名单

### 忘记密码 / Forgot Password

**问题**：忘记了管理员密码

**解决方案**：
1. 在登录页面点击"重置密码"（如果有）
2. 或清除浏览器本地存储（会重置为默认密码 `bmbccadmin123`）
3. 重新登录后立即修改新密码

## 技术说明 / Technical Details

### 数据存储 / Data Storage
- 登录按钮状态：`data.settings.showLoginButton`
- 存储位置：浏览器 LocalStorage
- 数据类型：Boolean (true/false)

### 网址检测 / URL Detection
```javascript
// 检测网址中的 admin 标识
const hash = window.location.hash;      // #/admin
const pathname = window.location.pathname; // /admin

if (hash === '#/admin' || hash === '#admin' || pathname.endsWith('/admin')) {
  setActiveTab('admin');
  // 清理网址
  window.history.replaceState(null, '', window.location.pathname);
}
```

### 按钮显示逻辑 / Button Visibility Logic
```javascript
// 显示条件：设置开启 OR 已登录
{(data.settings.showLoginButton || isAdminLoggedIn) && (
  <AdminButton />
)}
```

## 更新日志 / Changelog

**2026-07-14**
- ✅ 添加隐藏登录按钮功能
- ✅ 添加网址直接访问功能
- ✅ 默认隐藏登录按钮
- ✅ 支持桌面、移动、页脚三处同步控制
- ✅ 已登录用户始终可见后台按钮

---

**如有问题或建议，请联系网站管理员。**

**For issues or suggestions, please contact the website administrator.**
