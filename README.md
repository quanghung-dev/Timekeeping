# 🕒 Work Log - Website Chấm Công Cá Nhân Hiện Đại

Chào mừng bạn đến với **Work Log**, ứng dụng chấm công và quản lý thời gian làm việc cá nhân được thiết kế hiện đại, tinh tế, mượt mà và dễ sử dụng dành cho người đi làm.

Dự án sử dụng **React 19 + TypeScript + Vite + Tailwind CSS v4** cùng sự bổ trợ của **Framer Motion** và **Recharts** để kiến tạo một trải nghiệm người dùng tuyệt vời, lấy cảm hứng từ phong cách tối giản của Apple, Stripe, Linear và Notion.

---

## 🚀 Tính năng nổi bật

1. **Chế độ Kép tự động (Demo & Live Firebase)**:
   - Nếu không có biến môi trường Firebase trong `.env`, ứng dụng tự động chạy ở **Chế độ Demo (Demo Mode)** sử dụng `localStorage` làm cơ sở dữ liệu lưu trữ offline.
   - Giao dịch được giả lập độ trễ mạng (latency) từ 200ms–500ms giúp hiển thị hiệu ứng skeleton và loading spinner mượt mà.
   - Khi có tệp cấu hình `.env` với các biến môi trường Firebase hợp lệ, hệ thống sẽ tự động kết nối trực tiếp với Firebase Authentication và Cloud Firestore.
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

### 4. Đăng nhập Chế độ Demo (Demo Mode)
- **Tài khoản**: `demo@worklog.app`
- **Mật khẩu**: `demo123`
*(Bạn có thể nhấn nút Đăng nhập nhanh "Auto-fill" ở màn hình Login để điền tự động).*

---

## ☁ Cấu hình kết nối Firebase thật

Nếu muốn sử dụng dữ liệu đám mây Firebase thật, hãy tạo tệp `.env` ở thư mục gốc (hoặc sao chép từ `.env.example`) và nhập thông số dự án Firebase của bạn:

```env
VITE_FIREBASE_API_KEY=AIzaSyBJN-V2gpvAijDEWB7EX7bYji3...
VITE_FIREBASE_AUTH_DOMAIN=timekeeping-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=timekeeping-xxxx
VITE_FIREBASE_STORAGE_BUCKET=timekeeping-xxxx.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=539572413...
VITE_FIREBASE_APP_ID=1:539572413...:web:65bd7ebd9f...
```

*Lưu ý: Bạn cần tạo tài khoản nhân viên thủ công trên Firebase Auth console (vì ứng dụng Work Log dành cho cá nhân được doanh nghiệp cấp tài khoản sẽ không có nút Đăng ký).*

### Cấu hình Firebase Cloud Firestore Security Rules
Vui lòng sao chép nội dung trong file [firestore.rules](file:///d:/TimekeepingAntigravity/firestore.rules) dán vào phần Rules của Cloud Firestore trên Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /attendance/{docId} {
      allow read, delete: if request.auth != null && docId.startsWith(request.auth.uid + "_");
      allow create, update: if request.auth != null 
                            && docId.startsWith(request.auth.uid + "_")
                            && request.resource.data.userId == request.auth.uid;
    }
  }
}
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
