/* ===========================================================================
   T-FIT LAB — Tài khoản demo, phân quyền, quản trị người dùng, khôi phục dữ liệu
   Lưu ý: ứng dụng chạy thuần phía trình duyệt (localStorage) nên chỉ phù hợp
   cho học tập/demo, KHÔNG dùng để lưu mật khẩu thật.
   =========================================================================== */
const DEMO_ACCOUNTS = [
  { id: 'adm-demo-1', studentCode: 'ADMIN01', fullName: 'Quản trị viên Hệ thống', email: 'admin@dntu.edu.vn',
    role: 'ADMIN', department: 'Trung tâm CNTT - DNTU', cohort: 'Quản trị', phone: '0251000000' },
  { id: 'lec-default-1', studentCode: 'GV001', fullName: 'ThS. Nguyễn Văn An', email: 'an.nv@dntu.edu.vn',
    role: 'LECTURER', department: 'Khoa Cơ khí - DNTU', cohort: 'Giảng viên', phone: '02513899000' },
  { id: 'stu-demo-1', studentCode: '231150101', fullName: 'Lê Minh Khoa', email: 'khoa.lm@dntu.edu.vn',
    role: 'STUDENT', department: 'Khoa Cơ khí - Chế tạo máy', cohort: 'K23 (2023–2027)', phone: '0909111222' }
];
const DEMO_PASSWORD = '123456';

function ensureDemoAccounts() {
  DEMO_ACCOUNTS.forEach(a => {
    const idx = ClassroomDB.users.findIndex(u => u.id === a.id);
    if (idx === -1) {
      ClassroomDB.users.push({ ...a, passwordHash: hashPasswordSync(DEMO_PASSWORD), createdAt: new Date().toISOString() });
    } else if (String(ClassroomDB.users[idx].passwordHash).startsWith('sha256:')) {
      ClassroomDB.users[idx].passwordHash = hashPasswordSync(DEMO_PASSWORD);
    }
  });
  saveStateToStorage();
}

function applySessionRole() {
  const u = ClassroomDB.currentUser;
  const role = u ? u.role : 'STUDENT';
  ClassroomDB.activePortal = u && u.role !== 'STUDENT' ? 'LECTURER' : 'STUDENT';
  if (typeof applyRoleUI === 'function') {
    applyRoleUI(role);
  }
}

/* Phân quyền: khách/SV chỉ xem giao diện SV; GV xem SV + GV; ADMIN xem tất cả */
function isRoleAllowed(role) {
  const u = ClassroomDB.currentUser;
  const rank = { STUDENT: 1, LECTURER: 2, ADMIN: 3 };
  const mine = u ? rank[u.role] : 1;
  return rank[role] <= mine;
}

/* ---------- Nút điền nhanh tài khoản demo trong hộp đăng nhập ---------- */
function injectDemoLoginButtons() {
  const form = document.getElementById('auth-form-login');
  if (!form || document.getElementById('demo-login-box')) return;
  const box = document.createElement('div');
  box.id = 'demo-login-box';
  box.className = 'p-3 rounded-xl border border-dashed border-amber-500/60 bg-amber-50 dark:bg-amber-950/20 space-y-2';
  box.innerHTML = `<p class="font-bold text-amber-700 dark:text-amber-400">Tài khoản demo (mật khẩu: ${DEMO_PASSWORD})</p>
    <div class="grid grid-cols-3 gap-2">
      ${DEMO_ACCOUNTS.map(a => `<button type="button" data-demo="${a.email}" class="py-2 rounded-lg bg-burgundy-900 hover:bg-burgundy-800 text-techgold-400 font-bold">${a.role === 'ADMIN' ? 'Admin' : a.role === 'LECTURER' ? 'Giảng viên' : 'Sinh viên'}</button>`).join('')}
    </div>`;
  form.prepend(box);
  box.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => {
    document.getElementById('login-identifier').value = b.dataset.demo;
    document.getElementById('login-password').value = DEMO_PASSWORD;
  });
}

/* ---------- Đổi mật khẩu ---------- */
function changeMyPassword() {
  const u = ClassroomDB.currentUser;
  if (!u) return showToast('Hãy đăng nhập trước.', 'warning');
  const oldPw = prompt('Nhập mật khẩu hiện tại:'); if (oldPw === null) return;
  if (hashPasswordSync(oldPw) !== u.passwordHash) return showToast('Mật khẩu hiện tại không đúng.', 'error');
  const newPw = prompt('Nhập mật khẩu mới (tối thiểu 6 ký tự):'); if (newPw === null) return;
  if (newPw.length < 6) return showToast('Mật khẩu mới phải từ 6 ký tự.', 'warning');
  u.passwordHash = hashPasswordSync(newPw);
  saveStateToStorage(); addSystemAuditLog(`Đổi mật khẩu: ${u.fullName}.`);
  showToast('Đổi mật khẩu thành công!', 'success');
}

