# Pixel Office — giao diện từ bản ChatGPT

Đây là bản sao source giao diện của văn phòng đã làm trong ChatGPT, với bộ nhân vật pixel chibi mới nhất. Gói này là tài liệu thiết kế và source để port frontend, không phải backend của app local.

## Cách đưa vào Antigravity

1. Giải nén ZIP. Đặt nguyên folder `chatgpt-ui-reference` vào thư mục dự án `AgentOffice` hiện có. Không chép đè folder server/client hay database.
2. Mở chính dự án `AgentOffice` bằng Antigravity.
3. Mở `PROMPT_CHO_ANTIGRAVITY.txt`, sao chép toàn bộ và gửi cho Agent.
4. Để Antigravity port giao diện vào frontend đang có và giữ kết nối agent thật.

## Các file

- `preview/index.html`: layout đầy đủ, CSS và tương tác của bản tham chiếu.
- `preview/pixel-office.js`: phòng pixel và bộ nhân vật chibi, animation đi lại.
- `styles/layout.css`: toàn bộ CSS trích nguyên từ bản tham chiếu.
- `components/agent-sprite.js`: bộ vẽ sprite độc lập, không có storage hoặc gọi agent.
- `INTEGRATION.md`: ánh xạ các vùng giao diện với dữ liệu/runtime thật.
- `PROMPT_CHO_ANTIGRAVITY.txt`: hướng dẫn triển khai.
- `MANIFEST.json`: checksum các source tham chiếu.

Có thể mở `preview/index.html` để xem bản tham chiếu. Preview này chưa thực thi Antigravity; các task trong đó chỉ là luồng thủ công của bản web cũ. Không dùng preview thay app local.

Gói không có dữ liệu công việc, database, thông tin đăng nhập, API key hay cấu hình hosting.
