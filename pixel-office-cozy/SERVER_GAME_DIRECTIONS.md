# Các hướng phát triển — chưa triển khai

## Phòng server cho app agent thật
Mỗi rack đại diện một runner/máy đang kết nối, bấm xem heartbeat/online/offline, task đang chạy và số slot backend thật, log gần nhất, projectfolder mappings, report/artifact history. Đèn báo lấy từ dữ liệu thật. Không cho rack đồ họa tự tăng năng lựcAI. Vercel phục vụ frontend, WindowsRunner/server runtime thực mới thực thi task. Chưa có rack/status API hoặc phòng server thật trong bản preview này.

## Phòng server trong game thuần
Nâng cấp compute capacity để chạy thêm hợp đồng song song, lưu bản backup để giảm phạt sự cố, quản lý điện/nhiệt/chi phí vận hành. Đây là chỉ số game và logicNPC, không phải giới hạn quyền dùng AI thật.

## Ba hướng sản phẩm
1. Cozy office builder: tuyển NPC, nhận hợp đồng, giao đúng chuyên môn, nhận tiền/uy tín, mua đồ/mở phòng/nâng server. Bán game một lần và DLC đồ/theme. Vòng chơi mẫu:1phòng,3NPC,5hợpđồng,1chuỗi nângcấp; mô phỏng bằng logicgame để kiểm soát chi phí.
2. Productivity app gamified: người dùng quản lý agent thật; đồ trang trí/skin/avatar là phần chơi, công việc và báo cáo là giá trị chính. Gói trả phí cho đồng bộ/team/khả năng quản lý, bán cosmetics. Tính riêng chi phí AI/runner, đo cost mỗi user trước khi hứa unlimited.
3. Social office world: tham quan văn phòng bạn bè, chia sẻ blueprint, thi thiết kế, dự án chung. Bán cosmetic/theme/không gian, có chi phí vận hành realtime và quản trị cộng đồng cao hơn. Để sau khi bản solo dùng tốt.

Đề xuất: giữ PixelOffice hiện tại làm công cụ có game hóa; dùng lại editor/nhân vật để làm bản game riêng thử nhu cầu. Đo người chơi có quay lại vì trang trí và tiến trình hợp đồng trước khi làm cửa hàng hay live-service. Chưa có cơ sở dự báo doanh thu.

## Kênh phát hành tham khảo
Steam Direct:100USD/app theo tài liệu Steamworks: https://partner.steamgames.com/doc/gettingstarted/appfee
itch.io: có thể tự đặt pricing và revenue sharing; payment processor còn có phí riêng: https://itch.io/docs/creators/payments
Đây là thông tin tham khảo kiểm tra ngày25/10/2026, chưa tạo tài khoản/đăng game/bật thanh toán.
