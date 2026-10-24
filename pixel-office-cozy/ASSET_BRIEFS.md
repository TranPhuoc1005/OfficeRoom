# ImageGen asset briefs

Các PNG được tạo bằng công cụ ImageGen tích hợp, sử dụng concept login đã được người dùng chọn làm tham chiếu phong cách.

1. Entrance background: giữ tòa nhà, ánh nắng vàng, cây, nhân vật và lễ tân; bỏ toàn bộ title/logo/chữ/ô nhập/button/link khỏi concept; bảng giấy phải trống để đặt HTML thật, khôi phục nền trời trống ở góc trái.
2. Office interior: tạo nội thất 16:9 nhìn từ cao xuống theo cùng pixel minh họa; bốn bàn trung tâm 2x2, cửa sổ lớn, cây treo, đèn xanh, bàn gỗ, rug sage, meeting bên trái, coffee/sofa bên phải; chừa khoảng sàn trống phía trước; không người, không UI/chữ.
3. Character atlas: PNG alpha, 4x4 ô bằng nhau, bốn kiểu nhân vật bob/kính/tai nghe/búi tóc; cùng tỷ lệ 2.7 đầu, mắt biểu cảm, má hồng, quần áo chi tiết theo concept. Các cột đầu front/back, hai cột cuối pose nghiêng; code flip cho đi trái. Sau đó có lượt cleanup yêu cầu giữ nguyên grid/nhân vật và bỏ viền màu thừa.

Assets của gói là bitmap, không phải SVG hoặc các hình chữ nhật procedural từ bộ cũ. Không cần gọi lại dịch vụ tạo ảnh để chạy frontend, chỉ dùng các PNG đã kèm.
