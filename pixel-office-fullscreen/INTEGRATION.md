# Tích hợp bản toàn màn hình không zoom

Yêu cầu cuối cùng của người dùng: mở app là văn phòng phủ toàn bộ màn hình. Không cần zoom, kéo map hoặc bấm fit. Bản này thay thế mọi hướng dẫn camera trong gói cũ.

- Giữ .game-app và #officeView ở 100vw x 100dvh, không cuộn trang.
- Renderer tính world W/H từ viewport rồi bố trí lại sàn và đồ nội thất; dùng cùng một tỷ lệ cho cả hai trục. Không scaleX/scaleY khác nhau làm méo nhân vật.
- Sàn chạm bốn mép. Đồ nội thất và đường đi được tạo lại khi kích thước màn hình thay đổi. Panel hiện/ẩn không làm thay đổi kích thước viewport hoặc reset renderer.
- Desktop: phòng họp bên trái, bàn làm việc giữa, khu coffee và yên tĩnh bên phải. Màn hình hẹp: giữ bàn làm việc ở trên và khu nghỉ/coffee ở dưới, không bắt người dùng kéo map để nhìn thấy.
- Không gắn wheel/drag/pinch listener để điều khiển map, không có zoomIn/zoomOut/fitWorld hoặc phần trăm zoom.
- Nút fullscreen tùy chọn dành cho chế độ trình duyệt; không dùng làm điều kiện để map phủ kín app. Pause chỉ dừng hoạt ảnh.
- Dock có Văn phòng, Đội agent, Giao việc, Công việc, Lịch sử, Cài đặt. Các bảng ở phía dưới; bấm nhân vật mở đúng agent.

Chỉ port markup/style/sprite và bố cục renderer sang React hiện có. Các global data/taskForm/taskDetail/gameSyncHud/updatePixelOffice cần đổi thành props/store/callback. Cleanup event listeners và animation loop khi unmount; tránh tạo nhiều loop trong StrictMode.

preview/index.html có localStorage và luồng thủ công của bản web tham chiếu. KHÔNG mang chúng sang làm runtime chính. Giữ backend, SQLite, Antigravity CLI, agent ID, folder source, conversation ID, task history, tiến độ stream, tạo phiên mới, dừng task và INTERRUPTED của app local.

Hiện tại source có 4 agent mẫu và hoạt ảnh minh họa. Khi tích hợp, dùng agent thật trong SQLite, giữ ngoại hình ổn định theo ID và chuyển trạng thái theo sự kiện backend thật: rảnh đi lại, có task về bàn, cần xử lý dấu !, hoàn tất dấu ✓. Không seed đè dữ liệu hoặc giả task thành công bằng timer.

Thay các nhãn “Bản giao diện”, “GIAO DIỆN MẪU”, “lưu trên trình duyệt” và luồng mở ChatGPT/dán kết quả bằng thông tin đúng với app local. Không xóa database, không cài lại CLI, không sửa auth/thanh toán vì thay giao diện.
