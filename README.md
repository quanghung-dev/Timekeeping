# 🕒 Work Log - Website Chấm Công Cá Nhân Hiện Đại

Chào mừng bạn đến với **Work Log**, ứng dụng chấm công và quản lý thời gian làm việc cá nhân được thiết kế hiện đại, tinh tế, mượt mà và dễ sử dụng dành cho người đi làm.

Dự án sử dụng **React 19 + TypeScript + Vite + Tailwind CSS v4** cùng sự bổ trợ của **Framer Motion** và **Recharts** để kiến tạo một trải nghiệm người dùng tuyệt vời, lấy cảm hứng từ phong cách tối giản của Apple, Stripe, Linear và Notion.

---

## 🚀 Tính năng nổi bật

    - Nếu có tệp cấu hình `.env` với các biến môi trường Neon hợp lệ, hệ thống sẽ tự động kết nối trực tiếp với Neon Auth và Data API.
2. **Quy tắc Nghiệp vụ Chấm Công**:
   - Mỗi ngày chỉ tồn tại tối đa **một bản ghi công duy nhất**.
   - Ghi nhận Check In (▶) -> ẩn Check In, hiện Check Out (■). Sau khi Check Out -> hoàn tất ngày công, ẩn nút và hiện Badge báo công thành công.
   - Hỗ trợ Check In xuyên đêm (qua 24 giờ) mà không lo bị tính âm số giờ làm việc.
   - Cho phép **chỉnh sửa thủ công** bất kỳ ngày nào trong quá khứ nếu vô tình quên Check In/Out.
3. **Chuỗi Ngày Làm Việc Liên Tiếp (Streak)**:
   - Tính toán thông minh: Bỏ qua ngày thứ Bảy & Chủ Nhật để không làm mất chuỗi streak ngày công làm việc của người dùng cá nhân.
4. **Biểu đồ Trực quan & KPIs**:
   - Sử dụng **Recharts** vẽ biểu đồ số giờ làm việc theo ngày và xu hướng theo tuần.
   - Biểu đồ phân phối ngày công (Đi làm, Nghỉ phép, Nghỉ không lương).
   - KPIs thống kê công và lương tạm tính tự động thích ứng với cấu hình lương ngày hoặc giờ.
5. **Dark Mode & Responsive**:
   - Đồng bộ class-based Dark Mode lưu trữ trong `localStorage`.
   - Đáp ứng hiển thị Responsive hoàn toàn (Desktop có sidebar trái, Mobile chuyển thành thanh điều hướng Bottom Navigation tiện dụng).

---

## 🛠 Hướng dẫn Cài đặt & Chạy dự án

### 1. Yêu cầu hệ thống
- Máy tính đã cài đặt **Node.js** (Khuyến nghị phiên bản 18+).

### 2. Cài đặt các gói thư viện
Mở terminal tại thư mục gốc của dự án và chạy:
```bash
npm install
```

### 3. Chạy dự án ở chế độ phát triển (Dev Server)
```bash
npm run dev
```
Truy cập vào liên kết: [http://localhost:5173](http://localhost:5173) để trải nghiệm.

### 4. Đăng nhập
- Liên hệ quản trị viên (Admin) để lấy tài khoản đăng nhập trên hệ thống. Ứng dụng không hỗ trợ tự đăng ký tài khoản vì lý do bảo mật nội bộ.

---

## ☁ Cấu hình kết nối Neon Postgres

Dự án đã được di chuyển từ Firebase sang **Neon Postgres**. Cần cấu hình các biến môi trường sau trong tệp `.env`:

```env
VITE_NEON_AUTH_URL=https://ep-example.neonauth.us-east-2.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-example.apirest.us-east-2.aws.neon.tech/neondb/rest/v1
DATABASE_URL=postgresql://neondb_owner:password@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Yêu cầu cấu hình:

- Bật Neon Auth và Data API trên cùng một branch.
- Sao chép chính xác Auth URL và Data API URL từ Neon Console; không tự ghép hostname.
- Thêm URL dev/deploy của ứng dụng vào danh sách allowed origins của Neon Auth.
- `DATABASE_URL` chỉ được dùng bởi migration tooling và không được đưa vào biến `VITE_*`.
- Ứng dụng dùng session cookie của Neon Auth; tải lại trang không làm mất phiên đăng nhập.
- `@neondatabase/neon-js` hiện là bản beta mới nhất; kiểm tra lại `npm audit` khi nâng SDK vì dependency Auth gián tiếp đang có cảnh báo mức vừa.

### Di trú dữ liệu (Migration)
Sau khi thiết lập URL kết nối Backend (`DATABASE_URL`), chạy lệnh sau để khởi tạo bảng, indexes và cấu hình Row-Level Security (RLS) trên Neon:

```bash
node scripts/migrate.js
```

---

## 📁 Cấu trúc thư mục

```text
src/
  ├── components/   # Shared UI components (Button, Card, Modal, Input, Skeletons...)
  ├── pages/        # Route pages (Login, Dashboard, Attendance, History, Statistics, Settings)
  ├── hooks/        # Custom stateful hooks (useAttendanceData, useSettingsData)
  ├── contexts/     # Global state contexts (AuthContext, ThemeContext)
  ├── lib/          # Database routers, mock seeds, math utils, styling mergers
  ├── types/        # TypeScript structural model interfaces
  ├── App.tsx       # Main Router definitions & Toaster guards
  └── main.tsx      # Main React DOM mount
```

---
Chúc bạn quản lý thời gian làm việc vui vẻ và hiệu quả cùng **Work Log**! 🕒

---

## Trạng thái xác thực và dữ liệu

- Ứng dụng quản lý tài khoản qua Neon Auth. Việc tạo tài khoản được thực hiện thủ công trên Neon Console.
- Profile của nhân viên sẽ tự động được ứng dụng khởi tạo vào lần đăng nhập đầu tiên.
- Các API endpoints cho dữ liệu được bảo vệ chặt chẽ thông qua hệ thống Row-Level Security (RLS) của PostgreSQL.

## Kiểm thử

```bash
# Unit/component tests
npm run test:run

# Static analysis và production build
npm run lint
npm run build
```
