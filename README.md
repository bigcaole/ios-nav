# MyNavSite PRO

一款保持 iOS 风格交互体验的导航站点（桌面 + 移动端），支持分类、图标拖拽排序、Dock 快捷栏、私有分类、管理员后台与安全策略。

## 功能特性
- iOS 风格界面与交互（拖拽排序、Dock、卡片视图）
- 分类与图标管理（新增、编辑、删除、排序）
- Dock 快捷栏（固定数量，拖拽排序）
- 访客公开访问（支持 /:username 公共主页）
- 管理后台（邀请码、黑名单、登录记录、安全策略）
- 2FA / TOTP 管理员绑定
- PWA / Service Worker 缓存

## 快速开始（Docker Compose）

```bash
# 1) 克隆并进入目录
# 2) 准备 .env
cp .env.example .env
# 修改 DATABASE_URL/JWT_SECRET/ADMIN_USERNAME/ADMIN_PASSWORD

# 3) 启动
docker compose up -d --build
```

默认端口：
- 主站：`http://localhost:3000`
- 管理后台：`http://localhost:3001`

## 使用 GHCR 镜像

```bash
docker run -d \
  --name mynavsite-pro \
  -p 3000:3000 -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/mynavsite" \
  -e JWT_SECRET="replace-with-a-very-long-random-string" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="change-me-now" \
  -e ADMIN_PORT=3001 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -v /data/mynavsite/uploads:/app/public/uploads \
  -v /data/mynavsite/icons:/app/public/icons \
  ghcr.io/bigcaole/mynavsite-pro:latest
```

> 建议将 `uploads` 与 `icons` 做持久化挂载。

## 环境变量（Docker / 生产环境）

### 必填
| 变量 | 说明 | 示例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 签名密钥（建议 32+ 字符随机串） | `a-very-long-random-secret` |
| `ADMIN_USERNAME` | 初始管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 初始管理员密码 | `StrongPass!123` |

### 可选（端口与运行模式）
| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3000` | 主站服务端口 |
| `ADMIN_PORT` | `3001` | 管理后台端口 |
| `NODE_ENV` | `production` | 运行环境 |

### 可选（管理员安全）
| 变量 | 默认值 | 说明 |
|---|---|---|
| `ADMIN_FORCE_UPDATE` | `false` | 启动时强制用 `ADMIN_USERNAME/ADMIN_PASSWORD` 更新管理员账户（一次性使用后建议关掉） |
| `ADMIN_TOTP_RESET` | `false` | 启动时清除管理员 TOTP（一次性使用后建议关掉） |

### 可选（注册安全 - Cloudflare Turnstile）
| 变量 | 默认值 | 说明 |
|---|---|---|
| `TURNSTILE_ENABLED` | `false` | 是否启用 Turnstile 校验 |
| `TURNSTILE_SITE_KEY` | 空 | Turnstile 前端 Site Key |
| `TURNSTILE_SECRET_KEY` | 空 | Turnstile 后端 Secret |

### 可选（邮件备份）
| 变量 | 默认值 | 说明 |
|---|---|---|
| `BACKUP_EMAIL_ENABLED` | `false` | 是否启用自动邮件备份 |
| `BACKUP_EMAIL_TO` | 空 | 收件人邮箱 |
| `BACKUP_EMAIL_FROM` | 空 | 发件人邮箱（默认取 `SMTP_USER`） |
| `BACKUP_EMAIL_HOUR` | `3` | 备份发送小时（0-23） |
| `BACKUP_EMAIL_MINUTE` | `0` | 备份发送分钟（0-59） |
| `SMTP_HOST` | 空 | SMTP 地址 |
| `SMTP_PORT` | 空 | SMTP 端口（465 通常为 SSL） |
| `SMTP_USER` | 空 | SMTP 用户名 |
| `SMTP_PASS` | 空 | SMTP 密码 |

## 管理后台说明
- 默认管理员账号来自 `ADMIN_USERNAME/ADMIN_PASSWORD`
- 首次登录需绑定 TOTP
- 管理后台入口：`http://your-host:ADMIN_PORT/admin`

## 目录结构
- `server.js`：主后端入口
- `public/`：前端静态资源
- `public/uploads`：用户上传
- `public/icons`：站点图标缓存
- `.github/workflows/docker-image.yml`：自动构建镜像

## 开发与运维
- 详细部署说明可参考：`DEPLOYMENT_GUIDE.md`
- 管理后台使用说明：`ADMIN_GUIDE.md`

## License
Private / Internal

<!-- workflow trigger: 2026-03-14T22:48:31Z -->

<!-- workflow trigger: 2026-03-14T23:53:58Z -->
