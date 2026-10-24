# Kiểm tra bản tham chiếu v3

Đã kiểm tra bằng trình duyệt:
- Desktop viewport 1363x936: phòng ở x=0,y=0, kích thước 1363.32x936.32, phủ khung; không còn nút zoom, phần trăm zoom hoặc fit.
- Mobile iframe 390x844: phòng ở x=0,y=0, kích thước 390.15x844.05; document scrollWidth=390 và scrollHeight=844, không tràn trang; bàn và khu nghỉ chuyển bố cục dọc.
- Mở/đóng bảng Công việc từ dock.
- Pause hoạt ảnh và bấm Mộc mở form giao việc đúng Mộc.
- Source không còn handler wheel/drag/pinch hoặc state camera zoom/pan.
- Kiểm tra cú pháp JavaScript và toàn vẹn ZIP.

Bản tham chiếu không kết nối CLI/SQLite trên máy Windows của người dùng. Cần kiểm tra tích hợp thật sau port. Chưa test fullscreen trên mọi trình duyệt hoặc thiết bị touch thật.
