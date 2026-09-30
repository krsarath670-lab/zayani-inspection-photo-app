const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const photoRoutes = require('./routes/photoRoutes');
const searchRoutes = require('./routes/searchRoutes');

const PORT = process.env.PORT || 3000;

// Initialize Database & Seed
initDatabase();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', project: 'ZAYANI INSPECTION PHOTO APP', time: new Date() });
});

// Serve frontend static build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(path.join(clientDistPath, 'index.html'));
        } else {
            next();
        }
    });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  ZAYANI INSPECTION PHOTO APP Live on Port ${PORT}!`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`=======================================================`);
});
