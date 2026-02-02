const Database = require('better-sqlite3');
const path = require('path');
let bcrypt;

try {
    bcrypt = require('bcrypt');
} catch (err) {
    try {
        bcrypt = require('bcryptjs');
    } catch (err2) {
        console.error('Error: Could not load bcrypt or bcryptjs. Make sure dependencies are installed.');
        process.exit(1);
    }
}

// Adjust the path to your database file
const dbPath = path.join(__dirname, '../data/database.sqlite');

console.log(`Connecting to database at: ${dbPath}`);
let db;
try {
    db = new Database(dbPath, { fileMustExist: true });
} catch (error) {
    console.error('Error opening database:', error.message);
    console.error('Make sure you are running this script from the backend directory.');
    process.exit(1);
}

async function resetPasswords() {
    const password = 'password123';
    console.log(`Hashing password: ${password}...`);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const users = [
        'manager@unolo.com',
        'rahul@unolo.com',
        'priya@unolo.com'
    ];

    const updateStmt = db.prepare('UPDATE users SET password = ? WHERE email = ?');

    console.log('Updating user passwords...');
    let changes = 0;
    
    const transaction = db.transaction(() => {
        for (const email of users) {
            const info = updateStmt.run(hashedPassword, email);
            if (info.changes > 0) {
                console.log(`✓ Updated password for ${email}`);
                changes += info.changes;
            } else {
                console.log(`✗ User ${email} not found`);
            }
        }
    });

    transaction();
    console.log(`\nSuccess! Updated ${changes} users.`);
}

resetPasswords().catch(console.error);