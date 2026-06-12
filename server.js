const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let metrics = {
    scans: 0,
    clicks: 0,
    submissions: 0,
    payments: 0,
    pinInputs: 0,
    programs: { "IT": 0, "Business": 0, "Level3": 0, "GUF": 0, "GED": 0, "Pre-GED": 0 },
    wallets: { "KBZ Pay": 0, "AYA Pay": 0, "Wave Pay": 0 }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Campaign interactions hooks pipelines
app.post('/api/report-scan', (req, res) => { metrics.scans++; res.sendStatus(200); });
app.post('/api/report-click', (req, res) => { metrics.clicks++; res.sendStatus(200); });
app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    const stream = req.body.classType;
    if (stream && metrics.programs.hasOwnProperty(stream)) metrics.programs[stream]++;
    res.sendStatus(200);
});
app.post('/api/report-page2', (req, res) => {
    metrics.payments++;
    const appType = req.body.platform;
    if (appType && metrics.wallets.hasOwnProperty(appType)) metrics.wallets[appType]++;
    res.sendStatus(200);
});
app.post('/api/report-pin-input', (req, res) => { metrics.pinInputs++; res.sendStatus(200); });

// NEW ADMIN VALIDATION GATEWAY ROUTE
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    // MODIFY YOUR SECURE CREDENTIALS HERE
    const MASTER_USER = "admin";
    const MASTER_PASS = "gusto2026"; 

    if (username === MASTER_USER && password === MASTER_PASS) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

app.get('/api/metrics', (req, res) => { res.json(metrics); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard server running on port ${PORT}`));