/**
 * Integration Test Script for Field Force Tracker API
 * 
 * Prerequisites:
 * 1. Backend server must be running on http://localhost:3001
 * 2. Node.js v18+ (for native fetch support)
 * 
 * Usage: node test/integration_test.js
 */

const BASE_URL = 'http://localhost:3001';

// Colors for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

if (!globalThis.fetch) {
    console.error(`${RED}Error: This script requires Node.js v18+ for native 'fetch' support.${RESET}`);
    process.exit(1);
}

async function request(endpoint, method = 'GET', token = null, body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        throw new Error(`Request failed: ${error.message}`);
    }
}

function assert(condition, message) {
    if (condition) {
        console.log(`${GREEN}✓ PASS:${RESET} ${message}`);
    } else {
        console.error(`${RED}✗ FAIL:${RESET} ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function runTests() {
    console.log(`${CYAN}Starting API Integration Tests...${RESET}\n`);
    
    let managerToken;
    let employeeToken;
    let clientId;
    let clientLocation;

    // --- 1. Authentication Tests ---
    try {
        console.log(`${YELLOW}--- Authentication ---${RESET}`);
        
        // Manager Login
        const loginMgr = await request('/auth/login', 'POST', null, {
            email: 'manager@unolo.com',
            password: 'password123'
        });
        assert(loginMgr.status === 200 && loginMgr.data.success, 'Manager Login');
        managerToken = loginMgr.data.data.token;

        // Employee Login
        const loginEmp = await request('/auth/login', 'POST', null, {
            email: 'rahul@unolo.com',
            password: 'password123'
        });
        assert(loginEmp.status === 200 && loginEmp.data.success, 'Employee Login');
        employeeToken = loginEmp.data.data.token;

    } catch (e) {
        console.error(`${RED}Critical Auth Failure:${RESET}`, e.message);
        return;
    }

    // --- 2. Manager Feature Tests ---
    try {
        console.log(`\n${YELLOW}--- Manager Features ---${RESET}`);
        
        // Dashboard Stats
        const stats = await request('/dashboard/stats', 'GET', managerToken);
        assert(stats.status === 200 && stats.data.success, 'Get Manager Dashboard Stats');
        
        // Daily Summary (Feature B)
        const summary = await request('/dashboard/summary', 'GET', managerToken);
        assert(summary.status === 200 && summary.data.success, 'Get Daily Summary Report');
        console.log(`   Summary for date: ${summary.data.data.date}`);

    } catch (e) {
        console.error(`${RED}Manager Test Failure:${RESET}`, e.message);
    }

    // --- 3. Employee Feature Tests ---
    try {
        console.log(`\n${YELLOW}--- Employee Features ---${RESET}`);
        
        // Employee Dashboard
        const empDash = await request('/dashboard/employee', 'GET', employeeToken);
        assert(empDash.status === 200 && empDash.data.success, 'Get Employee Dashboard');

        // Get Assigned Clients
        const clients = await request('/checkin/clients', 'GET', employeeToken);
        assert(clients.status === 200 && clients.data.success, 'Get Assigned Clients');
        
        if (clients.data.data.length > 0) {
            const client = clients.data.data[0];
            clientId = client.id;
            // Use client's location if available, or default to a test location
            clientLocation = {
                latitude: client.latitude || 28.4595,
                longitude: client.longitude || 77.0266
            };
            console.log(`   Selected Client: ${client.name} (ID: ${clientId})`);
        } else {
            throw new Error('No clients assigned to employee, cannot test check-in');
        }

        // Clean up: Check out if already checked in
        const active = await request('/checkin/active', 'GET', employeeToken);
        if (active.data.data) {
            console.log('   User already checked in, performing cleanup checkout...');
            await request('/checkin/checkout', 'PUT', employeeToken);
        }

        // Perform Check-in (Feature A - Distance Calculation)
        const checkin = await request('/checkin', 'POST', employeeToken, {
            client_id: clientId,
            latitude: clientLocation.latitude,
            longitude: clientLocation.longitude,
            notes: 'Integration test check-in'
        });
        assert(checkin.status === 201 && checkin.data.success, 'Perform Check-in');
        console.log(`   Distance calculated: ${checkin.data.data.distance_from_client} km`);
        
        // Verify Active Check-in
        const activeCheck = await request('/checkin/active', 'GET', employeeToken);
        assert(activeCheck.status === 200 && activeCheck.data.data !== null, 'Verify Active Check-in');

        // Perform Checkout
        const checkout = await request('/checkin/checkout', 'PUT', employeeToken);
        assert(checkout.status === 200 && checkout.data.success, 'Perform Checkout');

        // Verify History
        const history = await request('/checkin/history', 'GET', employeeToken);
        assert(history.status === 200 && history.data.success && history.data.data.length > 0, 'Get Check-in History');

    } catch (e) {
        console.error(`${RED}Employee Test Failure:${RESET}`, e.message);
    }

    console.log(`\n${CYAN}Tests Completed.${RESET}`);
}

runTests();
