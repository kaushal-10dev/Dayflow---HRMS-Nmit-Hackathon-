const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'dayflow.db'));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dayflow-development-secret';

app.use(express.json());
app.use(express.static(__dirname));

db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'hr')), department TEXT NOT NULL,
    job_title TEXT NOT NULL, phone TEXT DEFAULT '', address TEXT DEFAULT '',
    salary INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL, check_in TEXT, check_out TEXT, status TEXT NOT NULL DEFAULT 'Present',
    UNIQUE(user_id, work_date)
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER NOT NULL,
    remarks TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'Pending', manager_comment TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gross_pay INTEGER NOT NULL, deductions INTEGER NOT NULL DEFAULT 0, net_pay INTEGER NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const seedUser = db.prepare(`INSERT OR IGNORE INTO users
  (employee_id, name, email, password_hash, role, department, job_title, phone, address, salary)
  VALUES (@employeeId, @name, @email, @passwordHash, @role, @department, @jobTitle, @phone, @address, @salary)`);
const alex = { employeeId: 'DF-2048', name: 'Alex Smith', email: 'alex.smith@dayflow.co', passwordHash: bcrypt.hashSync('dayflow123', 10), role: 'employee', department: 'Design', jobTitle: 'Product designer', phone: '+1 555 019 2048', address: 'New York, NY', salary: 6200 };
const maya = { employeeId: 'DF-1001', name: 'Maya Chen', email: 'maya.chen@dayflow.co', passwordHash: bcrypt.hashSync('admin123', 10), role: 'hr', department: 'People Ops', jobTitle: 'HR manager', phone: '+1 555 019 1001', address: 'New York, NY', salary: 7800 };
seedUser.run(alex); seedUser.run(maya);
const alexId = db.prepare('SELECT id FROM users WHERE email = ?').get(alex.email).id;
const mayaId = db.prepare('SELECT id FROM users WHERE email = ?').get(maya.email).id;
const seedAttendance = db.prepare('INSERT OR IGNORE INTO attendance (user_id, work_date, check_in, check_out, status) VALUES (?, ?, ?, ?, ?)');
[['2024-10-21','08:54','16:12','Present'],['2024-10-18','09:02','17:21','Present'],['2024-10-17','08:47','13:05','Half-day']].forEach(row => seedAttendance.run(alexId, ...row));
seedAttendance.run(mayaId, '2024-10-21', '08:31', null, 'Present');
const seedLeave = db.prepare('INSERT OR IGNORE INTO leave_requests (user_id, type, start_date, end_date, days, remarks, status) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM leave_requests WHERE user_id = ? AND start_date = ?)');
seedLeave.run(alexId, 'Paid leave', '2024-11-04', '2024-11-05', 2, 'Personal time', 'Pending', alexId, '2024-11-04');
seedLeave.run(alexId, 'Sick leave', '2024-09-02', '2024-09-02', 1, 'Not feeling well', 'Approved', alexId, '2024-09-02');
const seedPayroll = db.prepare('INSERT OR IGNORE INTO payroll (user_id, gross_pay, deductions, net_pay) VALUES (?, ?, ?, ?)');
seedPayroll.run(alexId, 6200, 1380, 4820); seedPayroll.run(mayaId, 7800, 1716, 6084);

