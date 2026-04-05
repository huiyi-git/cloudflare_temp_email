# 新增功能说明

## 1. 批量注册账号功能

### API 端点
```
POST /admin/batch_create_addresses
```

### 请求参数
```json
{
  "count": 10,              // 创建数量（1-100）
  "prefix": "user",         // 前缀（可选）
  "domain": "cslwd.us.ci",  // 域名
  "enablePrefix": false,    // 是否启用系统前缀
  "enableRandomSubdomain": false  // 是否启用随机子域名
}
```

### 响应示例
```json
{
  "success": 10,
  "failed": 0,
  "results": [
    {
      "id": 1,
      "name": "usera1b2c3d4@cslwd.us.ci",
      "jwt": "eyJhbGc..."
    }
  ],
  "errors": []
}
```

### 使用方法
1. 登录管理后台
2. 调用 API 或在前端添加批量创建界面
3. 生成的邮箱地址会自动保存到数据库

## 2. API 代理功能

### 代理地址
```
https://proxy.cslwd.us.ci
```

### 功能特性
- ✅ 隐藏真实 API 地址
- ✅ CORS 跨域支持
- ✅ 速率限制（每分钟 60 次请求）
- ✅ IP 黑名单支持
- ✅ 自动转发所有请求到后端

### 使用方法

**前端配置：**
将前端的 API 地址从：
```
https://api.cslwd.us.ci
```
改为：
```
https://proxy.cslwd.us.ci
```

**环境变量配置：**
```bash
# 前端 .env 文件
VITE_API_BASE=https://proxy.cslwd.us.ci
```

### 速率限制配置
在 `api-proxy/wrangler.toml` 中修改：
```toml
RATE_LIMIT_PER_MINUTE = 60  # 每分钟最多请求数
```

### 允许的来源配置
```toml
ALLOWED_ORIGINS = [
  "https://temp-email-1ki.pages.dev",
  "https://mail.cslwd.us.ci"
]
```

## 部署说明

### 手动部署
```bash
# 部署主 Worker
cd worker
wrangler deploy

# 部署 API 代理
cd ../api-proxy
npm install
wrangler deploy

# 部署前端
cd ../frontend
npm install
npm run build
wrangler pages deploy dist --project-name=temp-email-1ki
```

### 自动部署
推送代码到 GitHub 后自动部署：
```bash
git add .
git commit -m "Add batch registration and API proxy"
git push
```

## 配置自定义域名

### API 代理域名
1. 访问 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择 `temp_email_api_proxy`
4. 添加自定义域名：`proxy.cslwd.us.ci`

### 更新前端配置
修改 `frontend/.env.production`：
```
VITE_API_BASE=https://proxy.cslwd.us.ci
```

重新构建并部署前端。

## 安全建议

1. **定期更换 API Token**
2. **监控速率限制日志**
3. **配置 IP 黑名单**（如发现滥用）
4. **使用 Cloudflare WAF**（企业版功能）
5. **定期备份数据库**

## 故障排查

### 批量注册失败
- 检查数据库连接
- 检查域名配置是否正确
- 查看 Worker 日志：`wrangler tail`

### API 代理 502 错误
- 检查后端 API 是否正常
- 检查 `BACKEND_API` 配置是否正确
- 查看代理日志：`wrangler tail temp_email_api_proxy`

### CORS 错误
- 检查 `ALLOWED_ORIGINS` 配置
- 确认前端域名在允许列表中
