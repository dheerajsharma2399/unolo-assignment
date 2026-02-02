const Database = require('better-sqlite3');
const path = require('path');
let bcrypt;

try {
    bcrypt = require('bcrypt');
} catch (err) {
    try {
        bcrypt = require('bcryptjs');
    } catch (err2) {
        console.error('Error: Could not load bcrypt/bcryptjs');
        process.exit(1);
    }
}

const dbPath = path.join(__dirname, '../data/database.sqlite');
console.log(`Checking database at: ${dbPath}`);

const db = new Database(dbPath, { readonly: true });

const usersToCheck = ['manager@unolo.com', 'priya@unolo.com', 'rahul@unolo.com'];
const password = 'password123';

console.log('\n--- Verifying Login Credentials ---');

usersToCheck.forEach(email => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
        console.log(`❌ ${email}: User NOT FOUND`);
    } else {
        const match = bcrypt.compareSync(password, user.password);
        if (match) {
            console.log(`✅ ${email}: Password MATCHES`);
        } else {
            console.log(`❌ ${email}: Password INVALID (Hash mismatch)`);
        }
    }
});

console.log('-----------------------------------\n');