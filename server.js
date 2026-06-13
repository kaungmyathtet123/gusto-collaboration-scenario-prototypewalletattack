const express = require('express');
const path = require('path');
const https = require('https'); // Used for direct cloud API communication
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// ==================== JSONBIN.IO CONFIGURATION ====================
const BIN_ID = "6a2d7d6bda38895dfeba9d32";       // Replace with your actual Bin ID
const API_KEY = "$2a$10$RrRaii7U6HTf6XOFsYXDmuc2KOPdzOQ7gspoqEYkdNdYWL41ShA4W";   // Replace with your actual Master Key

// Global in-memory metrics fallback structure
let metrics = {
    scans: 0,
    clicks: 0,
    submissions: 0,
    payments: 0,
    pinInputs: 0,
    programs: { "IT": 0, "Business": 0, "Level3": 0, "GUF": 0, "GED": 0, "Pre-GED": 0 },
    wallets: { "KBZ Pay": 0, "AYA Pay": 0, "Wave Pay": 0 }
};

// HELPER FUNCTION: Pull data from JSONbin when the server starts
function loadDataFromCloud() {
    const options = {
        hostname: 'api.jsonbin.io',
        path: `/v3/b/${BIN_ID}/latest`,
        method: 'GET',
        headers: {
            'X-Master-Key': API_KEY
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.record) {
                    metrics = parsed.record;
                    console.log("[Cloud Storage] Synchronized successfully. Local memory updated from JSONbin.");
                }
            } catch (e) {
                console.log("[Cloud Storage Warning] Failed to parse initial cloud payload. Using default local schema.");
            }
        });
    });

    req.on('error', (err) => { console.error("[Cloud Storage Error] Initial fetch failed:", err.message); });
    req.end();
}

// HELPER FUNCTION: Push data to JSONbin on every student interaction
function saveDataToCloud() {
    const payload = JSON.stringify(metrics);
    const options = {
        hostname: 'api.jsonbin.io',
        path: `/v3/b/${BIN_ID}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': API_KEY
        }
    };

    const req = https.request(options, (res) => {
        res.on('data', () => {}); // Consume response data stream
        res.on('end', () => { console.log("[Cloud Storage] Change snapshot saved securely to JSONbin cloud."); });
    });

    req.on('error', (err) => { console.error("[Cloud Storage Error] Save operation failed:", err.message); });
    req.write(payload);
    req.end();
}

// Initialize application data stream on boot
loadDataFromCloud();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ==================== ANALYTICS & INTERACTION API ENDPOINTS ==================== */

app.post('/api/report-scan', (req, res) => {
    metrics.scans++;
    res.status(200).json({ status: "success" });
    saveDataToCloud(); // Fire-and-forget sync to the cloud pipeline
});

app.post('/api/report-click', (req, res) => {
    metrics.clicks++;
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    const chosenStream = (req.body && req.body.classType) ? req.body.classType : null;
    if (chosenStream && metrics.programs && metrics.programs.hasOwnProperty(chosenStream)) {
        metrics.programs[chosenStream]++;
    }
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

app.post('/api/report-pin-input', (req, res) => {
    metrics.pinInputs++;
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

app.post('/api/report-page2', (req, res) => {
    metrics.payments++;
    const chosenWallet = (req.body && req.body.platform) ? req.body.platform : null;
    if (chosenWallet && metrics.wallets && metrics.wallets.hasOwnProperty(chosenWallet)) {
        metrics.wallets[chosenWallet]++;
    }
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

/* ==================== SECURITY & METRICS MANAGEMENT GATEWAYS ==================== */

app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "gusto2026") {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(200).json({ authenticated: false });
    }
});

app.get('/api/metrics', (req, res) => {
    res.status(200).json(metrics);
});

/* ==================== SERVER ENGINE SYSTEM PROCESS ACTIVATION ==================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` GUSTO CAMPAIGN APPLICATION MANAGEMENT CONTAINER SERVER BOOTED `);
    console.log(` Real-time JSONbin cloud pipeline monitoring on port: ${PORT} `);
    console.log(`================================================================`);
});