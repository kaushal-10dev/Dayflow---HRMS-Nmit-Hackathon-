@ -11,18 +11,21 @@ npm install
npm start
```

Open `http://localhost:3000`. The server creates the SQLite database `dayflow.sqlite` automatically and seeds these demo accounts. Existing `dayflow-db.json` data is migrated automatically on the first SQLite startup.
Start a local MongoDB service first, then open `http://localhost:3000`. The server connects to `mongodb://127.0.0.1:27017` and uses the `dayflow_hrms` database by default. Set `MONGO_URI` or `MONGO_DB_NAME` to override these values. If MongoDB is empty, existing `dayflow-db.json` data is imported automatically on the first startup.

- Employee: `alex.smith@dayflow.co` / `dayflow123`
- Employee: `priya.nair@dayflow.co` / `employee123` (`DF-3001`)
- Employee: `daniel.lee@dayflow.co` / `designer123` (`DF-3002`)
- Employee: `sara.thomas@dayflow.co` / `engineer123` (`DF-3003`)
- Manager: `jordan.miller@dayflow.co` / `manager123`
- HR: `maya.chen@dayflow.co` / `admin123`

The API covers sign up/sign in with JWT sessions, employee-only public registration, employee profiles, attendance check-in/check-out, leave creation and approval, read-only employee payroll with HR updates, manager team scoping, performance progress, work-commitment status, and audit events. Data is stored in relational SQLite tables, so signups, approvals, profile updates, and other mutations survive server restarts. The responsive dashboard includes the authentication gate, employee portfolio, manager/HR approval queue, and performance view. Directly opening [index.html](index.html) still works as a static visual preview.
The API covers sign up/sign in with JWT sessions, employee-only public registration, employee profiles, attendance check-in/check-out, leave creation and approval, read-only employee payroll with HR updates, manager team scoping, performance progress, work-commitment status, and audit events. Data is stored in MongoDB collections, so signups, approvals, profile updates, and other mutations survive server restarts. The responsive dashboard includes the authentication gate, employee portfolio, manager/HR approval queue, and performance view. Directly opening [index.html](index.html) still works as a static visual preview.

The authenticated portfolio assistant answers questions about the signed-in employee's own attendance, leave, payroll, profile, goals, and commitment status. The Light/Dark theme toggle is saved in the browser and restored on the next visit.

Management endpoints include `/api/admin/employees`, `/api/admin/attendance`, `/api/admin/leaves`, `/api/admin/performance`, leave status updates, payroll updates, and performance updates. HR has organization-wide access; managers are limited to employees assigned to them.

From the manager or HR People view, the `Payroll` action updates gross pay and deductions and stores the calculated net pay. The `Review` action stores an employee goal, progress percentage, feedback, and commitment status. All changes are persisted in SQLite and are reflected when the employee logs in again.
From the manager or HR People view, the `Payroll` action updates gross pay and deductions and stores the calculated net pay. The `Review` action stores an employee goal, progress percentage, feedback, and commitment status. All changes are persisted in MongoDB and are reflected when the employee logs in again.

This is a hackathon prototype. Set `JWT_SECRET` in deployment, use HTTPS, and move browser sessions to secure HttpOnly cookies before production use.
This is a hackathon prototype. Set `JWT_SECRET` in deployment, use HTTPS, move browser sessions to secure HttpOnly cookies, and protect the local MongoDB instance with authentication before production use.
