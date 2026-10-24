# Pixel Office — bản 3: mở lên là văn phòng phủ kín khung app

Bản này thay thế PixelOffice_Game_Layout.zip trước đó.

Thay đổi chính: bỏ zoom, kéo map và nút về toàn cảnh. Văn phòng tự bố trí theo kích thước màn hình, sàn phủ kín viewport ngay khi mở; nhân vật giữ đúng tỷ lệ. Các chức năng vẫn nằm ở dock dưới, panel mở từ phía dưới.

## Đưa sang Antigravity

1. Giải nén và đặt folder `pixel-office-fullscreen` vào dự án AgentOffice hiện có.
2. Mở AgentOffice trong Antigravity, copy PROMPT_CHO_ANTIGRAVITY.txt và gửi cho Agent.
3. Chỉ port frontend; giữ nguyên CLI/backend/SQLite/folder và lịch sử đang hoạt động.

Có thể mở preview/index.html để xem bản mẫu. Preview là frontend độc lập với luồng prompt thủ công, chưa chạy Antigravity. Không thay app local bằng preview.

## Source

preview/index.html: layout toàn màn hình và form mẫu.
preview/game-layout.css: toàn bộ layout kiểu game và các override auto-fill.
preview/game-ui.js: dock và bottom panel.
preview/pixel-office.js: phòng tự thích nghi viewport, sprite, đường đi và hoạt ảnh; KHÔNG còn camera zoom/pan.
styles/base.css: CSS nền trích từ HTML.
components/agent-sprite.js: bộ vẽ sprite độc lập.
INTEGRATION.md: hướng dẫn port, QA.md: kiểm tra đã chạy.

Bản này phủ toàn bộ khung app/trình duyệt. Không tự ép trình duyệt vào chế độ ẩn thanh địa chỉ; nút fullscreen tùy chọn chỉ hoạt động khi người dùng bấm. Đây không phải thao tác thu phóng bản đồ.

Gói không chứa database, lịch sử task, credential hay cấu hình hosting. Map bản mẫu hiện tối đa 8 nhân vật; tất cả agent vẫn truy cập được ở panel Đội agent.