/* ---------- Quản trị người dùng (chỉ ADMIN) ---------- */
function requireAdmin() {
  const u = ClassroomDB.currentUser;
  if (!u || u.role !== 'ADMIN') { showToast('Chỉ Quản trị viên mới dùng được chức năng này.', 'warning'); return false; }
  return true;
}
function openAdminUsers() {
  if (!requireAdmin()) return;
  let m = document.getElementById('admin-users-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'admin-users-modal';
    m.className = 'fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4';
    document.body.appendChild(m);
  }
  m.classList.remove('hidden');
  renderAdminUsers();
}
function renderAdminUsers() {
  const m = document.getElementById('admin-users-modal'); if (!m) return;
  const me = ClassroomDB.currentUser;
  const rows = ClassroomDB.users.map(u => `<tr class="border-t border-slate-200 dark:border-slate-700">
    <td class="p-2 font-mono-tech">${u.studentCode}</td><td class="p-2">${u.fullName}</td><td class="p-2">${u.email}</td>
    <td class="p-2 font-bold">${u.role}</td><td class="p-2">${u.locked ? '🔒 Khóa' : 'Hoạt động'}</td>
    <td class="p-2 space-x-1 whitespace-nowrap">
      <button onclick="adminResetPw('${u.id}')" class="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700">Reset MK</button>
      ${u.id !== me.id ? `<button onclick="adminToggleLock('${u.id}')" class="px-2 py-1 rounded bg-amber-500 text-white">${u.locked ? 'Mở khóa' : 'Khóa'}</button>
      <button onclick="adminDeleteUser('${u.id}')" class="px-2 py-1 rounded bg-rose-600 text-white">Xóa</button>` : ''}
    </td></tr>`).join('');
  m.innerHTML = `<div class="bg-white dark:bg-techslate-900 w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl text-xs">
    <div class="bg-burgundy-900 text-white px-5 py-3 flex items-center justify-between sticky top-0">
      <h3 class="font-bold text-base">Quản lý người dùng (${ClassroomDB.users.length})</h3>
      <button onclick="document.getElementById('admin-users-modal').classList.add('hidden')" class="px-2 py-1 rounded bg-burgundy-950 hover:bg-electricred-500">Đóng ✕</button>
    </div>
    <div class="p-4 space-y-4">
      <form onsubmit="adminCreateUser(event)" class="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <input id="au-code" required placeholder="Mã (MSSV/GV)" class="px-2 py-2 rounded border dark:bg-slate-800 dark:border-slate-700">
        <input id="au-name" required placeholder="Họ tên" class="px-2 py-2 rounded border dark:bg-slate-800 dark:border-slate-700">
        <input id="au-email" type="email" required placeholder="Email" class="px-2 py-2 rounded border dark:bg-slate-800 dark:border-slate-700">
        <select id="au-role" class="px-2 py-2 rounded border dark:bg-slate-800 dark:border-slate-700"><option value="STUDENT">Sinh viên</option><option value="LECTURER">Giảng viên</option><option value="ADMIN">Admin</option></select>
        <input id="au-pw" value="${DEMO_PASSWORD}" placeholder="Mật khẩu" class="px-2 py-2 rounded border dark:bg-slate-800 dark:border-slate-700">
        <button class="py-2 rounded bg-emerald-700 text-white font-bold">+ Thêm</button>
      </form>
      <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="text-slate-500"><th class="p-2">Mã</th><th class="p-2">Họ tên</th><th class="p-2">Email</th><th class="p-2">Vai trò</th><th class="p-2">Trạng thái</th><th class="p-2">Thao tác</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
}
function adminCreateUser(e) {
  e.preventDefault(); if (!requireAdmin()) return;
  const g = id => document.getElementById(id).value.trim();
  const code = g('au-code'), email = g('au-email').toLowerCase(), pw = g('au-pw');
  if (pw.length < 6) return showToast('Mật khẩu tối thiểu 6 ký tự.', 'warning');
  if (ClassroomDB.users.some(u => u.email.toLowerCase() === email || u.studentCode.toUpperCase() === code.toUpperCase()))
    return showToast('Mã hoặc email đã tồn tại.', 'error');
  ClassroomDB.users.push({ id: 'usr-' + Date.now(), studentCode: code, fullName: g('au-name'), email, role: g('au-role'),
    department: 'Khoa Cơ khí - DNTU', cohort: '', phone: '', passwordHash: hashPasswordSync(pw), createdAt: new Date().toISOString() });
  saveStateToStorage(); addSystemAuditLog(`ADMIN tạo tài khoản ${code}.`); renderAdminUsers(); showToast('Đã tạo tài khoản.', 'success');
}
function adminResetPw(id) {
  if (!requireAdmin()) return;
  const u = ClassroomDB.users.find(x => x.id === id); if (!u) return;
  u.passwordHash = hashPasswordSync(DEMO_PASSWORD); saveStateToStorage();
  addSystemAuditLog(`ADMIN reset mật khẩu ${u.studentCode}.`); showToast(`Đã đặt lại mật khẩu ${u.studentCode} = ${DEMO_PASSWORD}`, 'success');
}
function adminToggleLock(id) {
  if (!requireAdmin()) return;
  const u = ClassroomDB.users.find(x => x.id === id); if (!u) return;
  u.locked = !u.locked; saveStateToStorage(); addSystemAuditLog(`ADMIN ${u.locked ? 'khóa' : 'mở khóa'} ${u.studentCode}.`); renderAdminUsers();
}
function adminDeleteUser(id) {
  if (!requireAdmin()) return;
  const u = ClassroomDB.users.find(x => x.id === id); if (!u || !confirm(`Xóa tài khoản ${u.studentCode}?`)) return;
  ClassroomDB.users = ClassroomDB.users.filter(x => x.id !== id);
  ClassroomDB.classMemberships = ClassroomDB.classMemberships.filter(m => m.studentId !== id);
  saveStateToStorage(); addSystemAuditLog(`ADMIN xóa tài khoản ${u.studentCode}.`); renderAdminUsers();
}

/* ---------- Sao lưu / Khôi phục (đầy đủ AppState + dữ liệu lớp học) ---------- */
function exportSystemBackupJSON() {
  const { currentUser, ...classroom } = ClassroomDB;
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), platform: 'T-FIT LAB (DNTU)',
    standard: ISO286Database.standardVersion, state: AppState, classroom }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = `TFIT-LAB_Backup_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  showToast('Đã sao lưu dữ liệu hệ thống ra tệp JSON!', 'success');
}
function importSystemBackupJSON(input) {
  if (!requireAdmin()) { input.value = ''; return; }
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.platform !== 'T-FIT LAB (DNTU)' || !d.state) throw new Error('format');
      ['savedFits', 'journalEntries', 'completedLessons', 'competencyScores'].forEach(k => { if (d.state[k]) AppState[k] = d.state[k]; });
      if (d.classroom) Object.assign(ClassroomDB, d.classroom, { currentUser: ClassroomDB.currentUser });
      ensureDemoAccounts(); saveStateToStorage();
      showToast('Khôi phục dữ liệu thành công. Đang tải lại…', 'success');
      setTimeout(() => location.reload(), 800);
    } catch (e) { showToast('Tệp sao lưu không hợp lệ.', 'error'); }
  };
  r.readAsText(f);
}
function resetAllLocalData() {
  if (!requireAdmin() || !confirm('Xóa TOÀN BỘ dữ liệu cục bộ và quay về dữ liệu mặc định?')) return;
  localStorage.removeItem('tfit_lab_state_v1'); localStorage.removeItem('tfit_lab_classroom_db_v2'); location.reload();
}

