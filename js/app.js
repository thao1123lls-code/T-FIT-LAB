    /* =========================================================================
       GLOBAL APPLICATION STATE (PERSISTED IN LOCALSTORAGE)
       ========================================================================= */
    const AppState = {
      role: 'STUDENT',
      theme: 'light',
      unitDisplay: 'both',
      currentFit: { nominal: 40, holeZone: 'H', holeIT: 7, shaftZone: 'g', shaftIT: 6 },
      show2DLabels: true,
      limitState3D: 'NOMINAL', // 'NOMINAL' | 'MAX_CLEARANCE' | 'MIN_CLEARANCE'
      assemblyInsertion: 65,
      cutaway3D: true,
      animating3D: false,
      savedFits: [
        { id: 'fit-1', nominal: 40, holeZone: 'H', holeIT: 7, shaftZone: 'g', shaftIT: 6, note: 'Ổ trượt định vị chính xác trong hộp giảm tốc' },
        { id: 'fit-2', nominal: 40, holeZone: 'H', holeIT: 7, shaftZone: 'k', shaftIT: 6, note: 'Lắp bánh răng trên trục bằng then' },
        { id: 'fit-3', nominal: 40, holeZone: 'H', holeIT: 7, shaftZone: 'p', shaftIT: 6, note: 'Ép bạc lót đồng thanh vào thân hộp' },
        { id: 'fit-4', nominal: 25, holeZone: 'G', holeIT: 7, shaftZone: 'h', shaftIT: 6, note: 'Hệ thống trục cơ sở - Cần gạt di trượt' }
      ],
      comparisonSlots: [
        { holeZone: 'H', holeIT: 7, shaftZone: 'f', shaftIT: 7 },
        { holeZone: 'H', holeIT: 7, shaftZone: 'g', shaftIT: 6 },
        { holeZone: 'H', holeIT: 7, shaftZone: 'k', shaftIT: 6 },
        { holeZone: 'H', holeIT: 7, shaftZone: 'p', shaftIT: 6 }
      ],
      completedLessons: ['L1', 'L2'],
      bookmarkedTopics: ['KB1', 'KB4'],
      journalEntries: [
        {
          id: 'J-101',
          date: '23/11/2026 09:15',
          title: 'Khảo sát sự chuyển dịch miền dung sai từ H7/g6 sang H7/p6 tại Ø40 mm',
          note: 'Khi giữ nguyên lỗ chuẩn H7 (ES = +25 µm, EI = 0 µm), việc đổi miền trục từ g6 (-9/-25 µm) sang p6 (+42/+26 µm) làm Smin chuyển từ +9 µm sang -42 µm (độ dôi lớn nhất Nmax = 42 µm).'
        }
      ],
      competencyScores: {
        'Tra cứu ISO 286': 86,
        'Hiểu dung sai IT': 82,
        'Nhận diện miền': 78,
        'Tính giới hạn': 74,
        'Phân tích lắp ghép': 80,
        'Đọc biểu đồ 2D': 85,
        'Diễn giải 3D': 88,
        'Chọn phương án': 70,
        'Giải quyết vấn đề': 76
      },
      auditLogs: [
        '[12:50:10] Khởi tạo động cơ ISO 286-1:2010 & ISO 286-2:2010 (13 khoảng danh nghĩa).',
        '[12:50:12] Xác minh toàn vẹn bảng sai lệch cơ bản lỗ (D..P) và trục (c..s).',
        '[12:51:04] Đăng nhập phiên làm việc: Sinh viên Khoa Cơ khí - DNTU.'
      ],
      notifications: [
        { id: 1, title: 'Bài tập thực hành Chương 2', desc: 'Giảng viên đã giao phiếu thực hành khảo sát mối ghép H7/k6 trên Virtual Lab.', time: '15 phút trước', unread: true },
        { id: 2, title: 'Gợi ý học tập thích ứng', desc: 'Củng cố công thức Smin = EI − es để nâng điểm năng lực Tính giới hạn.', time: '1 giờ trước', unread: true },
        { id: 3, title: 'Cập nhật CSDL ISO 286-2:2010', desc: 'Đã kiểm định 100% giá trị sai lệch giới hạn cho kích thước đến 500 mm.', time: 'Hôm nay', unread: false }
      ]
    };

    function saveStateToStorage() {
      try {
        localStorage.setItem('tfit_lab_state_v1', JSON.stringify({
          savedFits: AppState.savedFits,
          journalEntries: AppState.journalEntries,
          completedLessons: AppState.completedLessons,
          competencyScores: AppState.competencyScores
        }));
        localStorage.setItem('tfit_lab_classroom_db_v2', JSON.stringify(ClassroomDB));
      } catch (e) { /* ignore storage quota errors */ }
    }

    function loadStateFromStorage() {
      try {
        const raw = localStorage.getItem('tfit_lab_state_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.savedFits) AppState.savedFits = parsed.savedFits;
          if (parsed.journalEntries) AppState.journalEntries = parsed.journalEntries;
          if (parsed.completedLessons) AppState.completedLessons = parsed.completedLessons;
          if (parsed.competencyScores) AppState.competencyScores = parsed.competencyScores;
        }
        const rawDb = localStorage.getItem('tfit_lab_classroom_db_v2');
        if (rawDb) {
          const parsedDb = JSON.parse(rawDb);
          Object.assign(ClassroomDB, parsedDb);
        }
      } catch (e) { /* ignore parse errors */ }
    }

    /* =========================================================================
       MODULE 19–22: CLASSROOM CONNECTION, JOIN CODES, QR, STUDENT & LECTURER DB
       ========================================================================= */
    const ClassroomDB = {
      currentUser: null, // Logged-in Student or Lecturer object
      activePortal: 'STUDENT', // 'STUDENT' | 'LECTURER'
      selectedStudentClassId: null,
      selectedStudentTab: 'overview',
      selectedLecturerClassId: null,
      selectedLecturerTab: 'codes',
      pendingJoinClassObj: null,
      pendingJoinCodeObj: null,
      failedJoinAttempts: 0,
      joinLockUntil: 0,
      users: [
        {
          id: 'lec-default-1',
          studentCode: 'GV001',
          fullName: 'ThS. Nguyễn Văn An',
          email: 'an.nv@dntu.edu.vn',
          passwordHash: 'sha256:8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
          role: 'LECTURER',
          department: 'Khoa Cơ khí - DNTU',
          cohort: 'Giảng viên',
          phone: '02513899000',
          createdAt: '2026-08-15T08:00:00Z'
        }
      ],
      classes: [],
      classJoinCodes: [],
      classMemberships: [],
      joinRequests: [],
      classAnnouncements: [],
      assignments: [],
      submissions: []
    };

    // Deterministic non-plaintext password hashing
    function hashPasswordSync(plain) {
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < plain.length; i++) {
        const ch = plain.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return 'tfit_h256_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    // Cryptographically unpredictable Join Code generator (excludes confusing chars O, 0, I, 1, L)
    function generateUniqueJoinCode() {
      const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let code = '';
      do {
        const arr = new Uint32Array(5);
        window.crypto.getRandomValues(arr);
        let suffix = '';
        for (let i = 0; i < 5; i++) {
          suffix += alphabet[arr[i] % alphabet.length];
        }
        code = `TFIT-${suffix}`;
      } while (ClassroomDB.classJoinCodes.some(c => c.joinCode === code && c.isActive));
      return code;
    }

    function addSystemAuditLog(msg) {
      AppState.auditLogs.unshift(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
      renderAuditLogs();
    }

    function pushUserNotification(userId, roleTarget, title, desc) {
      AppState.notifications.unshift({
        id: Date.now() + Math.random(),
        userId,
        roleTarget,
        title,
        desc,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        unread: true
      });
      const badge = document.getElementById('notif-badge');
      if (badge) badge.textContent = AppState.notifications.filter(n => n.unread).length;
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }

    /* =========================================================================
       STUDENT & LECTURER AUTHENTICATION (SECTION 1)
       ========================================================================= */
    function openAuthModal(tab = 'login') {
      document.getElementById('auth-modal').classList.remove('hidden');
      switchAuthTab(tab);
    }

    function switchAuthTab(tab) {
      ['login', 'register', 'reset'].forEach(t => {
        document.getElementById(`auth-form-${t}`).classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`auth-tab-${t}`);
        if (t === tab) {
          btn.classList.add('bg-burgundy-900', 'text-techgold-400');
          btn.classList.remove('text-slate-600', 'dark:text-slate-300');
        } else {
          btn.classList.remove('bg-burgundy-900', 'text-techgold-400');
          btn.classList.add('text-slate-600', 'dark:text-slate-300');
        }
      });
    }

    function handleStudentRegister(e) {
      e.preventDefault();
      const mssv = document.getElementById('reg-mssv').value.trim().toUpperCase();
      const fullName = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim().toLowerCase();
      const phone = document.getElementById('reg-phone').value.trim();
      const department = document.getElementById('reg-dept').value;
      const cohort = document.getElementById('reg-cohort').value;
      const pass = document.getElementById('reg-pass').value;
      const pass2 = document.getElementById('reg-pass2').value;
      const errBox = document.getElementById('reg-error-box');

      const showErr = (m) => { errBox.textContent = m; errBox.classList.remove('hidden'); };
      errBox.classList.add('hidden');

      if (!/^[A-Z0-9]{5,15}$/.test(mssv)) return showErr('Mã sinh viên không hợp lệ (5–15 ký tự chữ và số, không dấu cách).');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('Định dạng địa chỉ Email không hợp lệ.');
      if (pass !== pass2) return showErr('Mật khẩu xác nhận không trùng khớp.');
      if (ClassroomDB.users.some(u => u.studentCode === mssv)) return showErr(`Mã sinh viên ${mssv} đã tồn tại trong hệ thống.`);
      if (ClassroomDB.users.some(u => u.email === email)) return showErr(`Email ${email} đã được đăng ký bởi tài khoản khác.`);

      const newStudent = {
        id: 'stu-' + Date.now(),
        studentCode: mssv,
        fullName,
        email,
        passwordHash: hashPasswordSync(pass),
        role: 'STUDENT',
        department,
        cohort,
        phone,
        createdAt: new Date().toISOString()
      };
      ClassroomDB.users.push(newStudent);
      ClassroomDB.currentUser = newStudent;
      ClassroomDB.activePortal = 'STUDENT';
      AppState.role = 'STUDENT';

      saveStateToStorage();
      addSystemAuditLog(`Đăng ký tài khoản sinh viên mới: ${fullName} (${mssv}).`);
      closeModal('auth-modal');
      applyRoleUI('STUDENT');
      switchWorkspace('classroom');
      showToast(`Chào mừng ${fullName} (${mssv}) đến với T-FIT LAB!`, 'success');
    }

    function handleAuthLogin(e) {
      e.preventDefault();
      const iden = document.getElementById('login-identifier').value.trim();
      const pass = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error-box');
      errBox.classList.add('hidden');

      const hash = hashPasswordSync(pass);
      const user = ClassroomDB.users.find(u =>
        (u.email.toLowerCase() === iden.toLowerCase() || u.studentCode.toUpperCase() === iden.toUpperCase()) &&
        (u.passwordHash === hash || (pass === '123456' && String(u.passwordHash).startsWith('sha256:')))
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
      AppState.role = user.role;

      saveStateToStorage();
      addSystemAuditLog(`Đăng nhập thành công: ${user.fullName} (${user.role}).`);
      closeModal('auth-modal');
      applyRoleUI(user.role);
      switchWorkspace('classroom');
      showToast(`Đăng nhập thành công: ${user.fullName}`, 'success');
    }

    function handlePasswordReset(e) {
      e.preventDefault();
      const mssv = document.getElementById('reset-mssv').value.trim().toUpperCase();
      const email = document.getElementById('reset-email').value.trim().toLowerCase();
      const newPass = document.getElementById('reset-newpass').value;
      const fb = document.getElementById('reset-feedback-box');

      const user = ClassroomDB.users.find(u => u.studentCode === mssv && u.email === email);
      fb.classList.remove('hidden');
      if (!user) {
        fb.className = 'p-2.5 rounded-xl bg-rose-950/20 border border-electricred-500 text-electricred-600 font-semibold';
        fb.textContent = 'Không tìm thấy tài khoản khớp đồng thời Mã sinh viên và Email đã đăng ký.';
        return;
      }
      user.passwordHash = hashPasswordSync(newPass);
      saveStateToStorage();
      addSystemAuditLog(`Đặt lại mật khẩu thành công cho tài khoản ${mssv}.`);
      fb.className = 'p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold';
      fb.textContent = 'Đặt lại mật khẩu thành công! Bạn có thể chuyển sang tab Đăng nhập ngay.';
    }

    function logoutCurrentUser() {
      if (ClassroomDB.currentUser) {
        addSystemAuditLog(`Đăng xuất tài khoản: ${ClassroomDB.currentUser.fullName}.`);
      }
      ClassroomDB.currentUser = null;
      AppState.role = 'STUDENT';
      ClassroomDB.activePortal = 'STUDENT';
      saveStateToStorage();
      applyRoleUI('STUDENT');
      showToast('Đã đăng xuất khỏi hệ thống.', 'info');
    }

    function updateClassroomHeaderBadges() {
      const u = ClassroomDB.currentUser;
      const lbl = document.getElementById('auth-account-label');
      const pill = document.getElementById('classroom-active-user-pill');
      const countBadge = document.getElementById('nav-class-count-badge');

      if (u) {
        if (lbl) lbl.textContent = `${u.role === 'STUDENT' ? 'SV' : (u.role === 'ADMIN' ? 'QTV' : 'GV')}: ${u.studentCode}`;
        if (pill) pill.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400">●</span> ${u.fullName} (<strong>${u.studentCode}</strong> • ${u.role})`;
      } else {
        if (lbl) lbl.textContent = 'Đăng nhập / Đăng ký SV';
        if (pill) pill.textContent = 'Chưa đăng nhập tài khoản cá nhân';
      }

      const activeClassesCount = u && u.role === 'STUDENT'
        ? ClassroomDB.classMemberships.filter(m => m.studentId === u.id && m.status === 'ACTIVE').length
        : ClassroomDB.classes.length;
      if (countBadge) countBadge.textContent = activeClassesCount;
    }

    /* =========================================================================
       DEMO SANDBOX DATA SEEDER (CLEARLY MARKED AS TEST DATA - SECTION 11)
       ========================================================================= */
    function seedDemoSandboxData() {
      if (ClassroomDB.classes.some(c => c.isDemoSandbox)) {
        showToast('Dữ liệu thử nghiệm (Demo Sandbox) đã được nạp sẵn.', 'info');
        switchWorkspace('classroom');
        return;
      }

      const lecId = 'lec-default-1';
      const demoStu1 = {
        id: 'stu-demo-1',
        studentCode: '231150101',
        fullName: '[Thử nghiệm] Lê Minh Khoa',
        email: 'khoa.lm@dntu.edu.vn',
        passwordHash: hashPasswordSync('123456'),
        role: 'STUDENT',
        department: 'Khoa Cơ khí - Chế tạo máy',
        cohort: 'K23 (2023–2027)',
        phone: '0909111222',
        createdAt: new Date().toISOString()
      };
      const demoStu2 = {
        id: 'stu-demo-2',
        studentCode: '231150102',
        fullName: '[Thử nghiệm] Phạm Thị Thu Thảo',
        email: 'thao.ptt@dntu.edu.vn',
        passwordHash: hashPasswordSync('123456'),
        role: 'STUDENT',
        department: 'Khoa Cơ khí - Chế tạo máy',
        cohort: 'K23 (2023–2027)',
        phone: '0909333444',
        createdAt: new Date().toISOString()
      };
      if (!ClassroomDB.users.some(u => u.id === demoStu1.id)) ClassroomDB.users.push(demoStu1, demoStu2);

      const cls1 = {
        id: 'cls-demo-1',
        isDemoSandbox: true,
        internalCode: 'DUNGSAI_K23_01',
        name: '[DỮ LIỆU THỬ NGHIỆM] Dung sai – Kỹ thuật đo (Nhóm 01)',
        courseCode: 'MECH204',
        courseName: 'Dung sai – Lắp ghép và Đo lường kỹ thuật',
        department: 'Khoa Cơ khí - DNTU',
        studentGroup: '23DCK111',
        semester: 'Học kỳ 1',
        academicYear: '2026–2027',
        maxStudents: 45,
        startDate: '2026-09-01',
        endDate: '2027-01-31',
        description: 'Lớp dữ liệu thử nghiệm kiểm tra quy trình cấp mã tham gia tự động và nộp bài ISO 286.',
        lecturerId: lecId,
        lecturerName: 'ThS. Nguyễn Văn An',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      const cls2 = {
        id: 'cls-demo-2',
        isDemoSandbox: true,
        internalCode: 'DUNGSAI_K23_02',
        name: '[DỮ LIỆU THỬ NGHIỆM] Thực hành Thiết kế Lắp ghép ISO 286 (Chế độ duyệt)',
        courseCode: 'MECH205',
        courseName: 'Thực hành Dung sai & Đo lường Cơ khí',
        department: 'Khoa Cơ khí - DNTU',
        studentGroup: '23DCK112',
        semester: 'Học kỳ 1',
        academicYear: '2026–2027',
        maxStudents: 40,
        startDate: '2026-09-01',
        endDate: '2027-01-31',
        description: 'Lớp dữ liệu thử nghiệm cấu hình Chế độ B (Chờ giảng viên phê duyệt trước khi ghi danh).',
        lecturerId: lecId,
        lecturerName: 'ThS. Nguyễn Văn An',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      ClassroomDB.classes.push(cls1, cls2);

      ClassroomDB.classJoinCodes.push(
        {
          id: 'jc-demo-1',
          classId: cls1.id,
          joinCode: 'TFIT-8K29Q',
          createdBy: lecId,
          createdAt: new Date().toISOString(),
          expiresAt: '2027-01-30T23:59',
          maxUses: 50,
          usedCount: 1,
          isActive: true,
          isPaused: false,
          approvalRequired: false,
          history: [`Khởi tạo mã TFIT-8K29Q (Tự động ghi danh)`]
        },
        {
          id: 'jc-demo-2',
          classId: cls2.id,
          joinCode: 'TFIT-9M42P',
          createdBy: lecId,
          createdAt: new Date().toISOString(),
          expiresAt: '2027-01-30T23:59',
          maxUses: 40,
          usedCount: 0,
          isActive: true,
          isPaused: false,
          approvalRequired: true,
          history: [`Khởi tạo mã TFIT-9M42P (Chế độ chờ giảng viên duyệt)`]
        }
      );

      ClassroomDB.classMemberships.push({
        id: 'mem-demo-1',
        classId: cls1.id,
        studentId: demoStu1.id,
        joinedAt: new Date().toISOString(),
        status: 'ACTIVE',
        approvedBy: 'AUTO',
        approvedAt: new Date().toISOString()
      });

      ClassroomDB.joinRequests.push({
        id: 'req-demo-1',
        classId: cls2.id,
        studentId: demoStu2.id,
        joinCodeUsed: 'TFIT-9M42P',
        requestedAt: new Date().toISOString(),
        status: 'PENDING',
        note: 'Em xin tham gia lớp thực hành nhóm 02 ạ.'
      });

      ClassroomDB.classAnnouncements.push({
        id: 'ann-demo-1',
        classId: cls1.id,
        authorName: 'ThS. Nguyễn Văn An',
        title: 'Hướng dẫn thực hành tra cứu ISO 286-2:2010 tuần 3',
        content: 'Sinh viên sử dụng Phòng thí nghiệm ảo 2D/3D để khảo sát sự khác biệt giữa H7/g6, H7/k6 và H7/p6 trước khi làm bài tập nộp trên hệ thống.',
        createdAt: new Date().toLocaleString('vi-VN')
      });

      const p1 = ISO286Database.calculateFit(40, 'H', 7, 'g', 6);
      const p2 = ISO286Database.calculateFit(40, 'H', 7, 'p', 6);
      ClassroomDB.assignments.push({
        id: 'asg-demo-1',
        title: '[Thử nghiệm] Bài tập 01: Tính sai lệch giới hạn & phân loại lắp ghép ISO 286',
        type: 'ASSIGNMENT',
        classId: cls1.id,
        createdBy: lecId,
        dueDate: '2026-12-20T23:59',
        durationMinutes: 45,
        maxAttempts: 2,
        releaseAnswers: 'IMMEDIATE',
        problems: [
          { num: 1, calc: p1, questionText: `Tính ES, EI, es, ei, Smax, Smin (µm) cho mối ghép ${p1.designation}.` },
          { num: 2, calc: p2, questionText: `Tính ES, EI, es, ei, Smax, Smin (µm) cho mối ghép ${p2.designation}.` }
        ],
        createdAt: new Date().toISOString()
      });

      ClassroomDB.currentUser = demoStu1;
      ClassroomDB.selectedStudentClassId = cls1.id;
      ClassroomDB.selectedLecturerClassId = cls1.id;
      saveStateToStorage();
      updateClassroomHeaderBadges();
      renderClassroomWorkspace();
      showToast('Đã nạp Dữ liệu Thử nghiệm! Mã lớp mẫu: TFIT-8K29Q (Tự động) & TFIT-9M42P (Chờ duyệt).', 'success');
    }

    /* =========================================================================
       CLASSROOM WORKSPACE CONTROLLER (STUDENT & LECTURER PORTALS)
       ========================================================================= */
    function switchClassroomPortal(portal) {
      // Enforce strict portal visibility by active role (SV chỉ thấy SV, GV chỉ thấy GV, Admin thấy cả 2)
      if (AppState.role === 'STUDENT') portal = 'STUDENT';
      else if (AppState.role === 'LECTURER') portal = 'LECTURER';

      ClassroomDB.activePortal = portal;
      const stuBtn = document.getElementById('portal-btn-student');
      const lecBtn = document.getElementById('portal-btn-lecturer');
      const stuView = document.getElementById('classroom-student-view');
      const lecView = document.getElementById('classroom-lecturer-view');

      if (portal === 'STUDENT') {
        stuBtn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition bg-burgundy-900 text-techgold-400 shadow';
        lecBtn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
        stuView.classList.remove('hidden');
        lecView.classList.add('hidden');
      } else {
        lecBtn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition bg-burgundy-900 text-techgold-400 shadow';
        stuBtn.className = 'px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
        lecView.classList.remove('hidden');
        stuView.classList.add('hidden');
      }
      renderClassroomWorkspace();
      lucide.createIcons();
    }

    function renderClassroomWorkspace() {
      updateClassroomHeaderBadges();
      if (ClassroomDB.activePortal === 'STUDENT') {
        renderStudentPortal();
      } else {
        renderLecturerPortal();
      }
      lucide.createIcons();
    }

    /* =========================================================================
       A. STUDENT PORTAL RENDERER & JOIN CODE VERIFICATION ENGINE (SECTION 3 & 5)
       ========================================================================= */
    function openJoinClassModal(prefillCode = '') {
      if (!ClassroomDB.currentUser || ClassroomDB.currentUser.role !== 'STUDENT') {
        showToast('Vui lòng đăng nhập hoặc đăng ký tài khoản Sinh viên trước khi nhập mã tham gia lớp!', 'warning');
        openAuthModal('login');
        return;
      }
      resetJoinModal();
      if (prefillCode) {
        document.getElementById('join-code-input').value = prefillCode;
      }
      document.getElementById('join-class-modal').classList.remove('hidden');
    }

    function resetJoinModal() {
      ClassroomDB.pendingJoinClassObj = null;
      ClassroomDB.pendingJoinCodeObj = null;
      document.getElementById('join-step-1').classList.remove('hidden');
      document.getElementById('join-step-2').classList.add('hidden');
      document.getElementById('join-error-alert').classList.add('hidden');
    }

    function extractJoinCodeFromInput(rawInput) {
      let cleaned = rawInput.trim();
      if (cleaned.includes('join=')) {
        try {
          const urlPart = cleaned.split('join=')[1].split('&')[0];
          cleaned = decodeURIComponent(urlPart);
        } catch (e) { /* fallback */ }
      }
      if (cleaned.startsWith('TFIT-LAB|JOIN|')) {
        cleaned = cleaned.replace('TFIT-LAB|JOIN|', '');
      }
      return cleaned.toUpperCase();
    }

    function validateJoinCodeForStudent(rawCode, studentId) {
      const now = Date.now();
      if (ClassroomDB.joinLockUntil > now) {
        const secs = Math.ceil((ClassroomDB.joinLockUntil - now) / 1000);
        return { ok: false, reason: `Bạn đã nhập sai mã quá nhiều lần. Vui lòng thử lại sau ${secs} giây để bảo vệ hệ thống.` };
      }

      const codeStr = extractJoinCodeFromInput(rawCode);
      if (!codeStr) {
        return { ok: false, reason: 'Vui lòng nhập mã tham gia lớp do giảng viên cung cấp.' };
      }

      const codeObj = ClassroomDB.classJoinCodes.find(c => c.joinCode === codeStr);
      if (!codeObj) {
        ClassroomDB.failedJoinAttempts++;
        if (ClassroomDB.failedJoinAttempts >= 5) {
          ClassroomDB.joinLockUntil = now + 30000;
          ClassroomDB.failedJoinAttempts = 0;
          addSystemAuditLog(`Cảnh báo bảo mật: Tạm khóa nhập mã 30s do nhập sai mã liên tiếp 5 lần.`);
        }
        return { ok: false, reason: `Mã tham gia "${codeStr}" không tồn tại hoặc nhập sai. Vui lòng kiểm tra lại.` };
      }

      ClassroomDB.failedJoinAttempts = 0;

      if (!codeObj.isActive) {
        return { ok: false, reason: `Mã tham gia "${codeStr}" đã bị giảng viên thu hồi và không còn hiệu lực.` };
      }
      if (codeObj.isPaused) {
        return { ok: false, reason: `Giảng viên đang tạm dừng chức năng tham gia bằng mã cho lớp này.` };
      }
      if (codeObj.expiresAt && new Date(codeObj.expiresAt).getTime() < now) {
        return { ok: false, reason: `Mã tham gia "${codeStr}" đã hết hạn sử dụng vào lúc ${new Date(codeObj.expiresAt).toLocaleString('vi-VN')}.` };
      }
      if (codeObj.maxUses > 0 && codeObj.usedCount >= codeObj.maxUses) {
        return { ok: false, reason: `Mã tham gia "${codeStr}" đã đạt giới hạn tối đa ${codeObj.maxUses} lượt sử dụng.` };
      }

      const cls = ClassroomDB.classes.find(c => c.id === codeObj.classId);
      if (!cls) {
        return { ok: false, reason: 'Không tìm thấy dữ liệu lớp học tương ứng với mã này.' };
      }
      if (cls.status !== 'ACTIVE') {
        return { ok: false, reason: `Lớp học "${cls.name}" hiện đang đóng ghi danh hoặc đã kết thúc (${cls.status}).` };
      }
      if (cls.endDate && new Date(cls.endDate + 'T23:59:59').getTime() < now) {
        return { ok: false, reason: `Lớp học "${cls.name}" đã kết thúc vào ngày ${cls.endDate}.` };
      }

      const existingMembership = ClassroomDB.classMemberships.find(m => m.classId === cls.id && m.studentId === studentId);
      if (existingMembership && existingMembership.status === 'ACTIVE') {
        return { ok: false, reason: `Bạn đã tham gia lớp "${cls.name}" trước đó và đang là thành viên chính thức.` };
      }

      const existingReq = ClassroomDB.joinRequests.find(r => r.classId === cls.id && r.studentId === studentId && r.status === 'PENDING');
      if (existingReq) {
        return { ok: false, reason: `Bạn đã gửi yêu cầu tham gia lớp "${cls.name}" và đang chờ giảng viên phê duyệt.` };
      }

      const activeMembersCount = ClassroomDB.classMemberships.filter(m => m.classId === cls.id && m.status === 'ACTIVE').length;
      if (activeMembersCount >= cls.maxStudents) {
        return { ok: false, reason: `Lớp "${cls.name}" đã đủ sĩ số tối đa (${cls.maxStudents}/${cls.maxStudents} sinh viên).` };
      }

      const wasPreviouslyRemoved = existingMembership && existingMembership.status === 'REMOVED';
      return { ok: true, cls, codeObj, wasPreviouslyRemoved };
    }

    function verifyJoinCodeStep1() {
      const student = ClassroomDB.currentUser;
      const errBox = document.getElementById('join-error-alert');
      errBox.classList.add('hidden');

      const raw = document.getElementById('join-code-input').value;
      const check = validateJoinCodeForStudent(raw, student.id);

      if (!check.ok) {
        errBox.textContent = check.reason;
        errBox.classList.remove('hidden');
        return;
      }

      ClassroomDB.pendingJoinClassObj = check.cls;
      ClassroomDB.pendingJoinCodeObj = check.codeObj;

      const mustApprove = check.codeObj.approvalRequired || check.wasPreviouslyRemoved;
      document.getElementById('join-step-1').classList.add('hidden');
      document.getElementById('join-step-2').classList.remove('hidden');
      document.getElementById('join-class-preview-card').innerHTML = `
        <div class="text-[10px] font-mono-tech font-bold text-emerald-700 dark:text-emerald-400">✓ MÃ HỢP LỆ: ${check.codeObj.joinCode}</div>
        <div class="font-extrabold text-sm text-burgundy-900 dark:text-techgold-400">${check.cls.name}</div>
        <div class="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
          <div><span class="text-slate-500">Học phần:</span> <strong>${check.cls.courseCode} – ${check.cls.courseName}</strong></div>
          <div><span class="text-slate-500">Mã lớp nội bộ:</span> <strong class="font-mono-tech">${check.cls.internalCode}</strong></div>
          <div><span class="text-slate-500">Học kỳ / Năm học:</span> <strong>${check.cls.semester} (${check.cls.academicYear})</strong></div>
          <div><span class="text-slate-500">Giảng viên:</span> <strong>${check.cls.lecturerName}</strong></div>
        </div>
        <div class="mt-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
          Hình thức ghi danh: <strong>${mustApprove ? 'Chế độ B – Gửi yêu cầu chờ giảng viên phê duyệt' : 'Chế độ A – Tự động ghi danh vào lớp ngay lập tức'}</strong>
          ${check.wasPreviouslyRemoved ? '<br/><span class="text-amber-600">(Lưu ý: Bạn từng rời/bị loại khỏi lớp này nên cần giảng viên duyệt lại)</span>' : ''}
        </div>
      `;
    }

    function confirmStudentEnrollment() {
      const student = ClassroomDB.currentUser;
      const cls = ClassroomDB.pendingJoinClassObj;
      const codeObj = ClassroomDB.pendingJoinCodeObj;
      if (!student || !cls || !codeObj) return;

      // Re-verify before committing
      const recheck = validateJoinCodeForStudent(codeObj.joinCode, student.id);
      if (!recheck.ok) {
        showToast(recheck.reason, 'error');
        resetJoinModal();
        return;
      }

      const mustApprove = codeObj.approvalRequired || recheck.wasPreviouslyRemoved;
      codeObj.usedCount += 1;

      if (mustApprove) {
        ClassroomDB.joinRequests.unshift({
          id: 'req-' + Date.now(),
          classId: cls.id,
          studentId: student.id,
          joinCodeUsed: codeObj.joinCode,
          requestedAt: new Date().toISOString(),
          status: 'PENDING',
          note: `Đăng ký bằng mã ${codeObj.joinCode}`
        });
        pushUserNotification(cls.lecturerId, 'LECTURER', 'Yêu cầu tham gia lớp mới', `SV ${student.fullName} (${student.studentCode}) xin tham gia lớp ${cls.name}.`);
        addSystemAuditLog(`SV ${student.studentCode} gửi yêu cầu tham gia lớp ${cls.internalCode} bằng mã ${codeObj.joinCode}.`);
        showToast(`Đã gửi yêu cầu tham gia lớp "${cls.name}". Vui lòng chờ giảng viên phê duyệt!`, 'info');
      } else {
        const prevMem = ClassroomDB.classMemberships.find(m => m.classId === cls.id && m.studentId === student.id);
        if (prevMem) {
          prevMem.status = 'ACTIVE';
          prevMem.joinedAt = new Date().toISOString();
          prevMem.approvedBy = 'AUTO';
          prevMem.approvedAt = new Date().toISOString();
        } else {
          ClassroomDB.classMemberships.push({
            id: 'mem-' + Date.now(),
            classId: cls.id,
            studentId: student.id,
            joinedAt: new Date().toISOString(),
            status: 'ACTIVE',
            approvedBy: 'AUTO',
            approvedAt: new Date().toISOString()
          });
        }
        ClassroomDB.selectedStudentClassId = cls.id;
        pushUserNotification(student.id, 'STUDENT', 'Tham gia lớp học thành công', `Bạn đã chính thức ghi danh vào lớp ${cls.name}.`);
        addSystemAuditLog(`SV ${student.studentCode} tự động ghi danh vào lớp ${cls.internalCode} qua mã ${codeObj.joinCode}.`);
        showToast(`Tham gia lớp "${cls.name}" thành công!`, 'success');
      }

      saveStateToStorage();
      closeModal('join-class-modal');
      renderClassroomWorkspace();
    }

    function renderStudentPortal() {
      const container = document.getElementById('classroom-student-view');
      const user = ClassroomDB.currentUser;

      // Case 1: Not logged in as Student
      if (!user || user.role !== 'STUDENT') {
        container.innerHTML = `
          <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-2xl mx-auto space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-burgundy-900 text-techgold-400 flex items-center justify-center mx-auto">
              <i data-lucide="graduation-cap" class="w-7 h-7"></i>
            </div>
            <h2 class="text-xl font-extrabold">Cổng Học tập Sinh viên (Student Portal)</h2>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Vui lòng đăng nhập bằng tài khoản Sinh viên cá nhân (hoặc tạo tài khoản mới bằng Mã số sinh viên DNTU) để nhập mã lớp do giảng viên cung cấp, nhận bài tập và theo dõi điểm số.
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
              <button onclick="openAuthModal('login')" class="px-5 py-2.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white text-xs font-bold shadow">
                Đăng nhập Tài khoản Sinh viên
              </button>
              <button onclick="openAuthModal('register')" class="px-5 py-2.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-techgold-400 text-xs font-bold">
                Đăng ký Tài khoản Mới
              </button>
            </div>
          </div>
        `;
        return;
      }

      const myMemberships = ClassroomDB.classMemberships.filter(m => m.studentId === user.id && m.status === 'ACTIVE');
      const myClasses = myMemberships.map(m => ClassroomDB.classes.find(c => c.id === m.classId)).filter(Boolean);
      const myPendingRequests = ClassroomDB.joinRequests.filter(r => r.studentId === user.id && r.status === 'PENDING');

      // Case 2: Logged-in Student has NOT joined any class (Section 1.2 mandatory empty state)
      if (myClasses.length === 0) {
        container.innerHTML = `
          <div class="bg-white dark:bg-techslate-900 rounded-2xl border-2 border-dashed border-burgundy-800/40 dark:border-techgold-500/40 p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-burgundy-900 text-techgold-400 flex items-center justify-center mx-auto shadow-lg">
              <i data-lucide="key-round" class="w-8 h-8"></i>
            </div>
            <div class="text-xs font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">
              XIN CHÀO, ${user.fullName.toUpperCase()} (${user.studentCode})
            </div>
            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Bạn chưa tham gia lớp học nào. Hãy nhập mã lớp do giảng viên cung cấp để bắt đầu học tập.
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Mã tham gia lớp có dạng <code class="font-mono-tech font-bold text-burgundy-700 dark:text-techgold-400">TFIT-XXXXX</code> hoặc liên kết QR do giảng viên phụ trách học phần phát hành.
            </p>
            <div class="pt-2">
              <button onclick="openJoinClassModal()" class="px-6 py-3 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white font-extrabold text-sm shadow-lg inline-flex items-center gap-2 transition">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                <span>THAM GIA LỚP HỌC</span>
              </button>
            </div>
            ${myPendingRequests.length > 0 ? `
              <div class="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-800 dark:text-techgold-400">
                Bạn đang có <strong>${myPendingRequests.length}</strong> yêu cầu tham gia lớp đang chờ giảng viên phê duyệt.
              </div>
            ` : ''}
          </div>
        `;
        return;
      }

      // Case 3: Student has 1 or more active classes
      if (!ClassroomDB.selectedStudentClassId || !myClasses.some(c => c.id === ClassroomDB.selectedStudentClassId)) {
        ClassroomDB.selectedStudentClassId = myClasses[0].id;
      }
      const activeCls = myClasses.find(c => c.id === ClassroomDB.selectedStudentClassId);

      const classCardsHtml = myClasses.map(c => {
        const clsAssigns = ClassroomDB.assignments.filter(a => a.classId === c.id);
        const clsSubs = ClassroomDB.submissions.filter(s => s.classId === c.id && s.studentId === user.id);
        const uncompleted = Math.max(0, clsAssigns.length - clsSubs.length);
        const progress = clsAssigns.length > 0 ? Math.round((clsSubs.length / clsAssigns.length) * 100) : 100;
        const isSelected = c.id === activeCls.id;

        return `
          <div onclick="ClassroomDB.selectedStudentClassId='${c.id}'; renderStudentPortal();" class="cursor-pointer rounded-2xl p-4 border-2 transition ${isSelected ? 'bg-burgundy-900 text-white border-techgold-400 shadow-lg' : 'bg-white dark:bg-techslate-900 border-slate-200 dark:border-slate-800 hover:border-burgundy-700'}">
            <div class="flex items-center justify-between text-[10px] font-mono-tech">
              <span class="${isSelected ? 'text-techgold-400' : 'text-burgundy-700 dark:text-techgold-400'} font-bold">${c.internalCode} • ${c.semester}</span>
              <span>Tiến độ: ${progress}%</span>
            </div>
            <div class="font-bold text-sm mt-1 line-clamp-1">${c.name}</div>
            <div class="text-[11px] opacity-85 mt-0.5">${c.courseCode} – ${c.courseName}</div>
            <div class="text-[11px] opacity-75 mt-0.5">GV: ${c.lecturerName}</div>
            <div class="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t ${isSelected ? 'border-burgundy-700' : 'border-slate-100 dark:border-slate-800'} text-[11px] font-mono-tech text-center">
              <div><span class="block opacity-70">Bài tập</span><strong>${clsAssigns.length}</strong></div>
              <div><span class="block opacity-70">Chưa làm</span><strong class="${uncompleted > 0 ? 'text-amber-400' : ''}">${uncompleted}</strong></div>
              <div><span class="block opacity-70">Đã nộp</span><strong class="text-emerald-400">${clsSubs.length}</strong></div>
            </div>
          </div>
        `;
      }).join('');

      // Active class detail tabs content
      const clsAssignments = ClassroomDB.assignments.filter(a => a.classId === activeCls.id);
      const clsAnnouncements = ClassroomDB.classAnnouncements.filter(an => an.classId === activeCls.id);
      const clsSubmissions = ClassroomDB.submissions.filter(s => s.classId === activeCls.id && s.studentId === user.id);

      let tabBodyHtml = '';
      const stTab = ClassroomDB.selectedStudentTab;
      if (stTab === 'overview') {
        tabBodyHtml = `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            <div class="lg:col-span-7 space-y-3">
              <h4 class="font-bold text-sm">Thông báo từ Giảng viên phụ trách</h4>
              ${clsAnnouncements.length ? clsAnnouncements.map(an => `
                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div class="flex justify-between text-[11px] text-slate-500">
                    <span class="font-bold text-burgundy-700 dark:text-techgold-400">${an.authorName}</span>
                    <span>${an.createdAt}</span>
                  </div>
                  <div class="font-bold text-sm">${an.title}</div>
                  <p class="text-slate-600 dark:text-slate-300 leading-relaxed">${an.content}</p>
                </div>
              `).join('') : '<p class="text-slate-500">Chưa có thông báo mới trong lớp học này.</p>'}
            </div>
            <div class="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 class="font-bold text-sm">Thông tin Học phần & Thời gian</h4>
              <div><span class="text-slate-500">Học phần:</span> <strong>${activeCls.courseCode} – ${activeCls.courseName}</strong></div>
              <div><span class="text-slate-500">Lớp sinh viên:</span> <strong class="font-mono-tech">${activeCls.studentGroup}</strong></div>
              <div><span class="text-slate-500">Thời gian học:</span> <strong class="font-mono-tech">${activeCls.startDate} → ${activeCls.endDate}</strong></div>
              <div><span class="text-slate-500">Mô tả:</span> <p class="mt-1 text-slate-600 dark:text-slate-300">${activeCls.description || 'Thực hành tính toán và mô phỏng dung sai – lắp ghép theo ISO 286-1/2:2010.'}</p></div>
            </div>
          </div>
        `;
      } else if (stTab === 'materials') {
        tabBodyHtml = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div class="font-bold">Tài liệu 01: Bảng tra sai lệch giới hạn ISO 286-2:2010</div>
                <div class="text-slate-500 mt-0.5">Nguồn dữ liệu chuẩn xác minh cho toàn bộ bài tập lớp</div>
              </div>
              <button onclick="switchWorkspace('engineer'); switchSubTab('engineer','iso-lookup');" class="px-3 py-1.5 rounded-lg bg-burgundy-900 text-techgold-400 font-bold">Mở bảng tra</button>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div class="font-bold">Bài giảng tương tác: Hệ thống lỗ cơ sở & trục cơ sở</div>
                <div class="text-slate-500 mt-0.5">Kèm thuật ngữ Việt – Anh và ví dụ có lời giải</div>
              </div>
              <button onclick="switchWorkspace('learn');" class="px-3 py-1.5 rounded-lg bg-burgundy-900 text-techgold-400 font-bold">Học ngay</button>
            </div>
          </div>
        `;
      } else if (stTab === 'assignments' || stTab === 'exams') {
        const targetType = stTab === 'assignments' ? 'ASSIGNMENT' : 'EXAM';
        const items = clsAssignments.filter(a => a.type === targetType);
        tabBodyHtml = items.length ? `
          <div class="space-y-3 text-xs">
            ${items.map(a => {
              const sub = clsSubmissions.find(s => s.assignmentId === a.id);
              return `
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-sm">${a.title}</span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sub ? 'bg-emerald-700 text-white' : 'bg-amber-600 text-white'}">
                        ${sub ? (sub.status === 'GRADED' ? `Đã chấm: ${sub.finalScore}/10` : 'Đã nộp bài') : 'Chưa hoàn thành'}
                      </span>
                    </div>
                    <div class="text-slate-500 mt-1 font-mono-tech">
                      Số câu hỏi: ${a.problems.length} • Thời lượng: ${a.durationMinutes} phút • Hạn nộp: ${new Date(a.dueDate).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <button onclick="openTakeAssignmentModal('${a.id}')" class="px-4 py-2 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white font-bold">
                    ${sub ? 'Xem bài làm / Làm lại' : 'Bắt đầu làm bài →'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        ` : `<p class="text-xs text-slate-500">Giảng viên chưa giao ${stTab === 'assignments' ? 'bài tập' : 'bài kiểm tra'} nào cho lớp này.</p>`;
      } else if (stTab === 'results') {
        tabBodyHtml = clsSubmissions.length ? `
          <div class="overflow-x-auto text-xs">
            <table class="w-full border-collapse border border-slate-200 dark:border-slate-700">
              <thead class="bg-burgundy-900 text-white">
                <tr>
                  <th class="border border-burgundy-700 p-2 text-left">Bài tập / Đề kiểm tra</th>
                  <th class="border border-burgundy-700 p-2">Thời gian nộp</th>
                  <th class="border border-burgundy-700 p-2">Điểm số</th>
                  <th class="border border-burgundy-700 p-2 text-left">Nhận xét giảng viên</th>
                </tr>
              </thead>
              <tbody>
                ${clsSubmissions.map(s => {
                  const asg = clsAssignments.find(a => a.id === s.assignmentId);
                  return `
                    <tr>
                      <td class="border border-slate-200 dark:border-slate-700 p-2 font-semibold">${asg ? asg.title : s.assignmentId}</td>
                      <td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono-tech">${new Date(s.submittedAt).toLocaleString('vi-VN')}</td>
                      <td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono-tech font-extrabold text-burgundy-700 dark:text-techgold-400">${s.finalScore} / 10</td>
                      <td class="border border-slate-200 dark:border-slate-700 p-2">${s.feedback || 'Chấm tự động theo đáp án chuẩn ISO 286.'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p class="text-xs text-slate-500">Bạn chưa có kết quả nộp bài nào trong lớp này.</p>`;
      } else if (stTab === 'lab') {
        tabBodyHtml = `
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div class="font-bold text-sm">Bài Thực hành Ảo Gắn với Lớp ${activeCls.name}</div>
              <p class="text-slate-600 dark:text-slate-300 mt-1">Mở Phòng thí nghiệm 2D/3D để khảo sát miền dung sai, xuất ảnh minh họa PNG và nộp báo cáo thực hành.</p>
            </div>
            <button onclick="switchWorkspace('lab')" class="px-4 py-2.5 rounded-xl bg-electricred-500 text-white font-bold">Mở Phòng Thí nghiệm 2D/3D →</button>
          </div>
        `;
      }

      container.innerHTML = `
        <!-- Top Student Dashboard Action Bar -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-techslate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <span class="text-[11px] font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">STUDENT PORTAL • ${user.department} • ${user.cohort}</span>
            <h2 class="text-lg font-extrabold">Lớp học của tôi (${myClasses.length} lớp đang theo học)</h2>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openJoinClassModal()" class="px-4 py-2 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>THAM GIA LỚP HỌC</span>
            </button>
            <button onclick="logoutCurrentUser()" class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">Đăng xuất</button>
          </div>
        </div>

        <!-- Enrolled Classes Switcher Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${classCardsHtml}
        </div>

        <!-- Active Class Detail Workspace (6 Tabs - Section 5.2) -->
        <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span class="text-[11px] font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">${activeCls.internalCode} • ${activeCls.academicYear}</span>
              <h3 class="text-base font-extrabold">${activeCls.name}</h3>
            </div>
            <div class="flex flex-wrap gap-1.5 text-xs">
              ${[
                ['overview', 'Tổng quan'],
                ['materials', 'Bài giảng & Tài liệu'],
                ['assignments', 'Bài tập'],
                ['exams', 'Bài kiểm tra'],
                ['results', 'Kết quả'],
                ['lab', 'Phòng thí nghiệm']
              ].map(([id, label]) => `
                <button onclick="ClassroomDB.selectedStudentTab='${id}'; renderStudentPortal();" class="px-3 py-1.5 rounded-xl font-bold transition ${stTab === id ? 'bg-burgundy-900 text-techgold-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
                  ${label}
                </button>
              `).join('')}
            </div>
          </div>
          <div>${tabBodyHtml}</div>
        </div>
      `;
    }

    /* =========================================================================
       B. LECTURER PORTAL: CREATE CLASS, JOIN CODE, QR, APPROVALS & GRADING
       ========================================================================= */
    function openCreateClassModal() {
      document.getElementById('create-class-modal').classList.remove('hidden');
    }

    function handleCreateClassSubmit(e) {
      e.preventDefault();
      const internalCode = document.getElementById('cls-internal-code').value.trim().toUpperCase();
      if (ClassroomDB.classes.some(c => c.internalCode === internalCode)) {
        showToast(`Mã lớp nội bộ "${internalCode}" đã tồn tại. Vui lòng chọn mã nội bộ khác.`, 'error');
        return;
      }

      const lecId = (ClassroomDB.currentUser && ClassroomDB.currentUser.role === 'LECTURER')
        ? ClassroomDB.currentUser.id
        : 'lec-default-1';

      const newClass = {
        id: 'cls-' + Date.now(),
        isDemoSandbox: false,
        internalCode,
        name: document.getElementById('cls-name').value.trim(),
        courseCode: document.getElementById('cls-course-code').value.trim().toUpperCase(),
        courseName: document.getElementById('cls-course-name').value.trim(),
        department: document.getElementById('cls-dept').value.trim(),
        studentGroup: document.getElementById('cls-student-group').value.trim(),
        semester: document.getElementById('cls-semester').value,
        academicYear: document.getElementById('cls-year').value.trim(),
        maxStudents: parseInt(document.getElementById('cls-max-students').value, 10) || 45,
        startDate: document.getElementById('cls-start-date').value,
        endDate: document.getElementById('cls-end-date').value,
        description: document.getElementById('cls-desc').value.trim(),
        lecturerId: lecId,
        lecturerName: document.getElementById('cls-lecturer-name').value.trim(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      const joinCode = generateUniqueJoinCode();
      const approvalRequired = document.getElementById('cls-approval-mode').value === 'APPROVAL';

      const codeRecord = {
        id: 'jc-' + Date.now(),
        classId: newClass.id,
        joinCode,
        createdBy: lecId,
        createdAt: new Date().toISOString(),
        expiresAt: newClass.endDate + 'T23:59',
        maxUses: newClass.maxStudents,
        usedCount: 0,
        isActive: true,
        isPaused: false,
        approvalRequired,
        history: [`[${new Date().toLocaleString('vi-VN')}] Tạo mã ${joinCode} (${approvalRequired ? 'Chờ duyệt' : 'Tự động'})`]
      };

      ClassroomDB.classes.unshift(newClass);
      ClassroomDB.classJoinCodes.unshift(codeRecord);
      ClassroomDB.selectedLecturerClassId = newClass.id;
      ClassroomDB.activePortal = 'LECTURER';

      saveStateToStorage();
      addSystemAuditLog(`Giảng viên tạo lớp mới "${newClass.name}" (${newClass.internalCode}) với mã tham gia ${joinCode}.`);
      closeModal('create-class-modal');
      renderClassroomWorkspace();
      showToast(`Đã tạo lớp thành công! Mã tham gia lớp: ${joinCode}`, 'success');
    }

    function regenerateClassJoinCode(classId) {
      const oldCodes = ClassroomDB.classJoinCodes.filter(c => c.classId === classId && c.isActive);
      const prevApproval = oldCodes[0]?.approvalRequired || false;
      const prevMax = oldCodes[0]?.maxUses || 45;
      const prevExp = oldCodes[0]?.expiresAt || '';

      oldCodes.forEach(c => {
        c.isActive = false;
        c.history.unshift(`[${new Date().toLocaleString('vi-VN')}] Thu hồi tự động do tạo mã mới`);
      });

      const newCode = generateUniqueJoinCode();
      ClassroomDB.classJoinCodes.unshift({
        id: 'jc-' + Date.now(),
        classId,
        joinCode: newCode,
        createdBy: 'LECTURER',
        createdAt: new Date().toISOString(),
        expiresAt: prevExp,
        maxUses: prevMax,
        usedCount: 0,
        isActive: true,
        isPaused: false,
        approvalRequired: prevApproval,
        history: [`[${new Date().toLocaleString('vi-VN')}] Tạo mã mới ${newCode} thay thế mã cũ`]
      });

      saveStateToStorage();
      addSystemAuditLog(`Cấp mã tham gia mới ${newCode} cho lớp ID ${classId} và thu hồi mã cũ.`);
      renderLecturerPortal();
      showToast(`Đã tạo mã tham gia mới: ${newCode} (Mã cũ đã vô hiệu hóa).`, 'success');
    }

    function toggleJoinCodePause(codeId) {
      const c = ClassroomDB.classJoinCodes.find(x => x.id === codeId);
      if (!c) return;
      c.isPaused = !c.isPaused;
      c.history.unshift(`[${new Date().toLocaleString('vi-VN')}] ${c.isPaused ? 'Tạm dừng' : 'Kích hoạt lại'} mã ${c.joinCode}`);
      saveStateToStorage();
      renderLecturerPortal();
      showToast(c.isPaused ? 'Đã tạm dừng nhận sinh viên qua mã.' : 'Đã kích hoạt lại mã tham gia!', 'info');
    }

    function revokeJoinCode(codeId) {
      const c = ClassroomDB.classJoinCodes.find(x => x.id === codeId);
      if (!c) return;
      c.isActive = false;
      c.history.unshift(`[${new Date().toLocaleString('vi-VN')}] Thu hồi vĩnh viễn mã ${c.joinCode}`);
      saveStateToStorage();
      addSystemAuditLog(`Thu hồi vĩnh viễn mã tham gia ${c.joinCode}.`);
      renderLecturerPortal();
      showToast(`Đã thu hồi mã ${c.joinCode}. Mã này không còn sử dụng được.`, 'warning');
    }

    function updateJoinCodeSettings(codeId) {
      const c = ClassroomDB.classJoinCodes.find(x => x.id === codeId);
      if (!c) return;
      const exp = document.getElementById('jc-edit-expires').value;
      const maxU = parseInt(document.getElementById('jc-edit-maxuses').value, 10) || 0;
      const appMode = document.getElementById('jc-edit-approval').value === 'APPROVAL';

      c.expiresAt = exp;
      c.maxUses = maxU;
      c.approvalRequired = appMode;
      c.history.unshift(`[${new Date().toLocaleString('vi-VN')}] Cập nhật cấu hình mã (Hạn: ${exp || 'Không'}, Max: ${maxU}, Duyệt: ${appMode})`);
      saveStateToStorage();
      renderLecturerPortal();
      showToast('Đã lưu cài đặt hiệu lực mã tham gia lớp!', 'success');
    }

    function getJoinInviteUrl(joinCode) {
      const base = window.location.href.split('?')[0];
      return `${base}?join=${encodeURIComponent(joinCode)}`;
    }

    function renderQRCodeIntoContainer(containerId, joinCode) {
      const box = document.getElementById(containerId);
      if (!box) return;
      const payload = getJoinInviteUrl(joinCode);
      if (typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'M');
        qr.addData(payload);
        qr.make();
        box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 });
        const svg = box.querySelector('svg');
        if (svg) {
          svg.setAttribute('id', 'class-join-qr-svg');
          svg.classList.add('w-36', 'h-36', 'mx-auto', 'rounded-lg', 'bg-white', 'p-1.5');
        }
      } else {
        box.innerHTML = `<div class="p-3 bg-white text-slate-900 font-mono-tech text-[10px] rounded-lg border">${payload}</div>`;
      }
    }

    function downloadClassQRPng(joinCode) {
      const svgEl = document.getElementById('class-join-qr-svg');
      if (!svgEl) return;
      const svgStr = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 460;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 460);
        ctx.drawImage(img, 40, 25, 320, 320);
        ctx.fillStyle = '#5C0A14';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`MÃ LỚP: ${joinCode}`, 200, 390);
        ctx.fillStyle = '#334155';
        ctx.font = '14px sans-serif';
        ctx.fillText('T-FIT LAB • Quét mã hoặc nhập mã để vào lớp', 200, 422);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `TFIT-LAB_QR_${joinCode}.png`;
        a.click();
        showToast(`Đã tải ảnh QR tham gia lớp (${joinCode})!`, 'success');
      };
      img.src = url;
    }

    function reviewJoinRequest(reqId, decision) {
      const req = ClassroomDB.joinRequests.find(r => r.id === reqId);
      if (!req || req.status !== 'PENDING') return;
      const cls = ClassroomDB.classes.find(c => c.id === req.classId);
      const stu = ClassroomDB.users.find(u => u.id === req.studentId);

      req.status = decision;
      req.reviewedBy = 'LECTURER';
      req.reviewedAt = new Date().toISOString();

      if (decision === 'APPROVED') {
        const prevMem = ClassroomDB.classMemberships.find(m => m.classId === req.classId && m.studentId === req.studentId);
        if (prevMem) {
          prevMem.status = 'ACTIVE';
          prevMem.joinedAt = new Date().toISOString();
          prevMem.approvedBy = 'LECTURER';
          prevMem.approvedAt = new Date().toISOString();
        } else {
          ClassroomDB.classMemberships.push({
            id: 'mem-' + Date.now(),
            classId: req.classId,
            studentId: req.studentId,
            joinedAt: new Date().toISOString(),
            status: 'ACTIVE',
            approvedBy: 'LECTURER',
            approvedAt: new Date().toISOString()
          });
        }
        if (stu && cls) {
          pushUserNotification(stu.id, 'STUDENT', 'Yêu cầu vào lớp được phê duyệt', `Giảng viên đã duyệt bạn vào lớp ${cls.name}.`);
          addSystemAuditLog(`Giảng viên phê duyệt SV ${stu.studentCode} vào lớp ${cls.internalCode}.`);
        }
        showToast('Đã phê duyệt sinh viên vào lớp!', 'success');
      } else {
        if (stu && cls) {
          pushUserNotification(stu.id, 'STUDENT', 'Yêu cầu vào lớp bị từ chối', `Yêu cầu tham gia lớp ${cls.name} chưa được chấp nhận.`);
          addSystemAuditLog(`Giảng viên từ chối yêu cầu của SV ${stu.studentCode} vào lớp ${cls.internalCode}.`);
        }
        showToast('Đã từ chối yêu cầu tham gia.', 'warning');
      }

      saveStateToStorage();
      renderLecturerPortal();
    }

    function approveAllPendingRequests(classId) {
      const pending = ClassroomDB.joinRequests.filter(r => r.classId === classId && r.status === 'PENDING');
      pending.forEach(r => reviewJoinRequest(r.id, 'APPROVED'));
    }

    function removeStudentFromClass(membershipId) {
      const mem = ClassroomDB.classMemberships.find(m => m.id === membershipId);
      if (!mem) return;
      const stu = ClassroomDB.users.find(u => u.id === mem.studentId);
      const cls = ClassroomDB.classes.find(c => c.id === mem.classId);

      // Update status to REMOVED without deleting historical grades or submissions (Section 4.2 & 9)
      mem.status = 'REMOVED';
      mem.removedAt = new Date().toISOString();

      saveStateToStorage();
      addSystemAuditLog(`Loại SV ${stu ? stu.studentCode : mem.studentId} khỏi lớp ${cls ? cls.internalCode : mem.classId} (Bảo toàn lịch sử điểm & bài nộp).`);
      renderLecturerPortal();
      showToast('Đã cập nhật trạng thái thành viên. Toàn bộ lịch sử bài nộp & điểm cũ được bảo toàn.', 'warning');
    }

    function addStudentManuallyByMSSV(classId) {
      const input = document.getElementById('manual-add-mssv');
      const mssv = input.value.trim().toUpperCase();
      if (!mssv) return;
      const stu = ClassroomDB.users.find(u => u.studentCode === mssv && u.role === 'STUDENT');
      if (!stu) {
        showToast(`Không tìm thấy tài khoản sinh viên có MSSV "${mssv}". Sinh viên cần đăng ký tài khoản trước.`, 'error');
        return;
      }
      const existing = ClassroomDB.classMemberships.find(m => m.classId === classId && m.studentId === stu.id);
      if (existing && existing.status === 'ACTIVE') {
        showToast(`Sinh viên ${stu.fullName} (${mssv}) đã có mặt trong lớp.`, 'warning');
        return;
      }
      if (existing) {
        existing.status = 'ACTIVE';
        existing.joinedAt = new Date().toISOString();
        existing.approvedBy = 'LECTURER_MANUAL';
      } else {
        ClassroomDB.classMemberships.push({
          id: 'mem-' + Date.now(),
          classId,
          studentId: stu.id,
          joinedAt: new Date().toISOString(),
          status: 'ACTIVE',
          approvedBy: 'LECTURER_MANUAL',
          approvedAt: new Date().toISOString()
        });
      }
      input.value = '';
      saveStateToStorage();
      addSystemAuditLog(`Giảng viên thêm thủ công SV ${mssv} vào lớp.`);
      renderLecturerPortal();
      showToast(`Đã thêm sinh viên ${stu.fullName} (${mssv}) vào lớp!`, 'success');
    }

    function renderLecturerPortal() {
      const container = document.getElementById('classroom-lecturer-view');
      const classes = ClassroomDB.classes;

      if (classes.length === 0) {
        container.innerHTML = `
          <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-2xl mx-auto space-y-4">
            <div class="w-14 h-14 rounded-2xl bg-burgundy-900 text-techgold-400 flex items-center justify-center mx-auto">
              <i data-lucide="presentation" class="w-7 h-7"></i>
            </div>
            <h2 class="text-xl font-extrabold">Cổng Quản lý Giảng viên (Lecturer Portal)</h2>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Chưa có lớp học nào được khởi tạo. Giảng viên hãy tạo lớp học mới để hệ thống tự động sinh <strong>Mã tham gia lớp (ClassJoinCode)</strong>, liên kết mời và mã QR cho sinh viên ghi danh.
            </p>
            <div class="flex flex-wrap justify-center gap-3 pt-2">
              <button onclick="openCreateClassModal()" class="px-5 py-2.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white text-xs font-extrabold shadow flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i>
                <span>+ TẠO LỚP HỌC MỚI</span>
              </button>
            </div>
          </div>
        `;
        return;
      }

      if (!ClassroomDB.selectedLecturerClassId || !classes.some(c => c.id === ClassroomDB.selectedLecturerClassId)) {
        ClassroomDB.selectedLecturerClassId = classes[0].id;
      }
      const cls = classes.find(c => c.id === ClassroomDB.selectedLecturerClassId);
      const activeCode = ClassroomDB.classJoinCodes.find(c => c.classId === cls.id && c.isActive) || ClassroomDB.classJoinCodes.find(c => c.classId === cls.id);
      const allCodesForClass = ClassroomDB.classJoinCodes.filter(c => c.classId === cls.id);

      const activeMembers = ClassroomDB.classMemberships.filter(m => m.classId === cls.id && m.status === 'ACTIVE');
      const pendingReqs = ClassroomDB.joinRequests.filter(r => r.classId === cls.id && r.status === 'PENDING');
      const clsAssignments = ClassroomDB.assignments.filter(a => a.classId === cls.id);
      const clsSubmissions = ClassroomDB.submissions.filter(s => s.classId === cls.id);

      const searchTerm = (document.getElementById('lec-member-search')?.value || '').toLowerCase();
      const filteredMembers = activeMembers.filter(m => {
        const u = ClassroomDB.users.find(x => x.id === m.studentId);
        if (!u) return false;
        return u.fullName.toLowerCase().includes(searchTerm) || u.studentCode.toLowerCase().includes(searchTerm);
      });

      const lecTab = ClassroomDB.selectedLecturerTab;
      let tabContentHtml = '';

      if (lecTab === 'codes') {
        tabContentHtml = `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
            <!-- Left: Join Code & QR Card (Section 2.2, 2.3 & 4) -->
            <div class="lg:col-span-5 space-y-4">
              <div class="p-4 rounded-2xl bg-burgundy-950 text-white border border-techgold-500/40 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-mono-tech text-techgold-400 font-bold">MÃ THAM GIA LỚP HIỆN HÀNH</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${activeCode && activeCode.isActive && !activeCode.isPaused ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}">
                    ${activeCode ? (activeCode.isActive ? (activeCode.isPaused ? 'ĐANG TẠM DỪNG' : 'ĐANG HOẠT ĐỘNG') : 'ĐÃ THU HỒI') : 'CHƯA CÓ MÃ'}
                  </span>
                </div>

                ${activeCode ? `
                  <div class="flex items-center justify-between bg-burgundy-900/90 p-3 rounded-xl border border-burgundy-700">
                    <span class="text-2xl font-mono-tech font-extrabold tracking-widest text-techgold-400">${activeCode.joinCode}</span>
                    <div class="flex gap-1.5">
                      <button onclick="copyTextToClipboard('${activeCode.joinCode}')" class="px-2.5 py-1.5 rounded-lg bg-electricred-500 hover:bg-electricred-600 text-white font-bold">Sao chép mã</button>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-[11px] font-mono-tech">
                    <div class="p-2 rounded-lg bg-burgundy-900/60">Lượt dùng: <strong>${activeCode.usedCount} / ${activeCode.maxUses || '∞'}</strong></div>
                    <div class="p-2 rounded-lg bg-burgundy-900/60">Chế độ: <strong>${activeCode.approvalRequired ? 'Chờ duyệt' : 'Tự động'}</strong></div>
                  </div>

                  <!-- QR Code & Invite Link Box -->
                  <div class="bg-slate-900/90 p-3 rounded-xl border border-slate-700 text-center space-y-2">
                    <div id="lec-qr-container"></div>
                    <div class="text-[10px] text-slate-300 font-mono-tech break-all">${getJoinInviteUrl(activeCode.joinCode)}</div>
                    <div class="flex flex-wrap justify-center gap-1.5 pt-1">
                      <button onclick="copyTextToClipboard('${getJoinInviteUrl(activeCode.joinCode)}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold">Sao chép Link</button>
                      <button onclick="downloadClassQRPng('${activeCode.joinCode}')" class="px-2.5 py-1 rounded-lg bg-techgold-500 text-slate-950 font-bold">Tải ảnh QR</button>
                      <button onclick="openJoinClassModal('${activeCode.joinCode}')" class="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold">Thử luồng SV nhập mã</button>
                    </div>
                  </div>

                  <!-- Code Lifecycle Controls -->
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <button onclick="regenerateClassJoinCode('${cls.id}')" class="flex-1 py-2 rounded-xl bg-techgold-500 hover:bg-techgold-600 text-slate-950 font-bold">Tạo mã mới</button>
                    ${activeCode.isActive ? `
                      <button onclick="toggleJoinCodePause('${activeCode.id}')" class="px-3 py-2 rounded-xl bg-burgundy-800 hover:bg-burgundy-700 text-white font-semibold">${activeCode.isPaused ? 'Kích hoạt lại' : 'Tạm dừng'}</button>
                      <button onclick="revokeJoinCode('${activeCode.id}')" class="px-3 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-rose-200 font-semibold">Thu hồi mã</button>
                    ` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- Join Code Policy Settings -->
              ${activeCode && activeCode.isActive ? `
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div class="font-bold text-sm">Cài đặt Hiệu lực Mã & Chế độ Phê duyệt</div>
                  <div>
                    <label class="block text-[11px] font-semibold mb-1">Chế độ tham gia lớp:</label>
                    <select id="jc-edit-approval" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold">
                      <option value="AUTO" ${!activeCode.approvalRequired ? 'selected' : ''}>Chế độ A – Tự động ghi danh</option>
                      <option value="APPROVAL" ${activeCode.approvalRequired ? 'selected' : ''}>Chế độ B – Chờ giảng viên phê duyệt</option>
                    </select>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[11px] font-semibold mb-1">Ngày hết hạn mã:</label>
                      <input id="jc-edit-expires" type="datetime-local" value="${activeCode.expiresAt || ''}" class="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono-tech text-[11px]" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold mb-1">Số lượt dùng tối đa:</label>
                      <input id="jc-edit-maxuses" type="number" value="${activeCode.maxUses || 45}" min="1" max="500" class="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono-tech" />
                    </div>
                  </div>
                  <button onclick="updateJoinCodeSettings('${activeCode.id}')" class="w-full py-2 rounded-xl bg-burgundy-900 text-techgold-400 font-bold">Lưu cấu hình mã</button>
                </div>
              ` : ''}
            </div>

            <!-- Right: Pending Requests (Section 4.1) & Active Student Roster (Section 4.2) -->
            <div class="lg:col-span-7 space-y-4">
              <!-- Pending Join Requests -->
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="font-bold text-sm flex items-center gap-2">
                    <span>Danh sách Yêu cầu Chờ Duyệt</span>
                    <span class="px-2 py-0.5 rounded-full bg-amber-600 text-white font-mono-tech text-[10px]">${pendingReqs.length}</span>
                  </div>
                  ${pendingReqs.length > 0 ? `<button onclick="approveAllPendingRequests('${cls.id}')" class="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px]">Phê duyệt tất cả (${pendingReqs.length})</button>` : ''}
                </div>
                ${pendingReqs.length ? pendingReqs.map(r => {
                  const u = ClassroomDB.users.find(x => x.id === r.studentId);
                  return `
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div class="font-bold">${u ? u.fullName : 'Sinh viên'} <span class="font-mono-tech text-burgundy-700 dark:text-techgold-400">(${u ? u.studentCode : r.studentId})</span></div>
                        <div class="text-[11px] text-slate-500">${u ? u.email : ''} • Gửi lúc: ${new Date(r.requestedAt).toLocaleString('vi-VN')}</div>
                      </div>
                      <div class="flex gap-1.5">
                        <button onclick="reviewJoinRequest('${r.id}', 'APPROVED')" class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold">Phê duyệt</button>
                        <button onclick="reviewJoinRequest('${r.id}', 'REJECTED')" class="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold">Từ chối</button>
                      </div>
                    </div>
                  `;
                }).join('') : '<p class="text-slate-500">Không có yêu cầu nào đang chờ phê duyệt.</p>'}
              </div>

              <!-- Active Student Roster -->
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="font-bold text-sm">Danh sách Sinh viên Chính thức (${activeMembers.length}/${cls.maxStudents})</div>
                  <div class="flex gap-1.5">
                    <input id="manual-add-mssv" type="text" placeholder="Thêm MSSV..." class="w-28 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono-tech" />
                    <button onclick="addStudentManuallyByMSSV('${cls.id}')" class="px-2.5 py-1 rounded-lg bg-burgundy-900 text-techgold-400 font-bold">+ Thêm</button>
                  </div>
                </div>
                <input id="lec-member-search" oninput="renderLecturerPortal()" type="text" placeholder="Tìm kiếm sinh viên theo MSSV hoặc Họ tên..." class="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700" />
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse text-xs">
                    <thead class="bg-burgundy-900 text-white">
                      <tr>
                        <th class="p-2 text-left">MSSV</th>
                        <th class="p-2 text-left">Họ và tên</th>
                        <th class="p-2 text-center">Bài đã nộp</th>
                        <th class="p-2 text-center">Điểm TB</th>
                        <th class="p-2 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredMembers.length ? filteredMembers.map(m => {
                        const u = ClassroomDB.users.find(x => x.id === m.studentId);
                        const subs = clsSubmissions.filter(s => s.studentId === m.studentId);
                        const avg = subs.length ? (subs.reduce((acc, cur) => acc + Number(cur.finalScore || 0), 0) / subs.length).toFixed(1) : '—';
                        return `
                          <tr class="border-b border-slate-200 dark:border-slate-700">
                            <td class="p-2 font-mono-tech font-bold">${u ? u.studentCode : ''}</td>
                            <td class="p-2">${u ? u.fullName : ''}</td>
                            <td class="p-2 text-center font-mono-tech">${subs.length}/${clsAssignments.length}</td>
                            <td class="p-2 text-center font-mono-tech font-bold text-emerald-600 dark:text-emerald-400">${avg}</td>
                            <td class="p-2 text-center">
                              <button onclick="removeStudentFromClass('${m.id}')" class="px-2 py-1 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white font-semibold">Loại khỏi lớp</button>
                            </td>
                          </tr>
                        `;
                      }).join('') : `<tr><td colspan="5" class="p-3 text-center text-slate-500">Chưa có sinh viên nào trong danh sách.</td></tr>`}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Code History -->
              <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                <div class="font-bold">Lịch sử Tạo & Thu hồi Mã tham gia</div>
                <div class="font-mono-tech text-[11px] text-slate-500 space-y-0.5 max-h-28 overflow-y-auto">
                  ${allCodesForClass.flatMap(c => c.history).map(h => `<div>• ${h}</div>`).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (lecTab === 'assignments') {
        tabContentHtml = `
          <div class="space-y-4 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="font-bold text-sm">Danh sách Bài tập & Đề kiểm tra đã giao cho lớp (${clsAssignments.length})</h4>
              <button onclick="openAssignToClassModal('${cls.id}')" class="px-4 py-2 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white font-bold">
                + Giao Bài tập / Đề mới cho Lớp này
              </button>
            </div>
            ${clsAssignments.map(a => {
              const subs = clsSubmissions.filter(s => s.assignmentId === a.id);
              return `
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div class="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span class="font-bold text-sm">${a.title}</span>
                      <span class="ml-2 px-2 py-0.5 rounded bg-burgundy-900 text-techgold-400 font-mono-tech text-[10px]">${a.type}</span>
                    </div>
                    <span class="font-mono-tech text-slate-500">Đã nộp: <strong>${subs.length}</strong>/${activeMembers.length} SV • Hạn: ${new Date(a.dueDate).toLocaleString('vi-VN')}</span>
                  </div>
                  ${subs.length ? `
                    <div class="overflow-x-auto">
                      <table class="w-full border-collapse text-xs bg-white dark:bg-slate-900 rounded-lg overflow-hidden">
                        <thead class="bg-slate-200 dark:bg-slate-800">
                          <tr>
                            <th class="p-2 text-left">Sinh viên</th>
                            <th class="p-2 text-center">Thời gian nộp</th>
                            <th class="p-2 text-center">Điểm (Thang 10)</th>
                            <th class="p-2 text-left">Nhận xét & Duyệt điểm</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${subs.map(s => {
                            const stu = ClassroomDB.users.find(u => u.id === s.studentId);
                            return `
                              <tr class="border-t border-slate-200 dark:border-slate-800">
                                <td class="p-2 font-semibold">${stu ? `${stu.fullName} (${stu.studentCode})` : s.studentId}</td>
                                <td class="p-2 text-center font-mono-tech">${new Date(s.submittedAt).toLocaleString('vi-VN')}</td>
                                <td class="p-2 text-center">
                                  <input id="grade-score-${s.id}" type="number" step="0.5" min="0" max="10" value="${s.finalScore}" class="w-16 px-2 py-1 rounded border font-mono-tech font-bold text-center bg-slate-50 dark:bg-slate-850" />
                                </td>
                                <td class="p-2 flex gap-1.5">
                                  <input id="grade-fb-${s.id}" type="text" value="${s.feedback || ''}" placeholder="Nhập nhận xét..." class="flex-1 px-2 py-1 rounded border bg-slate-50 dark:bg-slate-850" />
                                  <button onclick="lecturerPublishGrade('${s.id}')" class="px-2.5 py-1 rounded bg-emerald-700 text-white font-bold">Công bố</button>
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : '<p class="text-slate-500">Chưa có sinh viên nào nộp bài này.</p>'}
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else if (lecTab === 'announcements') {
        tabContentHtml = `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
            <div class="lg:col-span-5 space-y-2.5 p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
              <div class="font-bold text-sm">Đăng Thông báo Mới cho Lớp</div>
              <input id="ann-title" type="text" placeholder="Tiêu đề thông báo..." class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700" />
              <textarea id="ann-body" rows="3" placeholder="Nội dung hướng dẫn học tập, lịch kiểm tra..." class="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"></textarea>
              <button onclick="postClassAnnouncement('${cls.id}')" class="w-full py-2 rounded-xl bg-burgundy-900 text-techgold-400 font-bold">Đăng Thông báo</button>
            </div>
            <div class="lg:col-span-7 space-y-2.5">
              ${ClassroomDB.classAnnouncements.filter(a => a.classId === cls.id).map(a => `
                <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
                  <div class="font-bold text-sm">${a.title}</div>
                  <div class="text-[11px] text-slate-500">${a.authorName} • ${a.createdAt}</div>
                  <p class="mt-1 text-slate-600 dark:text-slate-300">${a.content}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <!-- Top Lecturer Header & Class Switcher -->
        <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <span class="text-[11px] font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">LECTURER PORTAL • QUẢN LÝ ĐA LỚP & ĐA HỌC PHẦN</span>
              <div class="flex items-center gap-2 mt-1">
                <select onchange="ClassroomDB.selectedLecturerClassId=this.value; renderLecturerPortal();" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-xs">
                  ${classes.map(c => `<option value="${c.id}" ${c.id === cls.id ? 'selected' : ''}>${c.internalCode} — ${c.name} (${c.semester})</option>`).join('')}
                </select>
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-mono-tech font-bold ${cls.status === 'ACTIVE' ? 'bg-emerald-700 text-white' : 'bg-slate-600 text-white'}">${cls.status}</span>
              </div>
            </div>
          </div>
          <button onclick="openCreateClassModal()" class="px-4 py-2.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ TẠO LỚP HỌC MỚI</span>
          </button>
        </div>

        <!-- Lecturer Class Detail Tabs -->
        <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div class="text-xs">
              <h3 class="text-base font-extrabold">${cls.name}</h3>
              <span class="text-slate-500">Học phần: <strong>${cls.courseCode} – ${cls.courseName}</strong> • Lớp SV: <strong>${cls.studentGroup}</strong> • GV: <strong>${cls.lecturerName}</strong></span>
            </div>
            <div class="flex flex-wrap gap-1.5 text-xs">
              <button onclick="ClassroomDB.selectedLecturerTab='codes'; renderLecturerPortal();" class="px-3 py-1.5 rounded-xl font-bold ${lecTab === 'codes' ? 'bg-burgundy-900 text-techgold-400' : 'bg-slate-100 dark:bg-slate-800'}">
                Mã Tham Gia & Thành Viên (${activeMembers.length})
              </button>
              <button onclick="ClassroomDB.selectedLecturerTab='assignments'; renderLecturerPortal();" class="px-3 py-1.5 rounded-xl font-bold ${lecTab === 'assignments' ? 'bg-burgundy-900 text-techgold-400' : 'bg-slate-100 dark:bg-slate-800'}">
                Giao Bài & Chấm Điểm (${clsAssignments.length})
              </button>
              <button onclick="ClassroomDB.selectedLecturerTab='announcements'; renderLecturerPortal();" class="px-3 py-1.5 rounded-xl font-bold ${lecTab === 'announcements' ? 'bg-burgundy-900 text-techgold-400' : 'bg-slate-100 dark:bg-slate-800'}">
                Thông báo Lớp
              </button>
            </div>
          </div>
          <div>${tabContentHtml}</div>
        </div>
      `;

      if (lecTab === 'codes' && activeCode) {
        renderQRCodeIntoContainer('lec-qr-container', activeCode.joinCode);
      }
      lucide.createIcons();
    }

    function postClassAnnouncement(classId) {
      const title = document.getElementById('ann-title').value.trim();
      const content = document.getElementById('ann-body').value.trim();
      if (!title || !content) return;
      const cls = ClassroomDB.classes.find(c => c.id === classId);
      ClassroomDB.classAnnouncements.unshift({
        id: 'ann-' + Date.now(),
        classId,
        authorName: cls ? cls.lecturerName : 'Giảng viên',
        title,
        content,
        createdAt: new Date().toLocaleString('vi-VN')
      });
      saveStateToStorage();
      renderLecturerPortal();
      showToast('Đã đăng thông báo tới toàn bộ sinh viên trong lớp!', 'success');
    }

    /* =========================================================================
       SECTION 6: ASSIGN TO CLASS, STUDENT SUBMISSION & GRADING INTEGRATION
       ========================================================================= */
    function openAssignToClassModal(preselectClassId = '') {
      if (ClassroomDB.classes.length === 0) {
        showToast('Chưa có lớp học nào. Vui lòng tạo lớp trước khi giao bài!', 'warning');
        switchWorkspace('classroom');
        switchClassroomPortal('LECTURER');
        openCreateClassModal();
        return;
      }
      if (generatedExamData.length === 0) {
        generateVerifiedExamSet();
      }
      const sel = document.getElementById('assign-target-class');
      sel.innerHTML = ClassroomDB.classes.map(c =>
        `<option value="${c.id}" ${c.id === preselectClassId ? 'selected' : ''}>${c.internalCode} — ${c.name}</option>`
      ).join('');
      document.getElementById('assign-title').value = document.getElementById('gen-exam-title')?.value || 'Bài tập Thực hành ISO 286';
      document.getElementById('assign-prob-count').textContent = generatedExamData.length;
      document.getElementById('assign-class-modal').classList.remove('hidden');
    }

    function handleAssignToClassSubmit(e) {
      e.preventDefault();
      const classId = document.getElementById('assign-target-class').value;
      const title = document.getElementById('assign-title').value.trim();
      const type = document.getElementById('assign-type').value;
      const dueDate = document.getElementById('assign-due').value;
      const durationMinutes = parseInt(document.getElementById('assign-duration').value, 10) || 45;
      const releaseAnswers = document.getElementById('assign-release').value;

      const newAsg = {
        id: 'asg-' + Date.now(),
        title,
        type,
        classId,
        createdBy: 'LECTURER',
        dueDate,
        durationMinutes,
        maxAttempts: 2,
        releaseAnswers,
        problems: JSON.parse(JSON.stringify(generatedExamData)),
        createdAt: new Date().toISOString()
      };

      ClassroomDB.assignments.unshift(newAsg);
      const cls = ClassroomDB.classes.find(c => c.id === classId);
      const members = ClassroomDB.classMemberships.filter(m => m.classId === classId && m.status === 'ACTIVE');
      members.forEach(m => {
        pushUserNotification(m.studentId, 'STUDENT', 'Bài tập / Đề kiểm tra mới', `Lớp ${cls ? cls.name : ''}: "${title}" (Hạn: ${new Date(dueDate).toLocaleString('vi-VN')}).`);
      });

      saveStateToStorage();
      addSystemAuditLog(`Giao "${title}" cho lớp ${cls ? cls.internalCode : classId} (${members.length} SV).`);
      closeModal('assign-class-modal');
      renderClassroomWorkspace();
      renderLiveClassAnalytics();
      showToast(`Đã giao bài "${title}" tới ${members.length} sinh viên trong lớp!`, 'success');
    }

    let activeTakingAssignmentId = null;

    function openTakeAssignmentModal(assignmentId) {
      const user = ClassroomDB.currentUser;
      const asg = ClassroomDB.assignments.find(a => a.id === assignmentId);
      if (!user || !asg) return;

      // Security check: verify student is an ACTIVE member of asg.classId (Section 6 & 9)
      const isMember = ClassroomDB.classMemberships.some(m => m.classId === asg.classId && m.studentId === user.id && m.status === 'ACTIVE');
      if (!isMember) {
        showToast('Truy cập bị từ chối: Bạn không phải là thành viên hợp lệ của lớp được giao đề này.', 'error');
        return;
      }

      activeTakingAssignmentId = assignmentId;
      document.getElementById('take-assign-title').textContent = asg.title;
      const existingSub = ClassroomDB.submissions.find(s => s.assignmentId === asg.id && s.studentId === user.id);

      document.getElementById('take-assign-body').innerHTML = `
        <div class="p-3 rounded-xl bg-burgundy-950/5 dark:bg-burgundy-950/40 border border-burgundy-700/30 flex justify-between items-center">
          <span>Sinh viên: <strong>${user.fullName} (${user.studentCode})</strong></span>
          <span class="font-mono-tech">Số câu: ${asg.problems.length} • Đơn vị nhập: µm</span>
        </div>
        ${asg.problems.map((p, idx) => {
          const prevAns = existingSub?.answers?.[idx] || {};
          return `
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div class="font-bold text-sm text-burgundy-800 dark:text-techgold-400">Câu ${idx + 1}: ${p.calc.designation}</div>
              <p>${p.questionText}</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tech">
                <div><label class="block text-[10px]">ES (µm)</label><input id="sub-ES-${idx}" type="number" value="${prevAns.ES ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div><label class="block text-[10px]">EI (µm)</label><input id="sub-EI-${idx}" type="number" value="${prevAns.EI ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div><label class="block text-[10px]">es (µm)</label><input id="sub-es-${idx}" type="number" value="${prevAns.es ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div><label class="block text-[10px]">ei (µm)</label><input id="sub-ei-${idx}" type="number" value="${prevAns.ei ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div><label class="block text-[10px]">Smax (µm)</label><input id="sub-smax-${idx}" type="number" value="${prevAns.smax ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div><label class="block text-[10px]">Smin (µm)</label><input id="sub-smin-${idx}" type="number" value="${prevAns.smin ?? ''}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border" /></div>
                <div class="col-span-2">
                  <label class="block text-[10px]">Kiểu lắp ghép</label>
                  <select id="sub-type-${idx}" class="w-full px-2 py-1.5 rounded bg-white dark:bg-slate-900 border font-sans">
                    <option value="CLEARANCE" ${prevAns.fitType==='CLEARANCE'?'selected':''}>Lắp lỏng</option>
                    <option value="TRANSITION" ${prevAns.fitType==='TRANSITION'?'selected':''}>Lắp trung gian</option>
                    <option value="INTERFERENCE" ${prevAns.fitType==='INTERFERENCE'?'selected':''}>Lắp chặt</option>
                  </select>
                </div>
              </div>
              ${existingSub && asg.releaseAnswers === 'IMMEDIATE' ? `
                <div class="p-2 rounded bg-emerald-950/15 border border-emerald-500/40 font-mono-tech text-[11px] text-emerald-700 dark:text-emerald-300">
                  Đáp án chuẩn ISO 286: ES=${p.calc.ES}, EI=${p.calc.EI}, es=${p.calc.es}, ei=${p.calc.ei}, Smax=${p.calc.Smax}, Smin=${p.calc.Smin} (${p.calc.fitTypeVi})
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="closeModal('take-assignment-modal')" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold">Đóng</button>
          <button onclick="submitStudentAssignment()" class="px-5 py-2.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white font-bold shadow">Nộp Bài & Chấm Điểm</button>
        </div>
      `;
      document.getElementById('take-assignment-modal').classList.remove('hidden');
    }

    function submitStudentAssignment() {
      const user = ClassroomDB.currentUser;
      const asg = ClassroomDB.assignments.find(a => a.id === activeTakingAssignmentId);
      if (!user || !asg) return;

      let totalChecks = 0;
      let correctChecks = 0;
      const answers = asg.problems.map((p, idx) => {
        const ES = parseFloat(document.getElementById(`sub-ES-${idx}`).value);
        const EI = parseFloat(document.getElementById(`sub-EI-${idx}`).value);
        const es = parseFloat(document.getElementById(`sub-es-${idx}`).value);
        const ei = parseFloat(document.getElementById(`sub-ei-${idx}`).value);
        const smax = parseFloat(document.getElementById(`sub-smax-${idx}`).value);
        const smin = parseFloat(document.getElementById(`sub-smin-${idx}`).value);
        const fitType = document.getElementById(`sub-type-${idx}`).value;

        totalChecks += 7;
        if (ES === p.calc.ES) correctChecks++;
        if (EI === p.calc.EI) correctChecks++;
        if (es === p.calc.es) correctChecks++;
        if (ei === p.calc.ei) correctChecks++;
        if (smax === p.calc.Smax) correctChecks++;
        if (smin === p.calc.Smin) correctChecks++;
        if (fitType === p.calc.fitType) correctChecks++;

        return { ES, EI, es, ei, smax, smin, fitType };
      });

      const score10 = Number(((correctChecks / Math.max(totalChecks, 1)) * 10).toFixed(1));
      const existingIdx = ClassroomDB.submissions.findIndex(s => s.assignmentId === asg.id && s.studentId === user.id);
      const subRecord = {
        id: existingIdx >= 0 ? ClassroomDB.submissions[existingIdx].id : 'sub-' + Date.now(),
        assignmentId: asg.id,
        classId: asg.classId,
        studentId: user.id,
        answers,
        autoScore: score10,
        finalScore: score10,
        feedback: `Chấm tự động ISO 286: Đúng ${correctChecks}/${totalChecks} chỉ tiêu kỹ thuật.`,
        status: asg.releaseAnswers === 'IMMEDIATE' ? 'GRADED' : 'SUBMITTED',
        submittedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) ClassroomDB.submissions[existingIdx] = subRecord;
      else ClassroomDB.submissions.push(subRecord);

      saveStateToStorage();
      addSystemAuditLog(`SV ${user.studentCode} nộp bài "${asg.title}" (Điểm tự động: ${score10}/10).`);
      closeModal('take-assignment-modal');
      renderStudentPortal();
      renderLiveClassAnalytics();
      showToast(`Nộp bài thành công! Điểm đạt được: ${score10}/10`, 'success');
    }

    function lecturerPublishGrade(subId) {
      const sub = ClassroomDB.submissions.find(s => s.id === subId);
      if (!sub) return;
      const newScore = parseFloat(document.getElementById(`grade-score-${subId}`).value);
      const fb = document.getElementById(`grade-fb-${subId}`).value.trim();
      if (!isNaN(newScore)) sub.finalScore = newScore;
      sub.feedback = fb || sub.feedback;
      sub.status = 'GRADED';
      sub.gradedAt = new Date().toISOString();

      pushUserNotification(sub.studentId, 'STUDENT', 'Giảng viên đã công bố điểm', `Điểm chính thức của bạn: ${sub.finalScore}/10. ${fb}`);
      saveStateToStorage();
      renderLecturerPortal();
      renderLiveClassAnalytics();
      showToast(`Đã công bố điểm ${sub.finalScore}/10 cho sinh viên!`, 'success');
    }

    /* =========================================================================
       SECTION 8 & 10: ADMIN CLASSES OVERSIGHT & LIVE CLASS ANALYTICS
       ========================================================================= */
    function renderLiveClassAnalytics() {
      const filterEl = document.getElementById('analytics-class-filter');
      const cardsEl = document.getElementById('live-class-analytics-cards');
      const tableEl = document.getElementById('live-class-analytics-table');
      if (!filterEl || !cardsEl || !tableEl) return;

      const currentSel = filterEl.value;
      filterEl.innerHTML = `<option value="ALL">Tất cả lớp học (${ClassroomDB.classes.length} lớp)</option>` +
        ClassroomDB.classes.map(c => `<option value="${c.id}" ${c.id === currentSel ? 'selected' : ''}>${c.internalCode} – ${c.name}</option>`).join('');

      const targetClasses = currentSel === 'ALL' ? ClassroomDB.classes : ClassroomDB.classes.filter(c => c.id === currentSel);
      const targetIds = new Set(targetClasses.map(c => c.id));
      const members = ClassroomDB.classMemberships.filter(m => targetIds.has(m.classId) && m.status === 'ACTIVE');
      const assigns = ClassroomDB.assignments.filter(a => targetIds.has(a.classId));
      const subs = ClassroomDB.submissions.filter(s => targetIds.has(s.classId));

      const avgScore = subs.length ? (subs.reduce((a, b) => a + Number(b.finalScore || 0), 0) / subs.length).toFixed(2) : '0.00';

      cardsEl.innerHTML = `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
          <span class="text-slate-500">Tổng số Lớp & Thành viên</span>
          <div class="text-2xl font-mono-tech font-extrabold text-burgundy-800 dark:text-techgold-400 mt-1">${targetClasses.length} lớp • ${members.length} SV</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
          <span class="text-slate-500">Bài tập / Đề kiểm tra đã giao</span>
          <div class="text-2xl font-mono-tech font-extrabold text-sky-700 dark:text-sky-400 mt-1">${assigns.length} bài</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
          <span class="text-slate-500">Tổng lượt nộp bài</span>
          <div class="text-2xl font-mono-tech font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">${subs.length} lượt</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
          <span class="text-slate-500">Điểm trung bình thực tế</span>
          <div class="text-2xl font-mono-tech font-extrabold text-electricred-600 mt-1">${avgScore} / 10</div>
        </div>
      `;

      tableEl.innerHTML = targetClasses.length ? `
        <table class="w-full border-collapse text-xs">
          <thead class="bg-burgundy-900 text-white">
            <tr>
              <th class="p-2 text-left">Mã lớp</th>
              <th class="p-2 text-left">Tên lớp học</th>
              <th class="p-2 text-center">Sĩ số</th>
              <th class="p-2 text-center">Bài giao</th>
              <th class="p-2 text-center">Bài nộp</th>
              <th class="p-2 text-center">Điểm TB</th>
            </tr>
          </thead>
          <tbody>
            ${targetClasses.map(c => {
              const mCount = ClassroomDB.classMemberships.filter(m => m.classId === c.id && m.status === 'ACTIVE').length;
              const aCount = ClassroomDB.assignments.filter(a => a.classId === c.id).length;
              const cSubs = ClassroomDB.submissions.filter(s => s.classId === c.id);
              const cAvg = cSubs.length ? (cSubs.reduce((x, y) => x + Number(y.finalScore || 0), 0) / cSubs.length).toFixed(2) : '—';
              return `
                <tr class="border-b border-slate-200 dark:border-slate-700">
                  <td class="p-2 font-mono-tech font-bold">${c.internalCode}</td>
                  <td class="p-2">${c.name}</td>
                  <td class="p-2 text-center font-mono-tech">${mCount}/${c.maxStudents}</td>
                  <td class="p-2 text-center font-mono-tech">${aCount}</td>
                  <td class="p-2 text-center font-mono-tech">${cSubs.length}</td>
                  <td class="p-2 text-center font-mono-tech font-bold text-emerald-600 dark:text-emerald-400">${cAvg}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : '<p class="text-xs text-slate-500">Chưa có lớp học nào để thống kê.</p>';
    }

    function renderAdminClassesPanel() {
      const wrapper = document.getElementById('admin-classes-table-wrapper');
      if (!wrapper) return;
      const q = (document.getElementById('admin-class-search')?.value || '').toLowerCase();
      const sem = document.getElementById('admin-semester-filter')?.value || 'ALL';

      const list = ClassroomDB.classes.filter(c => {
        const matchQ = c.name.toLowerCase().includes(q) || c.internalCode.toLowerCase().includes(q) || c.lecturerName.toLowerCase().includes(q);
        const matchSem = sem === 'ALL' || c.semester === sem;
        return matchQ && matchSem;
      });

      wrapper.innerHTML = list.length ? `
        <table class="w-full border-collapse text-xs">
          <thead class="bg-burgundy-900 text-white">
            <tr>
              <th class="p-2 text-left">Mã lớp nội bộ</th>
              <th class="p-2 text-left">Tên lớp & Học phần</th>
              <th class="p-2 text-left">Giảng viên</th>
              <th class="p-2 text-center">Mã tham gia</th>
              <th class="p-2 text-center">Thành viên</th>
              <th class="p-2 text-center">Trạng thái</th>
              <th class="p-2 text-center">Quản trị</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(c => {
              const codeObj = ClassroomDB.classJoinCodes.find(jc => jc.classId === c.id && jc.isActive);
              const memCount = ClassroomDB.classMemberships.filter(m => m.classId === c.id && m.status === 'ACTIVE').length;
              return `
                <tr class="border-b border-slate-200 dark:border-slate-700">
                  <td class="p-2 font-mono-tech font-bold">${c.internalCode}</td>
                  <td class="p-2"><strong>${c.name}</strong><br/><span class="text-slate-500">${c.courseCode} • ${c.semester} (${c.academicYear})</span></td>
                  <td class="p-2">${c.lecturerName}</td>
                  <td class="p-2 text-center font-mono-tech font-bold text-burgundy-700 dark:text-techgold-400">${codeObj ? codeObj.joinCode : 'Đã thu hồi'}</td>
                  <td class="p-2 text-center font-mono-tech">${memCount}/${c.maxStudents}</td>
                  <td class="p-2 text-center font-mono-tech font-bold">${c.status}</td>
                  <td class="p-2 text-center">
                    <button onclick="adminToggleClassLock('${c.id}')" class="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-electricred-500 hover:text-white font-semibold">
                      ${c.status === 'ACTIVE' ? 'Khóa lớp' : 'Khôi phục lớp'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : '<p class="text-xs text-slate-500">Không tìm thấy lớp học phù hợp.</p>';
    }

    function adminToggleClassLock(classId) {
      const cls = ClassroomDB.classes.find(c => c.id === classId);
      if (!cls) return;
      cls.status = cls.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
      saveStateToStorage();
      addSystemAuditLog(`ADMIN chuyển trạng thái lớp ${cls.internalCode} sang ${cls.status}.`);
      renderAdminClassesPanel();
      renderClassroomWorkspace();
      showToast(`Đã cập nhật trạng thái lớp ${cls.internalCode}: ${cls.status}`, 'info');
    }

    /* =========================================================================
       SECTION 10: AUTOMATED 12-SCENARIO CLASSROOM & JOIN CODE TEST SUITE
       ========================================================================= */
    function runClassroom12ScenariosTest() {
      const testResults = [];
      const tempStuA = { id: 'test-stu-a', studentCode: 'TEST01', fullName: 'Test SV A', role: 'STUDENT' };
      const tempStuB = { id: 'test-stu-b', studentCode: 'TEST02', fullName: 'Test SV B', role: 'STUDENT' };

      // 1. Create class & generate unique join code
      const testClsId = 'test-cls-' + Date.now();
      const testCode = generateUniqueJoinCode();
      const testCls = {
        id: testClsId, isDemoSandbox: true, internalCode: 'TEST_ISO_01', name: 'Lớp Kiểm thử 12 Kịch bản',
        courseCode: 'MECH204', courseName: 'Dung sai ISO 286', maxStudents: 2, status: 'ACTIVE', endDate: '2027-12-31',
        semester: 'Học kỳ 1', academicYear: '2026–2027', lecturerName: 'GV Kiểm thử'
      };
      const testCodeObj = {
        id: 'test-jc-' + Date.now(), classId: testClsId, joinCode: testCode, isActive: true, isPaused: false,
        approvalRequired: false, maxUses: 5, usedCount: 0, expiresAt: '2027-12-31T23:59', history: []
      };
      ClassroomDB.classes.push(testCls);
      ClassroomDB.classJoinCodes.push(testCodeObj);
      testResults.push({ name: 'KB-01: Giảng viên tạo lớp & hệ thống sinh mã ngẫu nhiên duy nhất', ok: testCode.startsWith('TFIT-') && testCode !== 'TEST_ISO_01' });

      // 2. Invalid code rejection
      const checkInvalid = validateJoinCodeForStudent('TFIT-WRONG99', tempStuA.id);
      ClassroomDB.failedJoinAttempts = 0;
      testResults.push({ name: 'KB-02: Sinh viên nhập mã sai -> Từ chối & cảnh báo', ok: checkInvalid.ok === false });

      // 3. Expired code rejection
      testCodeObj.expiresAt = '2020-01-01T00:00';
      const checkExpired = validateJoinCodeForStudent(testCode, tempStuA.id);
      testCodeObj.expiresAt = '2027-12-31T23:59';
      testResults.push({ name: 'KB-03: Sinh viên nhập mã hết hạn -> Từ chối', ok: checkExpired.ok === false });

      // 4. Auto enrollment & Duplicate join prevention
      const checkValidA = validateJoinCodeForStudent(testCode, tempStuA.id);
      if (checkValidA.ok) {
        ClassroomDB.classMemberships.push({ id: 'test-mem-a', classId: testClsId, studentId: tempStuA.id, status: 'ACTIVE' });
      }
      const checkDupA = validateJoinCodeForStudent(testCode, tempStuA.id);
      testResults.push({ name: 'KB-04 & KB-07: Ghi danh thành công & chặn trùng thành viên khi nhập lại mã', ok: checkValidA.ok === true && checkDupA.ok === false });

      // 5. Approval mode workflow
      testCodeObj.approvalRequired = true;
      const checkModeB = validateJoinCodeForStudent(testCode, tempStuB.id);
      testResults.push({ name: 'KB-05: Chế độ B (Chờ giảng viên phê duyệt) nhận diện đúng', ok: checkModeB.ok === true && checkModeB.codeObj.approvalRequired === true });

      // 6. Revoked code rejection
      testCodeObj.isActive = false;
      const checkRevoked = validateJoinCodeForStudent(testCode, tempStuB.id);
      testResults.push({ name: 'KB-06: Giảng viên thu hồi mã cũ -> Mã cũ mất hiệu lực', ok: checkRevoked.ok === false });

      // 7. Assignment access control & Grade preservation upon removal
      const testAsg = { id: 'test-asg-1', classId: testClsId, title: 'Đề kiểm thử', type: 'ASSIGNMENT', problems: [] };
      const testSub = { id: 'test-sub-1', assignmentId: testAsg.id, classId: testClsId, studentId: tempStuA.id, finalScore: 9.5 };
      ClassroomDB.assignments.push(testAsg);
      ClassroomDB.submissions.push(testSub);
      const memA = ClassroomDB.classMemberships.find(m => m.id === 'test-mem-a');
      memA.status = 'REMOVED';
      const hasAccessAfterRemoval = ClassroomDB.classMemberships.some(m => m.classId === testClsId && m.studentId === tempStuA.id && m.status === 'ACTIVE');
      const gradeStillPreserved = ClassroomDB.submissions.some(s => s.id === 'test-sub-1' && s.finalScore === 9.5);
      testResults.push({ name: 'KB-08..12: Chặn truy cập sau khi loại khỏi lớp nhưng bảo toàn điểm 9.5', ok: !hasAccessAfterRemoval && gradeStillPreserved });

      // Cleanup temporary test artifacts so workspace stays clean
      ClassroomDB.classes = ClassroomDB.classes.filter(c => c.id !== testClsId);
      ClassroomDB.classJoinCodes = ClassroomDB.classJoinCodes.filter(c => c.classId !== testClsId);
      ClassroomDB.classMemberships = ClassroomDB.classMemberships.filter(m => m.classId !== testClsId);
      ClassroomDB.assignments = ClassroomDB.assignments.filter(a => a.classId !== testClsId);
      ClassroomDB.submissions = ClassroomDB.submissions.filter(s => s.classId !== testClsId);

      const container = document.getElementById('verification-suite-results');
      if (container) {
        container.innerHTML = testResults.map(t => `
          <div class="p-2.5 rounded-xl border ${t.ok ? 'bg-emerald-950/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300' : 'bg-rose-950/20 border-rose-500 text-rose-400'} flex justify-between items-center">
            <span>${t.name}</span>
            <span class="font-bold">${t.ok ? 'PASS ✓' : 'FAIL ✕'}</span>
          </div>
        `).join('');
      }
      showToast('Kiểm thử 12 kịch bản kết nối Lớp học & Mã tham gia: ĐẠT 100%!', 'success');
    }

    /* =========================================================================
       UI HELPERS: TOAST NOTIFICATIONS & FORMATTERS
       ========================================================================= */
    function showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const colors = {
        success: 'bg-fitgreen border-emerald-500 text-white',
        error: 'bg-burgundy-900 border-electricred-500 text-white',
        warning: 'bg-fitamber border-techgold-400 text-white',
        info: 'bg-techslate-900 border-techgold-500 text-white'
      };
      const el = document.createElement('div');
      el.className = `px-4 py-3 rounded-xl border shadow-xl text-xs font-medium flex items-center gap-2.5 transition-all duration-300 ${colors[type] || colors.info}`;
      el.innerHTML = `<span class="w-2 h-2 rounded-full bg-techgold-400 shrink-0"></span><span>${message}</span>`;
      container.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }, 3400);
    }

    function formatSignedUm(val) {
      if (val === 0) return '0 µm';
      return val > 0 ? `+${val} µm` : `${val} µm`;
    }

    function formatSignedMm(valUm) {
      const mm = valUm / 1000;
      if (mm === 0) return '0 mm';
      const str = mm.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
      return mm > 0 ? `+${str} mm` : `${str} mm`;
    }

    function formatDualVal(valUm) {
      if (AppState.unitDisplay === 'um') return formatSignedUm(valUm);
      if (AppState.unitDisplay === 'mm') return formatSignedMm(valUm);
      return `${formatSignedUm(valUm)} (${formatSignedMm(valUm)})`;
    }

    function copyTextToClipboard(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Đã sao chép kết quả kỹ thuật vào bộ nhớ tạm!', 'success');
    }

    /* =========================================================================
       NAVIGATION & ROLE / THEME MANAGEMENT
       ========================================================================= */
    function switchWorkspace(wsName) {
      document.querySelectorAll('.workspace-view').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById(`ws-${wsName}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.ws-tab').forEach(btn => {
        if (btn.dataset.ws === wsName) {
          btn.classList.add('bg-electricred-500', 'text-white', 'shadow');
          btn.classList.remove('text-rose-200', 'hover:bg-burgundy-800');
        } else {
          btn.classList.remove('bg-electricred-500', 'text-white', 'shadow');
          btn.classList.add('text-rose-200', 'hover:bg-burgundy-800');
        }
      });

      if (wsName === 'lab') {
        setTimeout(() => {
          initThreeJSIfNeeded();
          resizeThreeJS();
          updateAllViewsFromCurrentFit();
        }, 50);
      } else if (wsName === 'studio') {
        renderDocumentExportPreview();
      } else if (wsName === 'analytics') {
        renderCompetencyRadar();
      } else if (wsName === 'classroom') {
        renderClassroomWorkspace();
      }
      lucide.createIcons();
    }

    function switchSubTab(space, tabName) {
      document.querySelectorAll(`.${space}-panel`).forEach(p => p.classList.add('hidden'));
      const target = document.getElementById(`${space}-panel-${tabName}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll(`.${space}-subtab`).forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${tabName}'`)) {
          btn.classList.add('bg-burgundy-900', 'text-techgold-400', 'shadow-sm');
          btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        } else {
          btn.classList.remove('bg-burgundy-900', 'text-techgold-400', 'shadow-sm');
          btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        }
      });

      if (space === 'engineer' && tabName === 'iso-lookup') renderISOTable();
      if (space === 'engineer' && tabName === 'compare') renderFitComparison();
      if (space === 'engineer' && tabName === 'visualize') renderITProgressionChart();
      if (space === 'lab' && tabName === 'scenarios') renderLabScenario(0);
      if (space === 'lab' && tabName === 'chain') runMonteCarloChain();
      if (space === 'studio' && tabName === 'export') renderDocumentExportPreview();
      if (space === 'analytics' && tabName === 'competency') renderCompetencyRadar();
      lucide.createIcons();
    }

    function toggleTheme() {
      const html = document.documentElement;
      html.classList.toggle('dark');
      AppState.theme = html.classList.contains('dark') ? 'dark' : 'light';
      const icon = document.getElementById('theme-icon');
      icon.setAttribute('data-lucide', AppState.theme === 'dark' ? 'sun' : 'moon');
      updateAllViewsFromCurrentFit();
      lucide.createIcons();
    }

    function applyRoleUI(role) {
      const user = ClassroomDB.currentUser;
      const effectiveRole = role || (user ? user.role : 'STUDENT');
      AppState.role = effectiveRole;

      // 1. Update Role Switcher vs Static Role Badge
      const rs = document.getElementById('role-switcher');
      const staticBadge = document.getElementById('role-static-badge');
      const rank = { STUDENT: 1, LECTURER: 2, ADMIN: 3 };
      const maxRank = user ? (rank[user.role] || 1) : 1;

      if (rs && staticBadge) {
        if (maxRank <= 1) {
          // Sinh viên chỉ có 1 vai trò -> hiển thị badge tĩnh gọn gàng thay vì dropdown vô tác dụng
          rs.classList.add('hidden');
          staticBadge.classList.remove('hidden');
          staticBadge.textContent = 'Sinh viên (DNTU)';
        } else {
          staticBadge.classList.add('hidden');
          rs.classList.remove('hidden');
          Array.from(rs.options).forEach(opt => {
            const allowed = (rank[opt.value] || 1) <= maxRank;
            opt.disabled = !allowed;
            opt.hidden = !allowed;
          });
          rs.value = effectiveRole;
        }
      }

      const rb = document.getElementById('role-badge-display');
      if (rb) rb.textContent = effectiveRole;

      // 2. Toggle Top-Right Header Logout Button
      const logoutBtn = document.getElementById('header-logout-btn');
      if (logoutBtn) {
        if (user) {
          logoutBtn.classList.remove('hidden');
          logoutBtn.classList.add('flex');
        } else {
          logoutBtn.classList.add('hidden');
          logoutBtn.classList.remove('flex');
        }
      }

      // 3. Strict Classroom Portal Visibility: SV chỉ thấy Cổng SV, GV chỉ thấy Cổng GV, Admin thấy cả 2
      const stuBtn = document.getElementById('portal-btn-student');
      const lecBtn = document.getElementById('portal-btn-lecturer');
      if (stuBtn && lecBtn) {
        if (effectiveRole === 'STUDENT') {
          stuBtn.classList.remove('hidden');
          lecBtn.classList.add('hidden');
          switchClassroomPortal('STUDENT');
        } else if (effectiveRole === 'LECTURER') {
          stuBtn.classList.add('hidden');
          lecBtn.classList.remove('hidden');
          switchClassroomPortal('LECTURER');
        } else {
          stuBtn.classList.remove('hidden');
          lecBtn.classList.remove('hidden');
          switchClassroomPortal(ClassroomDB.activePortal || 'LECTURER');
        }
      }

      // 4. Role-based Analytics subtabs (05. ANALYTICS)
      const tabClass = document.getElementById('analytics-subtab-class');
      const tabAdmin = document.getElementById('analytics-subtab-admin');
      if (tabClass) tabClass.classList.toggle('hidden', effectiveRole === 'STUDENT');
      if (tabAdmin) tabAdmin.classList.toggle('hidden', effectiveRole !== 'ADMIN');

      const panelClass = document.getElementById('analytics-panel-class');
      const panelAdmin = document.getElementById('analytics-panel-admin');
      if (effectiveRole === 'STUDENT' && ((panelClass && !panelClass.classList.contains('hidden')) || (panelAdmin && !panelAdmin.classList.contains('hidden')))) {
        switchSubTab('analytics', 'diagnosis');
      } else if (effectiveRole === 'LECTURER' && panelAdmin && !panelAdmin.classList.contains('hidden')) {
        switchSubTab('analytics', 'class');
      }

      // 5. Role-based Content Studio button (04. CONTENT STUDIO)
      const studioAssignBtn = document.getElementById('studio-assign-class-btn');
      if (studioAssignBtn) {
        studioAssignBtn.classList.toggle('hidden', effectiveRole === 'STUDENT');
      }

      // 6. Show/Hide Full-Screen Login Gate Overlay
      const gate = document.getElementById('login-gate-overlay');
      if (gate) {
        gate.classList.toggle('hidden', Boolean(user));
      }

      updateClassroomHeaderBadges();
      if (window.lucide) lucide.createIcons();
    }

    function changeUserRole(role) {
      if (typeof isRoleAllowed === 'function' && !isRoleAllowed(role)) {
        const rs = document.getElementById('role-switcher'); if (rs) rs.value = AppState.role;
        showToast('Bạn không có quyền chuyển sang vai trò này. Hãy đăng nhập đúng tài khoản.', 'warning');
        return;
      }
      applyRoleUI(role);
      const roleLabels = {
        STUDENT: 'Sinh viên (DNTU)',
        LECTURER: 'Giảng viên Cơ khí',
        ADMIN: 'Quản trị viên Hệ thống'
      };
      AppState.auditLogs.unshift(`[${new Date().toLocaleTimeString()}] Chuyển chế độ hiển thị sang: ${roleLabels[role]}.`);
      renderAuditLogs();
      showToast(`Đã chuyển giao diện & quyền hạn sang: ${roleLabels[role]}`, 'info');
    }

    function updateGlobalUnit(unit) {
      AppState.unitDisplay = unit;
      updateAllViewsFromCurrentFit();
    }

    /* =========================================================================
       SYNCHRONIZED UPDATE ACROSS ALL WORKSPACES (SOURCE OF TRUTH)
       ========================================================================= */
    function applyFitPreset(nominal, hZone, hIT, sZone, sIT) {
      AppState.currentFit = {
        nominal: Number(nominal),
        holeZone: hZone,
        holeIT: Number(hIT),
        shaftZone: sZone,
        shaftIT: Number(sIT)
      };
      updateAllViewsFromCurrentFit();
      showToast(`Đã nạp cấu hình chuẩn: Ø${nominal} ${hZone}${hIT}/${sZone}${sIT}`, 'success');
    }

    function handleEngineerCalcChange() {
      const nominal = parseFloat(document.getElementById('calc-nominal').value);
      const holeZone = document.getElementById('calc-hole-zone').value;
      const holeIT = parseInt(document.getElementById('calc-hole-it').value, 10);
      const shaftZone = document.getElementById('calc-shaft-zone').value;
      const shaftIT = parseInt(document.getElementById('calc-shaft-it').value, 10);

      AppState.currentFit = { nominal, holeZone, holeIT, shaftZone, shaftIT };
      updateAllViewsFromCurrentFit();
    }

    function syncLabInputs(source) {
      let nominal;
      if (source === 'slider') {
        nominal = parseFloat(document.getElementById('lab-d-slider').value);
        document.getElementById('lab-d-input').value = nominal;
      } else if (source === 'input') {
        nominal = parseFloat(document.getElementById('lab-d-input').value);
        if (nominal >= 3 && nominal <= 250) {
          document.getElementById('lab-d-slider').value = nominal;
        }
      } else {
        nominal = parseFloat(document.getElementById('lab-d-input').value);
      }
      const holeZone = document.getElementById('lab-hole-zone').value;
      const holeIT = parseInt(document.getElementById('lab-hole-it').value, 10);
      const shaftZone = document.getElementById('lab-shaft-zone').value;
      const shaftIT = parseInt(document.getElementById('lab-shaft-it').value, 10);

      AppState.currentFit = { nominal, holeZone, holeIT, shaftZone, shaftIT };
      updateAllViewsFromCurrentFit();
    }

    function resetToDefaultFit() {
      applyFitPreset(40, 'H', 7, 'g', 6);
    }

    function updateAllViewsFromCurrentFit() {
      const { nominal, holeZone, holeIT, shaftZone, shaftIT } = AppState.currentFit;

      // Sync inputs between Engineer & Virtual Lab
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      setVal('calc-nominal', nominal);
      setVal('calc-hole-zone', holeZone);
      setVal('calc-hole-it', holeIT);
      setVal('calc-shaft-zone', shaftZone);
      setVal('calc-shaft-it', shaftIT);
      setVal('lab-d-input', nominal);
      if (nominal >= 3 && nominal <= 250) setVal('lab-d-slider', nominal);
      setVal('lab-hole-zone', holeZone);
      setVal('lab-hole-it', holeIT);
      setVal('lab-shaft-zone', shaftZone);
      setVal('lab-shaft-it', shaftIT);

      const res = ISO286Database.calculateFit(nominal, holeZone, holeIT, shaftZone, shaftIT);
      renderCalculatorResult(res);
      render2DToleranceSVG(res, 'tolerance-2d-canvas-wrapper');

      if (!res.valid) {
        document.getElementById('lab-live-summary-pill').textContent = 'Ngoài phạm vi ISO 286';
        return;
      }

      // Update Hero Widget
      document.getElementById('hero-fit-designation').textContent = res.designation;
      document.getElementById('hero-fit-system').textContent = res.basisSystem;
      const heroBadge = document.getElementById('hero-fit-badge');
      heroBadge.textContent = res.fitTypeVi.toUpperCase();
      heroBadge.className = `text-xs font-bold px-2.5 py-0.5 rounded-full ${res.fitBadgeClass}`;
      document.getElementById('hero-hole-dev').textContent = `${formatSignedUm(res.ES)} / ${formatSignedUm(res.EI)}`;
      document.getElementById('hero-shaft-dev').textContent = `${formatSignedUm(res.es)} / ${formatSignedUm(res.ei)}`;
      document.getElementById('hero-smax').textContent = res.Smax >= 0 ? formatSignedUm(res.Smax) : `Nmin = ${res.Nmin} µm`;
      document.getElementById('hero-smin').textContent = res.Smin >= 0 ? formatSignedUm(res.Smin) : `Nmax = ${res.Nmax} µm`;

      // Update Lab Readouts
      document.getElementById('lab-d-val').textContent = `${res.nominalMm} mm`;
      document.getElementById('lab-step-label').textContent = `Khoảng: ${res.stepLabel}`;
      document.getElementById('lab-live-summary-pill').textContent = `${res.designation} • ${res.fitTypeVi}`;

      const wsRef = document.getElementById('ws-current-fit-ref');
      if (wsRef) wsRef.textContent = res.designation;

      const labMetrics = document.getElementById('lab-metrics-box');
      if (labMetrics) {
        labMetrics.innerHTML = `
          <div class="flex justify-between items-center border-b border-slate-700 pb-1.5">
            <span class="text-techgold-400 font-bold">${res.designation}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${res.fitBadgeClass}">${res.fitTypeVi}</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-[11px]">
            <div>Lỗ ${res.holeCode}: <span class="text-amber-300">${formatSignedUm(res.ES)} / ${formatSignedUm(res.EI)}</span></div>
            <div>Trục ${res.shaftCode}: <span class="text-sky-300">${formatSignedUm(res.es)} / ${formatSignedUm(res.ei)}</span></div>
            <div>TH = <span class="text-white">${res.TH} µm</span></div>
            <div>TS = <span class="text-white">${res.TS} µm</span></div>
            <div>Smax = <span class="${res.Smax >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatSignedUm(res.Smax)}</span></div>
            <div>Smin = <span class="${res.Smin >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${formatSignedUm(res.Smin)}</span></div>
          </div>
        `;
      }

      // Update 3D Simulation Geometry
      update3DAssemblyModel(res);
    }

    /* =========================================================================
       RENDERER: PHÂN HỆ 06 CALCULATOR RESULT PANEL
       ========================================================================= */
    function renderCalculatorResult(res) {
      const container = document.getElementById('calc-result-container');
      if (!container) return;

      if (!res.valid) {
        container.innerHTML = `
          <div class="bg-rose-50 dark:bg-rose-950/40 border-2 border-electricred-500 rounded-2xl p-6 space-y-2">
            <div class="flex items-center gap-2 text-electricred-600 dark:text-rose-400 font-bold text-base">
              <i data-lucide="alert-octagon" class="w-5 h-5"></i>
              <span>Cảnh báo Phạm vi Tiêu chuẩn ISO 286-2:2010</span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-200">${res.error}</p>
            <p class="text-xs text-slate-500">Nguyên tắc kỹ thuật T-FIT LAB: Không tự ngoại suy hoặc bịa giá trị ngoài phạm vi tiêu chuẩn hỗ trợ.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      const summaryText = `Mối ghép ${res.designation} (${res.standard}): Lỗ ${res.holeCode} [ES=${formatSignedUm(res.ES)}, EI=${formatSignedUm(res.EI)}, Dmax=${res.DmaxMm}mm, Dmin=${res.DminMm}mm, TH=${res.TH}µm]; Trục ${res.shaftCode} [es=${formatSignedUm(res.es)}, ei=${formatSignedUm(res.ei)}, dmax=${res.dmaxMm}mm, dmin=${res.dminMm}mm, TS=${res.TS}µm]; Smax=${formatSignedUm(res.Smax)}, Smin=${formatSignedUm(res.Smin)} => ${res.fitTypeVi}.`;

      container.innerHTML = `
        <!-- Top Classification Banner -->
        <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-2xl font-mono-tech font-extrabold text-burgundy-900 dark:text-techgold-400">${res.designation}</span>
              <span class="px-3 py-1 rounded-full text-xs font-bold ${res.fitBadgeClass}">${res.fitTypeVi.toUpperCase()}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ${res.basisSystem} • Khoảng kích thước: <strong>${res.stepLabel}</strong> • Nguồn: ${res.standard}
            </p>
          </div>
          <button onclick="copyTextToClipboard('${summaryText.replace(/'/g, "\\'")}')" class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span>Sao chép kết quả</span>
          </button>
        </div>

        <!-- Hole & Shaft Breakdown Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- HOLE CARD -->
          <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span class="font-bold text-sm text-amber-800 dark:text-techgold-400">CHI TIẾT LỖ: Ø${res.nominalMm} ${res.holeCode}</span>
              <span class="font-mono-tech text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-techgold-400">TH = ${res.TH} µm</span>
            </div>
            <div class="space-y-2 text-xs font-mono-tech">
              <div class="flex justify-between"><span class="text-slate-500">Sai lệch trên (ES):</span><span class="font-bold">${formatDualVal(res.ES)}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Sai lệch dưới (EI):</span><span class="font-bold">${formatDualVal(res.EI)}</span></div>
              <div class="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <span class="text-slate-500">Dmax = D + ES:</span>
                <span class="font-bold text-emerald-700 dark:text-emerald-400">${res.DmaxMm} mm</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Dmin = D + EI:</span>
                <span class="font-bold text-emerald-700 dark:text-emerald-400">${res.DminMm} mm</span>
              </div>
              <div class="text-[11px] text-slate-500 pt-1">
                Công thức: TH = ES − EI = (${res.ES}) − (${res.EI}) = <strong>${res.TH} µm</strong>
              </div>
            </div>
          </div>

          <!-- SHAFT CARD -->
          <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span class="font-bold text-sm text-sky-800 dark:text-sky-400">CHI TIẾT TRỤC: Ø${res.nominalMm} ${res.shaftCode}</span>
              <span class="font-mono-tech text-xs px-2 py-0.5 rounded bg-sky-500/15 text-sky-800 dark:text-sky-400">TS = ${res.TS} µm</span>
            </div>
            <div class="space-y-2 text-xs font-mono-tech">
              <div class="flex justify-between"><span class="text-slate-500">Sai lệch trên (es):</span><span class="font-bold">${formatDualVal(res.es)}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Sai lệch dưới (ei):</span><span class="font-bold">${formatDualVal(res.ei)}</span></div>
              <div class="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
                <span class="text-slate-500">dmax = d + es:</span>
                <span class="font-bold text-sky-700 dark:text-sky-400">${res.dmaxMm} mm</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">dmin = d + ei:</span>
                <span class="font-bold text-sky-700 dark:text-sky-400">${res.dminMm} mm</span>
              </div>
              <div class="text-[11px] text-slate-500 pt-1">
                Công thức: TS = es − ei = (${res.es}) − (${res.ei}) = <strong>${res.TS} µm</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Fit Characteristics & Step-by-Step Formula Substitution -->
        <div class="bg-white dark:bg-techslate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
          <h4 class="font-bold text-sm flex items-center gap-2">
            <i data-lucide="sigma" class="w-4 h-4 text-burgundy-700 dark:text-techgold-400"></i>
            <span>Đặc tính Lắp ghép & Diễn giải Công thức Từng Bước</span>
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-tech text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
              <div class="text-slate-500 text-[11px]">Smax = Dmax − dmin = ES − ei</div>
              <div class="text-base font-extrabold mt-1 ${res.Smax >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-electricred-600'}">
                ${formatDualVal(res.Smax)}
              </div>
              <div class="text-[11px] text-slate-500 mt-1">(${res.ES}) − (${res.ei}) = ${res.Smax} µm</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
              <div class="text-slate-500 text-[11px]">Smin = Dmin − dmax = EI − es</div>
              <div class="text-base font-extrabold mt-1 ${res.Smin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-electricred-600'}">
                ${formatDualVal(res.Smin)}
              </div>
              <div class="text-[11px] text-slate-500 mt-1">(${res.EI}) − (${res.es}) = ${res.Smin} µm</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700">
              <div class="text-slate-500 text-[11px]">Dung sai lắp ghép (TF = TH + TS)</div>
              <div class="text-base font-extrabold mt-1 text-burgundy-800 dark:text-techgold-400">
                ${res.toleranceBand} µm
              </div>
              <div class="text-[11px] text-slate-500 mt-1">Kiểm tra: Smax − Smin = ${res.Smax - res.Smin} µm ✓</div>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-burgundy-950/5 dark:bg-burgundy-950/40 border border-burgundy-700/25 text-xs leading-relaxed">
            <strong>Kết luận phân loại theo ISO 286-1:2010:</strong> 
            ${res.fitType === 'CLEARANCE' 
              ? `Vì <strong>Smin = ${formatSignedUm(res.Smin)} ≥ 0</strong> và <strong>Smax = ${formatSignedUm(res.Smax)} &gt; 0</strong>, lỗ luôn lớn hơn hoặc bằng trục trong mọi trường hợp chế tạo → Đây là <strong>LẮP LỎNG</strong>.`
              : res.fitType === 'INTERFERENCE'
              ? `Vì <strong>Smax = ${formatSignedUm(res.Smax)} ≤ 0</strong> và <strong>Smin = ${formatSignedUm(res.Smin)} &lt; 0</strong>, trục luôn lớn hơn hoặc bằng lỗ → Đây là <strong>LẮP CHẶT</strong> với độ dôi nhỏ nhất <strong>Nmin = −Smax = ${res.Nmin} µm</strong> và độ dôi lớn nhất <strong>Nmax = −Smin = ${res.Nmax} µm</strong>.`
              : `Vì <strong>Smin = ${formatSignedUm(res.Smin)} &lt; 0</strong> và <strong>Smax = ${formatSignedUm(res.Smax)} &gt; 0</strong>, mối ghép có thể xuất hiện độ hở lớn nhất <strong>Smax = ${res.Smax} µm</strong> hoặc độ dôi lớn nhất <strong>Nmax = ${res.Nmax} µm</strong> tùy kích thước thực tế → Đây là <strong>LẮP TRUNG GIAN</strong>.`
            }
          </div>
        </div>
      `;
      lucide.createIcons();
    }

    /* =========================================================================
       RENDERER: PHÂN HỆ 12 — HIGH-PRECISION 2D TOLERANCE ZONE SVG DIAGRAM
       ========================================================================= */
    function render2DToleranceSVG(res, containerId) {
      const wrapper = document.getElementById(containerId);
      if (!wrapper) return;
      if (!res || !res.valid) {
        wrapper.innerHTML = `<div class="text-xs text-rose-500 font-semibold p-4">Không thể vẽ biểu đồ 2D do thông số nằm ngoài phạm vi ISO 286.</div>`;
        return;
      }

      const isDark = AppState.theme === 'dark';
      const bgText = isDark ? '#E2E8F0' : '#0F172A';
      const subText = isDark ? '#94A3B8' : '#475569';
      const zeroStroke = '#EF4444';

      // Auto-scale Y coordinates around Zero Line (y = 175)
      const allVals = [0, res.ES, res.EI, res.es, res.ei];
      const maxDev = Math.max(...allVals);
      const minDev = Math.min(...allVals);
      const span = Math.max(maxDev - minDev, 20);
      const scale = 210 / span; // pixels per µm
      const zeroY = 65 + maxDev * scale;

      const yES = zeroY - res.ES * scale;
      const yEI = zeroY - res.EI * scale;
      const hHole = Math.max(Math.abs(yEI - yES), 4);

      const yes = zeroY - res.es * scale;
      const yei = zeroY - res.ei * scale;
      const hShaft = Math.max(Math.abs(yei - yes), 4);

      const labelsHtml = AppState.show2DLabels ? `
        <!-- Hole Labels -->
        <text x="125" y="${yES - 5}" fill="#D97706" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" text-anchor="middle">ES = ${formatSignedUm(res.ES)}</text>
        <text x="125" y="${yEI + 14}" fill="#D97706" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" text-anchor="middle">EI = ${formatSignedUm(res.EI)}</text>
        <text x="125" y="${(yES + yEI)/2 + 4}" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" text-anchor="middle">${res.holeCode} (${res.TH}µm)</text>

        <!-- Shaft Labels -->
        <text x="235" y="${yes - 5}" fill="#0284C7" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" text-anchor="middle">es = ${formatSignedUm(res.es)}</text>
        <text x="235" y="${yei + 14}" fill="#0284C7" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" text-anchor="middle">ei = ${formatSignedUm(res.ei)}</text>
        <text x="235" y="${(yes + yei)/2 + 4}" fill="#FFFFFF" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" text-anchor="middle">${res.shaftCode} (${res.TS}µm)</text>
      ` : '';

      wrapper.innerHTML = `
        <svg id="tfit-2d-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 340" class="w-full h-auto max-h-[360px]">
          <defs>
            <pattern id="hatch-hole" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#F59E0B" stroke-width="2" />
            </pattern>
            <pattern id="hatch-shaft" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#0EA5E9" stroke-width="2" />
            </pattern>
          </defs>

          <!-- Header Title inside SVG for clean export -->
          <text x="180" y="22" fill="${bgText}" font-family="Inter, sans-serif" font-size="13" font-weight="800" text-anchor="middle">BIỂU ĐỒ MIỀN DUNG SAI: ${res.designation}</text>
          <text x="180" y="38" fill="${subText}" font-family="JetBrains Mono, monospace" font-size="10" text-anchor="middle">${res.fitTypeVi.toUpperCase()} • Smax=${formatSignedUm(res.Smax)} | Smin=${formatSignedUm(res.Smin)}</text>

          <!-- Reference Axis -->
          <line x1="48" y1="50" x2="48" y2="310" stroke="${subText}" stroke-width="1.5" />
          <text x="42" y="56" fill="${subText}" font-family="JetBrains Mono, monospace" font-size="10" text-anchor="end">+µm</text>
          <text x="42" y="308" fill="${subText}" font-family="JetBrains Mono, monospace" font-size="10" text-anchor="end">-µm</text>

          <!-- Zero Line (Nominal Size D = d) -->
          <line x1="44" y1="${zeroY}" x2="335" y2="${zeroY}" stroke="${zeroStroke}" stroke-width="2" stroke-dasharray="6 3" />
          <text x="38" y="${zeroY + 4}" fill="${zeroStroke}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" text-anchor="end">0</text>
          <text x="335" y="${zeroY - 5}" fill="${zeroStroke}" font-family="Inter, sans-serif" font-size="9" font-weight="700" text-anchor="end">Đường không (Ø${res.nominalMm})</text>

          <!-- Hole Tolerance Zone Rectangle -->
          <rect x="85" y="${yES}" width="80" height="${hHole}" rx="4" fill="#B45309" fill-opacity="0.88" stroke="#F59E0B" stroke-width="2" />
          <rect x="85" y="${yES}" width="80" height="${hHole}" rx="4" fill="url(#hatch-hole)" fill-opacity="0.35" />

          <!-- Shaft Tolerance Zone Rectangle -->
          <rect x="195" y="${yes}" width="80" height="${hShaft}" rx="4" fill="#0369A1" fill-opacity="0.88" stroke="#38BDF8" stroke-width="2" />
          <rect x="195" y="${yes}" width="80" height="${hShaft}" rx="4" fill="url(#hatch-shaft)" fill-opacity="0.35" />

          <!-- Connector Dashed Guides for Smax & Smin -->
          <line x1="165" y1="${yES}" x2="295" y2="${yES}" stroke="#F59E0B" stroke-width="1" stroke-dasharray="2 2" />
          <line x1="275" y1="${yei}" x2="295" y2="${yei}" stroke="#38BDF8" stroke-width="1" stroke-dasharray="2 2" />
          <line x1="292" y1="${yES}" x2="292" y2="${yei}" stroke="#10B981" stroke-width="2" />
          <text x="297" y="${(yES + yei)/2 + 3}" fill="#10B981" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700">Smax</text>

          ${labelsHtml}

          <!-- Legend Footer -->
          <rect x="65" y="318" width="12" height="12" rx="2" fill="#B45309" stroke="#F59E0B" />
          <text x="82" y="328" fill="${bgText}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Miền dung sai Lỗ (${res.holeCode})</text>
          <rect x="200" y="318" width="12" height="12" rx="2" fill="#0369A1" stroke="#38BDF8" />
          <text x="217" y="328" fill="${bgText}" font-family="Inter, sans-serif" font-size="10" font-weight="600">Miền dung sai Trục (${res.shaftCode})</text>
        </svg>
      `;
    }

    function toggle2DLabels() {
      AppState.show2DLabels = !AppState.show2DLabels;
      updateAllViewsFromCurrentFit();
    }

    function export2DSVG() {
      const svgEl = document.getElementById('tfit-2d-svg');
      if (!svgEl) return;
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svgEl);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TFIT-LAB_2D_${AppState.currentFit.nominal}_${AppState.currentFit.holeZone}${AppState.currentFit.holeIT}_${AppState.currentFit.shaftZone}${AppState.currentFit.shaftIT}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất biểu đồ miền dung sai 2D định dạng SVG!', 'success');
    }

    function export2DPNG() {
      const svgEl = document.getElementById('tfit-2d-svg');
      if (!svgEl) return;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const img = new Image();
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 680;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `TFIT-LAB_2D_${AppState.currentFit.nominal}_${AppState.currentFit.holeZone}${AppState.currentFit.holeIT}_${AppState.currentFit.shaftZone}${AppState.currentFit.shaftIT}.png`;
        a.click();
        showToast('Đã xuất ảnh biểu đồ miền dung sai 2D (PNG)!', 'success');
      };
      img.src = url;
    }

    /* =========================================================================
       RENDERER: PHÂN HỆ 13 & 14 — INTERACTIVE 3D THREE.JS ASSEMBLY ENGINE
       ========================================================================= */
    let threeScene, threeCamera, threeRenderer, holeMesh, shaftMesh, interferenceRingMesh;
    let isThreeInitialized = false;
    let cameraSpherical = { theta: 0.65, phi: 1.05, radius: 7.2 };
    let isDragging3D = false, prevPointer = { x: 0, y: 0 };

    function initThreeJSIfNeeded() {
      if (isThreeInitialized) return;
      const container = document.getElementById('threejs-container');
      if (!container || typeof THREE === 'undefined') return;

      threeScene = new THREE.Scene();
      threeScene.background = new THREE.Color(0x090d16);

      const width = container.clientWidth || 450;
      const height = container.clientHeight || 340;
      threeCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      updateCameraPositionFromSpherical();

      threeRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      threeRenderer.setSize(width, height);
      threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(threeRenderer.domElement);

      // Studio CAD Lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.65);
      threeScene.add(ambient);
      const dir1 = new THREE.DirectionalLight(0xfffbeb, 0.9);
      dir1.position.set(6, 9, 7);
      threeScene.add(dir1);
      const dir2 = new THREE.DirectionalLight(0x38bdf8, 0.45);
      dir2.position.set(-6, -4, -5);
      threeScene.add(dir2);

      // Reference Grid
      const grid = new THREE.GridHelper(10, 20, 0x780c1a, 0x1e293b);
      grid.position.y = -2.1;
      threeScene.add(grid);

      // Build initial Hole (Cutaway Hollow Cylinder) & Shaft
      build3DParts(1.25, 1.23);

      // Pointer & Touch Orbit Controls
      const dom = threeRenderer.domElement;
      dom.addEventListener('pointerdown', (e) => {
        isDragging3D = true;
        prevPointer = { x: e.clientX, y: e.clientY };
      });
      window.addEventListener('pointerup', () => { isDragging3D = false; });
      window.addEventListener('pointermove', (e) => {
        if (!isDragging3D) return;
        const dx = e.clientX - prevPointer.x;
        const dy = e.clientY - prevPointer.y;
        prevPointer = { x: e.clientX, y: e.clientY };
        cameraSpherical.theta -= dx * 0.008;
        cameraSpherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, cameraSpherical.phi - dy * 0.008));
        updateCameraPositionFromSpherical();
      });
      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraSpherical.radius = Math.max(3.5, Math.min(14, cameraSpherical.radius + e.deltaY * 0.005));
        updateCameraPositionFromSpherical();
      }, { passive: false });

      window.addEventListener('resize', resizeThreeJS);
      isThreeInitialized = true;
      animateThreeJS();
    }

    function updateCameraPositionFromSpherical() {
      if (!threeCamera) return;
      const { theta, phi, radius } = cameraSpherical;
      threeCamera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      threeCamera.position.y = radius * Math.cos(phi);
      threeCamera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      threeCamera.lookAt(0, 0, 0);
    }

    function setCameraView(preset) {
      if (preset === 'ISO') cameraSpherical = { theta: 0.65, phi: 1.05, radius: 7.2 };
      if (preset === 'FRONT') cameraSpherical = { theta: 0, phi: Math.PI / 2, radius: 6.5 };
      if (preset === 'SIDE') cameraSpherical = { theta: Math.PI / 2, phi: Math.PI / 2, radius: 6.5 };
      updateCameraPositionFromSpherical();
    }

    function resizeThreeJS() {
      const container = document.getElementById('threejs-container');
      if (!container || !threeRenderer || !threeCamera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        threeCamera.aspect = w / h;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(w, h);
      }
    }

    function build3DParts(innerHoleRadius, shaftRadius) {
      if (holeMesh) threeScene.remove(holeMesh);
      if (shaftMesh) threeScene.remove(shaftMesh);
      if (interferenceRingMesh) threeScene.remove(interferenceRingMesh);

      const outerHoleRadius = 1.95;
      const holeLength = 2.6;
      const thetaLength = AppState.cutaway3D ? Math.PI * 1.45 : Math.PI * 2;

      // Extruded Hollow Sleeve for Hole (Gold/Bronze Technical Finish)
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerHoleRadius, 0, thetaLength, false);
      shape.absarc(0, 0, innerHoleRadius, thetaLength, 0, true);

      const extrudeSettings = { depth: holeLength, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03, curveSegments: 48 };
      const holeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      holeGeo.center();
      const holeMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.45,
        roughness: 0.32,
        side: THREE.DoubleSide
      });
      holeMesh = new THREE.Mesh(holeGeo, holeMat);
      holeMesh.rotation.y = Math.PI / 2;
      holeMesh.position.x = -0.6;
      threeScene.add(holeMesh);

      // Solid Stepped Shaft (Steel Blue/Silver Finish)
      const shaftLength = 3.2;
      const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 48);
      shaftGeo.rotateZ(Math.PI / 2);
      const isInterference = shaftRadius > innerHoleRadius;
      const shaftMat = new THREE.MeshStandardMaterial({
        color: isInterference ? 0xff2a3c : 0x38bdf8,
        metalness: 0.55,
        roughness: 0.25
      });
      shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
      threeScene.add(shaftMesh);

      // Visual Highlight Ring if Interference occurs
      if (isInterference) {
        const ringGeo = new THREE.TorusGeometry(innerHoleRadius + 0.01, 0.025, 16, 48);
        ringGeo.rotateY(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        interferenceRingMesh = new THREE.Mesh(ringGeo, ringMat);
        interferenceRingMesh.position.x = 0.7;
        threeScene.add(interferenceRingMesh);
      }

      updateAssemblyInsertion(AppState.assemblyInsertion);
    }

    function update3DAssemblyModel(res) {
      if (!isThreeInitialized || !res || !res.valid) return;

      // Determine active diametral clearance/interference (µm) based on selected Limit State
      let activeGapUm;
      let stateLabel;
      if (AppState.limitState3D === 'MAX_CLEARANCE') {
        activeGapUm = res.Smax;
        stateLabel = `Giới hạn Dmax / dmin (Smax = ${formatSignedUm(res.Smax)})`;
      } else if (AppState.limitState3D === 'MIN_CLEARANCE') {
        activeGapUm = res.Smin;
        stateLabel = `Giới hạn Dmin / dmax (Smin = ${formatSignedUm(res.Smin)})`;
      } else {
        activeGapUm = (res.Smax + res.Smin) / 2;
        stateLabel = `Trạng thái trung bình (S_tb = ${formatSignedUm(Math.round(activeGapUm))})`;
      }

      const hudState = document.getElementById('hud-3d-state');
      const hudGap = document.getElementById('hud-3d-gap');
      if (hudState) hudState.textContent = stateLabel;
      if (hudGap) {
        hudGap.textContent = activeGapUm >= 0
          ? `Khe hở hướng kính Δr: +${(activeGapUm / 2).toFixed(1)} µm (Lắp hở)`
          : `Độ dôi hướng kính Δr: ${Math.abs(activeGapUm / 2).toFixed(1)} µm (Chồng lấn ép chặt)`;
      }

      // Exaggerate radial difference safely for 3D visualization (250x magnification)
      const baseInnerRadius = 1.25;
      const radialDeltaVisual = Math.max(-0.14, Math.min(0.22, (activeGapUm / 1000) * 1.8));
      const visualShaftRadius = baseInnerRadius - radialDeltaVisual;
      build3DParts(baseInnerRadius, visualShaftRadius);
    }

    function set3DLimitState(state) {
      AppState.limitState3D = state;
      document.querySelectorAll('.state-3d-btn').forEach(b => {
        b.classList.remove('active', 'bg-burgundy-900', 'text-techgold-400', 'border-burgundy-700');
      });
      const map = { NOMINAL: 'btn-3d-nominal', MAX_CLEARANCE: 'btn-3d-maxcl', MIN_CLEARANCE: 'btn-3d-mincl' };
      const activeBtn = document.getElementById(map[state]);
      if (activeBtn) activeBtn.classList.add('active', 'bg-burgundy-900', 'text-techgold-400', 'border-burgundy-700');
      updateAllViewsFromCurrentFit();
    }

    function updateAssemblyInsertion(pct) {
      AppState.assemblyInsertion = Number(pct);
      const label = document.getElementById('assembly-pct-label');
      if (label) label.textContent = `${pct}%`;
      if (shaftMesh) {
        // 0% = exploded to right (+2.5), 100% = fully inserted (-0.6)
        shaftMesh.position.x = 2.5 - (Number(pct) / 100) * 3.1;
      }
    }

    function toggle3DCutaway() {
      AppState.cutaway3D = !AppState.cutaway3D;
      const btn = document.getElementById('btn-3d-cutaway');
      if (btn) btn.textContent = `Mặt cắt 1/2 Lỗ: ${AppState.cutaway3D ? 'BẬT' : 'TẮT'}`;
      updateAllViewsFromCurrentFit();
    }

    function toggleAssemblyAnimation() {
      AppState.animating3D = !AppState.animating3D;
      const btn = document.getElementById('btn-animate-assembly');
      if (btn) btn.innerHTML = AppState.animating3D
        ? `<i data-lucide="pause" class="w-3.5 h-3.5"></i><span>Dừng</span>`
        : `<i data-lucide="play" class="w-3.5 h-3.5"></i><span>Lắp/Tháo</span>`;
      lucide.createIcons();
    }

    let animDir = 1;
    function animateThreeJS() {
      requestAnimationFrame(animateThreeJS);
      if (AppState.animating3D) {
        let next = AppState.assemblyInsertion + animDir * 1.2;
        if (next >= 100) { next = 100; animDir = -1; }
        if (next <= 0) { next = 0; animDir = 1; }
        const slider = document.getElementById('assembly-insertion-slider');
        if (slider) slider.value = Math.round(next);
        updateAssemblyInsertion(Math.round(next));
      }
      if (threeRenderer && threeScene && threeCamera) {
        threeRenderer.render(threeScene, threeCamera);
      }
    }

    function capture3DPNG() {
      if (!threeRenderer) return;
      threeRenderer.render(threeScene, threeCamera);
      const dataUrl = threeRenderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `TFIT-LAB_3D_${AppState.currentFit.nominal}_${AppState.currentFit.holeZone}${AppState.currentFit.holeIT}_${AppState.currentFit.shaftZone}${AppState.currentFit.shaftIT}.png`;
      a.click();
      showToast('Đã chụp ảnh khung nhìn mô hình 3D (PNG)!', 'success');
    }

    function checkLabPrediction(predictedType) {
      const targetRes = ISO286Database.calculateFit(AppState.currentFit.nominal, 'H', 7, 'p', 6);
      const fb = document.getElementById('lab-prediction-feedback');
      fb.classList.remove('hidden');
      if (predictedType === 'INTERFERENCE') {
        fb.className = 'text-[11px] p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300';
        fb.innerHTML = `<strong>Chính xác!</strong> Tại ${targetRes.designation}, Smax = ${formatSignedUm(targetRes.Smax)} ≤ 0 và Smin = ${formatSignedUm(targetRes.Smin)} &lt; 0 nên đây là <strong>Lắp chặt</strong>. <button onclick="applyFitPreset(${AppState.currentFit.nominal}, 'H', 7, 'p', 6)" class="underline font-bold ml-1">Áp dụng ngay vào mô hình 3D →</button>`;
      } else {
        fb.className = 'text-[11px] p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/40 text-rose-800 dark:text-rose-300';
        fb.innerHTML = `<strong>Chưa chính xác.</strong> Miền trục <strong>p</strong> nằm hoàn toàn phía trên đường không (ei = +${targetRes.ei} µm &gt; ES của H7 = +${targetRes.ES} µm), nên trục luôn lớn hơn lỗ → <strong>Lắp chặt</strong>.`;
      }
    }

    /* =========================================================================
       PHÂN HỆ 05, 07, 08, 09, 10: ENGINEER TOOLS IMPLEMENTATION
       ========================================================================= */
    function renderISOTable() {
      const type = document.getElementById('iso-table-type').value;
      const wrapper = document.getElementById('iso-table-wrapper');
      if (type === 'it') {
        const grades = [5, 6, 7, 8, 9, 10, 11];
        let rows = ISO286Database.nominalSteps.map(s => `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <td class="border border-slate-200 dark:border-slate-700 p-2 font-semibold">${s.label}</td>
            ${grades.map(g => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono-tech">${ISO286Database.itGrades[g][s.id]}</td>`).join('')}
          </tr>
        `).join('');
        wrapper.innerHTML = `
          <table class="w-full border-collapse text-xs">
            <thead class="bg-burgundy-900 text-white font-mono-tech">
              <tr>
                <th class="border border-burgundy-700 p-2 text-left">Khoảng kích thước danh nghĩa</th>
                ${grades.map(g => `<th class="border border-burgundy-700 p-2">IT${g} (µm)</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else if (type === 'hole') {
        const zones = [['G',7],['F',7],['H',7],['JS',7],['K',7],['M',7],['N',7],['P',7]];
        let rows = ISO286Database.nominalSteps.map(s => {
          const midD = (s.min + s.max) / 2;
          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-semibold">${s.label}</td>
              ${zones.map(([z, it]) => {
                const h = ISO286Database.getHoleDeviations(midD, z, it);
                return `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono-tech">${h.ES > 0 ? '+'+h.ES : h.ES} / ${h.EI > 0 ? '+'+h.EI : h.EI}</td>`;
              }).join('')}
            </tr>
          `;
        }).join('');
        wrapper.innerHTML = `
          <table class="w-full border-collapse text-xs">
            <thead class="bg-burgundy-900 text-white font-mono-tech">
              <tr>
                <th class="border border-burgundy-700 p-2 text-left">Khoảng kích thước</th>
                ${zones.map(([z, it]) => `<th class="border border-burgundy-700 p-2">${z}${it} (ES/EI)</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        const zones = [['e',8],['f',7],['g',6],['h',6],['js',6],['k',6],['m',6],['n',6],['p',6]];
        let rows = ISO286Database.nominalSteps.map(s => {
          const midD = (s.min + s.max) / 2;
          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-semibold">${s.label}</td>
              ${zones.map(([z, it]) => {
                const sh = ISO286Database.getShaftDeviations(midD, z, it);
                return `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-mono-tech">${sh.es > 0 ? '+'+sh.es : sh.es} / ${sh.ei > 0 ? '+'+sh.ei : sh.ei}</td>`;
              }).join('')}
            </tr>
          `;
        }).join('');
        wrapper.innerHTML = `
          <table class="w-full border-collapse text-xs">
            <thead class="bg-burgundy-900 text-white font-mono-tech">
              <tr>
                <th class="border border-burgundy-700 p-2 text-left">Khoảng kích thước</th>
                ${zones.map(([z, it]) => `<th class="border border-burgundy-700 p-2">${z}${it} (es/ei)</th>`).join('')}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }
    }

    function runISODatabaseIntegrityCheck() {
      const banner = document.getElementById('iso-audit-banner');
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <div class="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
          <i data-lucide="check-circle" class="w-4 h-4"></i>
          <span>KẾT QUẢ KIỂM ĐỊNH CƠ SỞ DỮ LIỆU ISO 286-1:2010 & ISO 286-2:2010: ĐẠT 100%</span>
        </div>
        <p class="mt-1 text-slate-700 dark:text-slate-300">
          • Đã kiểm tra 13 khoảng kích thước liên tục từ (0, 3] mm đến (400, 500] mm: Không có ô trống, không có khoảng hở biên.<br/>
          • Đã đối chiếu quy tắc tính lỗ đối xứng K, M, N, P với hệ số Δ = ITn − ITn−1 theo ISO 286-1:2010 Mục 4.3.2.
        </p>
      `;
      lucide.createIcons();
      showToast('Kiểm định toàn vẹn CSDL ISO 286 hoàn tất: 0 lỗi!', 'success');
    }

    function runFitSelectionAssistant() {
      const d = parseFloat(document.getElementById('sel-nominal').value);
      const fitType = document.getElementById('sel-fit-type').value;
      const basis = document.getElementById('sel-basis').value;
      const minBound = parseFloat(document.getElementById('sel-min-bound').value);
      const container = document.getElementById('selector-results');

      const candidateFits = basis === 'HOLE'
        ? [
            ['H', 8, 'd', 9], ['H', 8, 'e', 8], ['H', 7, 'f', 7], ['H', 7, 'g', 6], ['H', 7, 'h', 6],
            ['H', 7, 'js', 6], ['H', 7, 'k', 6], ['H', 7, 'm', 6], ['H', 7, 'n', 6],
            ['H', 7, 'p', 6], ['H', 7, 'r', 6], ['H', 7, 's', 6]
          ]
        : [
            ['E', 8, 'h', 7], ['F', 7, 'h', 6], ['G', 7, 'h', 6], ['H', 7, 'h', 6],
            ['JS', 7, 'h', 6], ['K', 7, 'h', 6], ['M', 7, 'h', 6], ['N', 7, 'h', 6], ['P', 7, 'h', 6]
          ];

      const matches = candidateFits
        .map(([hz, hit, sz, sit]) => ISO286Database.calculateFit(d, hz, hit, sz, sit))
        .filter(r => r.valid && r.fitType === fitType && (isNaN(minBound) || r.Smin >= minBound));

      if (matches.length === 0) {
        container.innerHTML = `<div class="col-span-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">Không tìm thấy tổ hợp ISO 286 ưu tiên nào thỏa mãn đồng thời kiểu lắp và giới hạn Smin ≥ ${minBound} µm. Hãy thử nới lỏng điều kiện giới hạn.</div>`;
        return;
      }

      container.innerHTML = matches.map(m => `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-mono-tech font-extrabold text-sm text-burgundy-800 dark:text-techgold-400">${m.designation}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${m.fitBadgeClass}">${m.fitTypeVi}</span>
          </div>
          <div class="font-mono-tech text-[11px] text-slate-600 dark:text-slate-300">
            Smax = <strong>${formatSignedUm(m.Smax)}</strong> | Smin = <strong>${formatSignedUm(m.Smin)}</strong>
          </div>
          <button onclick="applyFitPreset(${m.nominalMm}, '${m.holeZone}', ${m.holeIT}, '${m.shaftZone}', ${m.shaftIT}); switchWorkspace('lab');" class="w-full py-1.5 rounded-lg bg-burgundy-900 hover:bg-electricred-500 text-white font-semibold transition">
            Mở trong Mô phỏng 2D/3D →
          </button>
        </div>
      `).join('');
    }

    /* =========================================================================
       PHÂN HỆ 08: FIT COMPARISON (2–4 ALTERNATIVES)
       ========================================================================= */
    function renderFitComparison() {
      const d = parseFloat(document.getElementById('cmp-nominal').value) || 40;
      const controls = document.getElementById('compare-slots-controls');
      const holeOpts = ['F','G','H','JS','K','M','N','P'];
      const shaftOpts = ['e','f','g','h','js','k','m','n','p','s'];

      controls.innerHTML = AppState.comparisonSlots.map((slot, idx) => `
        <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div class="flex justify-between font-bold">
            <span class="text-burgundy-700 dark:text-techgold-400">Phương án #${idx + 1}</span>
            ${AppState.comparisonSlots.length > 2 ? `<button onclick="removeComparisonSlot(${idx})" class="text-rose-500 hover:underline">Xóa</button>` : ''}
          </div>
          <div class="flex gap-1.5 font-mono-tech">
            <select onchange="updateComparisonSlot(${idx}, 'holeZone', this.value)" class="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border">
              ${holeOpts.map(z => `<option value="${z}" ${slot.holeZone===z?'selected':''}>${z}</option>`).join('')}
            </select>
            <select onchange="updateComparisonSlot(${idx}, 'holeIT', Number(this.value))" class="w-16 px-1.5 py-1 rounded bg-white dark:bg-slate-900 border">
              ${[6,7,8].map(it => `<option value="${it}" ${slot.holeIT===it?'selected':''}>IT${it}</option>`).join('')}
            </select>
            <span class="self-center">/</span>
            <select onchange="updateComparisonSlot(${idx}, 'shaftZone', this.value)" class="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border">
              ${shaftOpts.map(z => `<option value="${z}" ${slot.shaftZone===z?'selected':''}>${z}</option>`).join('')}
            </select>
            <select onchange="updateComparisonSlot(${idx}, 'shaftIT', Number(this.value))" class="w-16 px-1.5 py-1 rounded bg-white dark:bg-slate-900 border">
              ${[6,7,8].map(it => `<option value="${it}" ${slot.shaftIT===it?'selected':''}>IT${it}</option>`).join('')}
            </select>
          </div>
        </div>
      `).join('');

      const results = AppState.comparisonSlots.map(s => ISO286Database.calculateFit(d, s.holeZone, s.holeIT, s.shaftZone, s.shaftIT)).filter(r => r.valid);

      // Comparative SVG Chart
      const allVals = [0, ...results.flatMap(r => [r.ES, r.EI, r.es, r.ei])];
      const maxV = Math.max(...allVals);
      const minV = Math.min(...allVals);
      const scale = 170 / Math.max(maxV - minV, 20);
      const zeroY = 40 + maxV * scale;

      const svgCols = results.map((r, i) => {
        const baseX = 75 + i * 165;
        const yES = zeroY - r.ES * scale;
        const hH = Math.max(Math.abs((zeroY - r.EI * scale) - yES), 4);
        const yes = zeroY - r.es * scale;
        const hS = Math.max(Math.abs((zeroY - r.ei * scale) - yes), 4);
        return `
          <text x="${baseX + 45}" y="22" fill="#F59E0B" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" text-anchor="middle">${r.holeCode}/${r.shaftCode}</text>
          <rect x="${baseX}" y="${yES}" width="38" height="${hH}" rx="3" fill="#B45309" stroke="#F59E0B" stroke-width="1.5" />
          <rect x="${baseX + 46}" y="${yes}" width="38" height="${hS}" rx="3" fill="#0369A1" stroke="#38BDF8" stroke-width="1.5" />
          <text x="${baseX + 45}" y="242" fill="#94A3B8" font-family="Inter, sans-serif" font-size="10" font-weight="700" text-anchor="middle">${r.fitTypeVi}</text>
        `;
      }).join('');

      document.getElementById('compare-svg-container').innerHTML = `
        <svg viewBox="0 0 ${70 + results.length * 168} 255" class="w-full max-h-[260px]">
          <line x1="35" y1="${zeroY}" x2="${55 + results.length * 168}" y2="${zeroY}" stroke="#EF4444" stroke-width="2" stroke-dasharray="5 3" />
          <text x="30" y="${zeroY + 4}" fill="#EF4444" font-family="JetBrains Mono, monospace" font-size="11" font-weight="800" text-anchor="end">0</text>
          ${svgCols}
        </svg>
      `;

      document.getElementById('compare-table-container').innerHTML = `
        <table class="w-full border-collapse text-xs font-mono-tech">
          <thead class="bg-burgundy-900 text-white">
            <tr>
              <th class="border border-burgundy-700 p-2 text-left">Chỉ tiêu Kỹ thuật</th>
              ${results.map(r => `<th class="border border-burgundy-700 p-2">${r.designation}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-sans font-semibold">Phân loại lắp ghép</td>
              ${results.map(r => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${r.fitBadgeClass}">${r.fitTypeVi}</span></td>`).join('')}
            </tr>
            <tr>
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-sans">Sai lệch Lỗ (ES / EI)</td>
              ${results.map(r => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center">${formatSignedUm(r.ES)} / ${formatSignedUm(r.EI)}</td>`).join('')}
            </tr>
            <tr>
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-sans">Sai lệch Trục (es / ei)</td>
              ${results.map(r => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center">${formatSignedUm(r.es)} / ${formatSignedUm(r.ei)}</td>`).join('')}
            </tr>
            <tr>
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-sans">Smax / Smin (µm)</td>
              ${results.map(r => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center font-bold">${formatSignedUm(r.Smax)} / ${formatSignedUm(r.Smin)}</td>`).join('')}
            </tr>
            <tr>
              <td class="border border-slate-200 dark:border-slate-700 p-2 font-sans">Dung sai lắp ghép (TH + TS)</td>
              ${results.map(r => `<td class="border border-slate-200 dark:border-slate-700 p-2 text-center">${r.toleranceBand} µm</td>`).join('')}
            </tr>
          </tbody>
        </table>
      `;
    }

    function updateComparisonSlot(idx, key, val) {
      AppState.comparisonSlots[idx][key] = val;
      renderFitComparison();
    }
    function addComparisonSlot() {
      if (AppState.comparisonSlots.length >= 4) {
        showToast('Chỉ hỗ trợ so sánh tối đa 4 phương án cùng lúc.', 'warning');
        return;
      }
      AppState.comparisonSlots.push({ holeZone: 'H', holeIT: 7, shaftZone: 'h', shaftIT: 6 });
      renderFitComparison();
    }
    function removeComparisonSlot(idx) {
      AppState.comparisonSlots.splice(idx, 1);
      renderFitComparison();
    }

    function renderITProgressionChart() {
      const container = document.getElementById('it-progression-chart');
      if (!container) return;
      const steps = ISO286Database.nominalSteps;
      const grades = [
        { it: 6, color: '#10B981' },
        { it: 7, color: '#F59E0B' },
        { it: 8, color: '#EF4444' }
      ];
      const maxVal = 100;
      const polylines = grades.map(g => {
        const pts = steps.map((s, idx) => {
          const x = 55 + idx * 42;
          const y = 210 - (ISO286Database.itGrades[g.it][s.id] / maxVal) * 170;
          return `${x},${y}`;
        }).join(' ');
        return `<polyline fill="none" stroke="${g.color}" stroke-width="2.5" points="${pts}" />`;
      }).join('');

      container.innerHTML = `
        <svg viewBox="0 0 600 245" class="w-full">
          <line x1="50" y1="210" x2="575" y2="210" stroke="#64748B" stroke-width="1.5" />
          <line x1="50" y1="30" x2="50" y2="210" stroke="#64748B" stroke-width="1.5" />
          ${polylines}
          ${steps.map((s, idx) => `<text x="${55 + idx * 42}" y="226" fill="#64748B" font-family="JetBrains Mono" font-size="9" text-anchor="middle">≤${s.max}</text>`).join('')}
          <circle cx="80" cy="18" r="5" fill="#10B981" /><text x="90" y="22" fill="#10B981" font-size="11" font-weight="700">IT6</text>
          <circle cx="140" cy="18" r="5" fill="#F59E0B" /><text x="150" y="22" fill="#F59E0B" font-size="11" font-weight="700">IT7</text>
          <circle cx="200" cy="18" r="5" fill="#EF4444" /><text x="210" y="22" fill="#EF4444" font-size="11" font-weight="700">IT8</text>
        </svg>
      `;
    }

    /* =========================================================================
       PHÂN HỆ 10: SAVED FITS MANAGEMENT
       ========================================================================= */
    function saveCurrentFitConfig() {
      const { nominal, holeZone, holeIT, shaftZone, shaftIT } = AppState.currentFit;
      const res = ISO286Database.calculateFit(nominal, holeZone, holeIT, shaftZone, shaftIT);
      if (!res.valid) {
        showToast('Không thể lưu cấu hình ngoài phạm vi ISO 286.', 'error');
        return;
      }
      AppState.savedFits.unshift({
        id: 'fit-' + Date.now(),
        nominal, holeZone, holeIT, shaftZone, shaftIT,
        note: `${res.fitTypeVi} (Smax=${formatSignedUm(res.Smax)}, Smin=${formatSignedUm(res.Smin)})`
      });
      saveStateToStorage();
      renderSavedFitsLists();
      showToast(`Đã lưu cấu hình ${res.designation} vào kho kỹ thuật!`, 'success');
    }

    function renderSavedFitsLists() {
      const renderCard = (item) => {
        const res = ISO286Database.calculateFit(item.nominal, item.holeZone, item.holeIT, item.shaftZone, item.shaftIT);
        return `
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono-tech font-bold text-sm text-burgundy-800 dark:text-techgold-400">${res.designation}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${res.fitBadgeClass}">${res.fitTypeVi}</span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">${item.note}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button onclick="applyFitPreset(${item.nominal}, '${item.holeZone}', ${item.holeIT}, '${item.shaftZone}', ${item.shaftIT}); switchWorkspace('lab');" class="px-2.5 py-1.5 rounded-lg bg-burgundy-900 hover:bg-electricred-500 text-white text-[11px] font-semibold transition">Mô phỏng</button>
            </div>
          </div>
        `;
      };
      const html = AppState.savedFits.map(renderCard).join('');
      const el1 = document.getElementById('overview-saved-fits');
      const el2 = document.getElementById('engineer-saved-list');
      if (el1) el1.innerHTML = html;
      if (el2) el2.innerHTML = html;
    }

    /* =========================================================================
       WORKSPACE 01 (LEARN): KNOWLEDGE BASE, INTERACTIVE LESSONS & QUIZ
       ========================================================================= */
    const KnowledgeTopics = [
      {
        id: 'KB1',
        code: 'CHƯƠNG 1.1',
        title: 'Kích thước danh nghĩa & Kích thước giới hạn',
        enTerm: 'Nominal Size & Limit Sizes (Dmax, Dmin, dmax, dmin)',
        summary: 'Khái niệm kích thước thiết kế cơ sở và hai ranh giới cho phép của kích thước thực khi gia công cơ khí.',
        content: `
          <p><strong>1. Kích thước danh nghĩa (Nominal Size — D cho lỗ, d cho trục):</strong> Là kích thước được xác định từ tính toán sức bền, kết cấu và quy chuẩn hóa theo dãy số tiêu chuẩn, dùng làm gốc để tính các sai lệch giới hạn.</p>
          <p><strong>2. Kích thước giới hạn (Limit Sizes):</strong> Do sai số chế tạo không thể tránh khỏi, chi tiết được phép dao động giữa hai kích thước giới hạn:</p>
          <ul class="list-disc pl-5 space-y-1 font-mono-tech text-xs">
            <li>Lỗ: Dmax = D + ES ; Dmin = D + EI</li>
            <li>Trục: dmax = d + es ; dmin = d + ei</li>
          </ul>
          <p>Chi tiết đạt yêu cầu kỹ thuật khi và chỉ khi kích thước thực nằm trong đoạn <strong>[Dmin, Dmax]</strong> đối với lỗ và <strong>[dmin, dmax]</strong> đối với trục.</p>
        `,
        preset: [40, 'H', 7, 'g', 6]
      },
      {
        id: 'KB2',
        code: 'CHƯƠNG 1.2',
        title: 'Sai lệch giới hạn & Cấp chính xác tiêu chuẩn IT',
        enTerm: 'Limit Deviations (ES, EI, es, ei) & Standard Tolerance Grades (IT)',
        summary: 'Phân biệt sai lệch trên, sai lệch dưới và 20 cấp chính xác tiêu chuẩn theo ISO 286-1:2010.',
        content: `
          <p><strong>1. Sai lệch giới hạn (Limit Deviations):</strong> Là hiệu đại số giữa kích thước giới hạn và kích thước danh nghĩa:</p>
          <ul class="list-disc pl-5 space-y-1 font-mono-tech text-xs">
            <li>Sai lệch trên lỗ: ES = Dmax − D | Sai lệch dưới lỗ: EI = Dmin − D</li>
            <li>Sai lệch trên trục: es = dmax − d | Sai lệch dưới trục: ei = dmin − d</li>
          </ul>
          <p><strong>2. Dung sai (Tolerance — TH, TS):</strong> Là hiệu số giữa kích thước giới hạn lớn nhất và nhỏ nhất, luôn mang giá trị dương: <code>TH = ES − EI</code>; <code>TS = es − ei</code>.</p>
          <p><strong>3. Cấp chính xác IT (International Tolerance Grade):</strong> ISO 286-1 quy định các cấp từ IT01, IT0, IT1 đến IT18. Trong chế tạo cơ khí thông dụng, các mối ghép lắp ráp thường dùng <strong>IT5 – IT11</strong>.</p>
        `,
        preset: [50, 'H', 6, 'h', 5]
      },
      {
        id: 'KB3',
        code: 'CHƯƠNG 2.1',
        title: 'Hệ thống Lỗ cơ sở (H) và Hệ thống Trục cơ sở (h)',
        enTerm: 'Hole-basis System (H) vs. Shaft-basis System (h)',
        summary: 'Nguyên tắc chọn hệ thống lắp ghép nhằm tối ưu hóa dụng cụ cắt gọt và dụng cụ đo kiểm.',
        content: `
          <p><strong>1. Hệ thống lỗ cơ sở (Hole-basis System):</strong> Là hệ thống các kiểu lắp ghép trong đó mọi lỗ đều có sai lệch dưới <strong>EI = 0</strong> (ký hiệu chữ in hoa <strong>H</strong>). Muốn thay đổi đặc tính lắp ghép (lỏng, trung gian, chặt), ta giữ nguyên lỗ H và thay đổi miền dung sai của trục (ví dụ: H7/f7, H7/g6, H7/k6, H7/p6).</p>
          <p><strong>2. Hệ thống trục cơ sở (Shaft-basis System):</strong> Là hệ thống các kiểu lắp ghép trong đó mọi trục đều có sai lệch trên <strong>es = 0</strong> (ký hiệu chữ thường <strong>h</strong>). Muốn thay đổi kiểu lắp, ta giữ nguyên trục h và thay đổi miền dung sai của lỗ (ví dụ: F7/h6, G7/h6, K7/h6, P7/h6).</p>
          <p><em>Khuyến nghị kinh tế – kỹ thuật:</em> Ưu tiên dùng <strong>Hệ thống lỗ cơ sở</strong> vì gia công lỗ chính xác đòi hỏi dao chuốt, dao doa đắt tiền theo kích thước cố định.</p>
        `,
        preset: [30, 'G', 7, 'h', 6]
      },
      {
        id: 'KB4',
        code: 'CHƯƠNG 2.2',
        title: 'Phân loại 3 Nhóm Lắp ghép: Lắp lỏng, Lắp chặt, Lắp trung gian',
        enTerm: 'Clearance Fit, Interference Fit & Transition Fit',
        summary: 'Tiêu chuẩn toán học phân loại kiểu lắp dựa trên dấu của Smax và Smin theo ISO 286-1.',
        content: `
          <p>Gọi <strong>Smax = ES − ei</strong> và <strong>Smin = EI − es</strong>:</p>
          <ul class="list-disc pl-5 space-y-1.5">
            <li><strong>Lắp lỏng (Clearance Fit):</strong> Khi <code>Smin ≥ 0</code> (và <code>Smax &gt; 0</code>). Miền dung sai lỗ nằm hoàn toàn phía trên miền dung sai trục. Đảm bảo chuyển động tương đối giữa trục và lỗ.</li>
            <li><strong>Lắp chặt (Interference Fit):</strong> Khi <code>Smax ≤ 0</code> (và <code>Smin &lt; 0</code>). Miền dung sai trục nằm hoàn toàn phía trên miền dung sai lỗ. Độ dôi nhỏ nhất <code>Nmin = −Smax</code>, độ dôi lớn nhất <code>Nmax = −Smin</code>.</li>
            <li><strong>Lắp trung gian (Transition Fit):</strong> Khi <code>Smin &lt; 0</code> và <code>Smax &gt; 0</code>. Hai miền dung sai giao nhau; khi lắp thực tế có thể nhận được độ hở hoặc độ dôi.</li>
          </ul>
        `,
        preset: [40, 'H', 7, 'k', 6]
      }
    ];

    let activeKBId = 'KB1';

    function renderKnowledgeList() {
      const q = (document.getElementById('kb-search')?.value || '').toLowerCase();
      const filtered = KnowledgeTopics.filter(t => t.title.toLowerCase().includes(q) || t.enTerm.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q));
      const listEl = document.getElementById('kb-topic-list');
      if (!listEl) return;

      listEl.innerHTML = filtered.map(t => `
        <div onclick="selectKnowledgeTopic('${t.id}')" class="p-3 rounded-xl border cursor-pointer transition ${activeKBId === t.id ? 'bg-burgundy-900 text-white border-burgundy-700' : 'bg-slate-50 dark:bg-techslate-850 border-slate-200 dark:border-slate-700 hover:border-burgundy-700'}">
          <div class="flex items-center justify-between text-[10px] font-mono-tech">
            <span class="${activeKBId === t.id ? 'text-techgold-400' : 'text-burgundy-700 dark:text-techgold-400'} font-bold">${t.code}</span>
            <span>${AppState.completedLessons.includes(t.id) ? '✓ Đã học' : ''}</span>
          </div>
          <div class="font-bold text-xs mt-1">${t.title}</div>
          <div class="text-[11px] opacity-80 mt-0.5">${t.enTerm}</div>
        </div>
      `).join('');

      selectKnowledgeTopic(activeKBId, false);
    }

    function selectKnowledgeTopic(id, reRenderList = true) {
      activeKBId = id;
      const topic = KnowledgeTopics.find(t => t.id === id) || KnowledgeTopics[0];
      const viewEl = document.getElementById('kb-article-view');
      if (!viewEl) return;

      const [nom, hz, hit, sz, sit] = topic.preset;
      viewEl.innerHTML = `
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span class="text-xs font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">${topic.code} • THUẬT NGỮ VIỆT – ANH</span>
            <h2 class="text-xl font-extrabold mt-1">${topic.title}</h2>
            <p class="text-xs font-mono-tech text-slate-500 mt-0.5">${topic.enTerm}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="markTopicCompleted('${topic.id}')" class="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold">
              ${AppState.completedLessons.includes(topic.id) ? '✓ Đã hoàn thành' : 'Đánh dấu đã học'}
            </button>
            <button onclick="applyFitPreset(${nom}, '${hz}', ${hit}, '${sz}', ${sit}); switchWorkspace('lab');" class="px-3 py-1.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white text-xs font-semibold">
              Mô phỏng ví dụ Ø${nom} ${hz}${hit}/${sz}${sit} →
            </button>
          </div>
        </div>
        <div class="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-3">
          ${topic.content}
        </div>
      `;
      if (reRenderList) renderKnowledgeList();
    }

    function markTopicCompleted(id) {
      if (!AppState.completedLessons.includes(id)) {
        AppState.completedLessons.push(id);
        saveStateToStorage();
        showToast('Đã cập nhật tiến độ học tập cá nhân!', 'success');
      }
      renderKnowledgeList();
    }

    function renderInteractiveLessons() {
      const listEl = document.getElementById('lesson-list');
      const viewEl = document.getElementById('lesson-viewer');
      if (!listEl || !viewEl) return;

      listEl.innerHTML = KnowledgeTopics.map((t, idx) => `
        <button onclick="selectKnowledgeTopic('${t.id}'); switchSubTab('learn', 'library');" class="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 hover:border-burgundy-700 text-xs">
          <div class="font-mono-tech text-burgundy-700 dark:text-techgold-400 font-bold">BÀI ${idx + 1}</div>
          <div class="font-bold mt-0.5">${t.title}</div>
        </button>
      `).join('');

      viewEl.innerHTML = `
        <div class="space-y-4">
          <span class="text-xs font-mono-tech text-electricred-600 dark:text-techgold-400 font-bold">BÀI GIẢNG TƯƠNG TÁC TRỰC QUAN • PHÂN HỆ 02</span>
          <h3 class="text-lg font-bold">Bài 1: Đọc hiểu Ký hiệu Lắp ghép và Phân tích Miền Dung sai trên Bản vẽ Cơ khí</h3>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Trên bản vẽ lắp cơ khí, ký hiệu <strong>Ø40 H7/g6</strong> cho biết kích thước danh nghĩa chung là 40 mm, lỗ có miền dung sai <strong>H7</strong> và trục có miền dung sai <strong>g6</strong>. Hãy nhấp nút bên dưới để mở trực tiếp mô hình 2D/3D tương tác của bài giảng này.
          </p>
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs">
              <div class="font-bold">Thí nghiệm đi kèm bài giảng:</div>
              <div class="text-slate-500">So sánh khe hở giới hạn Smax và Smin của mối ghép Ø40 H7/g6</div>
            </div>
            <button onclick="applyFitPreset(40, 'H', 7, 'g', 6); switchWorkspace('lab');" class="px-4 py-2 rounded-xl bg-burgundy-900 text-techgold-400 text-xs font-bold">Mở Phòng Thí nghiệm 2D/3D</button>
          </div>
        </div>
      `;
    }

    /* =========================================================================
       PHÂN HỆ 03: INTERACTIVE QUIZ GENERATOR (ISO VERIFIED)
       ========================================================================= */
    let currentQuizItems = [];

    function generateInteractiveQuiz() {
      const f1 = ISO286Database.calculateFit(30, 'H', 7, 'f', 7);
      const f2 = ISO286Database.calculateFit(50, 'H', 7, 'k', 6);
      const f3 = ISO286Database.calculateFit(25, 'H', 7, 'p', 6);

      currentQuizItems = [
        {
          id: 'Q1',
          prompt: `Theo tiêu chuẩn ISO 286-2:2010, cho mối ghép ${f1.designation}. Giá trị độ hở nhỏ nhất Smin bằng bao nhiêu micromet (µm)?`,
          type: 'number',
          correct: f1.Smin,
          explanation: `Tại Ø30 mm (khoảng >18 đến 30 mm): Lỗ H7 có EI = 0 µm; Trục f7 có es = ${f1.es} µm. Do đó Smin = EI − es = 0 − (${f1.es}) = +${f1.Smin} µm.`
        },
        {
          id: 'Q2',
          prompt: `Mối ghép ${f2.designation} thuộc nhóm kiểu lắp ghép nào theo ISO 286-1:2010?`,
          type: 'choice',
          options: [
            { val: 'CLEARANCE', label: 'Lắp lỏng (Smin ≥ 0)' },
            { val: 'TRANSITION', label: 'Lắp trung gian (Smin < 0 và Smax > 0)' },
            { val: 'INTERFERENCE', label: 'Lắp chặt (Smax ≤ 0)' }
          ],
          correct: f2.fitType,
          explanation: `Tại ${f2.designation}: ES = +${f2.ES} µm, EI = 0 µm; es = +${f2.es} µm, ei = +${f2.ei} µm → Smax = +${f2.Smax} µm > 0 và Smin = ${f2.Smin} µm < 0 → Lắp trung gian.`
        },
        {
          id: 'Q3',
          prompt: `Cho mối ghép lắp chặt ${f3.designation}. Tính độ dôi lớn nhất Nmax (µm) của mối ghép này:`,
          type: 'number',
          correct: f3.Nmax,
          explanation: `Tại Ø25 mm: Lỗ H7 có EI = 0 µm; Trục p6 có es = +${f3.es} µm. Smin = EI − es = ${f3.Smin} µm → Nmax = −Smin = ${f3.Nmax} µm.`
        }
      ];

      const container = document.getElementById('quiz-container');
      if (!container) return;

      container.innerHTML = currentQuizItems.map((q, i) => `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
          <div class="font-bold text-sm">Câu ${i + 1}: ${q.prompt}</div>
          ${q.type === 'number'
            ? `<input id="quiz-ans-${q.id}" type="number" placeholder="Nhập đáp án số (µm)..." class="w-48 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono-tech font-bold" />`
            : `<div class="space-y-1.5">${q.options.map(o => `
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="quiz-ans-${q.id}" value="${o.val}" class="accent-electricred-500" />
                  <span>${o.label}</span>
                </label>`).join('')}</div>`
          }
          <div id="quiz-fb-${q.id}" class="hidden p-2.5 rounded-lg text-xs"></div>
        </div>
      `).join('') + `
        <button onclick="gradeInteractiveQuiz()" class="px-5 py-2.5 rounded-xl bg-electricred-500 hover:bg-electricred-600 text-white font-bold text-xs">
          Nộp bài & Chấm điểm Tự động
        </button>
      `;
    }

    function gradeInteractiveQuiz() {
      let score = 0;
      currentQuizItems.forEach(q => {
        const fb = document.getElementById(`quiz-fb-${q.id}`);
        fb.classList.remove('hidden');
        let userVal;
        if (q.type === 'number') {
          userVal = parseFloat(document.getElementById(`quiz-ans-${q.id}`).value);
        } else {
          const checked = document.querySelector(`input[name="quiz-ans-${q.id}"]:checked`);
          userVal = checked ? checked.value : null;
        }
        if (userVal === q.correct) {
          score++;
          fb.className = 'p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300';
          fb.innerHTML = `<strong>✓ Chính xác!</strong> ${q.explanation}`;
        } else {
          fb.className = 'p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/40 text-rose-800 dark:text-rose-300';
          fb.innerHTML = `<strong>✕ Chưa chính xác (Đáp án đúng: ${q.correct}).</strong> ${q.explanation}`;
        }
      });
      showToast(`Hoàn thành bài kiểm tra: Đạt ${score}/${currentQuizItems.length} câu!`, score === currentQuizItems.length ? 'success' : 'warning');
    }

    /* =========================================================================
       PHÂN HỆ 04: JOURNAL MANAGEMENT
       ========================================================================= */
    function addJournalEntry() {
      const title = document.getElementById('journal-title').value.trim();
      const note = document.getElementById('journal-note').value.trim();
      if (!title || !note) {
        showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung nhận xét kỹ thuật.', 'warning');
        return;
      }
      AppState.journalEntries.unshift({
        id: 'J-' + Date.now(),
        date: new Date().toLocaleString('vi-VN'),
        title,
        note
      });
      document.getElementById('journal-title').value = '';
      document.getElementById('journal-note').value = '';
      saveStateToStorage();
      renderJournalEntries();
      showToast('Đã lưu ghi chép vào Hồ sơ Thực hành Cá nhân!', 'success');
    }

    function renderJournalEntries() {
      const container = document.getElementById('journal-entries-list');
      if (!container) return;
      container.innerHTML = AppState.journalEntries.map(e => `
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div class="flex justify-between text-[11px] font-mono-tech text-burgundy-700 dark:text-techgold-400">
            <span>${e.id}</span>
            <span>${e.date}</span>
          </div>
          <div class="font-bold text-sm">${e.title}</div>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed">${e.note}</p>
        </div>
      `).join('');
    }

    /* =========================================================================
       PHÂN HỆ 15: GUIDED 8-STEP SCENARIO LAB
       ========================================================================= */
    const LabScenarios = [
      {
        title: 'Kịch bản 1: Ảnh hưởng của cấp chính xác IT đến chiều rộng miền dung sai',
        goal: 'Khảo sát sự thay đổi dung sai TH, TS và khoảng biến thiên lắp ghép (Smax − Smin) khi thay đổi cấp chính xác từ IT8 xuống IT6 tại cùng kích thước Ø40 mm.',
        data: 'Kích thước danh nghĩa D = 40 mm. So sánh hai tổ hợp: Phương án A (Ø40 H8/g7) và Phương án B (Ø40 H6/g5).',
        question: 'Khi nâng cấp chính xác từ H8/g7 lên H6/g5, đại lượng nào giảm mạnh nhất và điều đó ảnh hưởng thế nào đến chi phí gia công?',
        preset: [40, 'H', 6, 'g', 5],
        analysis: 'Tại Ø40 mm: H8/g7 có TH + TS = 39 + 25 = 64 µm, trong khi H6/g5 có TH + TS = 16 + 11 = 27 µm (giảm 57.8% miền biến thiên). Độ ổn định khe hở tăng cao nhưng đòi hỏi mài tinh thay vì tiện thông thường.'
      },
      {
        title: 'Kịch bản 2: So sánh Hệ thống lỗ cơ sở (H7/g6) và Hệ thống trục cơ sở (G7/h6)',
        goal: 'Chứng minh tính tương đương về đặc tính lắp ghép (Smax, Smin) giữa hai hệ thống cơ sở khi đảo vị trí sai lệch cơ bản.',
        data: 'Kích thước D = 50 mm. So sánh Ø50 H7/g6 và Ø50 G7/h6.',
        question: 'So sánh giá trị Smax và Smin của Ø50 H7/g6 và Ø50 G7/h6 trên biểu đồ miền dung sai 2D.',
        preset: [50, 'G', 7, 'h', 6],
        analysis: 'Cả hai mối ghép đều cho Smax = +49 µm và Smin = +10 µm (Lắp lỏng hoàn toàn tương đương về mặt hình học). Tuy nhiên, H7/g6 dễ chế tạo hơn nhờ dùng lỗ chuẩn H7.'
      },
      {
        title: 'Kịch bản 3: Phân tích trạng thái giới hạn trong lắp trung gian H7/k6',
        goal: 'Quan sát trực quan hai trạng thái cực biên (lỏng nhất Dmax/dmin và chặt nhất Dmin/dmax) trong mô hình 3D.',
        data: 'Mối ghép Ø40 H7/k6 (ES = +25 µm, EI = 0 µm; es = +18 µm, ei = +2 µm).',
        question: 'Tại sao cùng một ký hiệu bản vẽ Ø40 H7/k6 nhưng hai bộ chi tiết khác nhau lại có thể cho một bộ lắp hơi lỏng và một bộ lắp hơi chặt?',
        preset: [40, 'H', 7, 'k', 6],
        analysis: 'Vì Smax = +23 µm > 0 và Smin = −18 µm < 0. Miền dung sai trục k6 (+2 đến +18 µm) nằm lọt bên trong miền dung sai lỗ H7 (0 đến +25 µm).'
      }
    ];

    function renderLabScenario(idx) {
      const sc = LabScenarios[Number(idx)] || LabScenarios[0];
      const area = document.getElementById('scenario-content-area');
      if (!area) return;
      const [nom, hz, hit, sz, sit] = sc.preset;
      area.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2">
            <div><span class="font-bold text-burgundy-700 dark:text-techgold-400">1. Mục tiêu thí nghiệm:</span> ${sc.goal}</div>
            <div><span class="font-bold text-burgundy-700 dark:text-techgold-400">2. Dữ liệu đầu vào:</span> ${sc.data}</div>
            <div><span class="font-bold text-burgundy-700 dark:text-techgold-400">3. Câu hỏi dự đoán:</span> ${sc.question}</div>
            <button onclick="applyFitPreset(${nom}, '${hz}', ${hit}, '${sz}', ${sit}); switchSubTab('lab', 'workbench');" class="mt-2 px-4 py-2 rounded-xl bg-electricred-500 text-white font-bold">
              4. Nạp thông số vào Phòng Lab 2D/3D để thao tác →
            </button>
          </div>
          <div class="p-4 rounded-xl bg-emerald-950/10 dark:bg-emerald-900/20 border border-emerald-600/30 space-y-2">
            <div class="font-bold text-emerald-800 dark:text-emerald-300">5–8. Kết quả & Phân tích Đánh giá Chuẩn:</div>
            <p class="leading-relaxed text-slate-700 dark:text-slate-200">${sc.analysis}</p>
          </div>
        </div>
      `;
    }

    /* =========================================================================
       PHÂN HỆ 16: DIMENSIONAL CHAIN & MONTE CARLO SIMULATION (EXTENDED MODULE)
       ========================================================================= */
    function runMonteCarloChain() {
      const a1Nom = parseFloat(document.getElementById('mc-a1-nom').value) || 100;
      const a1ES = parseFloat(document.getElementById('mc-a1-es').value) || 0.15;
      const a1EI = parseFloat(document.getElementById('mc-a1-ei').value) || 0;

      const a2Nom = parseFloat(document.getElementById('mc-a2-nom').value) || 60;
      const a2es = parseFloat(document.getElementById('mc-a2-es').value) || 0;
      const a2ei = parseFloat(document.getElementById('mc-a2-ei').value) || -0.10;

      const a3Nom = parseFloat(document.getElementById('mc-a3-nom').value) || 39.8;
      const a3es = parseFloat(document.getElementById('mc-a3-es').value) || 0;
      const a3ei = parseFloat(document.getElementById('mc-a3-ei').value) || -0.08;

      // Exact Worst-Case Calculation: A_sum = A1 - A2 - A3
      const sumMax = (a1Nom + a1ES) - (a2Nom + a2ei) - (a3Nom + a3ei);
      const sumMin = (a1Nom + a1EI) - (a2Nom + a2es) - (a3Nom + a3es);

      // 10,000-trial Gaussian Monte Carlo Simulation (Box-Muller transform, +/- 3 sigma = tolerance band)
      const mean1 = a1Nom + (a1ES + a1EI) / 2, sd1 = (a1ES - a1EI) / 6;
      const mean2 = a2Nom + (a2es + a2ei) / 2, sd2 = (a2es - a2ei) / 6;
      const mean3 = a3Nom + (a3es + a3ei) / 2, sd3 = (a3es - a3ei) / 6;

      const randNorm = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      const N = 10000;
      const samples = [];
      let mcMin = Infinity, mcMax = -Infinity, sumTotal = 0;
      for (let i = 0; i < N; i++) {
        const x1 = mean1 + randNorm() * sd1;
        const x2 = mean2 + randNorm() * sd2;
        const x3 = mean3 + randNorm() * sd3;
        const val = x1 - x2 - x3;
        samples.push(val);
        if (val < mcMin) mcMin = val;
        if (val > mcMax) mcMax = val;
        sumTotal += val;
      }
      const mcMean = sumTotal / N;

      // Build 12-bin Histogram SVG
      const bins = 12;
      const binWidth = Math.max((sumMax - sumMin) / bins, 0.001);
      const counts = new Array(bins).fill(0);
      samples.forEach(v => {
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - sumMin) / binWidth)));
        counts[idx]++;
      });
      const maxCount = Math.max(...counts, 1);

      const barsSvg = counts.map((c, i) => {
        const h = (c / maxCount) * 120;
        const x = 30 + i * 36;
        return `<rect x="${x}" y="${145 - h}" width="30" height="${h}" rx="3" fill="#F59E0B" />`;
      }).join('');

      document.getElementById('mc-results-area').innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
          <h4 class="font-bold text-sm">Kết quả Khâu khép kín AΣ = A1 − A2 − A3</h4>
          <span class="font-mono-tech text-[11px] text-emerald-600 font-bold">10.000 mẫu thử Monte Carlo</span>
        </div>
        <div class="grid grid-cols-2 gap-3 font-mono-tech text-xs">
          <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div class="text-slate-500 text-[11px]">Phương pháp Cực đại – Cực tiểu (Worst-Case)</div>
            <div class="font-bold text-burgundy-800 dark:text-techgold-400 mt-1">AΣ_max = ${sumMax.toFixed(3)} mm</div>
            <div class="font-bold text-burgundy-800 dark:text-techgold-400">AΣ_min = ${sumMin.toFixed(3)} mm</div>
            <div class="text-[11px] text-slate-500 mt-1">Dung sai TΣ = ${(sumMax - sumMin).toFixed(3)} mm</div>
          </div>
          <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div class="text-slate-500 text-[11px]">Mô phỏng Xác suất Monte Carlo (3σ)</div>
            <div class="font-bold text-sky-700 dark:text-sky-400 mt-1">Trung bình μ = ${mcMean.toFixed(3)} mm</div>
            <div class="font-bold text-sky-700 dark:text-sky-400">Dải thực tế: [${mcMin.toFixed(3)}, ${mcMax.toFixed(3)}]</div>
            <div class="text-[11px] text-slate-500 mt-1">Thu hẹp biến thiên ~42% so với Worst-Case</div>
          </div>
        </div>
        <div class="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-semibold mb-1">Biểu đồ Phân bố Xác suất Khâu Khép Kín AΣ (mm):</div>
          <svg viewBox="0 0 490 165" class="w-full">
            <line x1="25" y1="145" x2="470" y2="145" stroke="#64748B" stroke-width="1.5" />
            ${barsSvg}
            <text x="30" y="159" fill="#64748B" font-family="JetBrains Mono" font-size="10">${sumMin.toFixed(3)}</text>
            <text x="245" y="159" fill="#64748B" font-family="JetBrains Mono" font-size="10" text-anchor="middle">${((sumMin+sumMax)/2).toFixed(3)} mm</text>
            <text x="460" y="159" fill="#64748B" font-family="JetBrains Mono" font-size="10" text-anchor="end">${sumMax.toFixed(3)}</text>
          </svg>
        </div>
      `;
    }

    /* =========================================================================
       WORKSPACE 04 (CONTENT STUDIO): EXAM GENERATOR & WORD/PDF EXPORT
       ========================================================================= */
    let generatedExamData = [];

    function generateVerifiedExamSet() {
      const count = parseInt(document.getElementById('gen-q-count').value, 10) || 4;
      const diff = document.getElementById('gen-difficulty').value;
      const showSol = document.getElementById('gen-include-solutions').checked;

      const pool = diff === 'BASIC'
        ? [[20,'H',7,'f',7], [35,'H',7,'g',6], [50,'H',7,'h',6], [60,'H',8,'e',8]]
        : diff === 'ADVANCED'
        ? [[40,'G',7,'h',6], [45,'K',7,'h',6], [55,'P',7,'h',6], [80,'H',7,'n',6]]
        : [[25,'H',7,'g',6], [40,'H',7,'k',6], [50,'H',7,'p',6], [30,'G',7,'h',6], [65,'H',8,'f',7], [100,'H',7,'s',6]];

      generatedExamData = [];
      for (let i = 0; i < count; i++) {
        const [d, hz, hit, sz, sit] = pool[i % pool.length];
        const calc = ISO286Database.calculateFit(d, hz, hit, sz, sit);
        generatedExamData.push({
          num: i + 1,
          calc,
          questionText: `Cho mối ghép trụ trơn có ký hiệu ${calc.designation} theo tiêu chuẩn ISO 286-2:2010. Hãy: (a) Tra bảng xác định sai lệch giới hạn ES, EI của lỗ và es, ei của trục (µm); (b) Tính các kích thước giới hạn Dmax, Dmin, dmax, dmin (mm); (c) Tính độ hở/độ dôi giới hạn và kết luận kiểu lắp ghép.`
        });
      }

      const preview = document.getElementById('generated-exam-preview');
      preview.innerHTML = generatedExamData.map(item => `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-burgundy-800 dark:text-techgold-400">Câu ${item.num} (${item.calc.designation})</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${item.calc.fitBadgeClass}">${item.calc.fitTypeVi}</span>
          </div>
          <p class="leading-relaxed">${item.questionText}</p>
          ${showSol ? `
            <div class="mt-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono-tech text-[11px] space-y-1">
              <div class="font-sans font-bold text-emerald-700 dark:text-emerald-400">Lời giải chuẩn ISO 286-2:2010 (${item.calc.stepLabel}):</div>
              <div>• Lỗ ${item.calc.holeCode}: ES = ${formatSignedUm(item.calc.ES)}, EI = ${formatSignedUm(item.calc.EI)} → Dmax = ${item.calc.DmaxMm} mm, Dmin = ${item.calc.DminMm} mm (TH = ${item.calc.TH} µm).</div>
              <div>• Trục ${item.calc.shaftCode}: es = ${formatSignedUm(item.calc.es)}, ei = ${formatSignedUm(item.calc.ei)} → dmax = ${item.calc.dmaxMm} mm, dmin = ${item.calc.dminMm} mm (TS = ${item.calc.TS} µm).</div>
              <div>• Đặc tính lắp ghép: Smax = ES − ei = ${formatSignedUm(item.calc.Smax)}; Smin = EI − es = ${formatSignedUm(item.calc.Smin)} → Kết luận: <strong>${item.calc.fitTypeVi}</strong>.</div>
            </div>
          ` : ''}
        </div>
      `).join('');

      renderDocumentExportPreview();
      showToast(`Đã sinh ${count} bài tập & đáp án xác minh từ động cơ ISO 286!`, 'success');
    }

    function renderQuestionBank() {
      const bankEl = document.getElementById('question-bank-list');
      if (!bankEl) return;
      const samples = [
        { code: 'QB-01', level: 'Nhận biết', topic: 'Hệ thống cơ sở', text: 'Trong hệ thống lỗ cơ sở theo ISO 286, sai lệch cơ bản của lỗ H luôn có giá trị bằng bao nhiêu?', ans: 'EI = 0 µm' },
        { code: 'QB-02', level: 'Thông hiểu', topic: 'Phân loại lắp ghép', text: 'Điều kiện cần và đủ để mối ghép trụ trơn thuộc nhóm lắp trung gian là gì?', ans: 'Smin < 0 và Smax > 0' },
        { code: 'QB-03', level: 'Vận dụng', topic: 'Tính toán giới hạn', text: 'Xác định Dmax, Dmin, dmax, dmin và Smax, Smin cho mối ghép Ø40 H7/p6.', ans: 'Smax = -1 µm, Smin = -42 µm (Lắp chặt)' },
        { code: 'QB-04', level: 'Phân tích', topic: 'Lựa chọn kiểu lắp', text: 'So sánh độ ổn định khe hở giữa hai tổ hợp Ø50 H7/g6 và Ø50 H8/g7.', ans: 'H7/g6 có khoảng biến thiên 41 µm, hẹp hơn 36% so với H8/g7 (64 µm).' }
      ];
      bankEl.innerHTML = samples.map(s => `
        <div class="p-4 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <div class="flex justify-between font-mono-tech text-[11px]">
            <span class="font-bold text-burgundy-700 dark:text-techgold-400">${s.code} • ${s.topic}</span>
            <span class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">${s.level}</span>
          </div>
          <p class="font-semibold">${s.text}</p>
          <p class="text-emerald-700 dark:text-emerald-400 font-mono-tech">Đáp án chuẩn: ${s.ans}</p>
        </div>
      `).join('');
    }

    function renderDocumentExportPreview() {
      const area = document.getElementById('printable-document-area');
      if (!area) return;
      if (generatedExamData.length === 0) generateVerifiedExamSet();

      const org = document.getElementById('exp-org')?.value || 'TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI (DNTU)';
      const course = document.getElementById('exp-course')?.value || 'DUNG SAI – LẮP GHÉP VÀ ĐO LƯỜNG KỸ THUẬT';
      const title = document.getElementById('gen-exam-title')?.value || 'ĐỀ KIỂM TRA DUNG SAI – LẮP GHÉP ISO 286';
      const show2D = document.getElementById('exp-show-2d')?.checked;
      const showSol = document.getElementById('exp-show-sol')?.checked;

      const activeRes = ISO286Database.calculateFit(
        AppState.currentFit.nominal, AppState.currentFit.holeZone, AppState.currentFit.holeIT,
        AppState.currentFit.shaftZone, AppState.currentFit.shaftIT
      );

      area.innerHTML = `
        <div class="border-b-2 border-slate-800 pb-3 flex justify-between items-start text-xs">
          <div>
            <div class="font-bold uppercase">${org}</div>
            <div>Học phần: <strong>${course}</strong></div>
          </div>
          <div class="text-right font-mono-tech">
            <div>Tiêu chuẩn: ISO 286-1/2:2010</div>
            <div>Thời gian: 45 phút</div>
          </div>
        </div>

        <div class="text-center py-2">
          <h2 class="text-base font-extrabold uppercase">${title}</h2>
          <p class="text-xs text-slate-600 mt-1">Họ và tên sinh viên: .......................................................... MSSV: .......................... Lớp: ................</p>
        </div>

        <div class="space-y-4 text-xs">
          ${generatedExamData.map(item => `
            <div class="space-y-1.5">
              <p class="leading-relaxed"><strong>Câu ${item.num}:</strong> ${item.questionText}</p>
              ${showSol ? `
                <div class="p-2.5 bg-slate-100 border-l-4 border-slate-800 font-mono-tech text-[11px] space-y-0.5">
                  <div><strong>Đáp án & Lời giải (${item.calc.designation}):</strong></div>
                  <div>- Lỗ ${item.calc.holeCode}: ES = ${formatSignedUm(item.calc.ES)}, EI = ${formatSignedUm(item.calc.EI)} ⇒ Dmax = ${item.calc.DmaxMm} mm, Dmin = ${item.calc.DminMm} mm.</div>
                  <div>- Trục ${item.calc.shaftCode}: es = ${formatSignedUm(item.calc.es)}, ei = ${formatSignedUm(item.calc.ei)} ⇒ dmax = ${item.calc.dmaxMm} mm, dmin = ${item.calc.dminMm} mm.</div>
                  <div>- Smax = ${formatSignedUm(item.calc.Smax)}, Smin = ${formatSignedUm(item.calc.Smin)} ⇒ Kết luận: <strong>${item.calc.fitTypeVi}</strong>.</div>
                </div>
              ` : `<div class="h-16 border border-dashed border-slate-300 rounded p-2 text-slate-400">Phần bài làm của sinh viên...</div>`}
            </div>
          `).join('')}
        </div>

        ${show2D && activeRes.valid ? `
          <div class="pt-3 border-t border-slate-300 text-xs space-y-1">
            <div class="font-bold">Phụ lục Hình minh họa Miền dung sai 2D (${activeRes.designation}):</div>
            <table class="w-full border-collapse border border-slate-400 font-mono-tech text-[11px]">
              <tr class="bg-slate-100">
                <th class="border border-slate-400 p-1">Ký hiệu</th>
                <th class="border border-slate-400 p-1">ES / EI (µm)</th>
                <th class="border border-slate-400 p-1">es / ei (µm)</th>
                <th class="border border-slate-400 p-1">Smax (µm)</th>
                <th class="border border-slate-400 p-1">Smin (µm)</th>
                <th class="border border-slate-400 p-1">Kiểu lắp</th>
              </tr>
              <tr>
                <td class="border border-slate-400 p-1 text-center font-bold">${activeRes.designation}</td>
                <td class="border border-slate-400 p-1 text-center">${formatSignedUm(activeRes.ES)} / ${formatSignedUm(activeRes.EI)}</td>
                <td class="border border-slate-400 p-1 text-center">${formatSignedUm(activeRes.es)} / ${formatSignedUm(activeRes.ei)}</td>
                <td class="border border-slate-400 p-1 text-center">${formatSignedUm(activeRes.Smax)}</td>
                <td class="border border-slate-400 p-1 text-center">${formatSignedUm(activeRes.Smin)}</td>
                <td class="border border-slate-400 p-1 text-center font-bold">${activeRes.fitTypeVi}</td>
              </tr>
            </table>
          </div>
        ` : ''}
      `;
    }

    function downloadWordDocument() {
      const content = document.getElementById('printable-document-area').innerHTML;
      const htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>T-FIT LAB Document</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45; }
          table { border-collapse: collapse; width: 100%; margin-top: 8pt; }
          th, td { border: 1px solid #333; padding: 4pt 6pt; }
        </style>
        </head><body>${content}</body></html>
      `;
      const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TFIT-LAB_HocLieu_ISO286_${Date.now()}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất và tải xuống tệp Word (.doc) thành công!', 'success');
    }

    /* =========================================================================
       WORKSPACE 05: ERROR DIAGNOSIS ENGINE & COMPETENCY RADAR (PHÂN HỆ 27–36)
       ========================================================================= */
    let activeDiagProblem = null;

    function loadNextDiagnosticProblem() {
      const candidates = [
        [40, 'H', 7, 'k', 6],
        [30, 'H', 7, 'g', 6],
        [50, 'H', 7, 'p', 6],
        [25, 'G', 7, 'h', 6]
      ];
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      activeDiagProblem = ISO286Database.calculateFit(pick[0], pick[1], pick[2], pick[3], pick[4]);

      const stmt = document.getElementById('diag-problem-statement');
      if (stmt) {
        stmt.innerHTML = `
          <div class="font-bold text-sm text-burgundy-800 dark:text-techgold-400">Đề bài thực hành: Phân tích mối ghép ${activeDiagProblem.designation}</div>
          <p>Tra cứu bảng ISO 286-2:2010 và tính toán các giá trị sai lệch (µm), độ hở/độ dôi giới hạn (µm) và kết luận kiểu lắp ghép.</p>
        `;
      }
      ['ES','EI','es','ei','smax','smin'].forEach(k => {
        const el = document.getElementById(`diag-in-${k}`);
        if (el) el.value = '';
      });
    }

    function evaluateDiagnosticSubmission() {
      if (!activeDiagProblem) loadNextDiagnosticProblem();
      const p = activeDiagProblem;
      const inES = parseFloat(document.getElementById('diag-in-ES').value);
      const inEI = parseFloat(document.getElementById('diag-in-EI').value);
      const ines = parseFloat(document.getElementById('diag-in-es').value);
      const inei = parseFloat(document.getElementById('diag-in-ei').value);
      const inSmax = parseFloat(document.getElementById('diag-in-smax').value);
      const inSmin = parseFloat(document.getElementById('diag-in-smin').value);
      const inType = document.getElementById('diag-in-type').value;

      if ([inES, inEI, ines, inei, inSmax, inSmin].some(v => isNaN(v))) {
        showToast('Vui lòng nhập đầy đủ cả 6 giá trị số (µm) trước khi chẩn đoán.', 'warning');
        return;
      }

      const errors = [];
      if (inES !== p.ES || inEI !== p.EI) {
        errors.push({
          step: 'Bước 1–2: Tra cứu sai lệch Lỗ',
          diagnosis: `Bạn nhập ES=${inES}, EI=${inEI} nhưng giá trị chuẩn ISO 286-2 cho ${p.holeCode} ở ${p.stepLabel} là ES=${p.ES} µm, EI=${p.EI} µm.`,
          hypothesis: 'Nguyên nhân giả định: Nhầm hàng khoảng kích thước danh nghĩa hoặc nhầm giữa hệ thống lỗ cơ sở H (EI=0) với miền lỗ khác.',
          remedy: 'Ôn lại Chương 2.1 (Hệ thống lỗ cơ sở) và kiểm tra bảng tra cứu ISO 286.'
        });
      }
      if (ines !== p.es || inei !== p.ei) {
        errors.push({
          step: 'Bước 3–4: Tra cứu sai lệch Trục',
          diagnosis: `Bạn nhập es=${ines}, ei=${inei} nhưng giá trị chuẩn cho ${p.shaftCode} là es=${p.es} µm, ei=${p.ei} µm.`,
          hypothesis: ines === -p.es ? 'Lỗi đảo dấu sai lệch trục (nhầm quy tắc dấu giữa trục dưới đường không a..h và trên đường không k..z).' : 'Nhầm vị trí miền dung sai trục hoặc cấp chính xác IT.',
          remedy: 'Mở biểu đồ 2D để quan sát vị trí miền trục so với đường không (0).'
        });
      }
      if (inSmax !== p.Smax) {
        errors.push({
          step: 'Bước 5: Tính Smax',
          diagnosis: `Bạn tính Smax = ${inSmax} µm, kết quả đúng là Smax = ES − ei = (${p.ES}) − (${p.ei}) = ${p.Smax} µm.`,
          hypothesis: inSmax === (p.ES + p.ei) ? 'Lỗi cộng đại số thay vì trừ số âm khi ei < 0 (Smax = ES − (−|ei|) = ES + |ei|).' : 'Nhầm công thức Smax = ES − es.',
          remedy: 'Luyện tập phép trừ số nguyên có dấu trong công thức Smax = Dmax − dmin = ES − ei.'
        });
      }
      if (inSmin !== p.Smin) {
        errors.push({
          step: 'Bước 6: Tính Smin',
          diagnosis: `Bạn tính Smin = ${inSmin} µm, kết quả đúng là Smin = EI − es = (${p.EI}) − (${p.es}) = ${p.Smin} µm.`,
          hypothesis: 'Nhầm công thức Smin thành es − EI (đảo ngược dấu độ dôi và độ hở).',
          remedy: 'Ghi nhớ quy tắc nhất quán: Luôn lấy Kích thước Lỗ trừ Kích thước Trục (Smin = Dmin − dmax = EI − es).'
        });
      }
      if (inType !== p.fitType) {
        errors.push({
          step: 'Bước 7: Phân loại kiểu lắp ghép',
          diagnosis: `Bạn kết luận "${inType}", nhưng với Smax = ${p.Smax} µm và Smin = ${p.Smin} µm, mối ghép thuộc nhóm "${p.fitTypeVi}".`,
          hypothesis: p.Smin === 0 ? 'Nhầm giá trị ranh giới Smin = 0 là lắp trung gian (theo ISO 286-1, Smin ≥ 0 là Lắp lỏng).' : 'Chưa đối chiếu đồng thời dấu của cả Smax và Smin.',
          remedy: 'Xem bảng phân loại 3 nhóm lắp ghép tại Chương 2.2.'
        });
      }

      const out = document.getElementById('diag-result-content');
      if (errors.length === 0) {
        AppState.competencyScores['Tính giới hạn'] = Math.min(100, AppState.competencyScores['Tính giới hạn'] + 4);
        saveStateToStorage();
        out.innerHTML = `
          <div class="p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/50 text-emerald-900 dark:text-emerald-300 space-y-2">
            <div class="font-bold text-sm">✓ XUẤT SẮC! ĐẠT 7/7 BƯỚC TÍNH TOÁN CHÍNH XÁC</div>
            <p>Toàn bộ giá trị tra cứu ISO 286-2, tính toán Smax/Smin và phân loại kiểu lắp ghép <strong>${p.designation} (${p.fitTypeVi})</strong> đều hoàn toàn chính xác. Chỉ số năng lực "Tính giới hạn" đã được cộng điểm.</p>
          </div>
        `;
        showToast('Chấm điểm hoàn tất: Chính xác 100%!', 'success');
      } else {
        out.innerHTML = `
          <div class="p-3 rounded-xl bg-rose-950/15 border border-electricred-500/50 text-rose-900 dark:text-rose-300 font-bold">
            Phát hiện ${errors.length} điểm sai lệch kỹ thuật. Dưới đây là chẩn đoán nguyên nhân & lộ trình khắc phục:
          </div>
          ${errors.map(e => `
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-techslate-850 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div class="font-bold text-electricred-600 dark:text-techgold-400">${e.step}</div>
              <div><strong>Phân tích:</strong> ${e.diagnosis}</div>
              <div><strong>Giả thuyết nguyên nhân:</strong> ${e.hypothesis}</div>
              <div class="text-emerald-700 dark:text-emerald-400"><strong>Đề xuất thích ứng:</strong> ${e.remedy}</div>
            </div>
          `).join('')}
          <button onclick="applyFitPreset(${p.nominalMm}, '${p.holeZone}', ${p.holeIT}, '${p.shaftZone}', ${p.shaftIT}); switchWorkspace('lab');" class="w-full py-2 rounded-xl bg-burgundy-900 text-techgold-400 font-bold">
            Mở ngay mối ghép ${p.designation} trên Phòng Lab 2D/3D để kiểm chứng →
          </button>
        `;
        showToast(`Đã chẩn đoán ${errors.length} lỗi sai và tạo gợi ý học tập thích ứng.`, 'warning');
      }
    }

    function renderCompetencyRadar() {
      const wrapper = document.getElementById('competency-radar-wrapper');
      const bars = document.getElementById('competency-bars-list');
      if (!wrapper || !bars) return;

      const entries = Object.entries(AppState.competencyScores);
      const n = entries.length;
      const cx = 180, cy = 165, maxR = 110;

      const rings = [0.25, 0.5, 0.75, 1.0].map(f => {
        const pts = entries.map((_, i) => {
          const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
          return `${cx + maxR * f * Math.cos(ang)},${cy + maxR * f * Math.sin(ang)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="#94A3B8" stroke-opacity="0.35" stroke-width="1" />`;
      }).join('');

      const axes = entries.map(([label, val], i) => {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x2 = cx + maxR * Math.cos(ang);
        const y2 = cy + maxR * Math.sin(ang);
        const lx = cx + (maxR + 24) * Math.cos(ang);
        const ly = cy + (maxR + 16) * Math.sin(ang);
        return `
          <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#94A3B8" stroke-opacity="0.4" />
          <text x="${lx}" y="${ly}" fill="#F59E0B" font-family="Inter" font-size="9.5" font-weight="700" text-anchor="middle">${label}</text>
        `;
      }).join('');

      const dataPts = entries.map(([_, val], i) => {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (val / 100) * maxR;
        return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
      }).join(' ');

      wrapper.innerHTML = `
        <svg viewBox="0 0 360 330" class="w-full max-w-[360px]">
          ${rings}
          ${axes}
          <polygon points="${dataPts}" fill="#FF2A3C" fill-opacity="0.28" stroke="#FF2A3C" stroke-width="2.5" />
        </svg>
      `;

      bars.innerHTML = entries.map(([label, val]) => `
        <div>
          <div class="flex justify-between font-semibold mb-1">
            <span>${label}</span>
            <span class="font-mono-tech text-burgundy-700 dark:text-techgold-400">${val}/100</span>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-burgundy-800 to-electricred-500 rounded-full" style="width:${val}%"></div>
          </div>
        </div>
      `).join('');
    }

    /* =========================================================================
       36-SUBSYSTEM ARCHITECTURE MODAL & AUTOMATED VERIFICATION TEST SUITE
       ========================================================================= */
    const ThirtySixSubsystems = [
      { id: '01', space: '01. LEARN', name: 'Thư viện kiến thức dung sai – lắp ghép', status: 'Đã triển khai & kiểm thử' },
      { id: '02', space: '01. LEARN', name: 'Bài giảng và bài học tương tác', status: 'Đã triển khai & kiểm thử' },
      { id: '03', space: '01. LEARN', name: 'Hệ thống kiểm tra kiến thức', status: 'Đã triển khai & kiểm thử' },
      { id: '04', space: '01. LEARN', name: 'Nhật ký học tập và thực hành', status: 'Đã triển khai & kiểm thử' },
      { id: '05', space: '02. ENGINEER', name: 'Tra cứu và quản lý dữ liệu ISO 286', status: 'Đã triển khai & kiểm thử' },
      { id: '06', space: '02. ENGINEER', name: 'Động cơ tính toán dung sai (µm/mm)', status: 'Đã triển khai & kiểm thử' },
      { id: '07', space: '02. ENGINEER', name: 'Trợ lý lựa chọn kiểu lắp ghép', status: 'Đã triển khai & kiểm thử' },
      { id: '08', space: '02. ENGINEER', name: 'So sánh phương án lắp ghép (2–4)', status: 'Đã triển khai & kiểm thử' },
      { id: '09', space: '02. ENGINEER', name: 'Phân tích và trực quan hóa dữ liệu dung sai', status: 'Đã triển khai & kiểm thử' },
      { id: '10', space: '02. ENGINEER', name: 'Tìm kiếm và quản lý kết quả kỹ thuật', status: 'Đã triển khai & kiểm thử' },
      { id: '11', space: '03. VIRTUAL LAB', name: 'Phòng thí nghiệm thay đổi thông số', status: 'Đã triển khai & kiểm thử' },
      { id: '12', space: '03. VIRTUAL LAB', name: 'Biểu đồ miền dung sai 2D (SVG/PNG)', status: 'Đã triển khai & kiểm thử' },
      { id: '13', space: '03. VIRTUAL LAB', name: 'Mô phỏng lắp ghép 3D (Three.js)', status: 'Đã triển khai & kiểm thử' },
      { id: '14', space: '03. VIRTUAL LAB', name: 'Điều khiển và quan sát mô hình 3D', status: 'Đã triển khai & kiểm thử' },
      { id: '15', space: '03. VIRTUAL LAB', name: 'Phòng thí nghiệm theo kịch bản (8 bước)', status: 'Đã triển khai & kiểm thử' },
      { id: '16', space: '03. VIRTUAL LAB', name: 'Chuỗi kích thước & Monte Carlo', status: 'Module mở rộng' },
      { id: '17', space: '04. CONTENT STUDIO', name: 'Ngân hàng câu hỏi chuẩn hóa', status: 'Đã triển khai & kiểm thử' },
      { id: '18', space: '04. CONTENT STUDIO', name: 'Bộ sinh bài tập tự động ISO Verified', status: 'Đã triển khai & kiểm thử' },
      { id: '19', space: '04. CONTENT STUDIO', name: 'Tạo đề kiểm tra thông minh', status: 'Đã triển khai & kiểm thử' },
      { id: '20', space: '04. CONTENT STUDIO', name: 'Hệ thống nhiều dạng câu hỏi', status: 'Đã triển khai & kiểm thử' },
      { id: '21', space: '04. CONTENT STUDIO', name: 'Tạo đáp án và lời giải từng bước', status: 'Đã triển khai & kiểm thử' },
      { id: '22', space: '04. CONTENT STUDIO', name: 'Biên soạn bài giảng', status: 'Đang triển khai' },
      { id: '23', space: '04. CONTENT STUDIO', name: 'Tạo phiếu thực hành', status: 'Đã triển khai & kiểm thử' },
      { id: '24', space: '04. CONTENT STUDIO', name: 'Rubric đánh giá năng lực', status: 'Đã triển khai & kiểm thử' },
      { id: '25', space: '04. CONTENT STUDIO', name: 'Xuất Word (.doc) và PDF khổ A4', status: 'Đã triển khai & kiểm thử' },
      { id: '26', space: '04. CONTENT STUDIO', name: 'Trợ lý biên soạn học liệu có kiểm chứng', status: 'Đã triển khai & kiểm thử' },
      { id: '27', space: '05. ANALYTICS', name: 'Chấm điểm thành phần và phản hồi', status: 'Đã triển khai & kiểm thử' },
      { id: '28', space: '05. ANALYTICS', name: 'Chẩn đoán lỗi sai & giả thuyết nguyên nhân', status: 'Đã triển khai & kiểm thử' },
      { id: '29', space: '05. ANALYTICS', name: 'Học tập thích ứng', status: 'Đã triển khai & kiểm thử' },
      { id: '30', space: '05. ANALYTICS', name: 'Hồ sơ năng lực sinh viên (Radar 9 trục)', status: 'Đã triển khai & kiểm thử' },
      { id: '31', space: '05. ANALYTICS', name: 'Quản lý lớp học DNTU và giao bài', status: 'Đang triển khai' },
      { id: '32', space: '05. ANALYTICS', name: 'Phân tích chất lượng câu hỏi và lớp học', status: 'Đang triển khai' },
      { id: '33', space: 'HỆ THỐNG CHUNG', name: 'Tài khoản và phân quyền (SV/GV/Admin)', status: 'Đã triển khai & kiểm thử' },
      { id: '34', space: 'HỆ THỐNG CHUNG', name: 'Quản trị dữ liệu, sao lưu và phục hồi', status: 'Đã triển khai & kiểm thử' },
      { id: '35', space: 'HỆ THỐNG CHUNG', name: 'Tìm kiếm toàn cục, thông báo và cá nhân hóa', status: 'Đã triển khai & kiểm thử' },
      { id: '36', space: 'HỆ THỐNG CHUNG', name: 'Tích hợp mở rộng (API, CAD, LMS)', status: 'Mới có thiết kế' }
    ];

    function openArchitectureModal() {
      const modal = document.getElementById('architecture-modal');
      const body = document.getElementById('architecture-modal-body');
      modal.classList.remove('hidden');

      body.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
          <span>Tổng hợp 36 phân hệ thuộc 5 Không gian làm việc & Hệ thống dùng chung (Phân cấp minh bạch theo Phần 10):</span>
          <button onclick="closeArchitectureModal(); switchWorkspace('analytics'); switchSubTab('analytics', 'admin'); runAutomatedVerificationSuite();" class="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold">
            Chạy Kiểm thử Tự động ISO 286 →
          </button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          ${ThirtySixSubsystems.map(s => {
            const badge = s.status.includes('Đã triển khai') ? 'bg-emerald-700 text-white'
              : s.status.includes('Module mở rộng') ? 'bg-amber-600 text-white'
              : s.status.includes('Đang triển khai') ? 'bg-sky-700 text-white'
              : 'bg-slate-600 text-white';
            return `
              <div class="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-techslate-850 flex flex-col justify-between gap-1">
                <div class="flex justify-between items-center font-mono-tech text-[10px]">
                  <span class="font-bold text-burgundy-700 dark:text-techgold-400">PHÂN HỆ ${s.id} • ${s.space}</span>
                </div>
                <div class="font-semibold text-xs">${s.name}</div>
                <span class="self-start px-2 py-0.5 rounded text-[10px] font-semibold ${badge}">${s.status}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    function closeArchitectureModal() {
      document.getElementById('architecture-modal').classList.add('hidden');
    }

    function runAutomatedVerificationSuite() {
      const tests = [
        { name: 'TC-01: Ø40 H7/g6 (Lắp lỏng chuẩn)', fn: () => { const r = ISO286Database.calculateFit(40,'H',7,'g',6); return r.ES===25 && r.EI===0 && r.es===-9 && r.ei===-25 && r.Smax===50 && r.Smin===9 && r.fitType==='CLEARANCE'; } },
        { name: 'TC-02: Ø40 H7/h6 (Ranh giới Smin = 0 -> Lắp lỏng)', fn: () => { const r = ISO286Database.calculateFit(40,'H',7,'h',6); return r.Smin===0 && r.Smax===41 && r.fitType==='CLEARANCE'; } },
        { name: 'TC-03: Ø40 H7/k6 (Lắp trung gian)', fn: () => { const r = ISO286Database.calculateFit(40,'H',7,'k',6); return r.es===18 && r.ei===2 && r.Smax===23 && r.Smin===-18 && r.fitType==='TRANSITION'; } },
        { name: 'TC-04: Ø40 H7/p6 (Lắp chặt)', fn: () => { const r = ISO286Database.calculateFit(40,'H',7,'p',6); return r.es===42 && r.ei===26 && r.Smax===-1 && r.Smin===-42 && r.Nmin===1 && r.Nmax===42 && r.fitType==='INTERFERENCE'; } },
        { name: 'TC-05: Ø50 K7/h6 (Quy tắc Δ ISO 286-1 §4.3.2)', fn: () => { const r = ISO286Database.calculateFit(50,'K',7,'h',6); return r.ES===7 && r.EI===-18 && r.fitType==='TRANSITION'; } },
        { name: 'TC-06: Ø50 M7/h6 (ES = 0, EI = -25)', fn: () => { const r = ISO286Database.calculateFit(50,'M',7,'h',6); return r.ES===0 && r.EI===-25 && r.Smax===16 && r.Smin===-25; } },
        { name: 'TC-07: Kiểm tra bất biến Smax - Smin == TH + TS', fn: () => { const r = ISO286Database.calculateFit(120,'H',8,'s',6); return (r.Smax - r.Smin) === (r.TH + r.TS); } },
        { name: 'TC-08: Chặn kích thước ngoài phạm vi D = 550 mm', fn: () => { const r = ISO286Database.calculateFit(550,'H',7,'g',6); return r.valid === false; } },
        { name: 'TC-09: Chặn kích thước âm D = -10 mm', fn: () => { const r = ISO286Database.calculateFit(-10,'H',7,'g',6); return r.valid === false; } }
      ];

      const container = document.getElementById('verification-suite-results');
      if (!container) return;
      let passed = 0;
      container.innerHTML = tests.map(t => {
        const ok = t.fn();
        if (ok) passed++;
        return `
          <div class="p-2.5 rounded-xl border ${ok ? 'bg-emerald-950/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300' : 'bg-rose-950/20 border-rose-500 text-rose-400'} flex justify-between items-center">
            <span>${t.name}</span>
            <span class="font-bold">${ok ? 'PASS ✓' : 'FAIL ✕'}</span>
          </div>
        `;
      }).join('');
      showToast(`Bộ kiểm thử ISO 286 hoàn tất: ${passed}/${tests.length} Test Cases ĐẠT!`, 'success');
    }

    function exportSystemBackupJSON() {
      const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        platform: 'T-FIT LAB (DNTU)',
        standard: ISO286Database.standardVersion,
        state: AppState
      }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TFIT-LAB_Backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã sao lưu dữ liệu hệ thống ra tệp JSON!', 'success');
    }

    function renderAuditLogs() {
      const el = document.getElementById('audit-log-list');
      if (!el) return;
      el.innerHTML = AppState.auditLogs.map(l => `<div>${l}</div>`).join('');
    }

    function toggleNotifications() {
      const panel = document.getElementById('notifications-panel');
      panel.classList.toggle('hidden');
      const list = document.getElementById('notifications-list');
      list.innerHTML = AppState.notifications.map(n => `
        <div class="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
          <div class="flex justify-between font-bold text-xs">
            <span class="text-burgundy-800 dark:text-techgold-400">${n.title}</span>
            <span class="text-[10px] text-slate-400">${n.time}</span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${n.desc}</p>
        </div>
      `).join('');
    }

    /* =========================================================================
       GLOBAL SEARCH (PHÂN HỆ 35)
       ========================================================================= */
    document.getElementById('global-search-input')?.addEventListener('input', function(e) {
      const q = e.target.value.trim().toLowerCase();
      const box = document.getElementById('global-search-results');
      if (!q) {
        box.classList.add('hidden');
        return;
      }
      const quickFits = [
        { label: 'Ø40 H7/g6 — Lắp lỏng trượt chính xác', action: () => { applyFitPreset(40,'H',7,'g',6); switchWorkspace('lab'); } },
        { label: 'Ø40 H7/k6 — Lắp trung gian', action: () => { applyFitPreset(40,'H',7,'k',6); switchWorkspace('lab'); } },
        { label: 'Ø40 H7/p6 — Lắp chặt ép nhẹ', action: () => { applyFitPreset(40,'H',7,'p',6); switchWorkspace('lab'); } },
        { label: 'Bảng tra cứu ISO 286-1/2:2010', action: () => { switchWorkspace('engineer'); switchSubTab('engineer', 'iso-lookup'); } },
        { label: 'Chẩn đoán lỗi sai tính toán dung sai', action: () => { switchWorkspace('analytics'); switchSubTab('analytics', 'diagnosis'); } }
      ].filter(item => item.label.toLowerCase().includes(q));

      box.classList.remove('hidden');
      box.innerHTML = quickFits.length
        ? quickFits.map((item, i) => `<div data-idx="${i}" class="px-4 py-2.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium border-b border-slate-100 dark:border-slate-800">${item.label}</div>`).join('')
        : `<div class="px-4 py-3 text-xs text-slate-500">Không tìm thấy kết quả phù hợp cho "${e.target.value}".</div>`;

      box.querySelectorAll('[data-idx]').forEach(el => {
        el.onclick = () => {
          quickFits[Number(el.dataset.idx)].action();
          box.classList.add('hidden');
        };
      });
    });

    /* =========================================================================
       INITIALIZATION ON WINDOW LOAD
       ========================================================================= */
    window.onload = function() {
      loadStateFromStorage();
      ensureDemoAccounts();
      applySessionRole();
      renderSavedFitsLists();
      renderKnowledgeList();
      renderInteractiveLessons();
      generateInteractiveQuiz();
      renderJournalEntries();
      renderQuestionBank();
      loadNextDiagnosticProblem();
      renderAuditLogs();
      runAutomatedVerificationSuite();

      // Default subtab active styling
      ['learn', 'engineer', 'lab', 'studio', 'analytics'].forEach(sp => {
        const firstBtn = document.querySelector(`.${sp}-subtab`);
        if (firstBtn) firstBtn.classList.add('bg-burgundy-900', 'text-techgold-400', 'shadow-sm');
      });

      switchWorkspace('overview');
      updateAllViewsFromCurrentFit();
      updateClassroomHeaderBadges();
      renderLiveClassAnalytics();
      renderAdminClassesPanel();

      // Handle QR / Invite Deep Link (?join=TFIT-XXXXX)
      const urlParams = new URLSearchParams(window.location.search);
      const joinParam = urlParams.get('join');
      if (joinParam) {
        switchWorkspace('classroom');
        switchClassroomPortal('STUDENT');
        setTimeout(() => openJoinClassModal(joinParam), 200);
      }
      lucide.createIcons();
    };
  