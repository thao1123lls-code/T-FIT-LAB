# T-FIT LAB — LMS Dung sai & Lắp ghép ISO 286

- **Giao diện mô phỏng ISO 286** (`index.html`): tra cứu, tính dung sai, 2D/3D — chạy thuần trình duyệt.
- **LMS có backend thật** (`lms.html` + `server/`): Node.js + Express + SQLite. Phân quyền, kiểm tra mã lớp, nộp/chấm bài, lịch sử, thông báo, nhật ký đều xử lý ở server.

## Chạy
```bash
npm install
npm start          # http://localhost:3000  (LMS: /lms.html)
npm test           # ISO 286 + 21 test API
```
Biến môi trường: `JWT_SECRET` (**bắt buộc đổi khi triển khai**), `PORT`, `DB_FILE`.

## Tài khoản demo (mật khẩu `123456`)
Admin `admin@dntu.edu.vn` · Giảng viên `an.nv@dntu.edu.vn` · Sinh viên `khoa.lm@dntu.edu.vn`

## Triển khai
GitHub Pages chỉ chạy được file tĩnh, **không chạy được backend**. Đưa repo lên GitHub để lưu code, rồi deploy server lên Render / Railway / Fly.io (start command `npm start`, gắn disk cho `data.db`, đặt `JWT_SECRET`).
