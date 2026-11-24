// T-FIT LAB API: Express + SQLite. Mọi kiểm tra quyền & mã lớp thực hiện tại đây.
const express = require('express'), Database = require('better-sqlite3'), bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'), path = require('path'), crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'data.db'));
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, email TEXT UNIQUE, pw TEXT, role TEXT CHECK(role IN('STUDENT','LECTURER','ADMIN')), locked INT DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS classes(id INTEGER PRIMARY KEY, name TEXT, course TEXT, lecturer_id INT REFERENCES users(id), code TEXT UNIQUE, max_students INT DEFAULT 50, status TEXT DEFAULT 'OPEN', approval INT DEFAULT 0, open_until TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS members(class_id INT REFERENCES classes(id), user_id INT REFERENCES users(id), status TEXT, joined TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(class_id,user_id));
CREATE TABLE IF NOT EXISTS announcements(id INTEGER PRIMARY KEY, class_id INT, author_id INT, title TEXT, body TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS assignments(id INTEGER PRIMARY KEY, class_id INT, title TEXT, description TEXT, kind TEXT DEFAULT 'ASSIGNMENT', due TEXT, max_score REAL DEFAULT 10, allow_resubmit INT DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY, assignment_id INT, student_id INT, content TEXT, status TEXT, attempt INT DEFAULT 0, score REAL, feedback TEXT, resubmit_ok INT DEFAULT 0, updated TEXT, UNIQUE(assignment_id,student_id));
CREATE TABLE IF NOT EXISTS submission_history(id INTEGER PRIMARY KEY, submission_id INT, event TEXT, detail TEXT, actor_id INT, at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS grade_log(id INTEGER PRIMARY KEY, submission_id INT, old_score REAL, new_score REAL, grader_id INT, at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, user_id INT, title TEXT, body TEXT, read INT DEFAULT 0, at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, user_id INT, action TEXT, detail TEXT, at TEXT DEFAULT CURRENT_TIMESTAMP);`);

const err = (s, m) => Object.assign(new Error(m), { status: s });
const H = fn => (req, res) => { try { res.json(fn(req, res) ?? { ok: true }); } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Lỗi máy chủ' }); if (!e.status) console.error(e); } };
const audit = (uid, a, d = '') => db.prepare('INSERT INTO audit(user_id,action,detail) VALUES(?,?,?)').run(uid, a, d);
const notify = (uid, t, b = '') => db.prepare('INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)').run(uid, t, b);
const newCode = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c; do { c = 'TF-' + Array.from(crypto.randomBytes(6), b => A[b % A.length]).join(''); } while (db.prepare('SELECT 1 FROM classes WHERE code=?').get(c)); return c; };
const hash = p => bcrypt.hashSync(p, 8);

function seed() {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n) return;
  const u = db.prepare('INSERT INTO users(code,name,email,pw,role) VALUES(?,?,?,?,?)');
  u.run('ADMIN01', 'Quản trị viên Hệ thống', 'admin@dntu.edu.vn', hash('123456'), 'ADMIN');
  u.run('GV001', 'ThS. Nguyễn Văn An', 'an.nv@dntu.edu.vn', hash('123456'), 'LECTURER');
  u.run('231150101', 'Lê Minh Khoa', 'khoa.lm@dntu.edu.vn', hash('123456'), 'STUDENT');
}
seed();

const app = express(); app.use(express.json({ limit: '1mb' }));
const auth = (req, res, next) => {
  try { const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    const u = db.prepare('SELECT id,code,name,email,role,locked FROM users WHERE id=?').get(p.id);
    if (!u || u.locked) throw 0; req.user = u; next();
  } catch { res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn' }); }
};
const role = (...r) => (req, res, next) => r.includes(req.user.role) ? next() : res.status(403).json({ error: 'Không đủ quyền' });
const wrap = (...fns) => { const last = fns.pop(); return [...fns, H(last)]; };

/* Quyền theo lớp: ADMIN tất cả; GV chỉ lớp mình phụ trách; SV chỉ lớp đã ACTIVE */
function classFor(user, id) {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(id); if (!c) throw err(404, 'Không tìm thấy lớp');
  if (user.role === 'ADMIN') return c;
  if (user.role === 'LECTURER' && c.lecturer_id === user.id) return c;
  if (user.role === 'STUDENT' && db.prepare("SELECT 1 FROM members WHERE class_id=? AND user_id=? AND status='ACTIVE'").get(id, user.id)) return c;
  throw err(403, 'Bạn không có quyền với lớp này');
}
const manage = (user, id) => { const c = classFor(user, id); if (user.role === 'STUDENT') throw err(403, 'Chỉ giảng viên phụ trách được thao tác'); return c; };

/* ---- Auth ---- */
const failed = new Map();
app.post('/api/auth/login', H(req => {
  const { identifier = '', password = '' } = req.body, k = String(identifier).toLowerCase(), f = failed.get(k);
  if (f && f.n >= 5 && Date.now() < f.until) throw err(429, 'Đăng nhập sai nhiều lần, thử lại sau 1 phút');
  const u = db.prepare('SELECT * FROM users WHERE lower(email)=? OR upper(code)=upper(?)').get(k, identifier);
  if (!u || !bcrypt.compareSync(String(password), u.pw)) { failed.set(k, { n: (f?.n || 0) + 1, until: Date.now() + 60000 }); throw err(401, 'Sai thông tin đăng nhập'); }
  if (u.locked) throw err(403, 'Tài khoản đã bị khóa'); failed.delete(k); audit(u.id, 'LOGIN');
  return { token: jwt.sign({ id: u.id }, SECRET, { expiresIn: '12h' }), user: { id: u.id, code: u.code, name: u.name, email: u.email, role: u.role } };
}));
app.post('/api/auth/register', H(req => {
  const { code, name, email, password } = req.body;
  if (!code || !name || !email || !password || password.length < 6) throw err(400, 'Thiếu thông tin hoặc mật khẩu < 6 ký tự');
  if (db.prepare('SELECT 1 FROM users WHERE lower(email)=lower(?) OR upper(code)=upper(?)').get(email, code)) throw err(409, 'Email hoặc MSSV đã tồn tại');
  const id = db.prepare("INSERT INTO users(code,name,email,pw,role) VALUES(?,?,?,?,'STUDENT')").run(code, name, email, hash(password)).lastInsertRowid;
  audit(id, 'REGISTER'); return { ok: true };
}));
app.get('/api/me', auth, H(req => req.user));
app.post('/api/me/password', auth, H(req => {
  const u = db.prepare('SELECT pw FROM users WHERE id=?').get(req.user.id), { oldPassword, newPassword } = req.body;
  if (!bcrypt.compareSync(String(oldPassword), u.pw)) throw err(400, 'Mật khẩu cũ không đúng');
  if (!newPassword || newPassword.length < 6) throw err(400, 'Mật khẩu mới tối thiểu 6 ký tự');
  db.prepare('UPDATE users SET pw=? WHERE id=?').run(hash(newPassword), req.user.id); audit(req.user.id, 'CHANGE_PW');
}));

/* ---- Lớp học ---- */
app.get('/api/classes', auth, H(req => {
  const u = req.user, q = u.role === 'ADMIN' ? db.prepare('SELECT c.*,(SELECT name FROM users WHERE id=lecturer_id) lecturer FROM classes c')
    : u.role === 'LECTURER' ? db.prepare('SELECT c.*,(SELECT name FROM users WHERE id=lecturer_id) lecturer FROM classes c WHERE lecturer_id=?')
    : db.prepare("SELECT c.id,c.name,c.course,c.status,(SELECT name FROM users WHERE id=lecturer_id) lecturer,m.status member_status FROM classes c JOIN members m ON m.class_id=c.id WHERE m.user_id=? AND m.status IN('ACTIVE','PENDING')");
  const rows = u.role === 'ADMIN' ? q.all() : q.all(u.id);
  return rows.map(c => ({ ...c, students: db.prepare("SELECT COUNT(*) n FROM members WHERE class_id=? AND status='ACTIVE'").get(c.id).n }));
}));
app.post('/api/classes', auth, role('LECTURER', 'ADMIN'), H(req => {
  const { name, course = '', max_students = 50, approval = 0, open_until = null } = req.body; if (!name) throw err(400, 'Thiếu tên lớp');
  const lecturer = req.user.role === 'ADMIN' ? (req.body.lecturer_id || req.user.id) : req.user.id;
  const code = newCode(), id = db.prepare('INSERT INTO classes(name,course,lecturer_id,code,max_students,approval,open_until) VALUES(?,?,?,?,?,?,?)').run(name, course, lecturer, code, +max_students, approval ? 1 : 0, open_until).lastInsertRowid;
  audit(req.user.id, 'CLASS_CREATE', code); return { id, code };
}));
app.patch('/api/classes/:id', auth, H(req => {
  const c = manage(req.user, req.params.id), b = req.body;
  db.prepare('UPDATE classes SET name=?,course=?,max_students=?,status=?,approval=?,open_until=?,code=? WHERE id=?').run(b.name ?? c.name, b.course ?? c.course, b.max_students ?? c.max_students,
    ['OPEN', 'CLOSED'].includes(b.status) ? b.status : c.status, b.approval ?? c.approval, b.open_until ?? c.open_until, b.regenerate_code ? newCode() : c.code, c.id);
  audit(req.user.id, 'CLASS_UPDATE', String(c.id)); return db.prepare('SELECT * FROM classes WHERE id=?').get(c.id);
}));
app.get('/api/classes/:id', auth, H(req => {
  const c = classFor(req.user, req.params.id); if (req.user.role === 'STUDENT') delete c.code; return c;
}));
const joinFail = new Map();
app.post('/api/classes/join', auth, role('STUDENT'), H(req => {
  const f = joinFail.get(req.user.id); if (f && f.n >= 5 && Date.now() < f.until) throw err(429, 'Nhập sai mã quá nhiều lần, thử lại sau 1 phút');
  const code = String(req.body.code || '').trim().toUpperCase(), c = db.prepare('SELECT * FROM classes WHERE code=?').get(code);
  if (!c) { joinFail.set(req.user.id, { n: (f?.n || 0) + 1, until: Date.now() + 60000 }); throw err(404, 'Mã lớp không hợp lệ'); }
  if (c.status !== 'OPEN' || (c.open_until && new Date(c.open_until) < new Date())) throw err(409, 'Lớp đã đóng đăng ký');
  const m = db.prepare('SELECT status FROM members WHERE class_id=? AND user_id=?').get(c.id, req.user.id);
  if (m && ['ACTIVE', 'PENDING'].includes(m.status)) throw err(409, 'Bạn đã tham gia hoặc đang chờ duyệt lớp này');
  if (db.prepare("SELECT COUNT(*) n FROM members WHERE class_id=? AND status='ACTIVE'").get(c.id).n >= c.max_students) throw err(409, 'Lớp đã hết chỗ');
  const st = c.approval ? 'PENDING' : 'ACTIVE';
  db.prepare('INSERT INTO members(class_id,user_id,status) VALUES(?,?,?) ON CONFLICT(class_id,user_id) DO UPDATE SET status=excluded.status').run(c.id, req.user.id, st);
  joinFail.delete(req.user.id); audit(req.user.id, 'JOIN', c.code); notify(c.lecturer_id, st === 'PENDING' ? 'Yêu cầu tham gia lớp' : 'Sinh viên mới', `${req.user.name} → ${c.name}`);
  return { status: st, class: { id: c.id, name: c.name } };
}));
app.post('/api/classes/:id/leave', auth, role('STUDENT'), H(req => {
  classFor(req.user, req.params.id);
  if (db.prepare("SELECT 1 FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.class_id=? AND s.student_id=? AND s.status='GRADED'").get(req.params.id, req.user.id)) throw err(409, 'Không thể rời lớp khi đã có bài được chấm điểm');
  db.prepare("UPDATE members SET status='LEFT' WHERE class_id=? AND user_id=?").run(req.params.id, req.user.id); audit(req.user.id, 'LEAVE', req.params.id);
}));
app.get('/api/classes/:id/members', auth, H(req => { classFor(req.user, req.params.id);
  return db.prepare("SELECT u.id,u.code,u.name,u.email,m.status FROM members m JOIN users u ON u.id=m.user_id WHERE m.class_id=? AND m.status IN('ACTIVE','PENDING')").all(req.params.id); }));
app.post('/api/classes/:id/members', auth, H(req => { // thêm thủ công theo MSSV
  const c = manage(req.user, req.params.id), s = db.prepare("SELECT id FROM users WHERE upper(code)=upper(?) AND role='STUDENT'").get(req.body.code || '');
  if (!s) throw err(404, 'Không có sinh viên với MSSV này');
  db.prepare("INSERT INTO members(class_id,user_id,status) VALUES(?,?,'ACTIVE') ON CONFLICT(class_id,user_id) DO UPDATE SET status='ACTIVE'").run(c.id, s.id); notify(s.id, 'Bạn được thêm vào lớp', c.name);
}));
app.post('/api/classes/:id/members/:uid/decision', auth, H(req => {
  const c = manage(req.user, req.params.id), ok = req.body.decision === 'APPROVE';
  if (ok && db.prepare("SELECT COUNT(*) n FROM members WHERE class_id=? AND status='ACTIVE'").get(c.id).n >= c.max_students) throw err(409, 'Lớp đã hết chỗ');
  if (!db.prepare("UPDATE members SET status=? WHERE class_id=? AND user_id=? AND status='PENDING'").run(ok ? 'ACTIVE' : 'REJECTED', c.id, req.params.uid).changes) throw err(404, 'Không có yêu cầu chờ duyệt');
  notify(+req.params.uid, ok ? 'Đã được duyệt vào lớp' : 'Yêu cầu bị từ chối', c.name); audit(req.user.id, ok ? 'APPROVE' : 'REJECT', `${c.id}/${req.params.uid}`);
}));

/* ---- Bảng tin & bài tập ---- */
app.get('/api/classes/:id/announcements', auth, H(req => { classFor(req.user, req.params.id); return db.prepare('SELECT a.*,u.name author FROM announcements a JOIN users u ON u.id=author_id WHERE class_id=? ORDER BY a.id DESC').all(req.params.id); }));
app.post('/api/classes/:id/announcements', auth, H(req => {
  const c = manage(req.user, req.params.id); if (!req.body.title) throw err(400, 'Thiếu tiêu đề');
  db.prepare('INSERT INTO announcements(class_id,author_id,title,body) VALUES(?,?,?,?)').run(c.id, req.user.id, req.body.title, req.body.body || '');
  db.prepare("SELECT user_id FROM members WHERE class_id=? AND status='ACTIVE'").all(c.id).forEach(m => notify(m.user_id, 'Thông báo lớp: ' + c.name, req.body.title));
}));
app.get('/api/classes/:id/assignments', auth, H(req => { classFor(req.user, req.params.id);
  return db.prepare('SELECT a.*,(SELECT status FROM submissions WHERE assignment_id=a.id AND student_id=?) my_status,(SELECT score FROM submissions WHERE assignment_id=a.id AND student_id=?) my_score,(SELECT feedback FROM submissions WHERE assignment_id=a.id AND student_id=?) my_feedback,(SELECT content FROM submissions WHERE assignment_id=a.id AND student_id=?) my_content,(SELECT COUNT(*) FROM submissions WHERE assignment_id=a.id AND status IN(\'SUBMITTED\',\'GRADED\')) submitted FROM assignments a WHERE class_id=? ORDER BY due').all(req.user.id, req.user.id, req.user.id, req.user.id, req.params.id); }));
app.post('/api/classes/:id/assignments', auth, H(req => {
  const c = manage(req.user, req.params.id), b = req.body; if (!b.title) throw err(400, 'Thiếu tiêu đề');
  const kind = ['ASSIGNMENT', 'LAB', 'QUIZ'].includes(b.kind) ? b.kind : 'ASSIGNMENT';
  const id = db.prepare('INSERT INTO assignments(class_id,title,description,kind,due,max_score,allow_resubmit) VALUES(?,?,?,?,?,?,?)').run(c.id, b.title, b.description || '', kind, b.due || null, +b.max_score || 10, b.allow_resubmit ? 1 : 0).lastInsertRowid;
  db.prepare("SELECT user_id FROM members WHERE class_id=? AND status='ACTIVE'").all(c.id).forEach(m => notify(m.user_id, 'Bài mới: ' + b.title, c.name)); audit(req.user.id, 'ASSIGN_CREATE', String(id)); return { id };
}));
const assignmentFor = (req) => { const a = db.prepare('SELECT * FROM assignments WHERE id=?').get(req.params.id); if (!a) throw err(404, 'Không tìm thấy bài'); return { a, c: classFor(req.user, a.class_id) }; };
app.post('/api/assignments/:id/submit', auth, role('STUDENT'), H(req => {
  const { a } = assignmentFor(req), draft = req.body.action === 'draft', now = new Date();
  if (!draft && a.due && new Date(a.due) < now) throw err(409, 'Đã quá hạn nộp bài');
  const s = db.prepare('SELECT * FROM submissions WHERE assignment_id=? AND student_id=?').get(a.id, req.user.id);
  if (s && ['SUBMITTED', 'GRADED'].includes(s.status) && !(a.allow_resubmit || s.resubmit_ok)) throw err(409, 'Bài đã nộp, không được nộp lại');
  if (!draft && !String(req.body.content || '').trim()) throw err(400, 'Nội dung bài làm trống');
  const st = draft ? 'DRAFT' : 'SUBMITTED', at = s ? s.attempt + (draft ? 0 : 1) : (draft ? 0 : 1);
  const id = s ? s.id : db.prepare('INSERT INTO submissions(assignment_id,student_id,status) VALUES(?,?,?)').run(a.id, req.user.id, st).lastInsertRowid;
  db.prepare('UPDATE submissions SET content=?,status=?,attempt=?,resubmit_ok=0,updated=? WHERE id=?').run(req.body.content || '', st, at, now.toISOString(), id);
  db.prepare('INSERT INTO submission_history(submission_id,event,detail,actor_id) VALUES(?,?,?,?)').run(id, draft ? 'DRAFT' : 'SUBMIT', `lần ${at}`, req.user.id);
  if (!draft) notify(classFor(req.user, a.class_id).lecturer_id, 'Có bài nộp mới', `${req.user.name} – ${a.title}`);
  return { id, status: st, attempt: at };
}));
app.get('/api/assignments/:id/submissions', auth, H(req => {
  const { a } = assignmentFor(req);
  return req.user.role === 'STUDENT' ? db.prepare('SELECT * FROM submissions WHERE assignment_id=? AND student_id=?').all(a.id, req.user.id)
    : db.prepare('SELECT s.*,u.name,u.code FROM submissions s JOIN users u ON u.id=student_id WHERE assignment_id=?').all(a.id);
}));
app.get('/api/submissions/:id/history', auth, H(req => {
  const s = db.prepare('SELECT s.*,a.class_id FROM submissions s JOIN assignments a ON a.id=assignment_id WHERE s.id=?').get(req.params.id); if (!s) throw err(404, 'Không tìm thấy');
  if (req.user.role === 'STUDENT' && s.student_id !== req.user.id) throw err(403, 'Không có quyền'); if (req.user.role !== 'STUDENT') manage(req.user, s.class_id);
  return { history: db.prepare('SELECT * FROM submission_history WHERE submission_id=?').all(s.id), grades: db.prepare('SELECT * FROM grade_log WHERE submission_id=?').all(s.id) };
}));
app.put('/api/submissions/:id/grade', auth, H(req => { // SV không thể gọi: manage() chặn
  const s = db.prepare('SELECT s.*,a.class_id,a.max_score,a.title FROM submissions s JOIN assignments a ON a.id=assignment_id WHERE s.id=?').get(req.params.id);
  if (!s) throw err(404, 'Không tìm thấy bài nộp'); manage(req.user, s.class_id);
  if (s.status === 'DRAFT') throw err(409, 'Bài mới là bản nháp'); const sc = Number(req.body.score);
  if (req.body.requestResubmit) { db.prepare('UPDATE submissions SET resubmit_ok=1,feedback=? WHERE id=?').run(req.body.feedback || '', s.id); db.prepare('INSERT INTO submission_history(submission_id,event,actor_id) VALUES(?,?,?)').run(s.id, 'RESUBMIT_REQUESTED', req.user.id); notify(s.student_id, 'Yêu cầu nộp lại', s.title); return; }
  if (!(sc >= 0 && sc <= s.max_score)) throw err(400, `Điểm phải trong khoảng 0–${s.max_score}`);
  db.prepare("UPDATE submissions SET score=?,feedback=?,status='GRADED' WHERE id=?").run(sc, req.body.feedback || '', s.id);
  db.prepare('INSERT INTO grade_log(submission_id,old_score,new_score,grader_id) VALUES(?,?,?,?)').run(s.id, s.score, sc, req.user.id);
  db.prepare('INSERT INTO submission_history(submission_id,event,detail,actor_id) VALUES(?,?,?,?)').run(s.id, 'GRADED', String(sc), req.user.id);
  notify(s.student_id, 'Bài đã được chấm', `${s.title}: ${sc}/${s.max_score}`); audit(req.user.id, 'GRADE', String(s.id));
}));

/* ---- Dashboard, thông báo ---- */
app.get('/api/dashboard', auth, H(req => {
  const u = req.user, n = db.prepare('SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read=0').get(u.id).n;
  if (u.role === 'STUDENT') return { role: u.role, unread: n,
    classes: db.prepare("SELECT c.id,c.name,c.course FROM classes c JOIN members m ON m.class_id=c.id WHERE m.user_id=? AND m.status='ACTIVE'").all(u.id),
    upcoming: db.prepare("SELECT a.id,a.title,a.due,a.kind,c.name class FROM assignments a JOIN classes c ON c.id=a.class_id JOIN members m ON m.class_id=c.id AND m.user_id=? AND m.status='ACTIVE' WHERE (a.due IS NULL OR a.due>=datetime('now')) AND NOT EXISTS(SELECT 1 FROM submissions s WHERE s.assignment_id=a.id AND s.student_id=? AND s.status IN('SUBMITTED','GRADED')) ORDER BY a.due LIMIT 10").all(u.id, u.id),
    grades: db.prepare("SELECT a.title,s.score,a.max_score FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE s.student_id=? AND s.status='GRADED' ORDER BY s.updated DESC LIMIT 5").all(u.id) };
  const own = u.role === 'ADMIN' ? '1=1' : `c.lecturer_id=${u.id}`;
  return { role: u.role, unread: n,
    classes: db.prepare(`SELECT COUNT(*) n FROM classes c WHERE ${own}`).get().n,
    students: db.prepare(`SELECT COUNT(DISTINCT m.user_id) n FROM members m JOIN classes c ON c.id=m.class_id WHERE m.status='ACTIVE' AND ${own}`).get().n,
    pending_join: db.prepare(`SELECT COUNT(*) n FROM members m JOIN classes c ON c.id=m.class_id WHERE m.status='PENDING' AND ${own}`).get().n,
    to_grade: db.prepare(`SELECT COUNT(*) n FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN classes c ON c.id=a.class_id WHERE s.status='SUBMITTED' AND ${own}`).get().n };
}));
app.get('/api/notifications', auth, H(req => db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id)));
app.post('/api/notifications/read', auth, H(req => { db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id); }));

/* ---- Admin ---- */
app.get('/api/admin/users', auth, role('ADMIN'), H(() => db.prepare('SELECT id,code,name,email,role,locked FROM users').all()));
app.post('/api/admin/users', auth, role('ADMIN'), H(req => {
  const { code, name, email, password = '123456', role: r } = req.body;
  if (!code || !name || !email || !['STUDENT', 'LECTURER', 'ADMIN'].includes(r)) throw err(400, 'Thiếu thông tin');
  try { db.prepare('INSERT INTO users(code,name,email,pw,role) VALUES(?,?,?,?,?)').run(code, name, email, hash(password), r); } catch { throw err(409, 'Mã hoặc email đã tồn tại'); }
  audit(req.user.id, 'USER_CREATE', code);
}));
app.patch('/api/admin/users/:id', auth, role('ADMIN'), H(req => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id); if (!u) throw err(404, 'Không tìm thấy');
  if (u.id === req.user.id && (req.body.locked || (req.body.role && req.body.role !== 'ADMIN'))) throw err(400, 'Không thể tự khóa/hạ quyền chính mình');
  db.prepare('UPDATE users SET role=?,locked=?,pw=? WHERE id=?').run(['STUDENT', 'LECTURER', 'ADMIN'].includes(req.body.role) ? req.body.role : u.role, req.body.locked == null ? u.locked : +!!req.body.locked, req.body.reset_password ? hash('123456') : u.pw, u.id);
  audit(req.user.id, 'USER_UPDATE', `${u.code} ${JSON.stringify({ ...req.body, password: undefined })}`);
}));
app.get('/api/admin/audit', auth, role('ADMIN'), H(() => db.prepare('SELECT a.*,u.code FROM audit a LEFT JOIN users u ON u.id=user_id ORDER BY a.id DESC LIMIT 200').all()));
app.get('/api/admin/stats', auth, role('ADMIN'), H(() => Object.fromEntries(['users', 'classes', 'members', 'assignments', 'submissions'].map(t => [t, db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n]))));
app.get('/api/admin/backup', auth, role('ADMIN'), H(req => { audit(req.user.id, 'BACKUP');
  return Object.fromEntries(['users', 'classes', 'members', 'announcements', 'assignments', 'submissions', 'submission_history', 'grade_log', 'audit'].map(t => [t, db.prepare(`SELECT * FROM ${t}`).all()])); }));

app.use('/api', (req, res) => res.status(404).json({ error: 'API không tồn tại' }));
const root = path.join(__dirname, '..'); // chỉ phục vụ file giao diện, KHÔNG phục vụ data.db / server / node_modules
['css', 'js', 'assets'].forEach(d => app.use('/' + d, express.static(path.join(root, d))));
['index.html', 'lms.html'].forEach(f => app.get(['/' + f, f === 'index.html' ? '/' : '/lms'], (q, r) => r.sendFile(path.join(root, f))));
module.exports = app;
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log('T-FIT LAB: http://localhost:' + (process.env.PORT || 3000) + '  (LMS: /lms.html)'));
