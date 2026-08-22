const views = {
  attendance: { title: 'Attendance', subtitle: 'Your time, clearly accounted for.', content: `<table><thead><tr><th>Date</th><th>Day</th><th>Check in</th><th>Check out</th><th>Total</th><th>Status</th></tr></thead><tbody><tr><td>21 Oct 2024</td><td>Monday</td><td>08:54 AM</td><td>04:12 PM</td><td>07:18</td><td><span class="pill">Present</span></td></tr><tr><td>18 Oct 2024</td><td>Friday</td><td>09:02 AM</td><td>05:21 PM</td><td>08:19</td><td><span class="pill">Present</span></td></tr><tr><td>17 Oct 2024</td><td>Thursday</td><td>08:47 AM</td><td>01:05 PM</td><td>04:18</td><td><span class="pill pending">Half-day</span></td></tr></tbody></table>` },
  leave: { title: 'Leave requests', subtitle: 'Plan time away without the paperwork.', content: `<div class="panel-heading"><h2>My requests</h2><button class="primary-button" data-open-modal="leave-modal">＋ New request</button></div><table><thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Submitted</th><th>Status</th></tr></thead><tbody><tr><td>Paid leave</td><td>04 - 05 Nov 2024</td><td>2</td><td>21 Oct 2024</td><td><span class="pill pending">Pending</span></td></tr><tr><td>Sick leave</td><td>02 Sep 2024</td><td>1</td><td>01 Sep 2024</td><td><span class="pill">Approved</span></td></tr></tbody></table>` },
  employees: { title: 'People', subtitle: '48 people making good work happen.', content: `<table><thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>Attendance</th></tr></thead><tbody><tr><td>Jordan Miller</td><td>Design</td><td>Design lead</td><td><span class="pill">Present</span></td></tr><tr><td>Riya Kapoor</td><td>Engineering</td><td>Software engineer</td><td><span class="pill">Present</span></td></tr><tr><td>Nina Shah</td><td>People ops</td><td>HR manager</td><td><span class="pill pending">On leave</span></td></tr></tbody></table>` },
  payroll: { title: 'Payroll', subtitle: 'Your compensation, always within reach.', content: `<div class="panel-heading"><div><p class="eyebrow">OCTOBER 2024</p><h2>Salary overview</h2></div><span class="pill">Paid on 31 Oct</span></div><div class="stat-grid" style="margin-top:25px"><article class="stat-card"><div class="stat-label">NET PAY</div><strong>$4,820 <small>this month</small></strong><p>After taxes and deductions</p></article><article class="stat-card"><div class="stat-label">GROSS PAY</div><strong>$6,200 <small>this month</small></strong><p>Annual gross: $74,400</p></article></div>` },
  profile: { title: 'My profile', subtitle: 'The details that make you, you.', content: `<div class="panel-heading"><div class="user-mini" style="border:0;padding:0"><div class="avatar avatar-sage" style="width:64px;height:64px;font-size:16px">AS</div><div><h2>Alex Smith</h2><p class="subheading">Product designer · Design</p></div></div><button class="primary-button">Edit profile</button></div><table style="margin-top:25px"><tbody><tr><th>Email</th><td>alex.smith@dayflow.co</td><th>Employee ID</th><td>DF-2048</td></tr><tr><th>Phone</th><td>+1 555 019 2048</td><th>Location</th><td>New York, NY</td></tr></tbody></table>` },
  settings: { title: 'Settings', subtitle: 'Make Dayflow work your way.', content: `<div class="panel-heading"><h2>Workspace preferences</h2></div><table><tbody><tr><td><strong>Email notifications</strong><br><span class="subheading">Get updates about leave and attendance</span></td><td><span class="pill">Enabled</span></td></tr><tr><td><strong>Weekly summary</strong><br><span class="subheading">A Monday overview of your week</span></td><td><span class="pill">Enabled</span></td></tr></tbody></table>` }
};
const pageTitle = document.querySelector('#page-title');
const dashboard = document.querySelector('#dashboard-view');
const generic = document.querySelector('#generic-view');
const genericTitle = document.querySelector('#generic-title');
const genericSubtitle = document.querySelector('#generic-subtitle');
const genericContent = document.querySelector('#generic-content');
const modal = document.querySelector('#leave-modal');
const toast = document.querySelector('#toast');
function showView(name) {
  if (name === 'dashboard') { dashboard.classList.add('active-view'); generic.classList.remove('active-view'); pageTitle.textContent = 'Overview'; }
  else { const view = views[name] || views.attendance; dashboard.classList.remove('active-view'); generic.classList.add('active-view'); genericTitle.textContent = view.title; genericSubtitle.textContent = view.subtitle; genericContent.innerHTML = view.content; pageTitle.textContent = view.title; }
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === name));
  history.replaceState(null, '', `#${name}`);
  document.querySelector('.sidebar').classList.remove('open');
}
function openModal() { modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
document.addEventListener('click', event => {
  const nav = event.target.closest('[data-view]');
  const target = event.target.closest('[data-view-target]');
  const open = event.target.closest('[data-open-modal]');
  if (nav) { event.preventDefault(); showView(nav.dataset.view); }
  if (target) showView(target.dataset.viewTarget);
  if (open) openModal();
  if (event.target.closest('.modal-close') || event.target === modal) closeModal();
  if (event.target.closest('.mobile-menu')) document.querySelector('.sidebar').classList.toggle('open');
});
document.addEventListener('submit', event => { if (event.target.id === 'leave-form') { event.preventDefault(); closeModal(); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); } });
const initialView = location.hash.slice(1) || 'dashboard';
showView(initialView);
