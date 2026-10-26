# Pixel Office v14 — Pantry hiện đại cho văn phòng trắng

Quầy pantry mới: tủ trắng phẳng, ngăn kéo xanh xám nhạt, tay nắm bạc, mặt quartz sáng và chân tủ liền. Có bồn rửa/vòi chrome, máy cà phê, lò vi sóng, cốc xanh và một chậu cây nhỏ. Bỏ thiết kế gỗ nâu/xanh đậm, kệ treo, dây leo, khăn caro kiểu quán cà phê. Đủ4ảnh trước/phải/sau/trái, tự thay hình cho tất cả object type pantrycounter đang có; không cần xóa đặt lại, không đổi vị trí/chủ/roomId. Tủ lạnh và nhân vật giữ nguyên.

Đã cập nhật preview, catalog thumbnail, renderer và prompt Antigravity. Các chức năng/bố cục v13 giữ nguyên.

# Pixel Office v13 — Toàn bộ sàn có thể thiết kế

Bản thiết kế frontend và bộ source để chuyển vào Antigravity. Mở preview bằng static server như trước. Giữ nguyên bộ nhân vật chibi gốc.

- Đặt đồ theo chân đế tới sát mép phải và xuống cuối sàn; bỏ giới hạn cũ 82% chiều cao. Lưới thiết kế cũng phủ tới đáy.
- Hai vách cùng loại, cùng trục, cùng kích thước và cùng nhóm phòng sẽ gộp khi nối đầu hoặc chồng lên nhau. Giữ ID của đoạn đang chọn; một lần Hoàn tác trả lại hai đoạn.
- Cửa đổi sang khung và cánh kính trượt, có trạng thái mở/đóng thật trong mô hình đường đi.
- WC và pantry: chọn cả phòng rồi bấm ↻90° hoặc R. Cả nền, tường, cửa, nội thất xoay quanh tâm. Nếu vướng đồ khác/mép sàn, app báo lý do; dời phòng ra chỗ trống trước.
- Kho chỉ hiển thị đồ hiện hành. Bàn/ghế gỗ, sofa xanh, thảm xanh, kệ và đồ trang trí đời đầu được bỏ khỏi kho. Đồ cũ đang đặt được chuyển sang mẫu trắng tương ứng; thảm xanh bỏ khỏi scene. Lưu bản sao trước chuyển đổi tại key bố cục có hậu tố -before-white-v13. ID, chủ sở hữu và liên kết bàn được giữ; bàn cũ có laptop liền được bổ sung màn hình rời nếu đủ giới hạn100vật.
- Cảnh đăng nhập mới là văn phòng trắng sáng, giữ nét chibi. Đây vẫn là giao diện minh họa đăng nhập, không phải Auth thật.

Chức năng backend, Auth, Supabase, CLI/runner chưa được nối trong preview này. PROMPT_CHO_ANTIGRAVITY.txt hướng dẫn đưa vào app thật và giữ nguyên các phần đó. Tùy chỉnh quần/áo/tóc bằng layer chibi vẫn chưa hoàn thiện; bộ8nhân vật chibi gốc vẫn được dùng.
