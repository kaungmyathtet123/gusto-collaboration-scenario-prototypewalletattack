const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Global metrics database tracking categories alongside simple totals
let metrics = {
    scans: 0,
    clicks: 0,
    submissions: 0,
    payments: 0,
    pinInputs: 0, // Explicitly counts PIN pad button clicks
    programs: {
        "IT": 0,
        "Business": 0,
        "Level3": 0,
        "GUF": 0,
        "GED": 0,
        "Pre-GED": 0
    },
    wallets: {
        "KBZ Pay": 0,
        "AYA Pay": 0,
        "Wave Pay": 0
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FEATURE 1: Scan Counter
app.post('/api/report-scan', (req, res) => {
    metrics.scans++;
    res.status(200).json({ status: "success" });
});

// FEATURE 2: Landing Page Checkout Click
app.post('/api/report-click', (req, res) => {
    metrics.clicks++;
    res.status(200).json({ status: "success" });
});

// FEATURE 3: Student Form Submission & Program Categorization
app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    const chosenStream = req.body.classType;
    if (chosenStream && metrics.programs.hasOwnProperty(chosenStream)) {
        metrics.programs[chosenStream]++;
    }
    res.status(200).json({ status: "success" });
});

// FEATURE 4: Pin Pad Verification & Payment App Tracker
app.post('/api/report-page2', (req, res) => {
    metrics.payments++;
    const chosenWallet = req.body.platform;
    if (chosenWallet && metrics.wallets.hasOwnProperty(chosenWallet)) {
        metrics.wallets[chosenWallet]++;
    }
    res.status(200).json({ status: "success" });
});

// NEW FEATURE: Tracks whenever any key is pressed on the payment PIN pad
app.post('/api/report-pin-input', (req, res) => {
    metrics.pinInputs++;
    res.status(200).json({ status: "success" });
});

// Unified analytics metrics delivery endpoint
app.get('/api/metrics', (req, res) => {
    res.json(metrics);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server configuration pipeline running on port ${PORT}`);
});