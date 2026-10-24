# Tích hợp vào frontend hiện có

## Thiết kế giữ lại

Màu nền #f5f4ef, chữ #263e36, nút chính #2a624d, panel #fffefa. Sidebar 216px trên desktop; main padding 32px 38px; panel radius 16px; 4 thẻ thống kê. Văn phòng bên trái, đội agent bên phải, bảng việc phía dưới. Giữ các breakpoint 1100px và 650px hoặc điều chỉnh tối thiểu theo app thật.

## Ánh xạ các vùng

| Vùng tham chiếu | Kết nối trong app local |
|---|---|
| #stats | Agent/task có thật từ API/store hiện tại |
| .office / pixel-office.js | Mount canvas + nhân vật; nhận props agent và trạng thái task |
| .pixel-agent onclick | Chọn agent bằng ID thật, mở bảng điều khiển hiện có |
| #agentRows / #teamCards | Đội đang lưu trong SQLite, không seed đè |
| #newTask / taskForm | Gửi task qua API hiện có, đúng agent/folder |
| taskDetail | Tiến độ, kết quả, stop task, phiên mới và lịch sử thật |
| #columns | Ánh xạ các trạng thái hiện tại sang các cột; giữ lỗi/gián đoạn hiển thị rõ |
| #motionToggle | Chỉ dừng hoạt ảnh; không dừng tiến trình CLI |
| Settings | Giữ lựa chọn folder/runtime và cấu hình app hiện có |

## Phân biệt source hiển thị và logic mẫu

`preview/index.html` là bản tham chiếu độc lập nên có localStorage, đội seed và task thủ công. Không copy phần data/fresh/save, submitReview/dán kết quả, promptFor hoặc link mở ChatGPT thành luồng thực thi chính của app local. Chỉ lấy markup/style và hình ảnh, giữ nguyên backend/store đang dùng.

`pixel-office.js` ở bản tham chiếu đọc biến global `data`, gọi `taskForm` và `window.updatePixelOffice`. Khi port React, thay chúng bằng props/callback và vòng đời component. Cleanup requestAnimationFrame khi unmount; không tạo nhiều loop khi render lại. Renderer vẽ canvas logic 480x300, sprite 32x40, image-rendering:pixelated và imageSmoothingEnabled=false. Hỗ trợ prefers-reduced-motion.

`components/agent-sprite.js` xuất drawAgentSprite(canvas, actor, direction, step). actor có index và agent.color dạng #RRGGBB; direction nhận down/up/left/right; step nhận 0 hoặc 1. Dùng module này trực tiếp hoặc port sang TypeScript. Gán ngoại hình ổn định theo agent ID hoặc lưu variant, không để nhân vật đổi diện mạo khi đổi thứ tự danh sách.

Bản tham chiếu chỉ vẽ tối đa 8 nhân vật trong phòng. Nếu app có nhiều hơn, cần cho chọn nhóm hoặc mở rộng bố cục; không ẩn agent khỏi danh sách quản lý.

## Trạng thái và chuyển động

Animation đi lại của source cũ chỉ mang tính trang trí. Trong app thật, dùng sự kiện runtime để điều khiển rảnh/đang thực thi/chờ xử lý/hoàn tất/lỗi/gián đoạn. Không sao chép nguyên đường đi rảnh cho nhân vật đang chạy task. Các nhãn như “chưa kết nối AI”, “làm việc qua ChatGPT”, “dán kết quả” và “đã lưu trên trình duyệt” phải thay bằng thông tin đúng với app local.

## Phạm vi

Chỉ đổi frontend; không thay runtime, không cài lại CLI, không sửa quyền truy cập, không xóa SQLite. Không xuất dữ liệu phiên/task vào bundle. Kiểm tra luồng task chỉ đọc và báo trung thực những bước chưa chạy được trên máy người dùng.
