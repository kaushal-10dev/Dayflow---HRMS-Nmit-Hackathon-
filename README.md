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
- HR: `maya.chen@dayflow.co` / `admin123`

The API covers sign up/sign in with JWT sessions, role-based HR access, employee profiles, attendance, leave creation and approval, and read-only employee payroll with HR updates. The responsive dashboard loads its attendance, leave, profile, payroll, and employee views from the API. Directly opening [index.html](index.html) still works as a static visual preview.
