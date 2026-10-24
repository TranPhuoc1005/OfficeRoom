# Thiết kế Cozy Edition

## Định hướng

Pixel minh họa phong phú, ánh sáng chiều ấm, môi trường có sách/cây xanh/đèn/bàn gỗ. Nhân vật phải lấy từ PNG mới, không tiếp tục vẽ lại bằng sprite hình khối hoặc emoji.

Palette: mực xanh #344c38, nút xanh #59784c, giấy kem #fff3d8, gỗ/viền #a88952 và #765b36, chữ phụ #95836c. Chữ UI là HTML thật, dễ đọc; không dùng ảnh baked chữ làm input/button.

## Layout

Lễ tân phủ viewport; nền tranh, tiêu đề và form là các lớp riêng. Desktop form nằm đúng bảng giấy phía phải; ở màn hình hẹp chuyển thành bảng giấy nổi phía dưới. Tiêu đề và form không được cắt khỏi viewport.

Nội thất phủ viewport, không có zoom/pan/fit. Tranh dùng cover, nhân vật tính từ tọa độ ảnh theo cùng phép cover và offset. Trên mobile tranh được crop, các điểm nhân vật được giới hạn trong khung; đây là giải pháp preview, app local cần đối chiếu hình nền/đường đi nếu thay bố cục phòng.

Dock sáu chức năng ở dưới. Panel giấy mở từ dưới, mở rộng/thu gọn/đóng; nội dung cuộn bên trong. Các nhân vật luôn ở dưới lớp panel. Không thêm sidebar hoặc khối dashboard lớn phía trên.

## Nhân vật

- Variant 0: tóc bob, kẹp hoa, cardigan xanh sage, túi kem.
- Variant 1: tóc tối, kính tròn, áo xanh, quần tan.
- Variant 2: tóc tối, tai nghe xanh, hoodie kem, quần xanh.
- Variant 3: tóc búi nâu, cardigan mauve, túi nâu.

Lưu spriteVariant theo agent ID. Chỉ thay ngoại hình, không đổi tên, folder hay lịch sử. Màu nhận diện UI không phải công cụ recolor từng phần PNG. Sprite atlas hiện có front/back tĩnh và hai pose nghiêng; đi trái dùng flip hai pose nghiêng. Đây không phải bộ idle/walk 8 hướng nhiều frame đầy đủ; front/back dùng gait nhỏ bằng CSS.

## Giới hạn artwork và chức năng

Nền nội thất có 4 bàn và đồ nội thất vẽ sẵn. Nhân vật là lớp rời và có thể bấm/chuyển động. Bản này KHÔNG cung cấp các đồ nội thất rời để kéo thả hay animation vẫy tay/mở cửa nhiều frame. Nếu app hiện có chế độ trang trí, không xóa tính năng đó: dùng tranh làm preset/reference, giữ dữ liệu và cơ chế nội thất rời của app, cần chuẩn bị/tách thêm asset trước khi thay hoàn toàn editor trang trí. Không giả vờ bàn baked-in đã trở thành vật thể kéo thả.

Bản mẫu tối đa 8 nhân vật trong scene (4 vị trí bàn, các vị trí phụ phía trước), tất cả agent vẫn quản lý qua panel. Mở rộng số bàn cần bố trí thêm artwork phù hợp.
