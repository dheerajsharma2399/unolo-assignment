const pool = require('../config/database');

(async () => {
    try {
        console.log('Running migration: Adding distance_from_client column...');
        await pool.execute('ALTER TABLE checkins ADD COLUMN distance_from_client REAL');
        console.log('Migration successful: Column added.');
    } catch (error) {
        if (error.message && error.message.includes('duplicate column name')) {
            console.log('Migration skipped: Column already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    }
    process.exit(0);
})();