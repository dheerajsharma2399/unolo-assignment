const db = require('../config/database');
const bcrypt = require('bcrypt');

async function updatePasswords() {
    const hash = await bcrypt.hash('password123', 10);
    console.log('New hash:', hash);

    await db.execute('UPDATE users SET password = ?', [hash]);
    console.log('Passwords updated successfully!');

    process.exit(0);
}

updatePasswords().catch(err => {
    console.error(err);
    process.exit(1);
});
