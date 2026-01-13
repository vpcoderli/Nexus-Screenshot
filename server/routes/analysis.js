import express from 'express';
import fs from 'fs';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

const reportsDir = join(__dirname, '../../data/reports');
const configPath = join(__dirname, '../../data/models.json');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Load model config
function loadModelConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch (error) {
        console.error('Error loading model config:', error);
    }
    return { models: [], activeModelId: null };
}

// Get active model
function getActiveModel() {
    const config = loadModelConfig();
    if (!config.activeModelId) {
        throw new Error('请先在模型管理中选择一个活动模型');
    }
    const model = config.models.find(m => m.id === config.activeModelId);
    if (!model) {
        throw new Error('未找到活动模型配置');
    }
    return model;
}

// Build analysis prompt based on the 竞品分析.md specification
function buildAnalysisPrompt(data) {
    const domainNames = {
        finance: '金融科技',
        healthcare: '医疗健康',
        education: '教育科技',
        legal: '法律服务'
    };
    const purposeNames = {
        market_entry: '市场进入',
        defense: '竞争防御',
        optimization: '产品优化',
        investment: '投资研究'
    };
    const regionNames = {
        china: '中国大陆',
        global: '全球市场',
        asia: '亚太地区'
    };

    return `你是 Nexus，一位全球顶尖的竞品情报分析大师。你融合了麦肯锡战略顾问的商业洞察、高盛分析师的数据严谨性、以及顶级产品经理的用户思维。

## 分析任务

**分析领域**: ${domainNames[data.domain] || data.domain}
**分析目的**: ${purposeNames[data.purpose] || data.purpose}
**目标市场**: ${regionNames[data.region] || data.region}
**竞品列表**: ${data.competitors.join('、')}
**您的产品/公司**: ${data.company || '未指定'}
${data.additionalInfo ? `**补充信息**: ${data.additionalInfo}` : ''}

## 请按照以下结构输出分析报告:

### 一、核心发现
列出3-5条最重要的分析结论，每条不超过2句话，按影响程度排序。

### 二、多维对比分析
对每个竞品进行多维度评估，包括:
- 核心功能
- 用户体验  
- 定价竞争力
- 技术壁垒
- 品牌认知
- 增长势头

使用1-5星评级（⭐）进行量化评估。

### 三、SWOT分析
针对主要竞品，分析其:
- **优势 (Strengths)**: 3-5点
- **劣势 (Weaknesses)**: 3-5点
- **机会 (Opportunities)**: 3-5点
- **威胁 (Threats)**: 3-5点

### 四、威胁等级评估
| 竞品 | 威胁等级 | 核心威胁来源 | 防御优先级 |
对每个竞品评估威胁等级（高🔴/中🟡/低🟢）

### 五、战略建议
- **进攻策略**: 具体可执行的进攻方向
- **防御策略**: 如何巩固现有优势
- **差异化机会**: 蓝海方向建议

### 六、风险提示
列出分析过程中的信息缺口、假设条件、潜在偏差

## 输出要求
1. 所有数据标注获取时间或标记为"推断数据"
2. 关键结论附注信息来源
3. 保持客观中立，呈现正反两面
4. 建议必须具体、可落地，避免空泛表述
5. 使用 Markdown 格式输出`;
}

// Start analysis
router.post('/start', async (req, res) => {
    const { domain, competitors, company, purpose, region, additionalInfo, reportFormat } = req.body;

    // Validate required fields
    if (!domain || !competitors?.length || !purpose) {
        return res.status(400).json({ error: '缺少必填字段' });
    }

    try {
        const model = getActiveModel();
        const reportId = uuidv4();
        const startTime = Date.now();

        // Create OpenAI client with custom baseURL
        const client = new OpenAI({
            baseURL: model.baseUrl,
            apiKey: model.apiKey || 'no-key',
            timeout: 600000 // 10 minutes timeout for analysis
        });

        // Build prompt
        const prompt = buildAnalysisPrompt({
            domain, competitors, company, purpose, region, additionalInfo
        });

        // Call LLM
        const response = await client.chat.completions.create({
            model: model.model,
            messages: [
                { role: 'system', content: '你是 Nexus，专业的竞品情报分析专家。请务必使用中文回答，并严格按照 Markdown 格式输出。' },
                { role: 'user', content: prompt }
            ],
            // temperature: 0.7, // Removed specifically for reasoning models which might prefer default
            max_tokens: 8000 // Increased for deep analysis
        });

        const analysisContent = response.choices[0]?.message?.content || '分析失败';
        const endTime = Date.now();

        // Create report object
        const report = {
            id: reportId,
            createdAt: new Date().toISOString(),
            domain,
            competitors,
            company,
            purpose,
            region,
            additionalInfo,
            reportFormat,
            model: {
                id: model.id,
                name: model.name,
                modelName: model.model
            },
            analysisTime: endTime - startTime,
            content: analysisContent,
            tokens: response.usage
        };

        // Save report
        const reportPath = join(reportsDir, `${reportId}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        res.json(report);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// Stream analysis (for real-time updates)
router.post('/stream', async (req, res) => {
    const { domain, competitors, company, purpose, region, additionalInfo } = req.body;

    try {
        const model = getActiveModel();

        const client = new OpenAI({
            baseURL: model.baseUrl,
            apiKey: model.apiKey || 'no-key'
        });

        const prompt = buildAnalysisPrompt({
            domain, competitors, company, purpose, region, additionalInfo
        });

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await client.chat.completions.create({
            model: model.model,
            messages: [
                { role: 'system', content: '你是 Nexus，专业的竞品情报分析专家。请用中文回答，使用 Markdown 格式。' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            stream: true
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

export default router;
