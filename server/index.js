import cors from 'cors';
import express from 'express';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Import routes
import analysisRoutes from './routes/analysis.js';
import modelRoutes from './routes/models.js';
import reportRoutes from './routes/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
const dataDir = join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// API Routes
app.use('/api/models', modelRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const distPath = join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        res.sendFile(join(distPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Nexus Server running at http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
