const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Определяем путь к frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('Frontend path:', frontendPath);

// Раздаём frontend
app.use(express.static(frontendPath));

// API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Всё остальное → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📁 Serving frontend from: ${frontendPath}`);
});
