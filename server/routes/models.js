import express from 'express';
import fs from 'fs';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

const configPath = join(__dirname, '../../data/models.json');

// Default configuration
const defaultConfig = {
    models: [
        {
            id: 'ollama-default',
            name: 'Ollama (本地)',
            provider: 'ollama',
            baseUrl: 'http://localhost:11434/v1',
            apiKey: 'ollama',
            model: 'qwen2.5:7b',
            isDefault: false,
            enabled: true
        },
        {
            id: 'lmstudio-default',
            name: 'LM Studio (本地)',
            provider: 'lmstudio',
            baseUrl: 'http://localhost:1234/v1',
            apiKey: 'lm-studio',
            model: 'local-model',
            isDefault: false,
            enabled: true
        },
        {
            id: 'openai-default',
            name: 'OpenAI',
            provider: 'openai',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini',
            isDefault: false,
            enabled: false
        }
    ],
    activeModelId: null
};

// Load configuration
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
    return defaultConfig;
}

// Save configuration
function saveConfig(config) {
    const dir = dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Get all models
router.get('/', (req, res) => {
    const config = loadConfig();
    res.json(config);
});

// Add new model
router.post('/', (req, res) => {
    const config = loadConfig();
    const newModel = {
        id: `custom-${Date.now()}`,
        ...req.body,
        enabled: true
    };
    config.models.push(newModel);
    saveConfig(config);
    res.json(newModel);
});

// Update model
router.put('/:id', (req, res) => {
    const config = loadConfig();
    const index = config.models.findIndex(m => m.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Model not found' });
    }
    config.models[index] = { ...config.models[index], ...req.body };
    saveConfig(config);
    res.json(config.models[index]);
});

// Delete model
router.delete('/:id', (req, res) => {
    const config = loadConfig();
    const index = config.models.findIndex(m => m.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Model not found' });
    }
    config.models.splice(index, 1);
    if (config.activeModelId === req.params.id) {
        config.activeModelId = null;
    }
    saveConfig(config);
    res.json({ success: true });
});

// Set active model
router.post('/active/:id', (req, res) => {
    const config = loadConfig();
    const model = config.models.find(m => m.id === req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }
    config.activeModelId = req.params.id;
    saveConfig(config);
    res.json({ success: true, activeModel: model });
});

// Test model connection
router.post('/test/:id', async (req, res) => {
    const config = loadConfig();
    const model = config.models.find(m => m.id === req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }

    try {
        const client = new OpenAI({
            baseURL: model.baseUrl,
            apiKey: model.apiKey || 'no-key',
            timeout: 120000 // 2 minutes timeout for testing
        });

        const userMessage = req.body.message || 'Hello, please respond with "OK"';

        const response = await client.chat.completions.create({
            model: model.model,
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 1000 // Increased for chat testing
        });

        res.json({
            success: true,
            message: 'Connection successful',
            response: response.choices[0]?.message?.content
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get available models from Ollama
router.get('/ollama/list', async (req, res) => {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) throw new Error('Ollama not available');
        const data = await response.json();
        res.json(data.models || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
