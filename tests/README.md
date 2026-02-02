# Field Force Tracker - Integration Tests

Enterprise-grade integration test suite for the Field Force Tracker API.

## Features

- **30+ tests** covering authentication, check-in flow, dashboard, and error handling
- **Remote server testing** - Test any deployment via URL
- **Retry mechanism** - Handles transient network failures
- **Colored output** - Easy to read test results
- **No dependencies** - Uses only Node.js built-in modules (v18+)

## Quick Start

```bash
cd tests
npm install

# Test local server
npm run test:local

# Test remote server (dmm.mooh.me)
npm run test:remote

# Test by IP address
npm run test:ip
```

## Usage

### Command Line Options

```bash
node run-tests.js --url=<SERVER_URL> --quiet
```

| Option | Description |
|--------|-------------|
| `--url=<URL>` | Base URL of the API server |
| `--quiet, -q` | Suppress passing tests output |
| `--help, -h` | Show help message |

### Examples

```bash
# Test local development server
node run-tests.js --url=http://localhost:9007

# Test production server
node run-tests.js --url=https://dmm.mooh.me

# Test by IP address
node run-tests.js --url=http://152.67.7.111:9007

# Quiet mode (only show failures)
node run-tests.js --url=https://dmm.mooh.me --quiet
```

### Using npm scripts

Edit `package.json` to add more server configurations:

```json
{
  "scripts": {
    "test:prod": "node run-tests.js --url=https://your-production.com",
    "test:staging": "node run-tests.js --url=https://staging.example.com"
  }
}
```

## Test Suites

### 1. Authentication Tests (9 tests)
- Manager and employee login
- Invalid credentials handling
- Token refresh
- Protected endpoints
- Logout

### 2. Manager Dashboard Tests (4 tests)
- Dashboard statistics
- Daily summary
- Role-based access control

### 3. Employee Check-in Tests (10 tests)
- Get assigned clients
- Check-in with location validation
- Active check-in verification
- Check-out functionality
- History retrieval
- Cleanup after tests

### 4. Validation & Error Handling Tests (6 tests)
- Missing required fields
- Invalid client IDs
- Invalid coordinates
- Missing authentication
- Invalid tokens

### 5. API Structure Tests (5 tests)
- Content-type verification
- Response structure consistency
- User role verification
- Distance calculation in response

## Configuration

Create a `config.json` file in the tests directory:

```json
{
    "baseUrl": "http://localhost:9007",
    "timeout": 10000,
    "retries": 2,
    "verbose": true,
    "testUsers": {
        "manager": {
            "email": "manager@unolo.com",
            "password": "password123"
        },
        "employee": {
            "email": "rahul@unolo.com",
            "password": "password123"
        },
        "employee2": {
            "email": "priya@unolo.com",
            "password": "password123"
        }
    }
}
```

## Sample Output

```
╔════════════════════════════════════════════════════════════╗
║     Field Force Tracker - Integration Test Suite           ║
╚════════════════════════════════════════════════════════════╝
Target: https://dmm.mooh.me
Time: 2026-02-02T12:00:00.000Z

━ Authentication ━

  ✓ Manager should be able to login
  ✓ Employee should be able to login
  ✓ Invalid credentials should fail
  ...

╔════════════════════════════════════════════════════════════╗
║                     Test Summary                           ║
╚════════════════════════════════════════════════════════════╝
Duration: 12.34s
Passed: 33
Failed: 0
Skipped: 1

URL: https://dmm.mooh.me
Completed: 2026-02-02T12:00:12.000Z
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    cd tests
    npm install
    npm run test:remote
```

## Requirements

- Node.js v18 or higher (for native fetch support)
- Backend server running and accessible
- Test users configured in the database

## Troubleshooting

### "This script requires Node.js v18+"
Upgrade Node.js or use nvm:
```bash
nvm install 18
nvm use 18
```

### Connection refused
Verify the server is running and the URL is correct:
```bash
curl https://dmm.mooh.me/api/auth/login
```

### Tests failing
1. Check server logs for errors
2. Verify test users exist in database
3. Run with `--quiet` to see only failures
4. Check network connectivity to server
