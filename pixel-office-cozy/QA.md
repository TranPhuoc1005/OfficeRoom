# Kiểm tra bản thiết kế Cozy Edition

Đã kiểm tra bằng trình duyệt:
- Màn hình lễ tân desktop: nền sạch UI, form HTML vừa khung, tiêu đề không bị cắt.
- Các trạng thái minh họa đăng nhập, tạo văn phòng, quên mật khẩu và chuyển vào nội thất.
- Văn phòng dùng tranh mới, bốn nhân vật rời mới, dock không zoom/pan/fit.
- Mở panel Đội agent; mở editor và thấy bốn lựa chọn ngoại hình.
- Chọn variant tai nghe cho Mộc, lưu, tải lại, mở editor và xác minh aria-pressed=true cho variant đã lưu; trả lại variant bob.
- Mobile iframe 390x844: login vừa khung; vào office; document scrollWidth=390, scrollHeight=844; panel đội có sprite/avatar và cuộn nội bộ.
- Đã phát hiện và sửa sprite đè panel bằng stacking context, đồng thời sửa avatar card bị chồng chữ; kiểm tra ảnh mobile sau sửa.

Đã kiểm tra cú pháp toàn bộ JavaScript, module renderer và toàn vẹn ZIP. Tài nguyên PNG alpha đã được xác minh và có metadata.

Giới hạn: đây là design preview, chưa kết nối Supabase Auth, runner/CLI hoặc database Windows thật. Các trường login readonly, không nhận credential. Task runtime vẫn là prototype thủ công; việc port phải giữ thực thi thật của app người dùng. Phần trạng thái register/reset được bổ sung trường UI sau vòng kiểm tra ban đầu; cần kiểm tra Auth thật sau tích hợp. Chưa kiểm tra nhiều người dùng, trang trí nội thất rời hoặc full animation 8 hướng.
