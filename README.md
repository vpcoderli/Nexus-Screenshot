# Nexus 竞品分析专家

> 🎯 基于大语言模型的智能竞品情报分析工具

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/OpenAI_Compatible-✓-brightgreen.svg" alt="OpenAI Compatible">
</p>

## ✨ 功能特性

- 🤖 **大模型驱动** - 接入大语言模型进行深度竞品分析
- 🔌 **多模型支持** - 兼容 OpenAI、Ollama、LM Studio 等 OpenAI 协议的模型服务
- 📊 **COMPETE 分析协议** - 结构化的6步分析流程
- 📋 **历史报告管理** - 保存、查看、删除历史分析报告
- 📄 **PDF 导出** - 一键导出专业格式的 PDF 报告
- 🎨 **现代 UI** - 精美的暗色主题界面，支持响应式布局

## 🖼️ 界面预览

![Nexus Screenshot](./docs/screenshot.png)

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- 本地运行的大模型服务（Ollama/LM Studio）或 OpenAI API Key

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/your-username/nexus-competitive-analysis.git
cd nexus-competitive-analysis

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

启动后访问 http://localhost:3000

### 配置模型

1. 打开应用后，点击导航栏的「⚙️ 模型管理」
2. 添加你的模型配置：
   - **Ollama**: 默认地址 `http://localhost:11434/v1`
   - **LM Studio**: 默认地址 `http://localhost:1234/v1`
   - **OpenAI**: 地址 `https://api.openai.com/v1`，需要填写 API Key
3. 点击「测试」验证连接
4. 点击「设为活动」激活该模型

## 📦 项目结构

```
nexus-competitive-analysis/
├── client/                 # 前端代码
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   └── app.js             # 前端逻辑
├── server/                 # 后端代码
│   ├── index.js           # 服务器入口
│   └── routes/            # API 路由
│       ├── models.js      # 模型管理 API
│       ├── analysis.js    # 分析 API
│       └── reports.js     # 报告管理 API
├── data/                   # 数据存储目录
│   ├── models.json        # 模型配置
│   └── reports/           # 分析报告存储
├── public/                 # 静态资源
├── package.json           # 项目配置
├── vite.config.js         # Vite 配置
└── README.md              # 项目说明
```

## 🔧 API 接口

### 模型管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/models` | 获取所有模型配置 |
| POST | `/api/models` | 添加新模型 |
| PUT | `/api/models/:id` | 更新模型配置 |
| DELETE | `/api/models/:id` | 删除模型 |
| POST | `/api/models/active/:id` | 设置活动模型 |
| POST | `/api/models/test/:id` | 测试模型连接 |

### 分析

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/analysis/start` | 开始竞品分析 |
| POST | `/api/analysis/stream` | 流式分析（SSE） |

### 报告管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/reports` | 获取所有报告列表 |
| GET | `/api/reports/:id` | 获取单个报告详情 |
| DELETE | `/api/reports/:id` | 删除报告 |
| GET | `/api/reports/:id/export` | 导出报告 HTML |

## 🤖 支持的模型

### Ollama

```bash
# 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 拉取推荐模型
ollama pull qwen2.5:7b

# 启动服务
ollama serve
```

### LM Studio

1. 下载 [LM Studio](https://lmstudio.ai/)
2. 下载你喜欢的模型
3. 启动本地服务器（默认端口 1234）

### OpenAI

1. 获取 [OpenAI API Key](https://platform.openai.com/api-keys)
2. 在模型管理中配置 API Key

## 📊 COMPETE 分析协议

Nexus 采用 COMPETE 六步分析法：

| 步骤 | 英文 | 中文 | 说明 |
|------|------|------|------|
| C | Context | 领域锁定 | 选择分析领域（金融/医疗/教育/法律） |
| O | Objective | 目标输入 | 定义竞品、目的、地区等 |
| M | Mine | 情报采集 | 系统性收集竞品信息 |
| P | Probe | 深度分析 | 多维对比、SWOT、威胁评估 |
| E | Extract | 洞察萃取 | 提炼核心发现和战略建议 |
| T | Emit | 报告输出 | 生成结构化分析报告 |

## 🔒 数据安全

- 所有数据存储在本地 `data/` 目录
- 模型配置和报告以 JSON 格式保存
- 支持完全本地部署，数据不外泄

## 🛠️ 开发

```bash
# 开发模式（前后端同时启动）
npm run dev

# 仅启动前端
npm run client

# 仅启动后端
npm run server

# 构建生产版本
npm run build

# 生产模式运行
npm start
```

## 📝 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系

如有问题或建议，请提交 Issue。

---

> **Nexus 印记：洞察铸就胜势**

