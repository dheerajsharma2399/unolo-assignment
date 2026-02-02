/**
 * Fix Password Hash Script
 *
 * Run this on the server to fix invalid bcrypt hashes in the database.
 *
 * Usage:
 *   node scripts/fix-passwords.js
 *
 * This will update all user passwords to use a valid bcrypt hash for 'password123'
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const NEW_PASSWORD_HASH = '$2b$10$MF9Y9DHObFzJKGWmpvtlp.mZSqWQHQfJOPWSQebCyTyTa59f0CGUG';

console.log('Fixing password hashes...');
console.log('Database:', dbPath);

const db = new Database(dbPath);

// Update all user passwords
const stmt = db.prepare('UPDATE users SET password = ? WHERE email LIKE ?');

const emails = [
    'manager@unolo.com',
    'rahul@unolo.com',
    'priya@unolo.com',
    'vikram@unolo.com'
];

let updated = 0;
for (const email of emails) {
    const result = stmt.run(NEW_PASSWORD_HASH, email);
    if (result.changes > 0) {
        console.log(`  ✓ Updated password for ${email}`);
        updated++;
    } else {
        console.log(`  ⚠ User not found: ${email}`);
    }
}

console.log(`\nUpdated ${updated} passwords.`);

// Verify the fix
console.log('\nVerifying fix...');
const users = db.prepare('SELECT id, name, email, role FROM users').all();
console.log(`Found ${users.length} users in database:`);
for (const user of users) {
    console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
}

// Test bcrypt compare
console.log('\nTesting bcrypt hash...');
bcrypt.compare('password123', NEW_PASSWORD_HASH).then(isValid => {
    if (isValid) {
        console.log('  ✓ New hash is valid for password123');
    } else {
        console.log('  ✗ New hash is INVALID!');
    }
    console.log('\nDone!');
    process.exit(0);
}).catch(err => {
    console.error('  ✗ Error testing hash:', err.message);
    process.exit(1);
});
