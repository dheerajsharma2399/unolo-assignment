This file contains the finding i got from the app.

I have deployed the app and is testing for all errors,  functionality, while reading code. 
I am taking help of AI LLM to analyse the logs that are generated.

1. tried login with employee id, dashbard error
"
Employee dashboard error: SqliteError: near "7": syntax error
at Database.prepare (/app/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
at /app/config/database.js:22:33
at new Promise (<anonymous>)
at Object.execute (/app/config/database.js:18:12)
at /app/routes/dashboard.js:76:40
at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {
code: 'SQLITE_ERROR'
}
"


it shows 
" Your Current Location
Lat: 28.459500, Long: 77.026600

Active Check-in
You are currently checked in at ABC Corp

Since: 16/1/2024, 9:00:00 am

Check Out
"


history page doesnt work,

logout works.



2.
Manager Dashboard
"Team Size
3

Active Check-ins
1

Today's Visits
0

Today's Activity
Your Current Location
Lat: 28.459500, Long: 77.026600

New Check-in
Select Client

Choose a client...
Notes (Optional)
Add any notes about this visit...
Check In"




bug 1
dashboard and checkin uses myqsl commands in sqlite database.
there are many instances where mysql queries are used.
changed commands to be sqlite compatible.



bug 2
"Missing checkin_time on Insert: SQLite does not automatically set the current timestamp for columns unless explicitly defined in the table schema with DEFAULT CURRENT_TIMESTAMP. The INSERT query in checkin.js was missing checkin_time, which results in NULL dates. This causes the history and dashboard queries (which filter by date) to return nothing for new check-ins."

bug 3 
nothing on history page for both employee and manager.

bug 4
employee cant checkin to any client.

incorrect column name usage

"The error SqliteError: table checkins has no column named lat occurs because the database schema uses latitude and longitude as column names, but the INSERT query in checkin.js is trying to insert into columns named lat and lng."

bug 5


