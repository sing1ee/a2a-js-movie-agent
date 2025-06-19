# Cloudflare Worker 部署指南

## 项目已成功迁移到 Hono

本项目已从 Express 迁移到 Hono 框架，现在可以部署到 Cloudflare Worker。

## 主要变更

### 1. 新增文件

- `src/a2a-hono-app.ts` - 基于 Hono 的 A2A 应用类
- `src/worker.ts` - Cloudflare Worker 入口文件
- `wrangler.toml` - Cloudflare Worker 配置文件

### 2. 依赖更新

```json
{
  "hono": "^4.8.0",
  "@hono/node-server": "^1.14.4"
}
```

### 3. 脚本更新

新增了以下脚本：
- `dev:worker` - 本地开发 Worker
- `build:worker` - 构建 Worker
- `deploy` - 部署到 Cloudflare

## 部署步骤

### 1. 安装 Wrangler

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 设置环境变量

使用 Wrangler 设置敏感环境变量：

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put TMDB_API_TOKEN
```

### 4. 配置非敏感环境变量

编辑 `wrangler.toml` 文件中的 `[vars]` 部分：

```toml
[vars]
USE_PROXY = "false"  # Cloudflare Worker 中通常不需要代理
NODE_ENV = "production"
```

### 5. 本地开发测试

```bash
bun run dev:worker
```

### 6. 部署到生产环境

```bash
bun run deploy
```

## 使用方式

### Node.js 服务器 (原有方式)

```bash
# 开发模式
bun run dev

# 生产模式
bun run build
bun run start
```

### Cloudflare Worker

```bash
# 本地开发
bun run dev:worker

# 部署
bun run deploy
```

## API 端点

无论是 Node.js 还是 Cloudflare Worker，都提供相同的端点：

- `GET /.well-known/agent.json` - Agent 信息卡片
- `POST /` - A2A 协议主端点
- `GET /health` - 健康检查

## 架构优势

### Hono 优势

1. **轻量级** - 比 Express 更小的体积
2. **性能高** - 基于 Web Standards API
3. **兼容性强** - 支持多种运行时环境
4. **TypeScript 优先** - 内置类型支持

### Cloudflare Worker 优势

1. **全球分布** - 边缘计算
2. **快速启动** - 冷启动时间极短
3. **成本效益** - 按请求计费
4. **自动扩展** - 无需配置

## 环境配置

### Node.js 环境

使用 `.env` 文件：

```env
OPENROUTER_API_KEY=your_key_here
TMDB_API_TOKEN=your_token_here
USE_PROXY=true
PROXY_URL=socks5://127.0.0.1:7890
PORT=3000
```

### Cloudflare Worker 环境

使用 `wrangler secret` 和 `wrangler.toml`：

```bash
# 设置敏感变量
wrangler secret put OPENROUTER_API_KEY
wrangler secret put TMDB_API_TOKEN
```

```toml
# wrangler.toml 中设置非敏感变量
[vars]
USE_PROXY = "false"
NODE_ENV = "production"
```

## 故障排除

### 1. 代理问题

Cloudflare Worker 环境中，建议设置 `USE_PROXY=false`，因为 Worker 已经在全球网络中运行。

### 2. 环境变量问题

确保所有必需的环境变量都已设置：
- `OPENROUTER_API_KEY`
- `TMDB_API_TOKEN`

### 3. 构建问题

如果遇到构建问题，请检查：
- 所有依赖是否已安装
- TypeScript 配置是否正确
- Wrangler 配置是否有效

## 性能监控

Cloudflare Dashboard 提供详细的性能指标：
- 请求数量
- 响应时间
- 错误率
- 内存使用

## 成本优化

Cloudflare Worker 提供免费额度：
- 每天 100,000 个请求
- 每请求 10ms CPU 时间

超出免费额度后按使用量计费，非常经济。 