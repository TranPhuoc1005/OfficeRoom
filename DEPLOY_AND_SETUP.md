# HƯỚNG DẪN TRIỂN KHAI PIXEL OFFICE ĐA THIẾT BỊ (VERCEL + SUPABASE + WINDOWS RUNNER)

Hệ thống cho phép bạn mở Pixel Office từ bất kỳ thiết bị nào (điện thoại, máy tính bảng, laptop, trình duyệt từ xa), đăng nhập vào văn phòng của mình, theo dõi đội ngũ 7 agent, giao task trực tiếp và nhận kết quả realtime. Antigravity CLI (`agy.exe`) sẽ chạy trực tiếp trên máy Windows cục bộ trong đúng thư mục dự án được chỉ định.

---

## 1. CẤU HÌNH SUPABASE (Database, Auth, Realtime & RLS)

### Bước 1.1: Tạo Project trên Supabase
1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập / tạo tài khoản.
2. Tạo một project mới (ví dụ: `Pixel-Office`).
3. Sau khi khởi tạo xong, vào **Project Settings** -> **API**:
   - Sao chép **Project URL** (`https://<project-ref>.supabase.co`)
   - Sao chép **Project API Keys** -> `anon` `public` key

### Bước 1.2: Chạy Migration Schema
1. Trong Supabase Dashboard, mở mục **SQL Editor** ở thanh điều hướng bên trái.
2. Mở file [supabase/migrations/20261024000000_pixel_office_multi_device.sql](supabase/migrations/20261024000000_pixel_office_multi_device.sql) trong project này.
3. Dán toàn bộ nội dung SQL vào SQL Editor và bấm **Run**.
4. Script sẽ tạo:
   - Các bảng: `offices`, `runners`, `projects`, `agents`, `tasks`, `task_events`.
   - Toàn bộ chính sách bảo mật **Row Level Security (RLS)** gắn chặt với `owner_id = auth.uid()`.
   - Các hàm RPC nguyên tử: `claim_next_task`, `runner_heartbeat`, `sync_runner_projects`, `report_task_progress`, `request_task_cancellation`, `create_runner_pair`.
   - Bật Supabase Realtime cho các bảng `tasks`, `agents`, `runners`, `task_events`.

---

## 2. DI CHUYỂN DỮ LIỆU CŨ TỪ SQLITE SANG SUPABASE

Database SQLite cũ (`server/data/pixel_office.db`) đã được sao lưu an toàn tại `server/data/pixel_office.db.backup_20261024`.

1. **Kiểm tra trước khi chuyển (Dry-Run):**
   ```powershell
   npm run db:migrate:dry-run
   ```
   Lệnh này sẽ đọc 7 agent (Huy, Tường, Phước, Toàn, Thành, Long, Hiếu) và lịch sử từ SQLite mà chưa ghi vào Supabase.

2. **Thực hiện di chuyển thực tế:**
   ```powershell
   npm run db:migrate
   ```
   Nhập URL, Anon Key, Email và Mật khẩu tài khoản Supabase của bạn. Script sẽ tự động import toàn bộ 7 agent, màu sắc, avatar chibi, thư mục dự án và lịch sử tác vụ một cách an toàn và chống trùng lặp.

---

## 3. KHỞI ĐỘNG LOCAL RUNNER TRÊN MÁY WINDOWS

Local Runner chạy ngầm trên máy Windows của bạn, kết nối ra ngoài qua HTTPS (outbound) để lắng nghe task, hoàn toàn không cần mở port modem hay để lộ IP.

### Cách 1: Sử dụng script 1-click PowerShell
```powershell
powershell .\start-runner.ps1
```
- Nếu là lần đầu chạy, script sẽ tự động mở giao diện ghép nối (hỏi Email / Mật khẩu để tự tạo mã kết nối và lưu vào `runner/.env`).
- Runner sẽ tự phát hiện đường dẫn `agy.exe`, đồng bộ 5 thư mục dự án (`AgentOffice`, `wegolden`, `flatsome`, `test_workspace_alpha`, `test_workspace_beta`) và phát tín hiệu heartbeat định kỳ 10 giây.

### Cách 2: Thêm thư mục dự án mới cho Runner
Để đăng ký thêm thư mục dự án trên máy Windows để website có thể chọn:
```powershell
powershell .\start-runner.ps1 -AddFolder
# hoặc: npm run runner:add-folder
```

---

## 4. DEPLOY LÊN VERCEL

File cấu hình [vercel.json](vercel.json) đã được thiết lập sẵn trong mã nguồn.

### Cách 1: Sử dụng Vercel CLI
```powershell
npm install -g vercel
vercel
```

### Cách 2: Deploy qua giao diện Vercel Dashboard (GitHub)
1. Đẩy mã nguồn lên repository GitHub của bạn (các file bí mật `.env` đã được `.gitignore` bảo vệ tuyệt đối).
2. Truy cập [https://vercel.com](https://vercel.com) -> **Add New Project** -> Chọn repository.
3. Trong phần **Environment Variables**, thêm 2 biến:
   - `VITE_SUPABASE_URL`: URL project Supabase của bạn.
   - `VITE_SUPABASE_ANON_KEY`: Anon public key của Supabase.
4. Bấm **Deploy**.

Sau khi deploy xong, bạn mở URL Vercel trên bất kỳ thiết bị nào, đăng nhập cùng tài khoản là có thể giao việc cho máy Windows xử lý!

---

## 5. KIỂM TRA & SỬ DỤNG HÀNG NGÀY

1. **Kiểm tra trạng thái Runner:**
   - Trên thanh trạng thái website hoặc góc trên cùng: Nếu runner đang chạy, sẽ hiển thị đèn xanh `🟢 Runner Online`. Nếu runner tắt, sẽ báo `🔴 Runner Offline`.
2. **Giao việc:**
   - Bấm trực tiếp vào nhân vật agent trên văn phòng pixel hoặc nút **Giao việc** ở thanh dock.
   - Điền yêu cầu công việc.
   - Máy Windows sẽ lập tức nhận task, chạy Antigravity CLI và stream tiến độ realtime lên website.
3. **Dừng tác vụ:**
   - Bấm vào nhân vật đang làm việc -> Chọn **🛑 Dừng tác vụ**.
   - Website sẽ gửi tín hiệu hủy nguyên tử tới Runner, Runner sẽ dừng toàn bộ cây tiến trình CLI và xác nhận trạng thái gián đoạn.
