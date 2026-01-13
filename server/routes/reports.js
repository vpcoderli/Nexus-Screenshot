import express from 'express';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

const reportsDir = join(__dirname, '../../data/reports');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Get all reports (list)
router.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
        const reports = files.map(file => {
            const content = fs.readFileSync(join(reportsDir, file), 'utf-8');
            const report = JSON.parse(content);
            // Return summary only for list
            return {
                id: report.id,
                createdAt: report.createdAt,
                domain: report.domain,
                competitors: report.competitors,
                company: report.company,
                purpose: report.purpose,
                model: report.model,
                analysisTime: report.analysisTime
            };
        });

        // Sort by date, newest first
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(reports);
    } catch (error) {
        console.error('Error loading reports:', error);
        res.json([]);
    }
});

// Get single report
router.get('/:id', (req, res) => {
    const reportPath = join(reportsDir, `${req.params.id}.json`);

    if (!fs.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Report not found' });
    }

    try {
        const content = fs.readFileSync(reportPath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (error) {
        res.status(500).json({ error: 'Error reading report' });
    }
});

// Delete report
router.delete('/:id', (req, res) => {
    const reportPath = join(reportsDir, `${req.params.id}.json`);

    if (!fs.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Report not found' });
    }

    try {
        fs.unlinkSync(reportPath);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting report' });
    }
});

// Export report as HTML (for PDF conversion on client)
router.get('/:id/export', (req, res) => {
    const reportPath = join(reportsDir, `${req.params.id}.json`);

    if (!fs.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Report not found' });
    }

    try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

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

        const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>竞品分析报告 - ${report.competitors.join('、')}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.8; 
            color: #1a1a2e; 
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 { font-size: 28px; margin-bottom: 20px; color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        h2 { font-size: 20px; margin: 30px 0 15px; color: #4f46e5; }
        h3 { font-size: 16px; margin: 20px 0 10px; color: #7c3aed; }
        p { margin: 10px 0; }
        ul, ol { margin: 10px 0 10px 20px; }
        li { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .meta { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .meta p { margin: 5px 0; color: #64748b; }
        .meta strong { color: #1a1a2e; }
        .content { white-space: pre-wrap; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #94a3b8; font-size: 12px; text-align: center; }
        code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        blockquote { border-left: 4px solid #6366f1; padding-left: 15px; margin: 15px 0; color: #64748b; }
    </style>
</head>
<body>
    <h1>📊 竞品分析报告</h1>
    <div class="meta">
        <p><strong>分析领域：</strong>${domainNames[report.domain] || report.domain}</p>
        <p><strong>分析目的：</strong>${purposeNames[report.purpose] || report.purpose}</p>
        <p><strong>竞品列表：</strong>${report.competitors.join('、')}</p>
        <p><strong>您的产品：</strong>${report.company || '未指定'}</p>
        <p><strong>生成时间：</strong>${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
        <p><strong>使用模型：</strong>${report.model?.name || 'Unknown'} (${report.model?.modelName || ''})</p>
        <p><strong>分析耗时：</strong>${(report.analysisTime / 1000).toFixed(1)} 秒</p>
    </div>
    <div class="content">${report.content}</div>
    <div class="footer">
        <p>由 Nexus 竞品分析专家生成 | ${new Date().toLocaleDateString('zh-CN')}</p>
        <p>洞察铸就胜势</p>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: 'Error exporting report' });
    }
});

export default router;
