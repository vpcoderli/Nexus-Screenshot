// ===== Nexus Competitive Analysis Tool =====
// Full-stack Application with LLM Integration

const API_BASE = '/api';

class NexusApp {
    constructor() {
        this.currentStep = 1;
        this.selectedDomain = null;
        this.competitors = [];
        this.analysisData = {};
        this.currentReport = null;
        this.modelsConfig = { models: [], activeModelId: null };
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadModelsConfig();
        await this.loadHistory();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Domain selection
        document.querySelectorAll('.domain-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectDomain(e));
        });

        // Competitor input
        const competitorInput = document.getElementById('competitorInput');
        const addBtn = document.getElementById('addCompetitorBtn');

        competitorInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCompetitor();
            }
        });
        competitorInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' || e.keyCode === 13) {
                this.addCompetitor();
            }
        });
        addBtn.addEventListener('click', () => this.addCompetitor());

        // Form navigation
        document.getElementById('backToStep1').addEventListener('click', () => this.goToStep(1));
        document.getElementById('startAnalysis').addEventListener('click', () => this.startAnalysis());

        // Report actions
        document.getElementById('exportPdf').addEventListener('click', () => this.exportPdf());
        document.getElementById('copyReport').addEventListener('click', () => this.copyReport());
        document.getElementById('newAnalysis').addEventListener('click', () => this.resetAnalysis());

        // History
        document.getElementById('refreshHistory').addEventListener('click', () => this.loadHistory());

        // Models form
        document.getElementById('addModelForm').addEventListener('submit', (e) => this.addModel(e));
        document.getElementById('newModelProvider').addEventListener('change', (e) => this.onProviderChange(e));

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-overlay').addEventListener('click', () => this.closeModal());
        document.getElementById('modalExportPdf').addEventListener('click', () => this.exportPdf(true));
        document.getElementById('modalCopyReport').addEventListener('click', () => this.copyReport(true));
        document.getElementById('modalDeleteReport').addEventListener('click', () => this.deleteReport());
    }

    // ===== Navigation =====
    handleNavigation(e) {
        const section = e.target.closest('.nav-btn').dataset.section;

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        e.target.closest('.nav-btn').classList.add('active');

        const progressContainer = document.getElementById('progressContainer');

        // Hide all sections
        document.querySelectorAll('.step-panel, .section-panel').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });

        if (section === 'analyze') {
            progressContainer.style.display = 'block';
            document.getElementById(`step${this.currentStep}`).classList.add('active');
            document.getElementById(`step${this.currentStep}`).style.display = 'block';
        } else if (section === 'history') {
            progressContainer.style.display = 'none';
            document.getElementById('historySection').style.display = 'block';
            this.loadHistory();
        } else if (section === 'models') {
            progressContainer.style.display = 'none';
            document.getElementById('modelsSection').style.display = 'block';
            this.loadModelsConfig();
        } else if (section === 'about') {
            progressContainer.style.display = 'none';
            document.getElementById('aboutSection').style.display = 'block';
        }
    }

    // ===== Domain Selection =====
    selectDomain(e) {
        const card = e.target.closest('.domain-card');
        const domain = card.dataset.domain;

        document.querySelectorAll('.domain-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        this.selectedDomain = domain;
        this.analysisData.domain = domain;

        setTimeout(() => this.goToStep(2), 300);
    }

    // ===== Competitor Management =====
    addCompetitor() {
        const input = document.getElementById('competitorInput');
        const value = input.value.trim();

        if (!value) return;

        if (this.competitors.length >= 5) {
            this.showToast('最多添加5个竞品', 'warning');
            return;
        }

        if (this.competitors.includes(value)) {
            this.showToast('该竞品已添加', 'warning');
            input.value = '';
            return;
        }

        this.competitors.push(value);
        this.renderCompetitorTags();
        input.value = '';
        input.focus();
        this.showToast(`已添加: ${value}`, 'success');
    }

    renderCompetitorTags() {
        const container = document.getElementById('competitorTags');
        container.innerHTML = this.competitors.map((comp, i) => `
            <span class="tag">
                ${comp}
                <span class="remove" data-index="${i}">✕</span>
            </span>
        `).join('');

        container.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.competitors.splice(index, 1);
                this.renderCompetitorTags();
            });
        });
    }

    // ===== Step Navigation =====
    goToStep(step) {
        this.currentStep = step;

        document.querySelectorAll('.step').forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i + 1 < step) s.classList.add('completed');
            if (i + 1 === step) s.classList.add('active');
        });

        document.querySelectorAll('.step-panel').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });

        const panel = document.getElementById(`step${step}`);
        panel.classList.add('active');
        panel.style.display = 'block';
    }

    // ===== Analysis =====
    async startAnalysis() {
        // Validate
        if (!this.modelsConfig.activeModelId) {
            this.showToast('请先在模型管理中选择一个活动模型', 'error');
            return;
        }

        if (this.competitors.length === 0) {
            this.showToast('请至少添加一个竞品', 'error');
            return;
        }

        const purpose = document.querySelector('input[name="purpose"]:checked');
        if (!purpose) {
            this.showToast('请选择分析目的', 'error');
            return;
        }

        // Collect form data
        this.analysisData = {
            domain: this.selectedDomain,
            competitors: [...this.competitors],
            company: document.getElementById('companyName').value,
            purpose: purpose.value,
            region: document.getElementById('region').value,
            reportFormat: document.getElementById('reportFormat').value,
            additionalInfo: document.getElementById('additionalInfo').value
        };

        // Update UI
        const domainNames = { finance: '金融科技', healthcare: '医疗健康', education: '教育科技', legal: '法律服务' };
        document.getElementById('selectedDomain').textContent = `领域：${domainNames[this.selectedDomain]}`;
        document.getElementById('competitorCount').textContent = `竞品：${this.competitors.length}个`;

        // Go to analysis step
        this.goToStep(3);

        // Reset stages
        document.querySelectorAll('.stage').forEach(s => {
            s.classList.remove('active', 'completed');
            s.querySelector('.progress-bar').style.width = '0%';
        });
        document.getElementById('stage-mine').classList.add('active');

        const logs = document.getElementById('analysisLogs');
        logs.innerHTML = '';

        this.addLog('🚀 开始竞品分析...', logs);
        this.addLog(`📋 竞品列表: ${this.competitors.join(', ')}`, logs);

        // Stage 1: Prepare
        await this.runStage('stage-mine', 30);
        this.addLog('✅ 分析请求准备完成', logs, 'success');

        // Stage 2: Call LLM
        document.getElementById('stage-probe').classList.add('active');
        document.getElementById('stage-mine').classList.remove('active');
        document.getElementById('stage-mine').classList.add('completed');

        this.addLog('🤖 正在调用大语言模型...', logs);
        document.getElementById('analysisStatusText').textContent = '大模型分析中，请稍候...';

        try {
            const response = await fetch(`${API_BASE}/analysis/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.analysisData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '分析失败');
            }

            const report = await response.json();
            this.currentReport = report;

            await this.runStage('stage-probe', 100);
            this.addLog('✅ 大模型分析完成', logs, 'success');

            // Stage 3: Generate report
            document.getElementById('stage-extract').classList.add('active');
            document.getElementById('stage-probe').classList.remove('active');
            document.getElementById('stage-probe').classList.add('completed');

            this.addLog('📊 正在生成报告...', logs);
            await this.runStage('stage-extract', 100);
            this.addLog('✅ 报告生成完成', logs, 'success');

            document.getElementById('stage-extract').classList.remove('active');
            document.getElementById('stage-extract').classList.add('completed');

            // Show report
            this.displayReport(report);

        } catch (error) {
            this.addLog(`❌ 错误: ${error.message}`, logs, 'error');
            this.showToast(error.message, 'error');
            document.getElementById('analysisStatusText').textContent = '分析失败';
        }
    }

    async runStage(stageId, targetProgress) {
        const stage = document.getElementById(stageId);
        const progressBar = stage.querySelector('.progress-bar');

        let progress = 0;
        while (progress < targetProgress) {
            progress += Math.random() * 20;
            if (progress > targetProgress) progress = targetProgress;
            progressBar.style.width = `${progress}%`;
            await this.delay(200);
        }
    }

    addLog(message, container, type = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }

    displayReport(report) {
        const domainNames = { finance: '金融科技', healthcare: '医疗健康', education: '教育科技', legal: '法律服务' };
        const purposeNames = { market_entry: '市场进入', defense: '竞争防御', optimization: '产品优化', investment: '投资研究' };
        const regionNames = { china: '中国大陆', global: '全球市场', asia: '亚太地区' };

        // Update meta
        const metaHtml = `
            <p><strong>分析领域：</strong>${domainNames[report.domain] || report.domain}</p>
            <p><strong>分析目的：</strong>${purposeNames[report.purpose] || report.purpose}</p>
            <p><strong>目标市场：</strong>${regionNames[report.region] || report.region}</p>
            <p><strong>竞品列表：</strong>${report.competitors.join('、')}</p>
            <p><strong>使用模型：</strong>${report.model?.name || 'Unknown'} (${report.model?.modelName || ''})</p>
            <p><strong>分析耗时：</strong>${(report.analysisTime / 1000).toFixed(1)} 秒</p>
            <p><strong>生成时间：</strong>${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
        `;
        document.getElementById('reportMeta').innerHTML = metaHtml;

        // Render markdown content
        const contentEl = document.getElementById('reportContent');
        if (window.marked) {
            contentEl.innerHTML = marked.parse(report.content);
        } else {
            contentEl.innerHTML = `<pre style="white-space: pre-wrap;">${report.content}</pre>`;
        }

        this.goToStep(6);
    }

    // ===== Report Actions =====
    async exportPdf(fromModal = false) {
        const contentEl = fromModal ? document.getElementById('modalReportContent') : document.getElementById('reportContent');
        const report = this.currentReport;

        if (!report || !window.html2pdf) {
            this.showToast('导出功能暂不可用', 'error');
            return;
        }

        this.showToast('正在生成 PDF...', 'info');

        const opt = {
            margin: 10,
            filename: `竞品分析报告_${report.competitors.join('_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            await html2pdf().set(opt).from(contentEl).save();
            this.showToast('PDF 导出成功', 'success');
        } catch (error) {
            this.showToast('PDF 导出失败', 'error');
        }
    }

    copyReport(fromModal = false) {
        const contentEl = fromModal ? document.getElementById('modalReportContent') : document.getElementById('reportContent');
        const text = this.currentReport?.content || contentEl.innerText;

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('报告内容已复制到剪贴板', 'success');
        }).catch(() => {
            this.showToast('复制失败', 'error');
        });
    }

    resetAnalysis() {
        this.currentStep = 1;
        this.selectedDomain = null;
        this.competitors = [];
        this.analysisData = {};
        this.currentReport = null;

        // Reset UI
        document.querySelectorAll('.domain-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('competitorTags').innerHTML = '';
        document.getElementById('companyName').value = '';
        document.querySelectorAll('input[name="purpose"]').forEach(r => r.checked = false);
        document.getElementById('region').value = 'china';
        document.getElementById('reportFormat').value = 'standard';
        document.getElementById('additionalInfo').value = '';
        document.getElementById('analysisLogs').innerHTML = '';
        document.getElementById('analysisStatusText').textContent = '正在调用大模型进行分析...';

        // Reset stages
        document.querySelectorAll('.stage').forEach(s => {
            s.classList.remove('active', 'completed');
            s.querySelector('.progress-bar').style.width = '0%';
        });
        document.getElementById('stage-mine').classList.add('active');

        this.goToStep(1);
    }

    // ===== History =====
    async loadHistory() {
        try {
            const response = await fetch(`${API_BASE}/reports`);
            const reports = await response.json();
            this.renderHistory(reports);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    renderHistory(reports) {
        const container = document.getElementById('historyList');
        const domainNames = { finance: '金融科技', healthcare: '医疗健康', education: '教育科技', legal: '法律服务' };
        const purposeNames = { market_entry: '市场进入', defense: '竞争防御', optimization: '产品优化', investment: '投资研究' };

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>暂无历史报告</h3>
                    <p>开始您的第一次竞品分析吧！</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reports.map(r => `
            <div class="history-card" data-id="${r.id}">
                <div class="history-card-header">
                    <span class="history-card-title">${domainNames[r.domain] || r.domain} - ${r.competitors.join('、')}</span>
                    <span class="history-card-date">${new Date(r.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <div class="history-card-meta">
                    <span>${purposeNames[r.purpose] || r.purpose}</span>
                    ${r.model ? ` | 模型: ${r.model.name}` : ''}
                    ${r.analysisTime ? ` | 耗时: ${(r.analysisTime / 1000).toFixed(1)}秒` : ''}
                </div>
                <div class="history-card-tags">
                    ${r.competitors.map(c => `<span class="tag">${c}</span>`).join('')}
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => this.viewReport(card.dataset.id));
        });
    }

    async viewReport(id) {
        try {
            const response = await fetch(`${API_BASE}/reports/${id}`);
            if (!response.ok) throw new Error('Failed to load report');

            const report = await response.json();
            this.currentReport = report;
            this.showReportModal(report);
        } catch (error) {
            this.showToast('加载报告失败', 'error');
        }
    }

    showReportModal(report) {
        const domainNames = { finance: '金融科技', healthcare: '医疗健康', education: '教育科技', legal: '法律服务' };
        const purposeNames = { market_entry: '市场进入', defense: '竞争防御', optimization: '产品优化', investment: '投资研究' };
        const regionNames = { china: '中国大陆', global: '全球市场', asia: '亚太地区' };

        document.getElementById('modalTitle').textContent = `${domainNames[report.domain]} - ${report.competitors.join('、')}`;

        document.getElementById('modalReportMeta').innerHTML = `
            <p><strong>分析领域：</strong>${domainNames[report.domain] || report.domain}</p>
            <p><strong>分析目的：</strong>${purposeNames[report.purpose] || report.purpose}</p>
            <p><strong>竞品列表：</strong>${report.competitors.join('、')}</p>
            <p><strong>使用模型：</strong>${report.model?.name || 'Unknown'}</p>
            <p><strong>生成时间：</strong>${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
        `;

        const contentEl = document.getElementById('modalReportContent');
        if (window.marked) {
            contentEl.innerHTML = marked.parse(report.content);
        } else {
            contentEl.innerHTML = `<pre style="white-space: pre-wrap;">${report.content}</pre>`;
        }

        document.getElementById('reportModal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('reportModal').style.display = 'none';
    }

    async deleteReport() {
        if (!this.currentReport) return;

        if (!confirm('确定要删除这份报告吗？')) return;

        try {
            await fetch(`${API_BASE}/reports/${this.currentReport.id}`, { method: 'DELETE' });
            this.showToast('报告已删除', 'success');
            this.closeModal();
            this.loadHistory();
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    // ===== Models =====
    async loadModelsConfig() {
        try {
            const response = await fetch(`${API_BASE}/models`);
            this.modelsConfig = await response.json();
            this.renderModels();
            this.updateModelStatus();
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }

    renderModels() {
        const container = document.getElementById('modelsList');

        if (!this.modelsConfig.models || this.modelsConfig.models.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">暂无配置的模型</p>';
            return;
        }

        container.innerHTML = this.modelsConfig.models.map(m => `
            <div class="model-card ${m.id === this.modelsConfig.activeModelId ? 'active' : ''}">
                <div class="model-card-header">
                    <div class="model-card-title">
                        ${m.name}
                        ${m.id === this.modelsConfig.activeModelId ? '<span class="badge">活动</span>' : ''}
                    </div>
                    <div class="model-card-actions">
                        <button class="test-btn" data-id="${m.id}">💬 对话测试</button>
                        ${m.id !== this.modelsConfig.activeModelId ? `<button class="active-btn" data-id="${m.id}">设为活动</button>` : ''}
                        <button class="delete-btn" data-id="${m.id}">删除</button>
                    </div>
                </div>
                <div class="model-card-info">
                    <p>提供商: ${m.provider}</p>
                    <p>API 地址: ${m.baseUrl}</p>
                    <p>模型: ${m.model}</p>
                </div>
            </div>
        `).join('');

        // Bind actions
        container.querySelectorAll('.test-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openTestChat(btn.dataset.id));
        });
        container.querySelectorAll('.active-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setActiveModel(btn.dataset.id));
        });
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteModel(btn.dataset.id));
        });
    }

    // ===== Chat Test =====
    openTestChat(id) {
        const model = this.modelsConfig.models.find(m => m.id === id);
        if (!model) return;

        this.currentTestModelId = id;
        document.getElementById('testModalTitle').textContent = `🤖 测试: ${model.name}`;

        // Reset Chat
        const chatContainer = document.getElementById('testChatContainer');
        chatContainer.innerHTML = `
            <div class="chat-placeholder">
                <div class="empty-icon">💬</div>
                <p>正在连接模型...</p>
            </div>
        `;
        document.getElementById('testChatInput').value = '';

        document.getElementById('modelTestModal').style.display = 'flex';

        // Initial connection test
        this.testModelConnection(id);

        // Bind send events
        const sendBtn = document.getElementById('sendTestMsgBtn');
        const input = document.getElementById('testChatInput');

        // Remove old listeners to avoid duplicates
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);

        newSendBtn.addEventListener('click', () => this.sendTestMessage());
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTestMessage();
            }
        };

        // Close button logic
        document.getElementById('closeTestModal').onclick = () => {
            document.getElementById('modelTestModal').style.display = 'none';
        }
    }

    async testModelConnection(id) {
        try {
            const response = await fetch(`${API_BASE}/models/test/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hi' })
            });
            const result = await response.json();

            const chatContainer = document.getElementById('testChatContainer');
            if (result.success) {
                chatContainer.innerHTML = `
                    <div class="chat-placeholder">
                        <div class="empty-icon" style="color: var(--success)">✅</div>
                        <p>连接成功！您可以开始与模型对话了。</p>
                        <p style="font-size: 12px; margin-top: 8px">模型响应: "${result.response}"</p>
                    </div>
                `;
            } else {
                chatContainer.innerHTML = `
                    <div class="chat-placeholder">
                        <div class="empty-icon" style="color: var(--danger)">❌</div>
                        <p>连接失败: ${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            const chatContainer = document.getElementById('testChatContainer');
            chatContainer.innerHTML = `
                <div class="chat-placeholder">
                    <div class="empty-icon" style="color: var(--danger)">⚠️</div>
                    <p>网络错误: ${error.message}</p>
                </div>
            `;
        }
    }

    async sendTestMessage() {
        const input = document.getElementById('testChatInput');
        const message = input.value.trim();
        if (!message) return;

        const container = document.getElementById('testChatContainer');

        // Remove placeholder if exists
        if (container.querySelector('.chat-placeholder')) {
            container.innerHTML = '';
        }

        // Add user message
        this.appendChatMessage('user', message);
        input.value = '';

        // Add loading state
        const loadingId = 'loading-' + Date.now();
        container.innerHTML += `
            <div class="chat-message assistant" id="${loadingId}">
                <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;

        try {
            const response = await fetch(`${API_BASE}/models/test/${this.currentTestModelId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const result = await response.json();

            // Remove loading
            document.getElementById(loadingId).remove();

            if (result.success) {
                this.appendChatMessage('assistant', result.response);
            } else {
                this.appendChatMessage('assistant', `Error: ${result.error}`);
            }
        } catch (error) {
            document.getElementById(loadingId).remove();
            this.appendChatMessage('assistant', `Network Error: ${error.message}`);
        }
    }

    appendChatMessage(role, text) {
        const container = document.getElementById('testChatContainer');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;

        // Simple markdown rendering for assistant
        if (role === 'assistant' && window.marked) {
            msgDiv.innerHTML = marked.parse(text);
        } else {
            msgDiv.textContent = text;
        }

        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    updateModelStatus() {
        const statusEl = document.getElementById('modelStatus');
        const activeModel = this.modelsConfig.models?.find(m => m.id === this.modelsConfig.activeModelId);

        if (activeModel) {
            statusEl.innerHTML = `<span class="status-dot"></span><span class="status-text">${activeModel.name}</span>`;
        } else {
            statusEl.innerHTML = `<span class="status-dot inactive"></span><span class="status-text">未选择模型</span>`;
        }
    }

    onProviderChange(e) {
        const provider = e.target.value;
        const baseUrlInput = document.getElementById('newModelBaseUrl');

        const defaults = {
            ollama: 'http://localhost:11434/v1',
            lmstudio: 'http://localhost:1234/v1',
            openai: 'https://api.openai.com/v1',
            custom: ''
        };

        baseUrlInput.value = defaults[provider] || '';
    }

    async addModel(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const model = {
            name: formData.get('name'),
            provider: formData.get('provider'),
            baseUrl: formData.get('baseUrl'),
            apiKey: formData.get('apiKey'),
            model: formData.get('model')
        };

        try {
            const response = await fetch(`${API_BASE}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(model)
            });

            if (!response.ok) throw new Error('Failed to add model');

            this.showToast('模型添加成功', 'success');
            form.reset();
            await this.loadModelsConfig();
        } catch (error) {
            this.showToast('添加模型失败', 'error');
        }
    }

    async testModel(id) {
        this.showToast('正在测试连接...', 'info');

        try {
            const response = await fetch(`${API_BASE}/models/test/${id}`, { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                this.showToast(`连接成功！响应: ${result.response}`, 'success');
            } else {
                this.showToast(`连接失败: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast('测试失败', 'error');
        }
    }

    async setActiveModel(id) {
        try {
            await fetch(`${API_BASE}/models/active/${id}`, { method: 'POST' });
            this.showToast('已设置为活动模型', 'success');
            await this.loadModelsConfig();
        } catch (error) {
            this.showToast('设置失败', 'error');
        }
    }

    async deleteModel(id) {
        if (!confirm('确定要删除这个模型配置吗？')) return;

        try {
            await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
            this.showToast('模型已删除', 'success');
            await this.loadModelsConfig();
        } catch (error) {
            this.showToast('删除失败', 'error');
        }
    }

    // ===== Utilities =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.nexusApp = new NexusApp();
});
