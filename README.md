# Dayflow - HRMS (Nmit Hackathon)

Dayflow is a lightweight HRMS dashboard prototype for the employee experience.

## Run locally

Install dependencies and start the full-stack app:

```bash
npm install
npm start
```

Open `http://localhost:3000`. The server creates `dayflow-db.json` automatically and seeds these demo accounts:

- Employee: `alex.smith@dayflow.co` / `dayflow123`
- Manager: `jordan.miller@dayflow.co` / `manager123`
- HR: `maya.chen@dayflow.co` / `admin123`

The API covers sign up/sign in with JWT sessions, employee-only public registration, employee profiles, attendance, leave creation and approval, read-only employee payroll with HR updates, manager team scoping, performance progress, work-commitment status, and audit events. The responsive dashboard includes the authentication gate, employee portfolio, manager/HR approval queue, and performance view. Directly opening [index.html](index.html) still works as a static visual preview.

This is a hackathon prototype. Set `JWT_SECRET` in deployment, use HTTPS, and move browser sessions to secure HttpOnly cookies before production use.