/* ---------- Chèn nút vào giao diện ---------- */
function injectAdminButtons() {
  const panel = document.getElementById('analytics-panel-admin');
  if (panel && !document.getElementById('admin-extra-btns')) {
    const first = panel.querySelector('button[onclick="exportSystemBackupJSON()"]');
    if (first) {
      const wrap = document.createElement('div'); wrap.id = 'admin-extra-btns'; wrap.className = 'space-y-2.5';
      const cls = 'w-full py-2.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 ';
      wrap.innerHTML = `
        <button onclick="openAdminUsers()" class="${cls}bg-burgundy-900 hover:bg-burgundy-800">👥 Quản lý người dùng (Admin)</button>
        <label class="${cls}bg-slate-700 hover:bg-slate-600 cursor-pointer">⬆ Khôi phục dữ liệu từ JSON
          <input type="file" accept="application/json" class="hidden" onchange="importSystemBackupJSON(this)"></label>
        <button onclick="resetAllLocalData()" class="${cls}bg-rose-700 hover:bg-rose-600">⟲ Đặt lại toàn bộ dữ liệu cục bộ</button>`;
      first.parentElement.insertBefore(wrap, first);
    }
  }
  const pill = document.getElementById('classroom-active-user-pill');
  if (pill && !document.getElementById('btn-change-pw')) {
    const b = document.createElement('button'); b.id = 'btn-change-pw'; b.textContent = 'Đổi mật khẩu';
    b.className = 'ml-2 text-[11px] underline text-burgundy-700 dark:text-techgold-400'; b.onclick = changeMyPassword;
    pill.parentElement.appendChild(b);
  }
}
document.addEventListener('DOMContentLoaded', () => { injectDemoLoginButtons(); injectAdminButtons(); });
window.addEventListener('load', () => setTimeout(() => { injectDemoLoginButtons(); injectAdminButtons(); }, 0));

