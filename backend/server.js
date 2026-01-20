const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Раздаём frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Всё остальное → index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
