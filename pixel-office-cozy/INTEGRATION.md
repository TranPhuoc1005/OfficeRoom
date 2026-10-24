# Port sang Pixel Office thật

## Giữ nguyên hệ thống

Chỉ thay phần trình bày. Giữ Supabase Auth, RLS, database, các bảng và dữ liệu hiện có; Antigravity CLI/runner, folder/project, conversation ID, task history, stream tiến độ, cancel, phiên mới và migration cũ. Không tạo app mới hoặc seed đè đội agent hiện tại.

## Source cần đọc

index.html chứa HTML giao diện và logic prototype cũ; game-layout.css là base layout full-screen; cozy.css override toàn bộ visual; game-ui.js vận hành dock/panel; cozy-office.js dùng ảnh mới, sprite, chọn ngoại hình và các trạng thái lễ tân minh họa. Không nạp pixel-office.js cũ và không dùng renderer hình khối v1-v3.

Khi port React, tách ReceptionScreen, OfficeScene, IllustratedAgent, BottomDock, BottomSheet, AgentCard, AgentEditor, TaskBoard, TaskDetail, HistoryPanel, SettingsPanel. Chuyển các global data/taskForm/taskDetail/updatePixelOffice/gameSyncHud thành props/store/callback. Scope refs, cleanup listeners và requestAnimationFrame; không tạo nhiều loop trong StrictMode.

## Auth thật

Các trường login trong preview chỉ readonly, có thông báo minh họa, click vào thẳng mẫu. Trong app thật phải dùng input/form có label, validation, loading/error và các handler Auth đã hoạt động. Nút tạo tài khoản/quên mật khẩu gọi đúng luồng hiện có, không dùng bypass openOffice() của preview. Chỉ chuyển vào văn phòng sau khi session Auth thật được xác nhận; người có session hợp lệ vào thẳng văn phòng. Không lưu mật khẩu hoặc đưa service_role key vào client.

## Agent và task

Bấm sprite bằng agent ID thật. Lưu spriteVariant vào record/profile hiện có bằng migration an toàn hoặc cấu hình ngoại hình tương thích. Card/scene dùng cùng variant. Các trường folder/conversation không bị thay đổi khi sửa ngoại hình.

Prototype vẫn dùng task thủ công, copy prompt/dán kết quả và localStorage. KHÔNG dùng chúng thay runner/cloud data thật. Task form gọi API hiện tại. Tiến độ, dấu trạng thái và kết quả lấy từ runtime thật; không suy diễn từ animation. Preview có idle walk và minh họa busy ở home, không phải scheduler agent hoặc xác thực việc thực thi.

## Artwork

Đưa cả ba PNG trong preview/assets vào public/assets hoặc asset pipeline của app. Cập nhật URL import. Đọc atlas.json; có thể dùng components/illustrated-sprites.js. Không thay bằng emoji hay dùng nguyên ảnh concept có form baked-in.

Giữ chế độ trang trí hiện có nếu app đã triển khai. Nền tranh mới có đồ nội thất baked-in, không thể tự biến thành những đồ kéo thả. Không xóa dữ liệu bố cục cũ để ép vào hình nền; dùng preset/reference và báo rõ phần cần asset rời.

## Kiểm tra sau port

Đăng nhập/đăng ký/khôi phục thật, session reload; không bypass Auth. Kiểm tra RLS/các văn phòng khác nhau. Giao task CLI thật đúng folder và nhận kết quả. Đổi sprite, refresh và xác minh cả avatar và scene đồng bộ. Panel đóng/mở không restart runner hoặc reset camera. Không có zoom/pan/fit. Báo rõ bước chưa kiểm chứng.
