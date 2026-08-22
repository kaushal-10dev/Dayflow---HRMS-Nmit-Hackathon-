const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const db = low(new FileSync(path.join(__dirname, 'dayflow-db.json')));
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dayflow-development-secret';
app.use(express.json());
app.use(express.static(__dirname));

db.defaults({ users: [], attendance: [], leaveRequests: [], payroll: [] }).write();
function nextId(collection) { return collection.reduce((max, item) => Math.max(max, item.id), 0) + 1; }
function safeUser(user) { const { passwordHash, ...publicUser } = user; return publicUser; }
function seed() {
  if (db.get('users').size().value() > 0) return;
  const users = [{ id: 1, employeeId: 'DF-2048', name: 'Alex Smith', email: 'alex.smith@dayflow.co', passwordHash: bcrypt.hashSync('dayflow123', 10), role: 'employee', department: 'Design', jobTitle: 'Product designer', phone: '+1 555 019 2048', address: 'New York, NY', salary: 6200 }, { id: 2, employeeId: 'DF-1001', name: 'Maya Chen', email: 'maya.chen@dayflow.co', passwordHash: bcrypt.hashSync('admin123', 10), role: 'hr', department: 'People Ops', jobTitle: 'HR manager', phone: '+1 555 019 1001', address: 'New York, NY', salary: 7800 }];
  db.set('users', users).set('attendance', [{ id: 1, userId: 1, workDate: '2024-10-21', checkIn: '08:54', checkOut: '16:12', status: 'Present' }, { id: 2, userId: 1, workDate: '2024-10-18', checkIn: '09:02', checkOut: '17:21', status: 'Present' }, { id: 3, userId: 1, workDate: '2024-10-17', checkIn: '08:47', checkOut: '13:05', status: 'Half-day' }]).set('leaveRequests', [{ id: 1, userId: 1, type: 'Paid leave', startDate: '2024-11-04', endDate: '2024-11-05', days: 2, remarks: 'Personal time', status: 'Pending', managerComment: '', createdAt: new Date().toISOString() }, { id: 2, userId: 1, type: 'Sick leave', startDate: '2024-09-02', endDate: '2024-09-02', days: 1, remarks: 'Not feeling well', status: 'Approved', managerComment: '', createdAt: new Date().toISOString() }]).set('payroll', [{ id: 1, userId: 1, grossPay: 6200, deductions: 1380, netPay: 4820 }, { id: 2, userId: 2, grossPay: 7800, deductions: 1716, netPay: 6084 }]).write();
}
seed();
function tokenFor(user) { return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' }); }
function auth(req, res, next) { const token = req.headers.authorization?.replace('Bearer ', ''); if (!token) return res.status(401).json({ error: 'Authentication required' }); try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Invalid or expired session' }); } }
function hrOnly(req, res, next) { if (req.user.role !== 'hr') return res.status(403).json({ error: 'HR access required' }); next(); }
function userById(id) { return db.get('users').find({ id }).value(); }
app.post('/api/auth/signup', (req, res) => { const { employeeId, name, email, password, role = 'employee', department = 'General', jobTitle = 'Employee' } = req.body; if (!employeeId || !name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Employee ID, name, email, and an 8+ character password are required' }); if (db.get('users').find(user => user.email === email.toLowerCase() || user.employeeId === employeeId).value()) return res.status(409).json({ error: 'Employee ID or email is already registered' }); const user = { id: nextId(db.get('users').value()), employeeId, name, email: email.toLowerCase(), passwordHash: bcrypt.hashSync(password, 10), role: role === 'hr' ? 'hr' : 'employee', department, jobTitle, phone: '', address: '', salary: 0 }; db.get('users').push(user).write(); res.status(201).json({ user: safeUser(user), token: tokenFor(user) }); });
app.post('/api/auth/signin', (req, res) => { const user = db.get('users').find(item => item.email === req.body.email?.toLowerCase()).value(); if (!user || !bcrypt.compareSync(req.body.password || '', user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password' }); res.json({ user: safeUser(user), token: tokenFor(user) }); });
app.get('/api/me', auth, (req, res) => res.json(safeUser(userById(req.user.id))));
app.get('/api/dashboard', auth, (req, res) => res.json({ user: safeUser(userById(req.user.id)), attendance: db.get('attendance').filter({ userId: req.user.id }).value(), leave: db.get('leaveRequests').filter({ userId: req.user.id }).value(), leaveBalance: 14 }));
app.get('/api/attendance', auth, (req, res) => res.json(db.get('attendance').filter({ userId: req.user.id }).value()));
app.get('/api/leaves', auth, (req, res) => res.json(db.get('leaveRequests').filter({ userId: req.user.id }).value()));
app.post('/api/leaves', auth, (req, res) => { const { type, startDate, endDate, days, remarks = '' } = req.body; if (!type || !startDate || !endDate || !days) return res.status(400).json({ error: 'Leave type, dates, and duration are required' }); const leave = { id: nextId(db.get('leaveRequests').value()), userId: req.user.id, type, startDate, endDate, days: Number(days), remarks, status: 'Pending', managerComment: '', createdAt: new Date().toISOString() }; db.get('leaveRequests').push(leave).write(); res.status(201).json(leave); });
app.get('/api/payroll', auth, (req, res) => res.json(db.get('payroll').find({ userId: req.user.id }).value()));
app.get('/api/admin/employees', auth, hrOnly, (req, res) => res.json(db.get('users').map(user => safeUser(user)).value()));
app.get('/api/admin/leaves', auth, hrOnly, (req, res) => res.json(db.get('leaveRequests').map(leave => ({ ...leave, employeeName: userById(leave.userId).name })).value()));
app.patch('/api/admin/leaves/:id', auth, hrOnly, (req, res) => { if (!['Approved', 'Rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Status must be Approved or Rejected' }); const leave = db.get('leaveRequests').find({ id: Number(req.params.id) }).assign({ status: req.body.status, managerComment: req.body.comment || '' }).write(); res.json(leave); });
app.patch('/api/admin/employees/:id/payroll', auth, hrOnly, (req, res) => { const grossPay = Number(req.body.grossPay); const deductions = Number(req.body.deductions || 0); if (!grossPay || grossPay < deductions) return res.status(400).json({ error: 'Valid salary values are required' }); const payroll = db.get('payroll').find({ userId: Number(req.params.id) }).assign({ grossPay, deductions, netPay: grossPay - deductions }).write(); res.json(payroll); });
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Dayflow running at http://localhost:${PORT}`));
