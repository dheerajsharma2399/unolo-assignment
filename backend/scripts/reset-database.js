/**
 * Database Reset Script
 *
 * WARNING: This will DELETE all data and recreate the database!
 *
 * Usage:
 *   node scripts/reset-database.js
 *
 * This will:
 * 1. Delete the existing database file
 * 2. Run schema.sql to create tables
 * 3. Run seed.sql to populate test data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          Database Reset Script - WARNING!                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Database:', dbPath);
console.log('Schema:', schemaPath);
console.log('Seed:', seedPath);
console.log('');

// Check if database exists
if (fs.existsSync(dbPath)) {
    console.log('⚠ Existing database found.');
    const stats = fs.statSync(dbPath);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log('  Modified:', stats.mtime.toISOString());
    console.log('');

    // Delete the database
    try {
        fs.unlinkSync(dbPath);
        console.log('✓ Deleted existing database.\n');
    } catch (err) {
        console.error('✗ Failed to delete database:', err.message);
        console.log('\nMake sure the backend is not running, then try again.');
        process.exit(1);
    }
} else {
    console.log('No existing database found.\n');
}

// Run schema.sql
console.log('Running schema.sql...');
try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    execSync(`sqlite3 "${dbPath}" "${schema.replace(/CREATE DATABASE.*;/g, '').replace(/USE.*;/g, '')}"`, {
        stdio: 'inherit',
        shell: true
    });
    console.log('✓ Schema applied.\n');
} catch (err) {
    console.error('✗ Failed to apply schema:', err.message);
    process.exit(1);
}

// Run seed.sql
console.log('Running seed.sql...');
try {
    const seed = fs.readFileSync(seedPath, 'utf8');
    // Remove MySQL-specific statements for SQLite
    const sqliteSeed = seed
        .replace(/CREATE DATABASE.*;/g, '')
        .replace(/USE.*;/g, '')
        .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
        .replace(/ENUM\([^)]+\)/g, 'TEXT')
        .replace(/FOREIGN KEY.*REFERENCES users\(id\)/g, '')
        .replace(/FOREIGN KEY.*REFERENCES clients\(id\)/g, '')
        .replace(/FOREIGN KEY.*ON DELETE CASCADE/g, '');

    execSync(`sqlite3 "${dbPath}" "${sqliteSeed}"`, {
        stdio: 'inherit',
        shell: true
    });
    console.log('✓ Seed data applied.\n');
} catch (err) {
    console.error('✗ Failed to apply seed data:', err.message);
    process.exit(1);
}

// Verify
console.log('Verifying database...');
const Database = require('better-sqlite3');
const db = new Database(dbPath);

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
const checkinCount = db.prepare('SELECT COUNT(*) as count FROM checkins').get();

console.log(`  Users: ${userCount.count}`);
console.log(`  Clients: ${clientCount.count}`);
console.log(`  Checkins: ${checkinCount.count}`);

console.log('\n✓ Database reset complete!');
console.log('\nYou can now restart the backend:');
console.log('  docker restart unolo-backend-1');
console.log('\nOr if running locally:');
console.log('  npm start');

process.exit(0);
