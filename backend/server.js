const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Always reinitialize database on startup (fresh deploy = fresh data)
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
console.log('Initializing database...');
try {
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('Deleted existing database');
    }
    execSync('node scripts/init-db.js', { stdio: 'inherit' });
    console.log('Database initialization complete.');
} catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
}

const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching for API routes
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 9007;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
