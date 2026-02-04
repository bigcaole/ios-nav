# 果味导航 - 部署与运维指南

> 适用对象：运维 / 管理员  
> 目标：将项目稳定部署到服务器并可持续运维

---

## 1. 架构说明

- 主站服务：`app`（默认端口 `3000`）
- 管理后台：同进程独立端口（默认 `3001`）
- 数据库：PostgreSQL（外部现有库或容器内库均可）
- 静态资源：`public/` 目录（含图标、上传文件等）

---

## 2. 部署前准备

## 2.1 服务器要求
- Linux x86_64
- Docker + Docker Compose
- 可访问 PostgreSQL

## 2.2 目录与权限
- 代码目录：建议 `/opt/mynavsite`
- 日志与持久化目录需可写

---

## 3. 关键环境变量（必配）

| 变量名 | 示例 | 作用 |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | 数据库连接 |
| `JWT_SECRET` | `a-very-long-random-secret` | 会话签名密钥 |
| `ADMIN_USERNAME` | `admin` | 默认管理员账号 |
| `ADMIN_PASSWORD` | `StrongPass!123` | 默认管理员密码 |
| `ADMIN_PORT` | `3001` | 管理员面板端口 |
| `TURNSTILE_ENABLED` | `true/false` | 是否启用 Turnstile |
| `TURNSTILE_SITE_KEY` | `xxxx` | Turnstile 前端 Key |
| `TURNSTILE_SECRET_KEY` | `xxxx` | Turnstile 后端 Secret |
| `REGISTER_CODE` | 留空或固定码 | 兼容项（建议使用邀请码机制） |

> 建议：所有敏感变量仅放在部署平台环境变量中，不写入代码仓库。

---

## 4. Docker 部署步骤

1. 进入项目目录  
   `cd /opt/mynavsite`
2. 配置环境变量（`.env` 或平台环境配置）
3. 启动服务  
   `docker compose up -d --build`
4. 检查容器状态  
   `docker compose ps`
5. 查看日志  
   `docker compose logs app --tail 200`

---

## 5. 反向代理建议

- 主站域名指向 `3000`
- 管理后台域名（建议独立）指向 `3001`
- 启用 HTTPS 与 HSTS
- 对后台路径增加 IP 白名单（可选）

---

## 6. 备份与恢复

## 6.1 应用内备份（推荐）
- 管理后台导出全量 JSON
- 新环境导入后可直接使用

## 6.2 数据库层备份
- 使用 1Panel 或 `pg_dump` 定期备份
- 备份策略：每日增量 + 每周全量

---

## 7. 升级流程（无停机建议）

1. 先导出一份应用全量备份
2. 拉取新代码
3. 执行 `docker compose up -d --build`
4. 验证登录、图标加载、管理员后台
5. 异常时回滚到上一镜像

---

## 8. 安全加固清单

- 启用管理员 TOTP
- 使用强密码与长 `JWT_SECRET`
- 限制数据库公网访问
- 开启黑名单与登录失败自动封禁
- 定期审计管理员操作日志

---

## 9. 常见问题

### 9.1 访问正常但登录失败
- 检查 Cookie 域与 SameSite 配置
- 检查反代是否转发 `X-Forwarded-*`

### 9.2 图标显示为首字母
- 外网图标源不可达或站点无 favicon
- 检查服务器 DNS 与网络策略

### 9.3 管理后台打不开
- 检查 `ADMIN_PORT` 映射与防火墙
- 检查容器日志是否启动失败
