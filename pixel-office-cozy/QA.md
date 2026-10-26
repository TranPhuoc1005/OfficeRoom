# QA v14 — quầy pantry

- Native browser1363×936: catalog hiển thị quầy mới, thêm được vào sàn. Quan sát cả4ảnh0/90/180/270°: trước có tủ/ngăn kéo xanh, hai hông đúng bên sink/microwave, sau là panel trắng. Không cắt mất vòi/máy/cánh tủ, không hiện khung nền đen.
- Sau xoay về0° và reload, quầy giữ ID d-mvom4sb7-1fk8xn21725ybzcd77wy và góc0°. Renderer dùng nguồn pantry mới cả sau reload. Scene thay chiều rộng khi đóng editor như v13.
- Syntax decor-editor.js, planner-renderer.js, office-planner.js pass. Kiểm4croprect hợp lệ trong PNG, đều có alpha khác0. Atlas fridge cũ không đổi. Không sửa dữ liệu layout/physics/task.
- Chỉ thay asset/khung hiển thị và loader. Không chạy lại toàn bộ suites v13 vì các model không thay. Giới hạn backend/mobile thật của v13 vẫn áp dụng.

# QA v13

Browser1363×936:
- Office riêng bên trái, editor x985..1351, office.right973. Lưới tới y936, không còn dừng84%.
- Thêm ghế tìm vị trí trống; kéo tới x971,y933 được. Canvas bbox gần x934.55..973.82,y880.86..920.13; giới hạn dùng chân đế, không bitmap trong suốt.
- Hai vách8ô kéo nối đầu: số vật20→19, số partition1, độ dài16ô. Model test thêm trường hợp dọc, khác vật liệu không gộp.
- WC bị chặn xoay khi vướng đồ: báo lý do. Dời xuống vùng dưới rồi xoay được90°.
- Tạo pantry ở sàn dưới, xoay90°. Tạo WC ở sàn dưới trái, xoay90°. Reload giữ nguyên cả hai ID và góc90°, không reset layout. WC vẫn kín. Nút Xóa có bottom604 < panel.bottom642.
- Login dùng ảnh trắng mới, trường form nằm đúng bảng bên phải. Bộ chibi gốc giữ nguyên.
- Không thấy lỗi app trong console; các lỗi thu được từ extension trình duyệt được loại khỏi kết luận app.

Model tests:
- geometry-v13: footprint chạm mép phải/đáy cả4góc, đường đi tới cuối sàn, xoay WC/pantry4góc, open/closed path, IDs giữ nguyên, hợp nhất vách ngang/dọc, từ chối xoay vượt sàn.
- Bộ workstation có chủ/ghế/màn hình gắn trên bàn trong phòng vẫn resolve ok qua4góc, screen giữ đúng mount/elevation.
- planner, attachments, navigation, workstations, reports, life suites chạy trong export. Hai fixture cũ cập nhật theo vùng sàn mới: barrier phải kéo tới đáy mới là complete barrier; test edge workstation dùng sizeOf để kiểm footprint thật.

Giới hạn: Chưa kiểm điện thoại thật, Supabase/Auth/Windows/CLI hoặc nhiều máy. Chỉ prototype frontend, không phải xác nhận hệ thống agent thực tế. Tùy biến layer trang phục chibi chưa hoàn thành.
