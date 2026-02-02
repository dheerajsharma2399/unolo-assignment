/**
 * Enterprise-Grade Integration Test Suite for Field Force Tracker
 * 
 * Usage:
 *   node run-tests.js --url=<SERVER_URL>
 * 
 * Prerequisites:
 *   - Node.js v18+
 *   - Backend server must be running
 */

import { argv } from 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';

// Test Configuration
const CONFIG_FILE = './config.json';
let config = {
    baseUrl: 'http://localhost:9006',
    timeout: 10000,
    retries: 2,
    verbose: true,
    testUsers: {
        manager: { email: 'manager@unolo.com', password: 'password123' },
        employee: { email: 'rahul@unolo.com', password: 'password123' },
        employee2: { email: 'priya@unolo.com', password: 'password123' }
    }
};

// Load config from file if exists
if (existsSync(CONFIG_FILE)) {
    try {
        const fileConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
        config = { ...config, ...fileConfig };
    } catch (e) {
        console.warn('Warning: Could not parse config.json, using defaults');
    }
}

// Parse command line arguments
for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url' && argv[i + 1]) {
        config.baseUrl = argv[i + 1];
    } else if (argv[i].startsWith('--url=')) {
        config.baseUrl = argv[i].split('=')[1];
    } else if (argv[i] === '--quiet' || argv[i] === '-q') {
        config.verbose = false;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
        console.log(`
Field Force Tracker - Integration Tests

Usage:
  node run-tests.js [options]

Options:
  --url=<URL>     Base URL of the API server
  --quiet, -q     Suppress passing tests output
  --help, -h      Show this help message

Examples:
  node run-tests.js --url=http://152.67.7.111:9006
  node run-tests.js --url=https://dmm.mooh.me
`);
        process.exit(0);
    }
}

const BASE_URL = config.baseUrl;

// Console Colors
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Test Results
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

/**
 * Simple HTTP client using Node.js http/https modules
 */
