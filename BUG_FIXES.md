# Bug Fixes Documentation

## 1. Dashboard Syntax Error (SQLite Incompatibility)

Location: backend/routes/dashboard.js

Symptom: Employee dashboard fails to load with error SqliteError: near "7": syntax error

Issue: The query used MySQL-specific syntax DATE_SUB(NOW(), INTERVAL 7 DAY) which sqlite dont support.

Fix: Replaced with SQLite equivalent datetime('now', '-7 days').

## 2. Check-in Column Name Mismatch

Location: backend/routes/checkin.js

Symptom: Check-in fails with error SqliteError: table checkins has no column named lat

Issue: The INSERT statement was trying to save data into lat and lng columns, but the database schema uses latitude and longitude.

Fix: Updated the SQL query to use the correct column names latitude and longitude.

## 3. Missing Check-in Timestamps (Empty History)

Location: backend/routes/checkin.js

Symptom: Check-ins are successful but dont appear on the History page or Dashboard Today's Activity

Issue: The INSERT query did not include the checkin_time column. SQLite was not automatically setting the current timestamp like MySQL would. This resulted in NULL dates, causing date-based filters in history and dashboard queries to exclude these records.

Fix: Explicitly added checkin_time to the INSERT statement with value datetime('now').

## 4. MySQL vs SQLite Date Functions

Location: backend/routes/checkin.js and backend/routes/dashboard.js

Symptom: Potential errors or incorrect time calculations during checkout or reporting.

Issue: The codebase used NOW() which is a MySQL function and not supported by SQLite.

Fix: Replaced all instances of NOW() with SQLite's datetime('now').

## 5. Login Authentication Logic

Location: backend/routes/auth.js

Symptom: Login process was unreliable.

Issue: bcrypt.compare returns a Promise, but it was being used in an if condition without await. This caused the condition to always evaluate as true (since a Promise object is truthy), potentially bypassing password checks.

Fix: Added await keyword before bcrypt.compare.

## 6. API Status Codes

Location: backend/routes/checkin.js

Symptom: Frontend receives 200 OK even when validation fails (e.g., missing Client ID).

Issue: The API was returning success status codes for client errors.

Fix: Updated validation logic to return 400 Bad Request when required fields are missing.

## 7. History Page Crash (Frontend)

Location: frontend/src/pages/History.jsx

Symptom: The history page would crash on load.

Issue: The checkins state was initialized to null, causing the reduce function to throw an error when attempting to process data before the API response arrived.

Fix: Initialized checkins state to an empty array [] to ensure safe iteration.

## 8. Database Reset/Restart Loop (Environment)

Location: Server Configuration (likely nodemon)

Symptom: SqliteError: attempt to write a readonly database (Code: SQLITE_READONLY_DBMOVED) followed by database re-initialization logs.

Issue: The development server (nodemon) watches the database.sqlite file. Every database write triggers a server restart. If the startup script re-initializes the database on boot, it deletes the file while the write operation is still active or pending, causing the error.

Fix: Created nodemon.json to ignore data/database.sqlite to prevent restarts on database updates.

## 9. Manager Check-in Restriction

Location: backend/routes/checkin.js

Symptom: Managers could access check-in/check-out endpoints, which is not intended functionality for their role.

Issue: Missing role-based access control on check-in endpoints.

Fix: Added middleware logic to restrict POST / and PUT /checkout endpoints to users with the 'employee' role only.

## 10. Frontend: Check-in Form Submission Failure

Location: frontend/src/pages/CheckIn.jsx

Symptom: Clicking Check In reloads the page instead of submitting the form.

Issue: The handleCheckIn function was missing e.preventDefault(), causing the default form submission behavior (page reload).

Fix: Added e.preventDefault() to the event handler.

## 11. Counter Component Stale Closure

Location: frontend/src/components/Counter.jsx

Symptom: The counter toggles between initial value and initial+1 instead of incrementing continuously.

Issue: The setInterval callback closed over the initial count variable.

Fix: Updated setCount to use the functional update form setCount(c => c + 1).

## 12. Backend: Coordinate Validation Bug

Location: backend/routes/checkin.js

Symptom: Check-ins at the equator (latitude 0) or prime meridian (longitude 0) would fail validation.

Issue: The validation if (!latitude) treated 0 as falsy/invalid.

Fix: Changed validation to strictly check for undefined (latitude === undefined).

## 13. API Status Codes: Concurrent Check-ins

Location: backend/routes/checkin.js

Symptom: Trying to check in while already checked in returned a generic 400 Bad Request.

Issue: Use of 400 status code for a state conflict.

Fix: Changed status code to 409 (Conflict) for better semantic correctness.

## 14. Frontend: History Page Crash (Robustness)

Location: frontend/src/pages/History.jsx

Symptom: Page crash if API returns null/undefined data.

Issue: While state was initialized to [], setCheckins(response.data.data) could set it to null if the API response was empty, leading to reduce failure.

Fix: Added safe navigation (checkins || []) in the render and calculation logic.

## Additional Notes from Research

The app was deployed and tested for errors and functionality issues. Heres what was found:

Employee login shows dashboard error because MySQL syntax was used in SQLite queries. The history page doesnt work for both employee and manager. Employee check-in fails because of incorrect column names (lat/lng instead of latitude/longitude).

For the distance_from_client feature to work fully, you need to ensure the Database has the new column and the Frontend is updated to display the data.

Update Database Schema
The INSERT statement in backend/routes/checkin.js expects a column named distance_from_client in the checkins table. You need to add this column to your SQLite database.

Run this SQL command (you can use a tool like DB Browser for SQLite or the sqlite3 CLI):

ALTER TABLE checkins ADD COLUMN distance_from_client REAL;
