# Main Logic Reliability Fixes Design

## Goal

Tích hợp Neon foundation vào `main` và sửa các lỗi logic đã xác nhận trong luồng khởi động, xác thực, chấm công, xóa dữ liệu, tìm kiếm, cài đặt và vận hành mobile mà không mở rộng sang các tính năng PWA/offline của giai đoạn sau.

## Integration Strategy

`main` hiện là tổ tiên trực tiếp của `codex/neon-foundation`, vì vậy bước đầu tiên là fast-forward `main` tới nhánh này. Mọi sửa lỗi tiếp theo được thực hiện và commit trực tiếp trên `main` theo yêu cầu của người dùng. Không xóa worktree hoặc nhánh nguồn trong phạm vi công việc này.

## Attendance and Delete Flow

- Thao tác xóa chỉ xem `error` của Data API là thất bại. Phản hồi thành công có `data: null` là hợp lệ và phải dẫn tới refetch cùng thông báo thành công.
- Trạng thái Dashboard được xác định từ cả bản ghi hôm nay và ca đang mở gần nhất:
  - Có ca đang mở: hiển thị Check Out, kể cả ca bắt đầu từ ngày trước.
  - Không có ca mở và chưa có bản ghi hôm nay: hiển thị Check In.
  - Bản ghi hôm nay là nghỉ phép, nghỉ không lương hoặc ca đã hoàn thành: hiển thị trạng thái đóng, không hiển thị Check Out.
- Check Out ca qua đêm dùng ngày bắt đầu của bản ghi và thời điểm hiện tại để tính đúng thời lượng. Ca mở quá 24 giờ không được âm thầm quy về một vòng 24 giờ; người dùng phải chỉnh sửa thủ công.
- Mọi create/update bản ghi phải đi qua validation nghiệp vụ trước khi gọi repository.

## Startup and Authentication

- Neon client được khởi tạo lười. Cấu hình thiếu hoặc sai phải được `AuthProvider` bắt và hiển thị qua `ErrorState`; không được làm `#root` rỗng trước khi React mount.
- Luồng tạo profile phải an toàn khi hai đường hydrate/login hoặc hai tab cùng chạy. Repository xử lý xung đột insert bằng cách đọc lại profile vừa được tạo; AuthContext dùng chung một promise đang chạy cho cùng user để tránh request trùng trong một provider.
- Lỗi logout phải được hiển thị cho người dùng thay vì chỉ ghi console.

## Mobile, Search, and Settings

- Trang Settings cung cấp nút đăng xuất trên mobile, dùng cùng hàm logout của AuthContext và chỉ điều hướng sau khi logout thành công.
- Tìm kiếm lịch sử coi bản ghi không có ghi chú như chuỗi rỗng; khi từ khóa khác rỗng, bản ghi đó không được khớp.
- `useSettingsData` cung cấp trạng thái đang lưu. Nút lưu bị vô hiệu hóa trong lúc request chạy.
- Khi lưu settings thất bại và hook tải lại giá trị server, form phải đồng bộ lại theo settings mới thay vì giữ giá trị thất bại trong local state.

## Data Integrity and Migration

- Validation client kiểm tra ngày lịch hợp lệ, cặp giờ vào/ra, quan hệ giữa status và trường thời gian, `totalHours`, lương dương và mục tiêu giờ trong khoảng 1–24.
- Migration bổ sung constraint có tên cho dữ liệu mới: định dạng ngày, định dạng giờ, `total_hours` trong `(0, 24]`, settings hợp lệ và tính nhất quán giữa status với các trường thời gian.
- Constraint được thêm bằng `NOT VALID` để không làm migration dừng vì dữ liệu cũ, nhưng PostgreSQL vẫn áp dụng cho insert/update mới. Việc làm sạch dữ liệu cũ là một tác vụ riêng sau khi có database thật để kiểm tra.

## Legacy Cleanup

Xóa script `test:rules`, `deploy:rules`, cấu hình Vitest rules và test Firestore không còn dùng. Các tài liệu lịch sử trong `docs/superpowers` được giữ nguyên vì chúng ghi lại quyết định trước đây.

## Testing Strategy

Mỗi nhóm sửa đi theo vòng RED–GREEN:

- Repository test cho delete thành công với `data: null`.
- Unit test cho state machine Dashboard và tính giờ ca qua đêm.
- Auth test cho cấu hình lỗi có thể render và hai lần ensure đồng thời không tạo lỗi người dùng.
- Component/unit test cho search, mobile logout và trạng thái lưu Settings.
- Contract test cho constraint migration và việc loại bỏ tooling Firebase.
- Cuối cùng chạy toàn bộ `npm run test:run`, `npm run test:coverage`, `npm run lint`, `npm run build`, sau đó browser smoke test cho cấu hình thiếu và cấu hình hợp lệ nhưng backend không truy cập được.

## Success Criteria

- Không còn thao tác xóa thành công nhưng UI báo thất bại.
- Ca qua đêm có thể Check Out từ Dashboard; ngày nghỉ không bị coi là ca đang mở.
- Thiếu `.env` hiển thị lỗi có thể retry thay vì trang trắng.
- Đăng nhập/hydrate đồng thời không gây lỗi unique profile.
- Người dùng mobile có thể đăng xuất.
- Search, Settings và validation hoạt động theo các quy tắc trên.
- Script Firebase lỗi thời không còn xuất hiện trong package scripts.
- Test, lint và build đều đạt; worktree và thay đổi ngoài phạm vi không bị đụng tới.

## Out of Scope

- Service worker, offline queue, notification nền, backup JSON và phân tích nâng cao.
- Nâng hoặc override cưỡng bức dependency Neon Auth beta để xử lý advisory upstream.
- Tối ưu bundle Recharts/Neon SDK ngoài việc lazy-init client cần cho lỗi khởi động.
- Làm sạch dữ liệu lịch sử trên Neon khi chưa có `DATABASE_URL` thật.
