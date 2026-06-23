const express = require('express');
const path = require('path');
const https = require('https'); 
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'gusto123';
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || crypto.randomBytes(24).toString('hex');

function getCookie(req, name) {
    const cookieHeader = req.headers.cookie || '';
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const cookie = cookies.find(item => item.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function isDashboardAuthed(req) {
    return getCookie(req, 'dashboardAuth') === DASHBOARD_TOKEN;
}

function requireDashboardAuth(req, res, next) {
    if (isDashboardAuthed(req)) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ status: 'unauthorized' });
    }
    return res.redirect('/dashboard-login');
}

app.use((req, res, next) => {
    const normalizedPath = req.path.toLowerCase();
    if (
        normalizedPath === '/dashboard.html' ||
        normalizedPath === '/dashboard2.html' ||
        normalizedPath === '/public/dashboard.html' ||
        normalizedPath === '/public/dashboard2.html'
    ) {
        return requireDashboardAuth(req, res, next);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ==================== JSONBIN.IO CONFIGURATION ====================
const BIN_ID = "6a2d7d6bda38895dfeba9d32";       
const API_KEY = "$2a$10$RrRaii7U6HTf6XOFsYXDmuc2KOPdzOQ7gspoqEYkdNdYWL41ShA4W";   

function createDefaultMetrics() {
    return {
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
}

function normalizeMetrics(savedMetrics) {
    const defaults = createDefaultMetrics();
    const safeMetrics = savedMetrics && typeof savedMetrics === 'object' ? savedMetrics : {};

    return {
        ...defaults,
        ...safeMetrics,
        programs: Object.fromEntries(
            Object.entries(defaults.programs).map(([key, value]) => [
                key,
                { ...value, ...(safeMetrics.programs && safeMetrics.programs[key]) }
            ])
        ),
        wallets: { ...defaults.wallets, ...(safeMetrics.wallets || {}) }
    };
}

// Updated nested memory schema to directly power the dashboard classification tree
let metrics = createDefaultMetrics();

// Array to keep track of open dashboard browser tabs
let clients = [];

app.get('/api/metrics-stream', requireDashboardAuth, (req, res) => {
    // Establish standard SSE headers to keep the connection open permanently
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Store this client connection
    clients.push(res);
    res.write(`data: ${JSON.stringify(metrics)}\n\n`);

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

function persistAndBroadcast() {
    broadcastMetrics();
    saveDataToCloud();
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
                    metrics = normalizeMetrics(parsedData.record);
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/dashboard-login', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'dashboard-login.html')); });
app.post('/dashboard-login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === DASHBOARD_USER && password === DASHBOARD_PASS) {
        res.setHeader('Set-Cookie', `dashboardAuth=${encodeURIComponent(DASHBOARD_TOKEN)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
        return res.redirect('/dashboard');
    }
    return res.redirect('/dashboard-login?error=1');
});
app.post('/dashboard-logout', (req, res) => {
    res.setHeader('Set-Cookie', 'dashboardAuth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.redirect('/dashboard-login');
});
app.get('/dashboard', requireDashboardAuth, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'Dashboard.html')); });

app.post('/api/report-scan', (req, res) => {
    metrics.scans++;
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

app.post('/api/report-click', (req, res) => {
    metrics.clicks++;
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

// Logs forms submission into the specific major
app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    const chosenStream = (req.body && req.body.classType) ? req.body.classType : null;
    
    if (chosenStream && metrics.programs && metrics.programs[chosenStream]) {
        metrics.programs[chosenStream].forms++;
    }
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

// Logs pin entries into the specific major
app.post('/api/report-pin-input', (req, res) => {
    metrics.pinInputs++;
    const studentProgram = (req.body && req.body.program) ? req.body.program : null;

    if (studentProgram && metrics.programs && metrics.programs[studentProgram]) {
        metrics.programs[studentProgram].pinInputs++;
    }
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

app.post('/api/report-page2', (req, res) => {
    metrics.payments++;
    const chosenWallet = (req.body && req.body.platform) ? req.body.platform : null;
    if (chosenWallet && metrics.wallets && metrics.wallets.hasOwnProperty(chosenWallet)) {
        metrics.wallets[chosenWallet]++;
    }
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

app.get('/api/metrics', requireDashboardAuth, (req, res) => { res.status(200).json(metrics); });

app.post('/api/reset-metrics', requireDashboardAuth, (req, res) => {
    metrics = createDefaultMetrics();
    res.status(200).json({ status: "success" });
    persistAndBroadcast();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server live on port ${PORT}`); });
