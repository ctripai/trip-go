# trip-go
TripGo AI 旅行规划项目，帮助现代“懒人”们轻松开启每一次旅程！

## 部署到 Vercel (使用 Next.js)

此项目使用 Next.js（Vercel 官方推荐的 React 框架）创建了一个简单的 API 接口示例，用于访问 DeepSeek API。

### 前提条件
- 安装 Node.js 和 npm。
- 获取 DeepSeek API 密钥：访问 [DeepSeek Platform](https://platform.deepseek.com) 注册并获取 API 密钥。
- 安装 Vercel CLI: `npm install -g vercel`

### 本地开发
1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev`
3. 访问 `http://localhost:3000` 查看首页，点击按钮测试 API。

### 部署步骤
1. 登录 Vercel: `vercel login`
2. 部署项目: `vercel`
3. 设置环境变量: `vercel env add DEEPSEEK_API_KEY` 并输入你的 DeepSeek API 密钥。
4. （可选）如需使用 ChatGPT 大模型，添加 OpenAI Key: `vercel env add OPENAI_API_KEY`，并可通过 `vercel env add OPENAI_MODEL` 设置默认模型（例如 `gpt-4`）。
5. 重新部署以应用环境变量: `vercel --prod`

### 测试 API
- 部署后，访问 `https://your-vercel-url.vercel.app/` 查看前端界面，页面上可选择模型并指定 ChatGPT 子模型（例如 `gpt-5-nano` / `gpt-4` / `gpt-4o` / `gpt-3.5-turbo`）。
- API 端点: `https://your-vercel-url.vercel.app/api/deepseek` 返回模型响应（支持 `model` 与 `openaiModel` 参数）。