function makeRequest(urlStr, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (options.token) {
            headers['Authorization'] = `Bearer ${options.token}`;
        }

        const body = options.body ? JSON.stringify(options.body) : null;
        if (body) {
            headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = httpModule.request({
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: headers,
            timeout: config.timeout
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        data: jsonData,
                        headers: res.headers
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        data: {},
                        raw: data,
                        headers: res.headers
                    });
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Request failed: ${e.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

async function get(endpoint, token) {
    return makeRequest(`${BASE_URL}${endpoint}`, { method: 'GET', token });
}

async function post(endpoint, body, token) {
    return makeRequest(`${BASE_URL}${endpoint}`, { method: 'POST', body, token });
}

async function put(endpoint, body, token) {
    return makeRequest(`${BASE_URL}${endpoint}`, { method: 'PUT', body, token });
}

// Assertion Helpers
function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) throw new Error(message || `Expected "${expected}" but got "${actual}"`);
}

function assertDefined(value, message) {
    if (value === undefined || value === null) throw new Error(message || 'Expected value to be defined');
}

function assertStatus(response, expectedStatus, message) {
    assertEqual(response.status, expectedStatus, message || `Expected status ${expectedStatus} but got ${response.status}`);
}

function assertSuccess(response, message) {
    assert(response.ok, message || 'Expected successful response');
    assert(response.data && response.data.success, message || 'Expected success:true in response');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main Test Execution
async function runTests() {
    const startTime = Date.now();

    console.log(`${COLORS.bright}${COLORS.white}
╔════════════════════════════════════════════════════════════╗
║     Field Force Tracker - Integration Test Suite           ║
╚════════════════════════════════════════════════════════════╝${COLORS.reset}`);
    console.log(`${COLORS.cyan}Target: ${BASE_URL}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Time: ${new Date().toISOString()}${COLORS.reset}\n`);

    const tokens = {};

    // ━━ Authentication Tests ━━
    console.log(`${COLORS.bright}${COLORS.cyan}━ Authentication ━${COLORS.reset}\n`);

    try {
        // Manager Login
        const mgrLogin = await post('/api/auth/login', config.testUsers.manager);
        if (mgrLogin.status === 200 && mgrLogin.data.success) {
            console.log(`${COLORS.green}  ✓ Manager should be able to login${COLORS.reset}`);
            results.passed++;
            tokens.manager = mgrLogin.data.data.token;
        } else {
            console.log(`${COLORS.red}  ✗ Manager should be able to login${COLORS.reset}`);
            console.log(`${COLORS.red}    Status: ${mgrLogin.status}, Response: ${JSON.stringify(mgrLogin.data)}${COLORS.reset}`);
            results.failed++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Manager should be able to login${COLORS.reset}`);
        console.log(`${COLORS.red}    Error: ${e.message}${COLORS.reset}`);
        results.failed++;
    }

    try {
        // Employee Login
        const empLogin = await post('/api/auth/login', config.testUsers.employee);
        if (empLogin.status === 200 && empLogin.data.success) {
            console.log(`${COLORS.green}  ✓ Employee should be able to login${COLORS.reset}`);
            results.passed++;
            tokens.employee = empLogin.data.data.token;
        } else {
            console.log(`${COLORS.red}  ✗ Employee should be able to login${COLORS.reset}`);
            console.log(`${COLORS.red}    Status: ${empLogin.status}, Response: ${JSON.stringify(empLogin.data)}${COLORS.reset}`);
            results.failed++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Employee should be able to login${COLORS.reset}`);
        console.log(`${COLORS.red}    Error: ${e.message}${COLORS.reset}`);
        results.failed++;
    }

    try {
        // Invalid credentials
        const invalidLogin = await post('/api/auth/login', { email: 'invalid@test.com', password: 'wrong' });
        if (invalidLogin.status === 401) {
            console.log(`${COLORS.green}  ✓ Invalid credentials should fail${COLORS.reset}`);
            results.passed++;
        } else {
            console.log(`${COLORS.red}  ✗ Invalid credentials should fail${COLORS.reset}`);
            console.log(`${COLORS.red}    Expected 401, got ${invalidLogin.status}${COLORS.reset}`);
            results.failed++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Invalid credentials should fail${COLORS.reset}`);
        results.failed++;
    }

    try {
        // Auth me without token
        const authMe = await get('/api/auth/me');
        if (authMe.status === 401) {
            console.log(`${COLORS.green}  ✓ Protected endpoint should require authentication${COLORS.reset}`);
            results.passed++;
        } else {
            console.log(`${COLORS.red}  ✗ Protected endpoint should require authentication${COLORS.reset}`);
            console.log(`${COLORS.red}    Expected 401, got ${authMe.status}${COLORS.reset}`);
            results.failed++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Protected endpoint should require authentication${COLORS.reset}`);
        results.failed++;
    }

    try {
        // Auth me with token
        if (tokens.manager) {
            const authMe = await get('/api/auth/me', tokens.manager);
            if (authMe.status === 200 && authMe.data.success) {
                console.log(`${COLORS.green}  ✓ /auth/me should return user profile with valid token${COLORS.reset}`);
                results.passed++;
            } else {
                console.log(`${COLORS.red}  ✗ /auth/me should return user profile with valid token${COLORS.reset}`);
                results.failed++;
            }
        } else {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No manager token${COLORS.reset}`);
            results.skipped++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ /auth/me should return user profile with valid token${COLORS.reset}`);
        results.failed++;
    }

    // ━━ Manager Dashboard Tests ━━
    console.log(`\n${COLORS.bright}${COLORS.cyan}━ Manager Dashboard ━${COLORS.reset}\n`);

    try {
        if (tokens.manager) {
            const stats = await get('/api/dashboard/stats', tokens.manager);
            if (stats.status === 200 && stats.data.success) {
                console.log(`${COLORS.green}  ✓ Manager can get dashboard stats${COLORS.reset}`);
                results.passed++;
            } else {
                console.log(`${COLORS.red}  ✗ Manager can get dashboard stats${COLORS.reset}`);
                results.failed++;
            }
        } else {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No manager token${COLORS.reset}`);
            results.skipped++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Manager can get dashboard stats${COLORS.reset}`);
        console.log(`${COLORS.red}    Error: ${e.message}${COLORS.reset}`);
        results.failed++;
    }

    // ━━ Employee Check-in Tests ━━
    console.log(`\n${COLORS.bright}${COLORS.cyan}━ Employee Check-in ━${COLORS.reset}\n`);

    try {
        if (tokens.employee) {
            const clients = await get('/api/checkin/clients', tokens.employee);
            if (clients.status === 200 && clients.data.success && Array.isArray(clients.data.data)) {
                console.log(`${COLORS.green}  ✓ Employee can get assigned clients${COLORS.reset}`);
                results.passed++;
            } else {
                console.log(`${COLORS.red}  ✗ Employee can get assigned clients${COLORS.reset}`);
                results.failed++;
            }
        } else {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No employee token${COLORS.reset}`);
            results.skipped++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Employee can get assigned clients${COLORS.reset}`);
        results.failed++;
    }

    try {
        if (tokens.employee) {
            const active = await get('/api/checkin/active', tokens.employee);
            if (active.status === 200) {
                console.log(`${COLORS.green}  ✓ Employee can get active check-in${COLORS.reset}`);
                results.passed++;
            } else {
                console.log(`${COLORS.red}  ✗ Employee can get active check-in${COLORS.reset}`);
                results.failed++;
            }
        } else {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No employee token${COLORS.reset}`);
            results.skipped++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Employee can get active check-in${COLORS.reset}`);
        results.failed++;
    }

    try {
        if (tokens.employee) {
            const history = await get('/api/checkin/history', tokens.employee);
            if (history.status === 200 && history.data.success) {
                console.log(`${COLORS.green}  ✓ Employee can get check-in history${COLORS.reset}`);
                results.passed++;
            } else {
                console.log(`${COLORS.red}  ✗ Employee can get check-in history${COLORS.reset}`);
                results.failed++;
            }
        } else {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No employee token${COLORS.reset}`);
            results.skipped++;
        }
    } catch (e) {
        console.log(`${COLORS.red}  ✗ Employee can get check-in history${COLORS.reset}`);
        results.failed++;
    }

    // ━━ Summary ━━
    const duration = Date.now() - startTime;

    console.log(`\n${COLORS.bright}${COLORS.white}
╔════════════════════════════════════════════════════════════╗
║                     Test Summary                           ║
╚════════════════════════════════════════════════════════════╝${COLORS.reset}`);
    console.log(`${COLORS.cyan}Duration: ${(duration / 1000).toFixed(2)}s${COLORS.reset}`);
    console.log(`${COLORS.green}Passed: ${results.passed}${COLORS.reset}`);
    console.log(`${results.failed > 0 ? COLORS.red : COLORS.green}Failed: ${results.failed}${COLORS.reset}`);
    console.log(`${COLORS.yellow}Skipped: ${results.skipped}${COLORS.reset}`);
    console.log(`\n${COLORS.cyan}URL: ${BASE_URL}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Completed: ${new Date().toISOString()}${COLORS.reset}\n`);

    process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
    console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error.message);
    process.exit(1);
});
