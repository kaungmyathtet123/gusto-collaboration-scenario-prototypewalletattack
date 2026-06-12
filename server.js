const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse incoming JSON payload request bodies
app.use(express.json());

// Serve static elements (HTML, scripts, CSS stylesheets) from the root project folder
app.use(express.static(__dirname));

// Global tracking architecture mapped exactly to your frontend interaction metrics
let metrics = {
    scans: 0,
    clicks: 0,
    submissions: 0,
    payments: 0,
    pinInputs: 0, // Counts raw button pad clicks live
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

// Explicit default route serving the simulation landing window
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ==================== ANALYTICS & INTERACTION API ENDPOINTS ==================== */

// FEATURE 1: QR Code Landing Page Scan Monitor
app.post('/api/report-scan', (req, res) => {
    metrics.scans++;
    console.log(`[Analytics Engine] QR Scan Registered. Total: ${metrics.scans}`);
    res.status(200).json({ status: "success", currentScans: metrics.scans });
});

// FEATURE 2: Pre-Payment Gateway Action Checkout Click
app.post('/api/report-click', (req, res) => {
    metrics.clicks++;
    console.log(`[Analytics Engine] Checkout Click Logged. Total: ${metrics.clicks}`);
    res.status(200).json({ status: "success", currentClicks: metrics.clicks });
});

// FEATURE 3: Student Form Verification Data Pipeline
app.post('/api/report-page1', (req, res) => {
    metrics.submissions++;
    
    // Robust fallbacks to protect memory structures against unexpected payload objects
    const chosenStream = (req.body && req.body.classType) ? req.body.classType : null;
    
    if (chosenStream && metrics.programs && metrics.programs.hasOwnProperty(chosenStream)) {
        metrics.programs[chosenStream]++;
        console.log(`[Analytics Engine] Student Verified Stream Category: ${chosenStream}`);
    } else {
        console.log(`[Warning] Submission received with unknown or missing classType format: ${chosenStream}`);
    }
    
    res.status(200).json({ status: "success", totalSubmissions: metrics.submissions });
});

// FEATURE 4: Numpad Keyboard Key Stroke Event Trigger
app.post('/api/report-pin-input', (req, res) => {
    metrics.pinInputs++;
    // Logging individual key clicks can flood the console, keeping tracking completely in memory
    res.status(200).json({ status: "success", totalPinInputs: metrics.pinInputs });
});

// FEATURE 5: Core Wallet Pin Authentication Checkout Completion Gateway
app.post('/api/report-page2', (req, res) => {
    metrics.payments++;
    
    const chosenWallet = (req.body && req.body.platform) ? req.body.platform : null;
    
    if (chosenWallet && metrics.wallets && metrics.wallets.hasOwnProperty(chosenWallet)) {
        metrics.wallets[chosenWallet]++;
        console.log(`[Analytics Engine] Complete Interaction Processed via: ${chosenWallet}`);
    } else {
        console.log(`[Warning] PIN submitted without target wallet selection profile string.`);
    }
    
    res.status(200).json({ status: "success", totalCompletedFlows: metrics.payments });
});

/* ==================== SECURITY & METRICS MANAGEMENT GATEWAYS ==================== */

// ADMIN LOGICAL AUTHENTICATION MANAGER
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    
    // Core Master Dashboard access credential matching configuration
    const CAMPAIGN_USER = "admin";
    const CAMPAIGN_PASS = "gusto2026";

    if (username === CAMPAIGN_USER && password === CAMPAIGN_PASS) {
        console.log(`[Security Alert] Admin Panel unlocked successfully by user: ${username}`);
        res.status(200).json({ authenticated: true });
    } else {
        console.log(`[Security Warning] Blocked an unauthorized login attempt using username: "${username}"`);
        res.status(200).json({ authenticated: false, message: "Invalid credentials configuration profile match." });
    }
});

// DATA COLLECTION API EXPOSURE DISTRIBUTION SYSTEM
app.get('/api/metrics', (req, res) => {
    // Provides full real-time parameters directly back to the dashboard script pipeline loop safely
    res.status(200).json(metrics);
});

/* ==================== SERVER ENGINE SYSTEM PROCESS ACTIVATION ==================== */

// Automatically hooks into environment deployment ports (like Render) with fallback to local port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` GUSTO CAMPAIGN APPLICATION MANAGEMENT CONTAINER SERVER BOOTED `);
    console.log(` Real-time analytic pipeline streaming on address: http://localhost:${PORT} `);
    console.log(`================================================================`);
});