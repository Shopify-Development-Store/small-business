require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
    origin: 'https://small-business-hx9gnbx95-deepaks-projects-87164fb3.vercel.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json());

// POST /api/gemini
app.post('/api/gemini', async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = process.env.GEMINI_API_URL;

    if (!apiKey || !apiUrl) {
        return res.status(500).json({ error: 'API key or URL not set.' });
    }

    // Setup timeout for fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

    try {
        const response = await fetch(`${apiUrl}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({ error: 'Gemini API error', details: text });
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'Request to Gemini API timed out.' });
        }
        res.status(500).json({ error: 'API request failed.', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
