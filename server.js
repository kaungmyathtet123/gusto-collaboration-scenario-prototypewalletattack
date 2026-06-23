const express = require('express');
const path = require('path');
const https = require('https'); 
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// ==================== JSONBIN.IO CONFIGURATION ====================
const BIN_ID = "6a2d7d6bda38895dfeba9d32";       
const API_KEY = "$2a$10$RrRaii7U6HTf6XOFsYXDmuc2KOPdzOQ7gspoqEYkdNdYWL41ShA4W";   

// Updated nested memory schema to directly power the dashboard classification tree
let metrics = {
    scans: 0,
    clicks: 0,
    submissions: 0,
    payments: 0,
    pinInputs: 0,
    programs: { 
        "IT": { forms: 0, pinInputs: 0 }, 
        "Business": { forms: 0, pinInputs: 0 }, 
        "Level3": { forms: 0, pinInputs: 0 }, 
        "GUF": { forms: 0, pinInputs: 0 }, 
        "GED": { forms: 0, pinInputs: 0 }, 
        "Pre-GED": { forms: 0, pinInputs: 0 } 
    },
    wallets: { "KBZ Pay": 0, "AYA Pay": 0, "Wave Pay": 0 }
};

// Array to keep track of open dashboard browser tabs
let clients = [];

app.get('/api/metrics-stream', (req, res) => {
    // Establish standard SSE headers to keep the connection open permanently
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Store this client connection
    clients.push(res);

    // If the browser tab closes, remove it from our active tracking array
    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

// Helper function to broadcast changes to all open dashboards instantly
function broadcastMetrics() {
    const dataString = JSON.stringify(metrics);
    clients.forEach(client => {
        client.write(`data: ${dataString}\n\n`);
    });
}

function loadDataFromCloud() {
    const options = {
        hostname: 'api.jsonbin.io',
        path: `/v3/b/${BIN_ID}/latest`,
        method: 'GET',
        headers: { 'X-Master-Key': API_KEY }
    };
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.record) {
                    metrics = parsedData.record;
                    console.log("[Cloud Storage] Synchronized metrics structure safely.");
                }
            } catch (e) {
                console.log("[Cloud Storage] Using active memory framework.");
            }
        });
    });
    req.on('error', (err) => { console.error("[Error]:", err.message); });
    req.end();
}

function saveDataToCloud() {
    const payload = JSON.stringify(metrics);
    const options = {
        hostname: 'api.jsonbin.io',
        path: `/v3/b/${BIN_ID}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY }
    };
    const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => { console.log("[Cloud Storage] Snapshot saved."); });
    });
    req.write(payload);
    req.end();
}

loadDataFromCloud();

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'Dashboard.html')); });

app.post('/api/report-scan', (req, res) => {
    metrics.scans++;
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

app.post('/api/report-click', (req, res) => {
    metrics.clicks++;
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

// Logs forms submission into the specific major
app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    const chosenStream = (req.body && req.body.classType) ? req.body.classType : null;
    
    if (chosenStream && metrics.programs && metrics.programs[chosenStream]) {
        metrics.programs[chosenStream].forms++;
    }
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

// Logs pin entries into the specific major
app.post('/api/report-pin-input', (req, res) => {
    metrics.pinInputs++;
    const studentProgram = (req.body && req.body.program) ? req.body.program : null;

    if (studentProgram && metrics.programs && metrics.programs[studentProgram]) {
        metrics.programs[studentProgram].pinInputs++;
    }
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

app.get('/api/metrics', (req, res) => { res.status(200).json(metrics); });

app.post('/api/reset-metrics', (req, res) => {
    metrics = {
        scans: 0, clicks: 0, submissions: 0, payments: 0, pinInputs: 0,
        programs: {
            "IT": { forms: 0, pinInputs: 0 }, "Business": { forms: 0, pinInputs: 0 },
            "Level3": { forms: 0, pinInputs: 0 }, "GUF": { forms: 0, pinInputs: 0 },
            "GED": { forms: 0, pinInputs: 0 }, "Pre-GED": { forms: 0, pinInputs: 0 }
        },
        wallets: { "KBZ Pay": 0, "AYA Pay": 0, "Wave Pay": 0 }
    };
    res.status(200).json({ status: "success" });
    saveDataToCloud();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server live on port ${PORT}`); });