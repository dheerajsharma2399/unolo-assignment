# Technical Questions & Answers

## 1. Scaling to 10,000 Employees
**Question:** If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

**Answer:**
The first breaking point would be the sqlite db. SQLite is a file based database that allows only one write operation at a time. 10,000 concurrent write requests would result in: many erros such as
- `SQLITE_BUSY` errors as processes fight for the write lock.
- High latency and request timeouts.
- Potential data loss if the server crashes under load.

**Fix:**
1. **Database Migration:** Migrate from SQLite to peeoper RDBMS like **PostgreSQL** or **MySQL**. These support row-level locking and high concurrency.
2. **Connection Pooling:** Implement a connection pool to manage database connections efficiently, preventing the overhead of opening/closing connections for every request.
3. **Load Balancing:** Run multiple instances of the Node.js backend behind a load balancer to distribute traffic.
4. **Asynchronous Processing:** Use a message queue (like RabbitMQ or AWS SQS) to decouple the API from the database. The API accepts the check-in, pushes it to a queue, and a worker process handles the database write.

## 2. JWT Security Issue
**Question:** The current JWT implementation has a security issue. What is it and how would you improve it?

**Answer:**
**Issue:** The `login` endpoint includes the user's **password hash** in the JWT payload (`password: user.password`).
```javascript
const token = jwt.sign(
    { id: user.id, ..., password: user.password }, // Security Risk!
    process.env.JWT_SECRET
);
```
JWTs are merely Base64 encoded, not encrypted. Anyone with the token can decode it and see the password hash. This increases the attack surface for offline brute-force attacks.

**Improvement:**
Remove sensitive data from the payload. The token should only contain the minimal information needed to identify the user and their permissions (id, email, role).

## 3. Offline Check-in Support
**Question:** How would you implement offline check-in support?

**Answer:**
1. **Frontend Storage:** Use **Service Workers** to cache the application shell. When offline, save check-in data (coordinates, timestamp) to `localStorage` or `IndexedDB`.
2. **Background Sync:** Use the Service Worker's **Background Sync API** to automatically send the stored request when the connection is restored.
3. **Backend Adaptation:** Modify the `POST /checkin` endpoint to accept an optional `checkin_time` field. If provided (offline sync), use that timestamp instead of the current server time to preserve the actual check-in time.

## 4. SQL vs NoSQL
**Question:** Explain the difference between SQL and NoSQL databases. For this Field Force Tracker application, which would you recommend and why?

**Answer:**
- **SQL (Relational):** Structured tables with defined schemas and relationships. Good for complex queries and data integrity.
- **NoSQL (Non-Relational):** Flexible schemas (documents, key-pairs). Good for unstructured data and rapid scaling.

**Recommendation: SQL**
The data model is inherently relational (Employees -> Managers, Check-ins -> Employees/Clients). Managers need complex reports involving joins across multiple tables. SQL ensures ACID compliance, which is critical for accurate attendance and payroll data.

## 5. Authentication vs Authorization
**Question:** What is the difference between authentication and authorization? Identify where each is implemented in this codebase.

**Answer:**
- **Authentication (AuthN):** Verifying **who** the user is.
- **Authorization (AuthZ):** Verifying **what** the user is allowed to do.

**In this codebase:**
- **Authentication:** `backend/routes/auth.js` (Login) and `middleware/auth.js` (`authenticateToken` verifies JWT).
- **Authorization:** `middleware/auth.js` (`requireManager` checks role) and route logic (e.g., `req.user.role !== 'employee'` checks).

## 6. Race Conditions
**Question:** Explain what a race condition is. Can you identify any potential race conditions in this codebase? How would you prevent them?

**Answer:**
**Definition:** When system behavior depends on the sequence or timing of uncontrollable events.

**In Codebase:**
In `backend/routes/checkin.js`, the code checks for active check-ins (`SELECT`) and then inserts (`INSERT`). If two requests arrive simultaneously, both might pass the `SELECT` check before either inserts, resulting in double check-ins.

**Prevention:**
1. **Database Constraint:** Add a unique index: `CREATE UNIQUE INDEX unique_active ON checkins(employee_id) WHERE status = 'checked_in';`.
2. **Transactions:** Wrap the check-and-insert logic in a database transaction with appropriate locking.