# Technical Questions & Answers

## 1. Scaling to 10,000 Employees

Question: If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

Answer:
The first thing that would break is definatly the sqlite database. SQLite is file based and only allows one write operation at a time. 10,000 concurrent writes would cause all sorts of problems like:

- SQLITE_BUSY errors because processes are fighting for the write lock
- Really high latency and requests timing out
- Possible data loss if the server crashes under the load

Heres how i would fix it:

1. Migrate to a proper RDBMS like PostgreSQL or MySQL. They handle row-level locking and high concurrency much better.
2. Set up connection pooling to manage database connections efficiently instead of opening and closing connections for every request.
3. Run multiple instances of the Node.js backend behind a load balancer to spread out the traffic.
4. Use a message queue like RabbitMQ or AWS SQS to decouple the API from the database. The API accepts the check-in, pushes it to a queue, and a worker process handles the actual database write.

## 2. JWT Security Issue

Question: The current JWT implementation has a security issue. What is it and how would you improve it?

Answer:
Heres the problem: the login endpoint includes the users password hash in the JWT payload. Heres the offending code:

```javascript
const token = jwt.sign(
    { id: user.id, ..., password: user.password }, // This is bad!
    process.env.JWT_SECRET
);
```

JWTs are just Base64 encoded, not encrypted. Anyone with the token can decode it and see the password hash. This makes offline brute-force attacks much easier to pull off.

The fix is simple: dont put sensitive data in the token. Only include what you need to identify the user and check their permissions (id, email, role). Nothing more.

## 3. Offline Check-in Support

Question: How would you implement offline check-in support?

Answer:
Heres my approach:

1. Use Service Workers to cache the application shell. When the user goes offline, save the check-in data (coordinates, timestamp, notes) to localStorage or IndexedDB.

2. Use the Service Workers Background Sync API to automatically send the stored request once the connection comes back.

3. On the backend, modify the POST /checkin endpoint to accept an optional checkin_time field. If its provided (meaning it came from an offline sync), use that timestamp instead of the current server time. This preserves when the person actually checked in, not when their phone finally got signal.

## 4. SQL vs NoSQL

Question: Explain the difference between SQL and NoSQL databases. For this Field Force Tracker application, which would you recommend and why?

Answer:
SQL databases are relational with structured tables, defined schemas, and relationships between tables. Theyre great for complex queries and maintaining data integrity.

NoSQL databases are more flexible with their schemas, using documents, key-pairs, or other formats. They shine with unstructured data and horizontal scaling.

For this application, id go with SQL. Heres why:

The data model is pretty relational - Employees report to Managers, Check-ins are linked to both Employees and Clients. Managers need to run complex reports with joins across multiple tables. SQL also gives you ACID compliance which is super important for attendance and payroll data. You dont want two check-ins getting recorded for the same time slot because of a race condition.

## 5. Authentication vs Authorization

Question: What is the difference between authentication and authorization? Identify where each is implemented in this codebase.

Answer:
Authentication is about verifying who the user is (proving their identity). Authorization is about verifying what the user is allowed to do (checking their permissions).

In this codebase:

Authentication happens in backend/routes/auth.js - the login endpoint verifies credentials and issues a JWT. The authenticateToken middleware in middleware/auth.js verifies the JWT on subsequent requests.

Authorization is handled by the requireManager middleware in middleware/auth.js which checks if the user has the manager role. Some routes also have their own role checks like checking if req.user.role !== 'employee'.

## 6. Race Conditions

Question: Explain what a race condition is. Can you identify any potential race conditions in this codebase? How would you prevent them?

Answer:
A race condition is when the systems behavior depends on the sequence or timing of events that you cant control. Things happen in an unpredictable order because of how the scheduler runs the code.

I see a potential race condition in backend/routes/checkin.js. The code checks for active check-ins with a SELECT query and then inserts a new check-in. If two requests come in at almost the same time, both might pass the SELECT check before either one inserts. This could result in two active check-ins for the same employee, which is definatly not right.

Heres how to prevent it:

1. Add a database constraint like: CREATE UNIQUE INDEX unique_active ON checkins(employee_id) WHERE status = 'checked_in'. This prevents duplicate active check-ins at the database level.

2. Wrap the check-and-insert logic in a database transaction with the appropriate locking to make it atomic.
