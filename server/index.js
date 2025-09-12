require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// POST /api/gemini
app.post('/api/gemini', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = process.env.GEMINI_API_URL;
    if (!apiKey || !apiUrl) return res.status(500).json({ error: 'API key or URL not set.' });
    try {
        const response = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        let data;
        try {
            // Check for non-200 status
            if (!response.ok) {
                const text = await response.text();
                return res.status(response.status).json({ error: 'Gemini API error', details: text });
            }
            data = await response.json();
        } catch (jsonErr) {
            return res.status(500).json({ error: 'Invalid JSON from Gemini API.' });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'API request failed.', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
