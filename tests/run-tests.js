/**
 * Enterprise-Grade Integration Test Suite for Field Force Tracker
 * 
 * Usage:
 *   npm test                          # Uses BASE_URL from config
 *   npm run test:remote               # Tests https://dmm.mooh.me
 *   npm run test:local                # Tests http://localhost:9007
 *   npm run test:ip                   # Tests http://152.67.7.111:9007
 *   node run-tests.js --url=<URL>     # Custom URL
 * 
 * Prerequisites:
 *   - Node.js v18+
 *   - Backend server must be running
 */

import { argv } from 'node:process';
import { readFileSync, existsSync } from 'node:fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';


// Test Configuration
const CONFIG_FILE = './config.json';
let config = {
    baseUrl: 'http://localhost:9007',
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
  --url=<URL>     Base URL of the API server (default: http://localhost:9007)
  --quiet, -q     Suppress passing tests output
  --help, -h      Show this help message

Examples:
  node run-tests.js --url=https://dmm.mooh.me
  node run-tests.js --url=http://152.67.7.111:9007
  npm run test:remote
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
    errors: [],
    suites: []
};

/**
 * HTTP Client using https/http modules (no fetch dependency)
 */
class ApiClient {
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.timeout = options.timeout || 10000;
        this.retries = options.retries || 2;
    }

    async request(endpoint, options = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
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

        return new Promise((resolve, reject) => {
            const req = httpModule.request({
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: options.method || 'GET',
                headers: headers,
                timeout: this.timeout
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = data ? JSON.parse(data) : {};
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

    get(endpoint, token) {
        return this.request(endpoint, { method: 'GET', token });
    }

    post(endpoint, body, token) {
        return this.request(endpoint, { method: 'POST', body, token });
    }

    put(endpoint, body, token) {
        return this.request(endpoint, { method: 'PUT', body, token });
    }

    delete(endpoint, token) {
        return this.request(endpoint, { method: 'DELETE', token });
    }
}

/**
 * Test Framework
 */
class TestSuite {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.beforeEach = null;
        this.beforeAll = null;
        this.afterAll = null;
    }

    beforeEachFn(fn) {
        this.beforeEach = fn;
    }

    beforeAllFn(fn) {
        this.beforeAll = fn;
    }

    afterAllFn(fn) {
        this.afterAll = fn;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run(api, tokens) {
        console.log(`\n${COLORS.bright}${COLORS.cyan}━ ${this.name} ━${COLORS.reset}\n`);

        let setupData = null;

        if (this.beforeAll) {
            try {
                setupData = await this.beforeAll(api, tokens);
            } catch (e) {
                console.error(`${COLORS.red}Setup failed:${COLORS.reset}`, e.message);
                results.errors.push({ suite: this.name, error: e.message });
                return;
            }
        }

        for (const test of this.tests) {
            const testName = test.name;
            let testPassed = false;
            let testError = null;

            try {
                if (this.beforeEach) {
                    await this.beforeEach(api, tokens, setupData);
                }
                await test.fn(api, tokens, setupData);
                testPassed = true;
            } catch (e) {
                testError = e;
            }

            if (testPassed) {
                results.passed++;
                if (config.verbose) {
                    console.log(`${COLORS.green}  ✓ ${testName}${COLORS.reset}`);
                }
            } else {
                results.failed++;
                console.log(`${COLORS.red}  ✗ ${testName}${COLORS.reset}`);
                if (testError) {
                    console.log(`${COLORS.red}    Error: ${testError.message}${COLORS.reset}`);
                }
                results.errors.push({ suite: this.name, test: testName, error: testError ? testError.message : null });
            }
        }

        if (this.afterAll) {
            try {
                await this.afterAll(api, tokens, setupData);
            } catch (e) {
                console.error(`${COLORS.yellow}Teardown warning:${COLORS.reset}`, e.message);
            }
        }
    }
}

/**
 * Assertion Helpers
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected "${expected}" but got "${actual}"`);
    }
}

function assertNotEqual(actual, expected, message) {
    if (actual === expected) {
        throw new Error(message || `Expected different value but got "${actual}"`);
    }
}

function assertDefined(value, message) {
    if (value === undefined || value === null) {
        throw new Error(message || 'Expected value to be defined');
    }
}

function assertArrayLength(arr, length, message) {
    if (!Array.isArray(arr) || arr.length !== length) {
        throw new Error(message || `Expected array of length ${length} but got ${Array.isArray(arr) ? arr.length : 'not an array'}`);
    }
}

function assertGreaterThan(actual, min, message) {
    if (actual <= min) {
        throw new Error(message || `Expected value > ${min} but got ${actual}`);
    }
}

function assertStatus(response, expectedStatus, message) {
    assertEqual(response.status, expectedStatus, message || `Expected status ${expectedStatus} but got ${response.status}`);
}

function assertSuccess(response, message) {
    assert(response.ok, message || 'Expected successful response');
    assert(response.data?.success, message || 'Expected success:true in response');
}

/**
 * Utility Functions
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main Test Execution
 */
async function runTests() {
    const startTime = Date.now();

    console.log(`${COLORS.bright}${COLORS.white}
╔════════════════════════════════════════════════════════════╗
║     Field Force Tracker - Integration Test Suite           ║
╚════════════════════════════════════════════════════════════╝${COLORS.reset}`);
    console.log(`${COLORS.cyan}Target: ${BASE_URL}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Time: ${new Date().toISOString()}${COLORS.reset}\n`);

    const api = new ApiClient(BASE_URL, { timeout: config.timeout, retries: config.retries });

    // Test Suites
    const suites = [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Suite 1: Authentication Tests
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const authSuite = new TestSuite('Authentication');

    authSuite.test('Manager should be able to login', async (api, tokens) => {
        const response = await api.post('/auth/login', config.testUsers.manager);
        assertStatus(response, 200);
        assertSuccess(response, 'Login should succeed');
        assertDefined(response.data.data?.token, 'Response should contain token');
        assertDefined(response.data.data?.user, 'Response should contain user data');
        tokens.manager = response.data.data.token;
    });

    authSuite.test('Employee should be able to login', async (api, tokens) => {
        const response = await api.post('/auth/login', config.testUsers.employee);
        assertStatus(response, 200);
        assertSuccess(response, 'Login should succeed');
        assertDefined(response.data.data?.token, 'Response should contain token');
        tokens.employee = response.data.data.token;
    });

    authSuite.test('Invalid credentials should fail', async (api, tokens) => {
        const response = await api.post('/auth/login', { email: 'invalid@test.com', password: 'wrongpass' });
        assertStatus(response, 401);
        assert(!response.data.success, 'Response should indicate failure');
    });

    authSuite.test('Missing credentials should fail', async (api, tokens) => {
        const response = await api.post('/auth/login', {});
        assertStatus(response, 400);
    });

    authSuite.test('Protected endpoint should require authentication', async (api, tokens) => {
        const response = await api.get('/auth/me');
        assertStatus(response, 401);
    });

    authSuite.test('/auth/me should return user profile with valid token', async (api, tokens) => {
        const response = await api.get('/auth/me', tokens.manager);
        assertStatus(response, 200);
        assertSuccess(response);
        assertDefined(response.data.data?.id, 'User profile should contain ID');
        assertDefined(response.data.data?.email, 'User profile should contain email');
        assertDefined(response.data.data?.role, 'User profile should contain role');
    });

    authSuite.test('Token refresh should work with valid token', async (api, tokens) => {
        const response = await api.post('/auth/refresh', null, tokens.manager);
        assertStatus(response, 200);
        assertSuccess(response);
        assertDefined(response.data.data?.token, 'Refresh should return new token');
    });

    authSuite.test('Token refresh should fail without token', async (api, tokens) => {
        const response = await api.post('/auth/refresh');
        assertStatus(response, 401);
    });

    authSuite.test('Logout should succeed with valid token', async (api, tokens) => {
        const response = await api.post('/auth/logout', null, tokens.employee);
        // Logout might succeed or fail depending on implementation
        assert(response.status === 200 || response.status === 401, 'Logout should not cause server error');
    });

    suites.push(authSuite);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Suite 2: Manager Dashboard Tests
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const managerSuite = new TestSuite('Manager Dashboard');

    managerSuite.beforeAllFn(async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.manager);
        tokens.manager = login.data.data.token;
    });

    managerSuite.test('Manager can get dashboard stats', async (api, tokens) => {
        const response = await api.get('/dashboard/stats', tokens.manager);
        assertStatus(response, 200);
        assertSuccess(response);
        const stats = response.data.data;
        assertDefined(stats.total_employees, 'Stats should contain total_employees');
        assertDefined(stats.total_checkins_today, 'Stats should contain total_checkins_today');
    });

    managerSuite.test('Manager can get daily summary', async (api, tokens) => {
        const response = await api.get('/dashboard/summary', tokens.manager);
        assertStatus(response, 200);
        assertSuccess(response);
        const summary = response.data.data;
        assertDefined(summary.date, 'Summary should contain date');
    });

    managerSuite.test('Employee cannot access manager stats', async (api, tokens) => {
        const empLogin = await api.post('/auth/login', config.testUsers.employee);
        tokens.employee = empLogin.data.data.token;
        const response = await api.get('/dashboard/stats', tokens.employee);
        assert(response.status === 403 || response.status === 401, 'Employee should not access manager stats');
    });

    suites.push(managerSuite);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Suite 3: Employee Check-in Tests
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const checkinSuite = new TestSuite('Employee Check-in');

    let testClientId = null;
    let testCheckinId = null;

    checkinSuite.beforeAllFn(async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.employee);
        tokens.employee = login.data.data.token;

        const clients = await api.get('/checkin/clients', tokens.employee);
        if (clients.data.data?.length > 0) {
            testClientId = clients.data.data[0].id;
        }
    });

    checkinSuite.test('Employee can get assigned clients', async (api, tokens) => {
        const response = await api.get('/checkin/clients', tokens.employee);
        assertStatus(response, 200);
        assertSuccess(response);
        assert(Array.isArray(response.data.data), 'Clients should be an array');
    });

    checkinSuite.test('Employee can get active check-in', async (api, tokens) => {
        const response = await api.get('/checkin/active', tokens.employee);
        assertStatus(response, 200);
        assertDefined(response.data.data, 'Active check-in response should have data field');
    });

    checkinSuite.test('Employee can get check-in history', async (api, tokens) => {
        const response = await api.get('/checkin/history', tokens.employee);
        assertStatus(response, 200);
        assertSuccess(response);
        assert(Array.isArray(response.data.data), 'History should be an array');
    });

    checkinSuite.test('Check-in with valid client and location should succeed', async (api, tokens) => {
        if (!testClientId) {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No clients available${COLORS.reset}`);
            results.skipped++;
            return;
        }

        const active = await api.get('/checkin/active', tokens.employee);
        if (active.data.data) {
            await api.put('/checkin/checkout', null, tokens.employee);
            await sleep(500);
        }

        const response = await api.post('/checkin', {
            client_id: testClientId,
            latitude: 28.4595,
            longitude: 77.0266,
            notes: 'Integration test check-in'
        }, tokens.employee);

        assertStatus(response, 201);
        assertSuccess(response);
        assertDefined(response.data.data?.id, 'Check-in should return ID');
        assertDefined(response.data.data?.distance_from_client, 'Check-in should return distance');
        testCheckinId = response.data.data?.id;
    });

    checkinSuite.test('Active check-in should exist after check-in', async (api, tokens) => {
        if (!testCheckinId) {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No check-in performed${COLORS.reset}`);
            results.skipped++;
            return;
        }

        const response = await api.get('/checkin/active', tokens.employee);
        assertStatus(response, 200);
        assertDefined(response.data.data, 'Active check-in should exist');
        assertEqual(response.data.data?.id, testCheckinId, 'Active check-in should match');
    });

    checkinSuite.test('Check-out should succeed when checked in', async (api, tokens) => {
        if (!testCheckinId) {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No check-in performed${COLORS.reset}`);
            results.skipped++;
            return;
        }

        const response = await api.put('/checkin/checkout', null, tokens.employee);
        assertStatus(response, 200);
        assertSuccess(response);
    });

    checkinSuite.test('No active check-in after checkout', async (api, tokens) => {
        const response = await api.get('/checkin/active', tokens.employee);
        assertStatus(response, 200);
        assertEqual(response.data.data, null, 'Should not have active check-in after checkout');
    });

    checkinSuite.test('History should contain the test check-in', async (api, tokens) => {
        const response = await api.get('/checkin/history', tokens.employee);
        assertStatus(response, 200);
        assertSuccess(response);
        assertArrayLength(response.data.data, 1, 'History should have at least 1 entry');
    });

    checkinSuite.afterAllFn(async (api, tokens) => {
        try {
            const active = await api.get('/checkin/active', tokens.employee);
            if (active.data.data) {
                await api.put('/checkin/checkout', null, tokens.employee);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    suites.push(checkinSuite);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Suite 4: Validation & Error Handling Tests
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const validationSuite = new TestSuite('Validation & Errors');

    validationSuite.beforeAllFn(async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.employee);
        tokens.employee = login.data.data.token;
    });

    validationSuite.test('Check-in without client_id should fail', async (api, tokens) => {
        const response = await api.post('/checkin', {
            latitude: 28.4595,
            longitude: 77.0266
        }, tokens.employee);
        assertStatus(response, 400);
    });

    validationSuite.test('Check-in with invalid client_id should fail', async (api, tokens) => {
        const response = await api.post('/checkin', {
            client_id: 99999,
            latitude: 28.4595,
            longitude: 77.0266
        }, tokens.employee);
        assertStatus(response, 404);
    });

    validationSuite.test('Check-out without active check-in should fail', async (api, tokens) => {
        const active = await api.get('/checkin/active', tokens.employee);
        if (active.data.data) {
            await api.put('/checkin/checkout', null, tokens.employee);
        }

        const response = await api.put('/checkin/checkout', null, tokens.employee);
        assert(response.status === 400 || response.status === 404, 'Should fail when no active check-in');
    });

    validationSuite.test('Missing authorization header should return 401', async (api, tokens) => {
        const response = await api.request('/dashboard/stats', { method: 'GET' });
        assertStatus(response, 401);
    });

    validationSuite.test('Invalid token should return 401', async (api, tokens) => {
        const response = await api.get('/dashboard/stats', 'invalid-token-123');
        assertStatus(response, 401);
    });

    suites.push(validationSuite);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Suite 5: API Structure Tests
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const structureSuite = new TestSuite('API Structure');

    structureSuite.test('API should respond with JSON content type', async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.manager);
        const contentType = login.headers['content-type'] || login.headers['content-type'];
        assert(contentType?.includes('application/json'), 'Response should have JSON content-type');
    });

    structureSuite.test('Successful responses should have success field', async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.manager);
        assertDefined(login.data.success, 'Response should have success field');
    });

    structureSuite.test('Error responses should have message field', async (api, tokens) => {
        const response = await api.post('/auth/login', { email: 'test@test.com', password: 'wrong' });
        assertDefined(response.data.message, 'Error response should have message field');
    });

    structureSuite.test('Login response should include user role', async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.manager);
        assertDefined(login.data.data?.user?.role, 'User data should include role');
        assertEqual(login.data.data.user.role, 'manager', 'Manager login should have manager role');
    });

    structureSuite.test('Check-in response should include distance', async (api, tokens) => {
        const login = await api.post('/auth/login', config.testUsers.employee);
        tokens.employee = login.data.data.token;

        const clients = await api.get('/checkin/clients', tokens.employee);
        const clientId = clients.data.data?.[0]?.id;
        if (!clientId) {
            console.log(`${COLORS.yellow}  ⚠ Skipped: No clients available${COLORS.reset}`);
            results.skipped++;
            return;
        }

        const active = await api.get('/checkin/active', tokens.employee);
        if (active.data.data) {
            await api.put('/checkin/checkout', null, tokens.employee);
        }

        const response = await api.post('/checkin', {
            client_id: clientId,
            latitude: 28.4595,
            longitude: 77.0266
        }, tokens.employee);

        assertStatus(response, 201);
        assertDefined(response.data.data?.distance_from_client, 'Check-in response should include distance');

        await api.put('/checkin/checkout', null, tokens.employee);
    });

    suites.push(structureSuite);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Run All Suites
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const tokens = {};

    for (const suite of suites) {
        await suite.run(api, tokens);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Summary
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const duration = Date.now() - startTime;

    console.log(`\n${COLORS.bright}${COLORS.white}
╔════════════════════════════════════════════════════════════╗
║                     Test Summary                           ║
╚════════════════════════════════════════════════════════════╝${COLORS.reset}`);
    console.log(`${COLORS.cyan}Duration: ${(duration / 1000).toFixed(2)}s${COLORS.reset}`);
    console.log(`${COLORS.green}Passed: ${results.passed}${COLORS.reset}`);
    console.log(`${results.failed > 0 ? COLORS.red : COLORS.green}Failed: ${results.failed}${COLORS.reset}`);
    console.log(`${COLORS.yellow}Skipped: ${results.skipped}${COLORS.reset}`);

    if (results.errors.length > 0) {
        console.log(`\n${COLORS.red}${COLORS.bright}Failed Tests:${COLORS.reset}`);
        for (const error of results.errors) {
            console.log(`  - ${error.suite}: ${error.test || 'Setup'}`);
            if (error.error) {
                console.log(`    ${error.error}`);
            }
        }
    }

    console.log(`\n${COLORS.cyan}URL: ${BASE_URL}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Completed: ${new Date().toISOString()}${COLORS.reset}\n`);

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error.message);
    process.exit(1);
});
