# Pixel Office — Cozy Edition / thiết kế v4

Bản thiết kế mới theo hình Pixel Office ấm áp đã được chọn: tranh pixel minh họa chi tiết, nội thất gỗ và cây xanh, ánh nắng vàng, nhân vật chibi có tóc/quần áo/phụ kiện riêng. Thay thế các gói layout v1-v3 trước đó.

## Cách đưa qua Antigravity

1. Giải nén, đặt folder `pixel-office-cozy` vào dự án AgentOffice hiện có.
2. Mở chính dự án đó trong Antigravity.
3. Copy toàn bộ PROMPT_CHO_ANTIGRAVITY.txt và gửi cho Agent.
4. Yêu cầu port giao diện và dùng đúng các file ảnh kèm theo; giữ hệ thống thật đang có.

## Xem thử

Mở preview/index.html. Bấm “Vào văn phòng mẫu” hoặc “Khám phá bản mẫu”. Có thể vào thẳng nội thất bằng `index.html?view=office`.

Đây là prototype giao diện. Trường đăng nhập là minh họa readonly, không gửi/lưu mật khẩu, không phải Supabase Auth. Task trong preview là luồng thủ công có localStorage của bản mẫu. Không đưa cơ chế bypass/demo này vào ứng dụng production.

## Nội dung gói

- preview/: source chạy trực tiếp, gồm layout lễ tân, nội thất, dock, panel đội/task/history/settings, form agent và chọn 4 ngoại hình.
- preview/assets/entrance.png: nền lễ tân KHÔNG có form/chữ UI; dùng HTML thật phía trên.
- preview/assets/office-interior.png: nền nội thất chi tiết, không có nhân vật baked-in.
- preview/assets/characters-atlas.png: PNG alpha thật, 4 hàng x 4 cột; bộ nhân vật mới.
- preview/assets/atlas.json: metadata và cách ánh xạ hướng/khung hình.
- components/illustrated-sprites.js: renderer sprite độc lập để tái sử dụng trong React.
- reference/login-concept.png: concept đã chọn, chỉ dùng đối chiếu phong cách, không lấy làm form tương tác.
- DESIGN_GUIDE.md: thiết kế và giới hạn artwork.
- INTEGRATION.md: ánh xạ sang runtime/Auth/Supabase đang có.
- QA.md: những kiểm tra đã chạy.

Assets được tạo bằng ImageGen theo brief trong ASSET_BRIEFS.md. Gói không có tài khoản, API key, database, task của người dùng, cấu hình hosting hoặc source Antigravity trên máy Windows.
