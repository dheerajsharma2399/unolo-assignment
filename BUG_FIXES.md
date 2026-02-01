# Bug Fixes Documentation

## 1. Dashboard Syntax Error (SQLite Incompatibility)
- **Location:** `backend/routes/dashboard.js`
- **Symptom:** Employee dashboard fails to load with error: `SqliteError: near "7": syntax error`.
- **Issue:** The query used MySQL-specific syntax `DATE_SUB(NOW(), INTERVAL 7 DAY)` which is not supported by SQLite.
- **Fix:** Replaced with SQLite equivalent: `datetime('now', '-7 days')`.

## 2. Check-in Column Name Mismatch
- **Location:** `backend/routes/checkin.js`
- **Symptom:** Check-in fails with error: `SqliteError: table checkins has no column named lat`.
- **Issue:** The `INSERT` statement attempted to save data into `lat` and `lng` columns, but the database schema uses `latitude` and `longitude`.
- **Fix:** Updated the SQL query to use `latitude` and `longitude`.

## 3. Missing Check-in Timestamps (Empty History)
- **Location:** `backend/routes/checkin.js`
- **Symptom:** Check-ins are successful but do not appear on the History page or Dashboard "Today's Activity".
- **Issue:** The `INSERT` query did not include the `checkin_time` column. Unlike MySQL, SQLite was not automatically setting the current timestamp (or the schema default was not being triggered correctly/relied upon). This resulted in `NULL` dates, causing date-based filters in history/dashboard queries to exclude these records.
- **Fix:** Explicitly added `checkin_time` to the `INSERT` statement with value `datetime('now')`.

## 4. MySQL vs SQLite Date Functions
- **Location:** `backend/routes/checkin.js` and `backend/routes/dashboard.js`
- **Symptom:** Potential errors or incorrect time calculations during checkout or reporting.
- **Issue:** The codebase used `NOW()` which is a MySQL function and not supported by SQLite.
- **Fix:** Replaced all instances of `NOW()` with SQLite's `datetime('now')`.

## 5. Login Authentication Logic
- **Location:** `backend/routes/auth.js`
- **Symptom:** Login process was unreliable.
- **Issue:** `bcrypt.compare` returns a Promise, but it was being used in an `if` condition without `await`. This caused the condition to always evaluate as true (since a Promise object is truthy), potentially bypassing password checks.
- **Fix:** Added `await` keyword before `bcrypt.compare`.

## 6. API Status Codes
- **Location:** `backend/routes/checkin.js`
- **Symptom:** Frontend receives `200 OK` even when validation fails (e.g., missing Client ID).
- **Issue:** The API was returning success status codes for client errors.
- **Fix:** Updated validation logic to return `400 Bad Request` when required fields are missing.

## 7. History Page Crash (Frontend)
- **Location:** `frontend/src/pages/History.jsx`
- **Symptom:** The history page would crash on load.
- **Issue:** The `checkins` state was initialized to `null`, causing the `reduce` function to throw an error when attempting to process data before the API response arrived.
- **Fix:** Initialized `checkins` state to an empty array `[]` to ensure safe iteration.

## 8. Database Reset/Restart Loop (Environment)
- **Location:** Server Configuration (likely `nodemon`)
- **Symptom:** `SqliteError: attempt to write a readonly database` (Code: `SQLITE_READONLY_DBMOVED`) followed by database re-initialization logs.
- **Issue:** The development server (`nodemon`) watches the `database.sqlite` file. Every database write triggers a server restart. If the startup script re-initializes the database on boot, it deletes the file while the write operation is still active or pending, causing the error.
- **Fix:** Created `nodemon.json` to ignore `database.sqlite` to prevent restarts on database updates.

## 9. Manager Check-in Restriction
- **Location:** `backend/routes/checkin.js`
- **Symptom:** Managers could access check-in/check-out endpoints, which is not intended functionality for their role.
- **Issue:** Missing role-based access control on check-in endpoints.
- **Fix:** Added middleware logic to restrict `POST /` and `PUT /checkout` endpoints to users with the 'employee' role only.