function createToken(user) { return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' }); }
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Invalid or expired session' }); }
}
function hrOnly(req, res, next) { if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR access required' }); next(); }
function safeUser(id) { return db.prepare('SELECT id, employee_id AS employeeId, name, email, role, department, job_title AS jobTitle, phone, address, salary FROM users WHERE id = ?').get(id); }

app.post('/api/auth/signup', (req, res) => {
  const { employeeId, name, email, password, role = 'employee', department = 'General', jobTitle = 'Employee' } = req.body;
  if (!employeeId || !name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Employee ID, name, email, and an 8+ character password are required' });
  try {
    const result = db.prepare('INSERT INTO users (employee_id, name, email, password_hash, role, department, job_title) VALUES (?, ?, ?, ?, ?, ?, ?)').run(employeeId, name, email.toLowerCase(), bcrypt.hashSync(password, 10), role === 'hr' ? 'hr' : 'employee', department, jobTitle);
    const user = safeUser(result.lastInsertRowid); res.status(201).json({ user, token: createToken(user) });
  } catch (error) { res.status(409).json({ error: 'Employee ID or email is already registered' }); }
});
app.post('/api/auth/signin', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.toLowerCase());
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) return res.status(401).json({ error: 'Incorrect email or password' });
  res.json({ user: safeUser(user.id), token: createToken(user) });
});
app.get('/api/me', auth, (req, res) => res.json(safeUser(req.user.id)));
app.get('/api/dashboard', auth, (req, res) => {
  const attendance = db.prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY work_date DESC LIMIT 7").all(req.user.id);
  const leave = db.prepare("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5").all(req.user.id);
  res.json({ user: safeUser(req.user.id), attendance, leave, leaveBalance: 14 });
});
app.get('/api/attendance', auth, (req, res) => res.json(db.prepare('SELECT * FROM attendance WHERE user_id = ? ORDER BY work_date DESC').all(req.user.id)));
app.post('/api/attendance/check-in', auth, (req, res) => { const date = req.body.date || new Date().toISOString().slice(0, 10); db.prepare("INSERT INTO attendance (user_id, work_date, check_in, status) VALUES (?, ?, time('now'), 'Present') ON CONFLICT(user_id, work_date) DO UPDATE SET check_in = COALESCE(check_in, time('now'))").run(req.user.id, date); res.status(201).json(db.prepare('SELECT * FROM attendance WHERE user_id = ? AND work_date = ?').get(req.user.id, date)); });
app.post('/api/attendance/check-out', auth, (req, res) => { const date = req.body.date || new Date().toISOString().slice(0, 10); db.prepare("UPDATE attendance SET check_out = time('now') WHERE user_id = ? AND work_date = ?").run(req.user.id, date); res.json(db.prepare('SELECT * FROM attendance WHERE user_id = ? AND work_date = ?').get(req.user.id, date)); });
app.get('/api/leaves', auth, (req, res) => res.json(db.prepare('SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)));
app.post('/api/leaves', auth, (req, res) => { const { type, startDate, endDate, days, remarks = '' } = req.body; if (!type || !startDate || !endDate || !days) return res.status(400).json({ error: 'Leave type, dates, and duration are required' }); const result = db.prepare('INSERT INTO leave_requests (user_id, type, start_date, end_date, days, remarks) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, type, startDate, endDate, Number(days), remarks); res.status(201).json(db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(result.lastInsertRowid)); });
app.get('/api/payroll', auth, (req, res) => res.json(db.prepare('SELECT * FROM payroll WHERE user_id = ?').get(req.user.id)));
app.get('/api/admin/employees', auth, hrOnly, (req, res) => res.json(db.prepare('SELECT id, employee_id AS employeeId, name, email, role, department, job_title AS jobTitle, phone, address, salary FROM users ORDER BY name').all()));
app.get('/api/admin/leaves', auth, hrOnly, (req, res) => res.json(db.prepare('SELECT leave_requests.*, users.name AS employee_name FROM leave_requests JOIN users ON users.id = leave_requests.user_id ORDER BY leave_requests.created_at DESC').all()));
app.patch('/api/admin/leaves/:id', auth, hrOnly, (req, res) => { const status = ['Approved', 'Rejected'].includes(req.body.status) ? req.body.status : null; if (!status) return res.status(400).json({ error: 'Status must be Approved or Rejected' }); db.prepare('UPDATE leave_requests SET status = ?, manager_comment = ? WHERE id = ?').run(status, req.body.comment || '', req.params.id); res.json(db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id)); });
app.patch('/api/admin/employees/:id/payroll', auth, hrOnly, (req, res) => { const gross = Number(req.body.grossPay); const deductions = Number(req.body.deductions || 0); if (!gross || gross < deductions) return res.status(400).json({ error: 'Valid salary values are required' }); db.prepare('INSERT INTO payroll (user_id, gross_pay, deductions, net_pay) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET gross_pay = excluded.gross_pay, deductions = excluded.deductions, net_pay = excluded.net_pay, updated_at = CURRENT_TIMESTAMP').run(req.params.id, gross, deductions, gross - deductions); res.json(db.prepare('SELECT * FROM payroll WHERE user_id = ?').get(req.params.id)); });
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Dayflow running at http://localhost:${PORT}`));
