/* =========================================================================
   T-FIT LAB — Điều khiển màn hình mở đầu & cổng đăng nhập (Login Gate)
   - gateGoto('landing' | 'login')      : chuyển giữa 2 màn hình
   - gateShowPanel('login' | 'register'): đổi nội dung card bên phải
   - Cảnh 3D (Three.js) cho 2 màn hình, chỉ vẽ khi đang hiển thị
   Logic đăng nhập/đăng ký thật nằm ở auth-extra.js (không đổi).
   ========================================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  /* ---------- Chuyển màn hình ---------- */
  window.gateGoto = function (screen) {
    $('gate-screen-landing').classList.toggle('is-off', screen !== 'landing');
    $('gate-screen-login').classList.toggle('is-off', screen !== 'login');
    const gate = $('login-gate-overlay');
    if (gate) gate.scrollTop = 0;
    if (screen === 'login') {
      gateShowPanel('login');
      setTimeout(() => { const el = $('gate-identifier'); if (el) el.focus({ preventScroll: true }); }, 60);
    }
  };

  window.gateShowPanel = function (panel) {
    $('gate-panel-login').classList.toggle('is-off', panel !== 'login');
    $('gate-panel-register').classList.toggle('is-off', panel !== 'register');
    ['gate-error-box', 'gate-reg-error'].forEach((id) => { const e = $(id); if (e) e.classList.add('hidden'); });
  };

  window.gateTogglePw = function () {
    const input = $('gate-password');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    $('gate-eye-on').classList.toggle('is-off', show);
    $('gate-eye-off').classList.toggle('is-off', !show);
  };

  /* Quên mật khẩu: dùng lại form đặt lại mật khẩu có sẵn (auth-modal),
     nâng z-index để hiện phía trên màn hình đăng nhập. */
  window.gateForgotPassword = function () {
    const modal = $('auth-modal');
    if (!modal) return;
    modal.style.zIndex = '110';
    if (typeof openAuthModal === 'function') openAuthModal('reset');
    else modal.classList.remove('hidden');
  };

  /* ---------- Luôn mở web bằng màn hình 1 (landing) ----------
     - hold = true: cổng luôn hiện ở landing, kể cả khi trình duyệt đã lưu đăng nhập
       (app.js ẩn cổng khi có người dùng → ta hiện lại cho tới khi bấm nút vào cổng).
     - Bấm "VÀO CỔNG ĐĂNG NHẬP HỆ THỐNG": đã có đăng nhập được ghi nhớ → vào thẳng hệ thống;
       chưa có → sang màn hình 2 để đăng nhập / đăng ký. */
  let hold = true;
  const gateEl = () => $('login-gate-overlay');
  const loggedIn = () => typeof ClassroomDB !== 'undefined' && !!ClassroomDB.currentUser;

  window.gateEnter = function () {
    hold = false;
    if (loggedIn()) gateEl().classList.add('hidden');
    else gateGoto('login');
  };

  function holdLanding() {
    const g = gateEl();
    if (hold && g && g.classList.contains('hidden')) { g.classList.remove('hidden'); gateGoto('landing'); }
  }

  /* "Ghi nhớ đăng nhập": lưu lựa chọn lúc bấm Đăng nhập */
  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'gate-login-form') {
      const cb = $('gate-remember');
      try { localStorage.setItem('tfit_remember', cb && !cb.checked ? '0' : '1'); } catch (_) {}
    }
  }, true);

  function start() {
    // Không tick "Ghi nhớ" ở lần trước → bắt đăng nhập lại
    let remember = '1';
    try { remember = localStorage.getItem('tfit_remember') || '1'; } catch (_) {}
    if (remember === '0' && loggedIn()) {
      ClassroomDB.currentUser = null;
      try { saveStateToStorage(); } catch (_) {}
      if (typeof applyRoleUI === 'function') applyRoleUI('STUDENT');
    }
    holdLanding();
  }

  function watchGate() {
    const gate = gateEl();
    if (!gate || !('MutationObserver' in window)) return;
    let wasHidden = gate.classList.contains('hidden');
    new MutationObserver(() => {
      const hidden = gate.classList.contains('hidden');
      if (hold && hidden) { holdLanding(); return; }
      if (wasHidden && !hidden && !hold) { // hiện lại sau đăng xuất → về màn hình đăng nhập
        gateGoto('login');
        const pw = $('gate-password'); if (pw) { pw.value = ''; pw.type = 'password'; }
        $('gate-eye-on').classList.remove('is-off'); $('gate-eye-off').classList.add('is-off');
      }
      wasHidden = hidden;
    }).observe(gate, { attributes: true, attributeFilter: ['class'] });
  }
  watchGate();
  holdLanding();
  window.addEventListener('load', start);

  /* =====================================================================
     CẢNH 3D
     ===================================================================== */
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = [];

  function mats() {
    return {
      gold: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.7, roughness: 0.35 }),
      goldDark: new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.7, roughness: 0.45 }),
      red: new THREE.MeshStandardMaterial({ color: 0x9a1428, metalness: 0.55, roughness: 0.4 }),
      redDark: new THREE.MeshStandardMaterial({ color: 0x4a0a14, metalness: 0.4, roughness: 0.6 }),
      brown: new THREE.MeshStandardMaterial({ color: 0x3a2410, metalness: 0.5, roughness: 0.55 }),
      base: new THREE.MeshStandardMaterial({ color: 0x2a0d12, metalness: 0.3, roughness: 0.7 }),
      wire: new THREE.MeshBasicMaterial({ color: 0xe8c468, wireframe: true, transparent: true, opacity: 0.35 }),
    };
  }

  function cyl(r, h, mat, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 48), mat);
    m.rotation.z = Math.PI / 2; // trục dọc theo X
    return m;
  }
  function ring(r, tube, mat) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 64), mat);
    t.rotation.y = Math.PI / 2;
    return t;
  }

  /* Cảnh 1 (landing): trục lắp trong lỗ — H7/g6 */
  function buildFit(group, spin) {
    const M = mats();
    // Lỗ (ống rỗng)
    const prof = [new THREE.Vector2(1.05, -1.1), new THREE.Vector2(1.55, -1.1), new THREE.Vector2(1.55, 1.1), new THREE.Vector2(1.05, 1.1)];
    const hole = new THREE.Mesh(new THREE.LatheGeometry(prof.concat([prof[0]]), 64), M.brown);
    hole.rotation.z = Math.PI / 2; hole.position.x = -1.4;
    hole.material.side = THREE.DoubleSide;
    group.add(hole);
    // Trục
    const shaft = new THREE.Group();
    shaft.add(cyl(0.98, 5.2, M.goldDark, 64));
    const core = cyl(0.99, 2.6, M.gold, 64); core.position.x = -0.4; shaft.add(core);
    for (let i = 0; i < 16; i++) { // then hoa khế ở đầu trục
      const a = (i / 16) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.28, 0.42), i % 2 ? M.red : M.redDark);
      b.position.set(-2.9, Math.cos(a) * 1.25, Math.sin(a) * 1.25);
      b.rotation.x = -a; shaft.add(b);
    }
    group.add(shaft); spin.push(shaft);
    // Vùng dung sai (lưới vàng) + vòng dẫn
    const zone = cyl(1.3, 3.4, M.wire, 40); zone.position.x = 1.9; group.add(zone);
    const r1 = ring(1.32, 0.03, M.gold); r1.position.x = 0.25; group.add(r1);
    const r2 = ring(1.32, 0.03, M.gold); r2.position.x = 3.55; group.add(r2);
    group.position.set(0.4, 0, 0);
    group.rotation.set(0.25, -0.35, 0.12);
    return { camPos: [0, 1.2, 9.2], base: { y: -0.35, x: 0.25 } };
  }

  /* Cảnh 2 (login): cụm trục – ổ đỡ – bánh răng trên đế */
  function buildAssembly(group, spin) {
    const M = mats();
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 3.2), M.base); base.position.y = -1.7; group.add(base);
    [-2.6, 2.6].forEach((x) => { // gối đỡ
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 1.6), M.redDark); blk.position.set(x, -0.6, 0); group.add(blk);
      const brg = cyl(0.78, 0.8, M.brown, 40); brg.position.set(x, 0.25, 0); group.add(brg);
    });
    const shaft = new THREE.Group();
    shaft.add(cyl(0.32, 7.4, M.goldDark, 32));
    // bánh răng
    const gear = new THREE.Group();
    const disc = cyl(1.25, 0.34, M.red, 48); gear.add(disc);
    const hub = cyl(0.55, 0.6, M.gold, 32); gear.add(hub);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.36), M.gold);
      tooth.position.set(0, Math.cos(a) * 1.38, Math.sin(a) * 1.38);
      tooth.rotation.x = -a; gear.add(tooth);
    }
    gear.position.x = -0.6; shaft.add(gear);
    // lồng dung sai (lưới)
    const cage = cyl(0.95, 1.9, M.wire, 28); cage.position.x = 1.35; shaft.add(cage);
    const cr = ring(0.96, 0.03, M.gold); cr.position.x = 0.4; shaft.add(cr);
    const cr2 = ring(0.96, 0.03, M.gold); cr2.position.x = 2.3; shaft.add(cr2);
    shaft.position.y = 0.25; group.add(shaft); spin.push(shaft);
    // tay quay
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), M.goldDark);
    arm.position.set(-3.3, 1.5, 0); arm.rotation.z = -0.5; group.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), M.gold); knob.position.set(-3.85, 2.55, 0); group.add(knob);
    group.rotation.set(0.35, -0.55, 0);
    return { camPos: [0, 2.4, 11], base: { y: -0.55, x: 0.35 } };
  }

  function makeScene(canvasId, builder) {
    const canvas = $(canvasId);
    if (!canvas || !window.THREE) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch (e) { return; } // không có WebGL → bỏ qua, giao diện vẫn dùng bình thường
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffe6cf, 0.7));
    const key = new THREE.DirectionalLight(0xffd8a0, 1.25); key.position.set(4, 7, 6); scene.add(key);
    const rim = new THREE.PointLight(0xff2a3c, 1.6, 40); rim.position.set(-6, 2, 4); scene.add(rim);
    const group = new THREE.Group(); scene.add(group);
    const spin = [];
    const cfg = builder(group, spin);
    camera.position.set(...cfg.camPos); camera.lookAt(0, 0, 0);
    scenes.push({ canvas, renderer, scene, camera, group, spin, cfg, w: 0, h: 0 });
  }

  function frame(t) {
    requestAnimationFrame(frame);
    const gate = $('login-gate-overlay');
    if (!gate || gate.classList.contains('hidden')) return;
    const sec = t / 1000;
    scenes.forEach((s) => {
      if (!s.canvas.offsetParent) return; // đang ẩn
      const w = s.canvas.clientWidth, h = s.canvas.clientHeight;
      if (!w || !h) return;
      if (w !== s.w || h !== s.h) { s.renderer.setSize(w, h, false); s.camera.aspect = w / h; s.camera.updateProjectionMatrix(); s.w = w; s.h = h; }
      if (!reduceMotion) {
        s.group.rotation.y = s.cfg.base.y + Math.sin(sec * 0.25) * 0.18;
        s.spin.forEach((o) => { o.rotation.x = sec * 0.6; });
      }
      s.renderer.render(s.scene, s.camera);
    });
  }

  function init() {
    makeScene('gate-canvas-landing', buildFit);
    makeScene('gate-canvas-login', buildAssembly);
    if (scenes.length) requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
