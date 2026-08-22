const localApi = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API = localApi && location.port !== '3000' ? 'http://localhost:3000/api' : '/api';
const canUseApi = location.protocol !== 'file:' || localApi;
let currentUser = null;
let authMode = 'signin';
const authScreen = document.querySelector('#auth-screen');
const appShell = document.querySelector('.app-shell');
const authForm = document.querySelector('#auth-form');
const authCard = document.querySelector('.auth-card');
const authError = document.querySelector('#auth-error');
const authTitle = document.querySelector('#auth-title');
const authCopy = document.querySelector('#auth-copy');
const authEyebrow = document.querySelector('#auth-eyebrow');
const authSubmit = document.querySelector('#auth-submit');
const pageTitle = document.querySelector('#page-title');
const dashboard = document.querySelector('#dashboard-view');
const generic = document.querySelector('#generic-view');
const genericTitle = document.querySelector('#generic-title');
const genericSubtitle = document.querySelector('#generic-subtitle');
const genericContent = document.querySelector('#generic-content');
const modal = document.querySelector('#leave-modal');
const toast = document.querySelector('#toast');
const assistantPanel = document.querySelector('#assistant-panel');
const assistantMessages = document.querySelector('#assistant-messages');
const assistantForm = document.querySelector('#assistant-form');
const viewMeta = { attendance: ['Attendance', 'Your time, clearly accounted for.'], leave: ['Leave requests', 'Plan time away without the paperwork.'], employees: ['People', '48 people making good work happen.'], payroll: ['Payroll', 'Your compensation, always within reach.'], performance: ['Performance', 'Progress and commitment, in view.'], profile: ['My profile', 'The details that make you, you.'], settings: ['Settings', 'Make Dayflow work your way.'] };

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem('dayflow-token');
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try { response = await fetch(`${API}${path}`, { ...options, headers }); } catch { throw new Error('Cannot connect to Dayflow server. Run npm start and open http://localhost:3000.'); }
  const body = await response.text();
  let data = {};
  if (body.trim()) {
    try { data = JSON.parse(body); } catch { data = { error: 'The server returned an invalid response. Please try again.' }; }
  }
  if (!response.ok) { if (response.status === 401) { localStorage.removeItem('dayflow-token'); signOut(false); } if (response.status === 405) throw new Error('This page is using a static server. Open http://localhost:3000 instead.'); throw new Error(data.error || `Request failed (${response.status})`); }
  if (!body.trim()) throw new Error('The server returned an empty response. Please try again.');
  return data;
}
function setAuthenticated(user) {
  currentUser = user;
  const welcomeName = document.querySelector('#welcome-name');
  if (welcomeName) welcomeName.textContent = user.name.split(' ')[0];
  authScreen.style.display = 'none';
  appShell.classList.add('authenticated');
  const avatar = document.querySelector('#top-avatar');
  if (avatar) avatar.textContent = user.name.split(' ').map(part => part[0]).join('');
  const sidebarAvatar = document.querySelector('.user-mini .avatar');
  const sidebarName = document.querySelector('.user-mini strong');
  const sidebarRole = document.querySelector('.user-mini small');
  if (sidebarAvatar) sidebarAvatar.textContent = user.name.split(' ').map(part => part[0]).join('');
  if (sidebarName) sidebarName.textContent = user.name;
  if (sidebarRole) sidebarRole.textContent = `${user.jobTitle} · ${user.role}`;
  document.querySelector('#assistant-launcher').hidden = false;
  document.querySelectorAll('[data-management-only]').forEach(element => { element.style.display = ['hr', 'manager'].includes(user.role) ? '' : 'none'; });
}
function signOut(showMessage = true) { currentUser = null; localStorage.removeItem('dayflow-token'); appShell.classList.remove('authenticated'); authScreen.style.display = ''; assistantPanel.classList.remove('open'); assistantPanel.hidden = true; document.querySelector('#assistant-launcher').hidden = true; if (showMessage) { authError.textContent = 'You have been signed out.'; } }
function setAuthMode(mode) { authMode = mode; authCard.classList.toggle('signup-mode', mode === 'signup'); document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode)); authEyebrow.textContent = mode === 'signup' ? 'JOIN YOUR WORKSPACE' : 'WELCOME BACK'; authTitle.textContent = mode === 'signup' ? 'Create your Dayflow account' : 'Sign in to Dayflow'; authCopy.textContent = mode === 'signup' ? 'Your employee account starts here.' : 'Access your workday in one clear view.'; authSubmit.innerHTML = `${mode === 'signup' ? 'Create account' : 'Sign in'} <span>↗</span>`; authError.textContent = ''; }
function showToast(message) { toast.firstChild.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
function setTheme(theme) { document.body.classList.toggle('dark-mode', theme === 'dark'); localStorage.setItem('dayflow-theme', theme); document.querySelector('#theme-button').textContent = theme === 'dark' ? '☀' : '◐'; }
function addAssistantMessage(message, type) { const bubble = document.createElement('div'); bubble.className = `assistant-message ${type}`; bubble.textContent = message; assistantMessages.appendChild(bubble); assistantMessages.scrollTop = assistantMessages.scrollHeight; }
function table(rows, headers) { return `<table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`; }
function today() { return new Date().toISOString().slice(0, 10); }
function updateDashboard(data) {
  const todayRecords = data.attendance.filter(record => record.workDate === today());
  const present = todayRecords.filter(record => record.status === 'Present').length;
  const presentCount = document.querySelector('#present-count');
  const presentProgress = document.querySelector('#present-progress');
  const presentCaption = document.querySelector('#present-caption');
  if (presentCount) presentCount.innerHTML = `${present} <small>/ ${data.attendance.length || 1} records</small>`;
  if (presentProgress) presentProgress.style.width = `${Math.min(100, (present / Math.max(1, data.attendance.length)) * 100)}%`;
  if (presentCaption) presentCaption.textContent = `${data.leave.filter(item => item.status === 'Pending').length} leave requests awaiting review`;
  const balance = document.querySelector('#leave-balance');
  if (balance) balance.innerHTML = `${data.leaveBalance} <small>days remaining</small>`;
}

async function renderView(name) {
  if (name === 'dashboard') {
    dashboard.classList.add('active-view'); generic.classList.remove('active-view'); pageTitle.textContent = 'Overview';
    if (canUseApi && currentUser) { try { const data = await api('/dashboard'); const count = document.querySelector('.nav-count'); if (count) count.textContent = data.leave.filter(item => item.status === 'Pending').length; updateDashboard(data); } catch { showToast('Unable to refresh dashboard data'); } }
    return;
  }
  const [title, subtitle] = viewMeta[name] || viewMeta.attendance;
  dashboard.classList.remove('active-view'); generic.classList.add('active-view'); genericTitle.textContent = title; genericSubtitle.textContent = subtitle; pageTitle.textContent = title; genericContent.innerHTML = '<p class="subheading">Loading your data...</p>';
  if (!canUseApi) return;
  try {
    if (name === 'attendance') {
      const records = await api(['hr', 'manager'].includes(currentUser.role) ? '/admin/attendance' : '/attendance');
      const management = ['hr', 'manager'].includes(currentUser.role);
      const rows = records.map(record => `<tr><td>${management ? record.employeeName : record.workDate}</td><td>${management ? record.workDate : record.checkIn || '--'}</td><td>${management ? record.checkIn || '--' : record.checkOut || '--'}</td><td>${management ? record.checkOut || '--' : `<span class="pill ${record.status === 'Present' ? '' : 'pending'}">${record.status}</span>`}</td></tr>`).join('');
      genericContent.innerHTML = `${!management ? `<div class="attendance-actions"><button class="primary-button" data-attendance-action="check-in">Check in</button><button class="secondary-button" data-attendance-action="check-out">Check out</button></div>` : '<p class="subheading">Team attendance records</p>'}${table(rows, management ? ['Employee', 'Date', 'Check in', 'Check out'] : ['Date', 'Check in', 'Check out', 'Status'])}`;
    } else if (name === 'leave') {
      const leaves = await api(['hr', 'manager'].includes(currentUser.role) ? '/admin/leaves' : '/leaves');
      const management = ['hr', 'manager'].includes(currentUser.role);
      const rows = leaves.map(item => management ? `<tr><td>${item.employeeName}</td><td>${item.type}</td><td>${item.startDate} - ${item.endDate}</td><td><span class="pill ${item.status === 'Pending' ? 'pending' : ''}">${item.status}</span></td><td>${item.status === 'Pending' ? `<button class="text-button leave-action" data-leave-id="${item.id}" data-leave-status="Approved">Approve</button><button class="text-button leave-action reject" data-leave-id="${item.id}" data-leave-status="Rejected">Reject</button>` : '--'}</td></tr>` : `<tr><td>${item.type}</td><td>${item.startDate} - ${item.endDate}</td><td>${item.days}</td><td><span class="pill ${item.status === 'Pending' ? 'pending' : ''}">${item.status}</span></td></tr>`).join('');
      genericContent.innerHTML = `<div class="panel-heading"><h2>${management ? 'Approval queue' : 'My requests'}</h2>${!management ? '<button class="primary-button" data-open-modal="leave-modal">＋ New request</button>' : ''}</div>${table(rows, management ? ['Employee', 'Type', 'Dates', 'Status', 'Actions'] : ['Type', 'Dates', 'Days', 'Status'])}`;
    } else if (name === 'payroll') {
      const payroll = await api('/payroll');
      genericContent.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">CURRENT PAY PERIOD</p><h2>Salary overview</h2></div><span class="pill">Read only</span></div><div class="stat-grid" style="margin-top:25px"><article class="stat-card"><div class="stat-label">NET PAY</div><strong>$${payroll.netPay.toLocaleString()} <small>this month</small></strong><p>After taxes and deductions</p></article><article class="stat-card"><div class="stat-label">GROSS PAY</div><strong>$${payroll.grossPay.toLocaleString()} <small>this month</small></strong><p>Payroll managed by HR</p></article></div>`;
    } else if (name === 'performance') {
      const records = await api(currentUser.role === 'employee' ? '/performance' : '/admin/performance');
      genericContent.innerHTML = records.length ? records.map(item => `<div class="performance-card"><div><p class="eyebrow">${item.employeeName || 'YOUR CURRENT REVIEW'}</p><h2>${item.goal}</h2><p class="subheading">${item.feedback || 'No feedback added yet.'}</p></div><div class="performance-score"><strong>${item.progress}%</strong><span>${item.commitmentStatus} commitment</span></div><div class="progress"><span style="width:${item.progress}%"></span></div></div>`).join('') : '<p class="subheading">No performance review has been recorded yet.</p>';
    } else if (name === 'profile') {
      const user = await api('/me');
      genericContent.innerHTML = `<div class="panel-heading"><div class="user-mini" style="border:0;padding:0"><div class="avatar avatar-sage" style="width:64px;height:64px;font-size:16px">${user.name.split(' ').map(part => part[0]).join('')}</div><div><h2>${user.name}</h2><p class="subheading">${user.jobTitle} · ${user.department}</p></div></div><button class="primary-button" data-profile-edit>Edit profile</button></div><form class="profile-form" id="profile-form" hidden><label>Phone<input name="phone" value="${user.phone || ''}"></label><label>Address<input name="address" value="${user.address || ''}"></label><button class="primary-button" type="submit">Save changes</button></form>${table(`<tr><th>Email</th><td>${user.email}</td><th>Employee ID</th><td>${user.employeeId}</td></tr><tr><th>Phone</th><td>${user.phone || '--'}</td><th>Location</th><td>${user.address || '--'}</td></tr>`, [])}`;
    } else if (name === 'employees') {
      const employees = await api('/admin/employees');
      genericContent.innerHTML = table(employees.map(user => `<tr><td>${user.name}</td><td>${user.department}</td><td>${user.jobTitle}</td><td>${user.role}</td><td><button class="text-button" data-view-target="performance">View progress</button><button class="text-button payroll-edit" data-employee-id="${user.id}" data-employee-name="${user.name}" data-salary="${user.salary || 0}">Payroll</button><button class="text-button performance-edit" data-employee-id="${user.id}" data-employee-name="${user.name}">Review</button></td></tr>`).join(''), ['Employee', 'Department', 'Role', 'Access', 'Manage']);
    } else {
      genericContent.innerHTML = '<div class="panel-heading"><h2>Workspace preferences</h2></div><p class="subheading">Email notifications and weekly summaries are enabled for this workspace.</p>';
    }
  } catch (error) { genericContent.innerHTML = `<p class="subheading">${error.message}</p>`; }
}
function showView(name) { renderView(name); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name)); history.replaceState(null, '', `#${name}`); document.querySelector('.sidebar').classList.remove('open'); }
function openModal() { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-view]'); const target = event.target.closest('[data-view-target]'); const open = event.target.closest('[data-open-modal]');
  if (nav) { event.preventDefault(); showView(nav.dataset.view); }
  if (target) showView(target.dataset.viewTarget);
  if (open) openModal();
  if (event.target.closest('.modal-close') || event.target === modal) closeModal();
  if (event.target.closest('.mobile-menu')) document.querySelector('.sidebar').classList.toggle('open');
  const leaveAction = event.target.closest('.leave-action');
  if (leaveAction) updateLeave(leaveAction.dataset.leaveId, leaveAction.dataset.leaveStatus);
  const attendanceAction = event.target.closest('[data-attendance-action]');
  if (attendanceAction) updateAttendance(attendanceAction.dataset.attendanceAction);
  if (event.target.closest('[data-profile-edit]')) { const form = document.querySelector('#profile-form'); if (form) form.hidden = !form.hidden; }
  if (event.target.closest('#notification-button')) loadNotifications();
  if (event.target.closest('#theme-button')) setTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
  if (event.target.closest('#assistant-launcher')) { assistantPanel.hidden = false; assistantPanel.classList.add('open'); assistantPanel.setAttribute('aria-hidden', 'false'); }
  if (event.target.closest('#assistant-close')) { assistantPanel.classList.remove('open'); assistantPanel.setAttribute('aria-hidden', 'true'); }
  if (event.target.closest('#search-button')) { const query = prompt('Search people or open a view'); if (query) { const target = query.toLowerCase().includes('leave') ? 'leave' : query.toLowerCase().includes('attendance') ? 'attendance' : query.toLowerCase().includes('payroll') ? 'payroll' : query.toLowerCase().includes('performance') ? 'performance' : 'employees'; showView(target); } }
  const payrollEdit = event.target.closest('.payroll-edit');
  if (payrollEdit) updatePayroll(payrollEdit.dataset.employeeId, payrollEdit.dataset.employeeName, payrollEdit.dataset.salary);
  const performanceEdit = event.target.closest('.performance-edit');
  if (performanceEdit) updatePerformance(performanceEdit.dataset.employeeId, performanceEdit.dataset.employeeName);
});
assistantForm.addEventListener('submit', async event => { event.preventDefault(); const input = assistantForm.elements.question; const question = input.value.trim(); if (!question) return; addAssistantMessage(question, 'user'); input.value = ''; try { const result = await api('/assistant', { method: 'POST', body: JSON.stringify({ question }) }); addAssistantMessage(result.answer, 'bot'); } catch (error) { addAssistantMessage(error.message, 'bot'); } });
async function updateLeave(id, status) { try { await api(`/admin/leaves/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); showToast(`Leave request ${status.toLowerCase()}`); showView('leave'); } catch (error) { showToast(error.message); } }
async function updatePayroll(id, name, currentSalary) { const grossPay = prompt(`Monthly gross pay for ${name}`, currentSalary); if (grossPay === null) return; const deductions = prompt(`Monthly deductions for ${name}`, '0'); if (deductions === null) return; try { await api(`/admin/employees/${id}/payroll`, { method: 'PATCH', body: JSON.stringify({ grossPay, deductions }) }); showToast('Payroll updated'); } catch (error) { showToast(error.message); } }
async function updatePerformance(id, name) { const goal = prompt(`Current goal for ${name}`); if (goal === null) return; const progress = prompt('Progress percentage (0-100)', '0'); if (progress === null) return; const feedback = prompt('Manager feedback', ''); if (feedback === null) return; try { await api(`/admin/employees/${id}/performance`, { method: 'PATCH', body: JSON.stringify({ goal, progress, feedback, commitmentStatus: 'High', reviewStatus: 'On track' }) }); showToast('Performance review saved'); } catch (error) { showToast(error.message); } }
async function updateAttendance(action) { try { await api(`/attendance/${action}`, { method: action === 'check-in' ? 'POST' : 'PATCH', body: JSON.stringify({ workDate: today() }) }); showToast(action === 'check-in' ? 'Check-in recorded' : 'Check-out recorded'); showView('attendance'); } catch (error) { showToast(error.message); } }
async function loadNotifications() { try { const notifications = await api('/notifications'); showToast(notifications.length ? notifications.map(item => item.title).join(' · ') : 'No new notifications'); } catch (error) { showToast(error.message); } }
document.addEventListener('submit', async event => {
  if (event.target.id !== 'leave-form') return;
  event.preventDefault(); const form = new FormData(event.target);
  if (!canUseApi) { closeModal(); showToast('Start the server to save requests'); return; }
  try { const start = new Date(form.get('startDate')); const end = new Date(form.get('endDate')); const days = Math.max(1, Math.round((end - start) / 86400000) + 1); await api('/leaves', { method: 'POST', body: JSON.stringify({ type: form.get('type'), startDate: form.get('startDate'), endDate: form.get('endDate'), days, remarks: form.get('remarks') }) }); closeModal(); showToast('Leave request sent for review'); if (location.hash === '#leave') showView('leave'); } catch (error) { showToast(error.message); }
});
document.addEventListener('submit', async event => {
  if (event.target.id !== 'profile-form') return;
  event.preventDefault(); const form = new FormData(event.target);
  try { await api('/me', { method: 'PATCH', body: JSON.stringify({ phone: form.get('phone'), address: form.get('address') }) }); showToast('Profile changes saved'); showView('profile'); } catch (error) { showToast(error.message); }
});
async function start() {
  if (!canUseApi) { setAuthenticated({ name: 'Preview user', role: 'employee' }); showView(location.hash.slice(1) || 'dashboard'); return; }
  const token = localStorage.getItem('dayflow-token');
  if (!token) return;
  try { setAuthenticated(await api('/me')); showView(location.hash.slice(1) || 'dashboard'); } catch { signOut(false); }
}
document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
authForm.addEventListener('submit', async event => {
  event.preventDefault(); authError.textContent = ''; authSubmit.disabled = true;
  const form = new FormData(authForm); const payload = Object.fromEntries(form.entries());
  try { const session = await api(authMode === 'signup' ? '/auth/signup' : '/auth/signin', { method: 'POST', body: JSON.stringify(payload) }); localStorage.setItem('dayflow-token', session.token); setAuthenticated(session.user); showView(session.user.role === 'employee' ? 'dashboard' : 'employees'); } catch (error) { authError.textContent = error.message; } finally { authSubmit.disabled = false; }
});
document.querySelector('#logout-button').addEventListener('click', () => signOut());
window.addEventListener('hashchange', () => { if (currentUser) showView(location.hash.slice(1) || 'dashboard'); });
start();
setTheme(localStorage.getItem('dayflow-theme') || 'light');