/* ---------- Xử lý màn hình đăng nhập đầu vào (Login Gate) ---------- */
function fillGateDemo(email) {
  const idEl = document.getElementById('gate-identifier');
  const pwEl = document.getElementById('gate-password');
  const errBox = document.getElementById('gate-error-box');
  if (idEl) idEl.value = email;
  if (pwEl) pwEl.value = DEMO_PASSWORD;
  if (errBox) errBox.classList.add('hidden');
}

function handleGateLogin(e) {
  e.preventDefault();
  ensureDemoAccounts();
  const iden = document.getElementById('gate-identifier').value.trim();
  const pass = document.getElementById('gate-password').value;
  const errBox = document.getElementById('gate-error-box');
  errBox.classList.add('hidden');

  const hash = hashPasswordSync(pass);
  const user = ClassroomDB.users.find(u =>
    (u.email.toLowerCase() === iden.toLowerCase() || u.studentCode.toUpperCase() === iden.toUpperCase()) &&
    (u.passwordHash === hash || (pass === DEMO_PASSWORD && String(u.passwordHash).startsWith('sha256:')))
  );

  if (user && user.locked) {
    errBox.textContent = 'Tài khoản đã bị khóa bởi Quản trị viên.';
    errBox.classList.remove('hidden');
    return;
  }
  if (!user) {
    errBox.textContent = 'Sai thông tin đăng nhập (Email/MSSV hoặc mật khẩu không đúng).';
    errBox.classList.remove('hidden');
    return;
  }

  ClassroomDB.currentUser = user;
  ClassroomDB.activePortal = user.role === 'STUDENT' ? 'STUDENT' : 'LECTURER';
  saveStateToStorage();
  addSystemAuditLog(`Đăng nhập thành công: ${user.fullName} (${user.role}).`);
  if (typeof applyRoleUI === 'function') applyRoleUI(user.role);
  showToast(`Chào mừng ${user.fullName} (${user.role})!`, 'success');
}

function handleGateRegister(e) {
  e.preventDefault();
  const mssv = document.getElementById('gate-reg-mssv').value.trim().toUpperCase();
  const fullName = document.getElementById('gate-reg-name').value.trim();
  const email = document.getElementById('gate-reg-email').value.trim().toLowerCase();
  const pass = document.getElementById('gate-reg-pass').value;
  const err = document.getElementById('gate-reg-error');
  err.classList.add('hidden');

  if (!/^[A-Z0-9]{5,15}$/.test(mssv)) {
    err.textContent = 'MSSV không hợp lệ (5–15 ký tự chữ và số, không dấu cách).';
    err.classList.remove('hidden');
    return;
  }
  if (ClassroomDB.users.some(u => u.studentCode === mssv || u.email.toLowerCase() === email)) {
    err.textContent = 'MSSV hoặc Email đã tồn tại trong hệ thống.';
    err.classList.remove('hidden');
    return;
  }
  const newStu = {
    id: 'stu-' + Date.now(),
    studentCode: mssv,
    fullName,
    email,
    passwordHash: hashPasswordSync(pass),
    role: 'STUDENT',
    department: 'Khoa Cơ khí - DNTU',
    cohort: 'DNTU',
    phone: '',
    createdAt: new Date().toISOString()
  };
  ClassroomDB.users.push(newStu);
  ClassroomDB.currentUser = newStu;
  ClassroomDB.activePortal = 'STUDENT';
  saveStateToStorage();
  addSystemAuditLog(`Đăng ký tài khoản sinh viên mới: ${fullName} (${mssv}).`);
  e.target.reset();
  if (typeof applyRoleUI === 'function') applyRoleUI('STUDENT');
  showToast(`Đăng ký & đăng nhập thành công: ${fullName}!`, 'success');
}
