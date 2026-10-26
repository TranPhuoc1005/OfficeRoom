# v14 — Pantry trắng, ưu tiên hướng dẫn này cho phần quầy

Load thêm assets/pantry-white-v14.png và pantry-white-v14-regions.json vào OfficePantryArt. planner-renderer chọn OfficePantryArt riêng khi type pantrycounter; fridge tiếp tục dùng OfficePropArt/atlas cũ. Đừng thay toàn bộ atlas chung rồi làm hỏng tủ lạnh. Khi image/metadata sẵn sàng phải render lại cả catalog và scene; trong lúc chờ dùng fallback native trắng.

Crop rect theo metadata, không chia đều 2×2 vì đối tượng nằm lệch tâm các ô. Thứ tự mảng0/1/2/3 =0/90/180/270°. PNG RGBA1536×1024, alpha thật; không xoay một ảnh bitmap để giả hướng. OfficePlanner.bounds chỉ đổi khung hiển thị pantry: height .68*size+8, width (hướng dọc .44, ngang1.1)*size+8. Footprint/collision/roomOffset/owner/layout không thay. Việc đổi art áp dụng cho object pantrycounter cũ và tạo phòng pantry mới, không cần migration dữ liệu.

Không đưa art quầy gỗ cũ trở lại qua nhánh renderer, catalog hoặc room builder. Giữ chức năng tea affordance hiện tại; thay ảnh không biến pantry thành công cụ AI hoặc dịch vụ mới. Giữ mọi chức năng v13 và backend/Auth thật khi port.

# v13 — Hướng dẫn hiện hành, ưu tiên hơn lịch sử bên dưới

## Sàn và tọa độ

OfficePlanner.floorBounds dùng viewport local: left2px/right width-2px, top32%height, bottom height-3px. clampPosition dựa trên footprint đã xoay, không chặn tâm ở x.98/y.82 và không dựa vào toàn bộ bitmap trong suốt. Phòng chừa thêm nửa bề dày vách ở mép. Navigation mở toàn bộ cột và hàng dưới; planning-grid/guide tới bottom0. Không dùng padding giả hoặc zoom để che vùng chết.

Giữ office-rail.css cuối cùng và ResizeObserver của v12: viewport sàn kết thúc trước cột controls. Bám lưới vẫn bật; gần mép dùng clamp chính xác thay vì bắt buộc để lại1ô. Thêm vật mới tìm khoảng trống, tránh nằm dưới WC kín.

## Vách và cửa

OfficePlanner.mergeWalls hợp nhất khoảng của vách cùng type, parity góc xoay, scale, roomId; cùng đường tâm trong1.5px, gap≤.24ô. Giữ ID đang chọn, loại đoạn còn lại, cập nhật roomOffset. Không gộp vách kính với tường trắng hoặc vách của hai phòng khác nhau. Giới hạn đoạn96ô. Transaction thuộc change/undo; production phải lưu union atomically, không gọi backend mỗi pointermove. Cửa được dựng bằng canvas geometry khung/cánh kính trượt: mở để lối trống, đóng để chặn. OfficeRooms vẫn cắt lỗ tường theo footprint cửa. Đừng chỉ đổi hình mà bỏ collision.

## Xoay cả phòng

OfficePlanner.rotateRoom transaction clone; xoay offset trong hệ trục tương thích workstation (u*c+v*s,-u*s+v*c), đổi roomWidth/roomDepth khi góc lẻ90, đổi rotation mọi thành viên, kiểm sàn/va chạm trước commit. syncRooms rồi OfficeAttachments.sync; cập nhật offset thiết bị liên kết. IDs/ownerId/mount/follow/deskId/roomId giữ nguyên. validate cho nền đã xoay: width và depth6..18ô; builder vẫn width8..18/depth6..12. Chọn WC qua vỏ kín; pantry qua nền hoặc Chọn cả phòng. Nút size/lật/nhân bản phòng vẫn khóa; xoay phòng đã mở. Không tự xoay bitmap cả phòng như một ảnh phẳng.

## Đồ hiện hành và login

CATALOG giữ định nghĩa cell cũ hidden để nhận import; modernize chuyển model sang loại trắng, xóa thảm xanh theo yêu cầu. Chụp backup trước migration; production dùng workspace backup/migration atomically. Không reset cả layout, không đổi agent IDs, không xóa task. Bàn cũ cần màn hình rời để giữ workstation hợp lệ. Nếu đạt100vật, không thêm lén vượt giới hạn; hiện thiếu thiết bị để người dùng xử lý. Các mẫu trắng bổ sung được vẽ native trong planner-renderer; idle rules nhận whitesofa/whitetable.

assets/entrance-white-v13.png là ảnh đăng nhập mới; office-rail.css thay nguồn ảnh và màu form. Đưa asset và style vào login thật nhưng giữ Supabase Auth, đăng ký/khôi phục/session/RLS hiện có. Không bê preview readonly inputs, nút Vào văn phòng mẫu, query view=office hoặc dữ liệu giả sang production.

Giữ Windows Runner/agy, từng agent CWD/folder/source/history/conversation riêng, dừng task, output thật, máy in và taxi của app thật. Không lấy prototype timer làm bằng chứng backend hoàn thành. Không thay nhân vật chibi hiện tại bằng character-studio procedural.

--- Lịch sử các bản trước ---

# v12 — QUYẾT ĐỊNH HIỆN HÀNH

Load office-rail.css cuối. Tách office và controls bằng layoutcolumns thật: world-viewport.right=--office-rail. Cộtphải có nền riêng, dock/editor/panel/camera/Lễtân nằm trọn bên trong. Không chỉtăng z-index, không đặtpadding vàoảnh trongkhi actor vẫn dùng cảwindowcoords. CSS:has chọn railwidth theo trạngthái panel; nếuengine/componentkhôngdùng:has thì derive từUIstate tươngđương.

ResizeObserver theo dõi kíchthước viewport, không chỉ windowresize. Panel mở/đóng không phát windowresize nên thiếuobserver sẽ làm canvas/actor/va chạm vẫn ởsizecũ và tiếp tục nằm dưới thanh. resize guard width/height<1; update local vw/vh, call layout.resize để sync rooms/attachments/nav, rescale actorpositions, bỏ leisuregoal cũ/reservation để tínhlại. Không sửa trạngthái task/CLI/reportbackend. Không gửi layoutDB mỗi lần đổi cột; canonical IDs/anchor/mount/roomOffset giữ nguyên, coordscon derived.

Không bê demo localStorage/loginbypass/manualtask sang production; giữAuth/RLS/workspace/CWD/sessions/history/stop/runner/taxi thật. Fullscreen làappviewport gồm2cột, không thêmzoomcontrol. Giữartchibi gốc và mọichức năng v11.

--- Lịch sử v11 ---

# v11 — QUYẾT ĐỊNH HIỆN HÀNH

1. Load straight-office.css SAU mọi CSS trước, straight-office.js SAU cozy-office.js và TRƯỚC decor-editor.js. Nó thay nội dung .office-art bằng wall/window/floor CSS/SVG chínhdiện, gỡ backgroundimage phối cảnh active. Giữ floor horizon32% và các normalizedanchors cũ để không dời furniture/agent. Lưới sàn dùngunit2ô và flooroffset, lưới planner1ô. Không perspective/skew hay các đường tile hội tụ. Art nhân vật giữ nguyên.
2. decor-actions được dời ra khỏi decorFields/scrollinspector thành action-tray ngay trước footer. IDs/eventhandlers vẫn giữ. Có tablist catalog/properties; chọn/thêm object chuyển properties. Trườngscroll riêng, tray khôngflexshrink/khôngoverflowhidden. Khi roomBuilder mở, tabs/content/tray ẩn để tránh thiếu chỗ. Không nhét nútXóa ở cuối panelbịclipping. Nếu portcomponentframework, tách ScrollArea và stickyfooter thực, kiểm650pxheight.
3. renderPrivacy dùng rect của floorroomKindrestroom, phủ opaque shell theo z=roomfront+120, doorz=roomfront+130 để vẫn click cửa. Đồthànhviêntrừdoor ẩn qua visibility; roofclick/drag chọnfloor và cùngmodelmovegroup. pointercapture dùng roofelement thật, không dùng hiddenfloorbutton. cozyposition hỏi privateRoom(x,y), ẩn actor khi trong rect, cập nhật occupancy nhỏ; không gửi API/network mỗi frame. Giữ collision/path/roomOffset/door.open thật. Không giảdoorclosed nếu đangopen. Không cần/rendercutaway bêntrong, không cho đổi thànhpixelrig.
4. OfficePropArt tải assets/pantry-fridge-atlas.png+regionsJSON, renderer dùngsourceRect theo rotation/90; fridge bounds cao cốđịnh1.55size, pantry.80size để tránh tủlạnh co thànhmáyin/hộpngang khi xoay. Đây là8ảnh4view cùngmodel, khớp anchorfloor hiệncó. Metadata đo8alpha connectedcomponents, không chia đều sheet vì cell thực khácwidth. Không crop nhầm quầy rộng sang hìnhbên cạnh. Giữalpha khiđưa vàoassetpipeline. Sourceimagegeneration không được thayảnhchibi gốc.
5. Giữ v10rooms/snap/owner/parentattachments/report/task/stop/taxi và mọibackend thật. Production occupancy lấy từ authority của scene/life, không tự đồng bộ vònganimation vàoSupabase. GiữAuth/RLS/history/CWD/session. Cácgiớihạnv10 vềroomresize, sink/fridgedecoration vànomultiplayerauthority hiện vẫn áp dụng.

--- Lịch sử v10 và trước ---

# v10 — QUYẾT ĐỊNH HIỆN HÀNH

Giữ v9.1 chibi gốc, không tải CharacterStudio. Tất cả backend/Auth/runner/sourcefolder/session/taxi tiếp tục như cũ. Chỉ port editor/geometry và các field mới qua adapter dữ liệu hiện có.

## Hình học và trục
OfficeWorkstations.footprint có nhánh architecture với length(ô)*unit*scale và thickness.35ô; unit=min(viewportWidth/48,viewportHeight/30),90°/270° hoán đổi w/h thật. Không dùng chiều rộng frame ảnh làm chiều dài vách dọc. Legacy khônglength vẫn được đọc theo kíchthước cũ để tươngthích; editor migration planningVersion1 đo lại dài theo footprint cũ, thêm length, giữ ID/anchor/owner.

OfficePlanner rect/bounds/height dùng cùng footprint cho hit-test/drawing/collision/snap. PlannerRenderer vẽ architecture và đồ mới bằngcanvas; một số furniture xoay dọc có representation hìnhhọc thay assetbitmap90°, hướng ngang vẫn dùng artcũ. Không quay ảnh bàn ghế trên mặt phẳng màn hình gây hình nằm nghiêng. Có thể port sang scenegraph/mesh/4direction assets đúng phối cảnh, nhưng trục floor và footprint phải giữ nguyên. Nhân vật vẫn dùng ảnh chibi gốc.

## Snap và thao tác
OfficePlanner.snap nhận proposed pixelanchor, chọn grid hoặc gần nhất trong8px giữa tâm/cạnh, nối endpoints vách trong14px; bỏ objectscon/đồngroom để tránh tựbắt. Guides dùng cùngworldpixels. Alt bypass, Shift khóa tọa độ còn lại sau snap. Parentattachment vẫn do OfficeAttachments.sync. Không gửi updateSupabase mỗi pointermove; commit một transaction khi thả. Undo/redo/import thay objectinstances: mọi click cửa phải lookup currentobject by ID, không dùng closure giữ objectcũ.

## Phòng
OfficePlanner.buildRoom pure+atomic: kiểm bounds/khoảng trống/limit trước, sinh roomfloor +4walls+door +WC/sink hoặc pantrycounter/fridge/table. roomId là groupID, không phải workspace/projectID. roomWidth/roomDepth là ô, roomKind restroom/pantry. Cáccon có roomOffset:{u,v} theo ô quanh centerfloor; syncRooms trước attachment và nav để không hở góc/cửa khi resize/aspectchange. x/y của con là derived, không là canonical. Khi kéo thànhviên riêng cậpnhật offset; ra khỏi rect thì bỏ roomId/offset. Dời floor dời cảgroup; giới hạnbounds vàkhôngđè đồ khác. Xóa phòng một transaction, Undo phục hồi cả nhóm, detach children ngoài group tham chiếu parentđãxóa. Copy một món phải xóa roomId/offset để không snap vềvịtrí cũ.

Nền phòng chữnhật không rotate/resize sau tạo trong MVP; UI disabled đúng. Chưa có roomdetector từ tườngtựvẽ, điệnnước/đườngống/tầng2, nhiều ghếsofa, accesscontrol hay autoopen cửa. Bồn rửa/fridge chỉdecoration. Door mở/đóng dùng OfficeRooms cutout+strict collision. Navigation dùng cell gầnvuông theo min(width/48,height/32) để cửa không kẹt trên màn hình siêurộng. Khi tải/resize, syncRooms trước tạo obstaclecache. Chưa có physicscollision actorvớiactor.

## Persistence production
Giữ trường mới tronglayout schema/export/import; validate numbers/enums/IDs/offsets. Giữ versioncheck/transactions/workspace RLS, migration snapshot/rollback trongappthật. Không reset bố cục người dùng, không seed các phòng QA từtrìnhduyệt vào database. Multi-client cần1authority/reservation/life như quyếtđịnh trước. Đây vẫn là demo localStorage/manualtask; không copy login/querybypass vào production.

--- Lịch sử v9.1 và các phiên bản trước ---

# v10 — QUYẾT ĐỊNH HIỆN HÀNH

Giữ v9.1 chibi gốc, không tải CharacterStudio. Tất cả backend/Auth/runner/sourcefolder/session/taxi tiếp tục như cũ. Chỉ port editor/geometry và các field mới qua adapter dữ liệu hiện có.

## Hình học và trục
OfficeWorkstations.footprint có nhánh architecture với length(ô)*unit*scale và thickness.35ô; unit=min(viewportWidth/48,viewportHeight/30),90°/270° hoán đổi w/h thật. Không dùng chiều rộng frame ảnh làm chiều dài vách dọc. Legacy khônglength vẫn được đọc theo kíchthước cũ để tươngthích; editor migration planningVersion1 đo lại dài theo footprint cũ, thêm length, giữ ID/anchor/owner.

OfficePlanner rect/bounds/height dùng cùng footprint cho hit-test/drawing/collision/snap. PlannerRenderer vẽ architecture và đồ mới bằngcanvas; một số furniture xoay dọc có representation hìnhhọc thay assetbitmap90°, hướng ngang vẫn dùng artcũ. Không quay ảnh bàn ghế trên mặt phẳng màn hình gây hình nằm nghiêng. Có thể port sang scenegraph/mesh/4direction assets đúng phối cảnh, nhưng trục floor và footprint phải giữ nguyên. Nhân vật vẫn dùng ảnh chibi gốc.

## Snap và thao tác
OfficePlanner.snap nhận proposed pixelanchor, chọn grid hoặc gần nhất trong8px giữa tâm/cạnh, nối endpoints vách trong14px; bỏ objectscon/đồngroom để tránh tựbắt. Guides dùng cùngworldpixels. Alt bypass, Shift khóa tọa độ còn lại sau snap. Parentattachment vẫn do OfficeAttachments.sync. Không gửi updateSupabase mỗi pointermove; commit một transaction khi thả. Undo/redo/import thay objectinstances: mọi click cửa phải lookup currentobject by ID, không dùng closure giữ objectcũ.

## Phòng
OfficePlanner.buildRoom pure+atomic: kiểm bounds/khoảng trống/limit trước, sinh roomfloor +4walls+door +WC/sink hoặc pantrycounter/fridge/table. roomId là groupID, không phải workspace/projectID. roomWidth/roomDepth là ô, roomKind restroom/pantry. Cáccon có roomOffset:{u,v} theo ô quanh centerfloor; syncRooms trước attachment và nav để không hở góc/cửa khi resize/aspectchange. x/y của con là derived, không là canonical. Khi kéo thànhviên riêng cậpnhật offset; ra khỏi rect thì bỏ roomId/offset. Dời floor dời cảgroup; giới hạnbounds vàkhôngđè đồ khác. Xóa phòng một transaction, Undo phục hồi cả nhóm, detach children ngoài group tham chiếu parentđãxóa. Copy một món phải xóa roomId/offset để không snap vềvịtrí cũ.

Nền phòng chữnhật không rotate/resize sau tạo trong MVP; UI disabled đúng. Chưa có roomdetector từ tườngtựvẽ, điệnnước/đườngống/tầng2, nhiều ghếsofa, accesscontrol hay autoopen cửa. Bồn rửa/fridge chỉdecoration. Door mở/đóng dùng OfficeRooms cutout+strict collision. Navigation dùng cell gầnvuông theo min(width/48,height/32) để cửa không kẹt trên màn hình siêurộng. Khi tải/resize, syncRooms trước tạo obstaclecache. Chưa có physicscollision actorvớiactor.

## Persistence production
Giữ trường mới tronglayout schema/export/import; validate numbers/enums/IDs/offsets. Giữ versioncheck/transactions/workspace RLS, migration snapshot/rollback trongappthật. Không reset bố cục người dùng, không seed các phòng QA từtrìnhduyệt vào database. Multi-client cần1authority/reservation/life như quyếtđịnh trước. Đây vẫn là demo localStorage/manualtask; không copy login/querybypass vào production.

--- Lịch sử v9.1 và các phiên bản trước ---

# v9.1 — QUYẾT ĐỊNH HIỆN HÀNH, ƯU TIÊN HƠN GHI CHÚ V9 BÊN DƯỚI

Người dùng yêu cầu GIỮ NGUYÊN nhân vật chibi cũ. Không dùng CharacterStudio.draw, không auto-convert appearance hoặc đổi spriteVariant theo preset7nam pixel. index không tải character-studio.js; code còn đó chỉ là thử nghiệm chưa dùng. UI đã trở về8mẫu atlas gốc. Existing appearance fields không bị xóa, chỉ không dùng để render.

Tùy chỉnh từng tóc/mặt/áo/quần/kính +7mẫu nam phải được làm bằng asset cùng nét chibi gốc, có đăng ký tọa độ/scale nhất quán ở idle/walk/seated, được duyệt trước khi thay hình. Chưa có bộ layer này trong bản v9.1. Không báo chức năng đã hoàn thành bằng việc dùng artstyle khác.

An: thêm an-walk-full.png + an-walk-regions.json. Chỉ thay nguồnframe di chuyển cho variant3; idle/back/seated và các nhân vật khác giữ ảnh gốc.4frame riêng có đầy đủ giày/búi tóc, mirrorleft. Không dùng hàng cuối walk-cycle.png vì ảnh cũ cắt tới y887. Frame theo quãng đường như trước. Chưa có4direction walk mới, up/down dùngside giống model hiện tại.

Sinh hoạt vẫn giữ bằng office-life.js + affordances/path/seat; art chibi dùng sprite ngồi gốc, không vẽ đạo cụ từ rig pixel vào hình. Giữ icon/bubble và ưu tiên task/report. Các phần về production/Supabase/RLS/runner/reservation bên dưới vẫn áp dụng. Phần v9 nói CharacterStudio là renderer mặc định đã bị thay thế bởi quyết định v9.1 này.

---

# Port vào AgentOffice thật

## Giữ hệ thống đang có
Đọc source/model/schema hiện tại trước khi sửa. Không reset Supabase, local database, workspace, source folder, agentId, conversationId, lịch sử task, đồ trang trí hoặc session Auth. Không bỏ taxi/animation hiện có. Đổi skin/UI qua adapter. Không ship readonly login, seed task, bypass query ?view=office hoặc thao tác task thủ công của demo vào production.

## Bố cục và kho đồ
Đổi nền thành room-white.png: chỉ tường trắng/cửa sổ/sàn gạch, không chứa đồ. 15 vật rời. 6 thiết bị mới dùng equipment-white.png và source rectangles trong equipment-regions.json. 9 loại cũ dùng furniture-atlas.png và `regions` trong decor-editor.js. Màn hình là đồ riêng, có thể đặt trên bàn; preview cho đặt tự do, không có snap/parent tự động. Giữ chức năng xoay/tile/snap/kho đồ đang có trong app thật nếu có.

Kho đồ dưới cao khoảng160px desktop, thấp hơn nhiều bản v5; một hàng cuộn ngang. Inspector nằm cùng dải, có nút thu kho. Dock thấp~62px, không zoom, không kéo camera, phòng full viewport ngay từ đầu. Tỉ lệ mặc định đồ giảm25%, nhân vật khoảng70–94px desktop/60px mobile. Không tự nhân lại scale đã lưu trong DB; dùng displayScale adapter nếu cần.

Preview vẫn đọc key pixel-office-layout-v5 để giữ ID/bố cục cũ, không chuyển phòng trắng bằng cách xóa dữ liệu. Bản thật giữ model/repository hiện có, commit kéo một lần khi pointerup, pointercancel hồi trạng thái trước kéo, xử lý optimistic update/realtime/conflict theo workspace. Layout có `{version:1,objects:[{id,type,x,y,scale,flip,label}]}` để tham chiếu; adapter sang tọa độ hiện tại thay vì đổi schema vô cớ. v7 thay gán theo index bằng ownerId/deskId thật trong model preview; xem phầnv7 dưới.

## Sprite fix
`assets/sprite-regions.json` chứa rect từng sprite sau khi phân tích alpha và ranh giới hàng. Không suy ra row height bằng image.height/4: ảnh walk có các hàng KHÔNG đều, đó là nguyên nhân chân nhân vật hàng trước xuất hiện trên đầu hàng sau. `paint` giữ aspect ratio, căn giữa và cùng điểm chân. 3 nhân vật cũ dùng cycle8frame, An và4 kiểu mới dùng2pose full-body, vì hàng cuối asset8frame cũ chạm mép ảnh. Không quảng cáo là đủ8frame cho cả8 kiểu. Bộ ảnh chỉ có đi ngang/mirror; khi đi dọc vẫn dùng mặt nghiêng. Chưa có bộ sprite4hướng/ngồi gõ phím mới. Giữ bộ4hướng/taxi app đang có nếu tốt hơn.

## Máy in / báo cáo
`office-reports.js` có sync/markReady/enqueue/claim/advance/open. Demo lấy task.status review/done với đầu ra result không rỗng. markReady xác nhận nội dung hoàn tất; lưu nháp không tạo bản in mới. Report snapshot chứa id, taskId, agentId, agentName, title, content, created, state, publishedAt. `content` giữ nguyên văn kết quả task, không tạo báo cáo giả, không phân tích diff bằng phỏng đoán. Kết quả mới được gửi lại sẽ tạo reportrevision mới; cùng task/cùng nội dung không in trùng. Một máy in phục vụ một agent mỗi lượt. Không có máy in thì chờ; không giả vờ đã in.

Bản thật: lắng nghe sự kiện task COMPLETED/SUCCESS từ backend có taskId/output/version. Persist báo cáo bằng repository Supabase hiện có và RLS theo workspace. Dùng server revision hoặc eventId để idempotency, không chỉ hash demo. Gọi enqueue với kết quả thật; animation chỉ thể hiện delivery, không được quyết định task backend đã hoàn tất hay không. Mất mạng/tab đóng/reload chỉ phục hồi cosmetic state, không chạy lại AI task. Báo cáo phải vẫn đọc được từ backend ngay cả khi tắt animation/reduced-motion; cho phép bỏ qua delivery animation trong trường hợp đó. Nếu không có đường đến máy in, báo blocked/waiting và vẫn cho xem kết quả task; không teleport xuyên đồ hoặc đổi nội dung.

Khi agent tới printer approach point, animation hiện trạng thái in, sau đó badge Báo cáo tăng. Click máy in/dock mở danh sách, click report xem nội dung, copy hoặc tải txt. Không gọi window.print hay máy in vật lý; đây là vật trang trí mang ý nghĩa xuất bản câu trả lời trong app.


# v7 — xoay đồ, chủ sở hữu, ngồi làm việc

office-workstations.js là model hàm thuần, không phụ thuộc DOM. Nó được nạp trước scene/editor. Mỗi object thêm rotation0/90/180/270, ownerId(agentId hoặc null), deskId(bàn liên kết hoặc null). Chỉ thêm trường mặc định khi thiếu; giữ nguyên id/type/position/scale/flip. Không tự gán lại bộ cũ. Bản thật dùng adapter sang schema đang có, migration có rollback, RLS theo workspace; kiểm tra FK agent/bàn phải cùng workspace ở server.

assign(): bàn/ghế/màn hình nhận chủ rõ ràng. Chỉ tự liên kết ghế/màn hình đã cùng chủ với bàn gần nhất. Chuyển chủ của bàn thì tháo liên kết của món không còn cùng chủ, giữ món/owner để người dùng xử lý. Không âm thầm lấy đồ chưa gán hoặc đồ người khác. Nhân bản đồ mới không kế thừa ownerId/deskId để tránh một ghế bị coi là của nhiều người. Xóa bàn giữ ghế/màn hình nhưng resolver báo thiếu liên kết; không xóa cascade đồ.

rotate(): transaction trên snapshot. Chọn Xoay cả bộ sẽ xoay điểm bố trí các vật deskId liên kết quanh bàn, dựa trên pixel viewport rồi đổi về tọa độ chuẩn hóa. Nếu món ra ngoài phòng, hủy toàn bộ lần xoay, không kẹp méo riêng từng vị trí. Undo/redo giữ ID và ownership. Footprint vật cứng đổi ngang/dọc theo góc; navigation cache bị xóa khi layout đổi.

resolve(): tìm ghế theo ownerId, bàn theo deskId và cùng ownerId, màn hình theo ownerId+deskId. Kiểm tra cùng hướng, ghế đúng phía và khoảng cách, màn hình gần bàn. Mỗi vật chỉ có một owner. Nếu agent có nhiều ghế, chọn bộ hợp lệ đầu tiên; chưa có cơ chế bàn dài chia2người/2slot. Muốn chia bàn dài trong app thật thì thêm model workstationSlots rõ ràng, không dùng chungchairId giữa2agent.

Scene đi tới tọa độ ghế đã gán, không chọn bàn theo index. Navigation của agent chỉ cho bỏ collision ghế riêng để ngồi; vẫn tránh bàn/cây/ghế người khác. Đường đến cell center được nối đoạn cuối tới điểm ghế, không teleport về bàn. Arrival → seated=true, hướng lấy từ rotation; sprite ngồi tách riêng. Layout/chủ/trạng thái task thay đổi sẽ hủy path/seat và tính lại. Không tới được thì hiện workIssue, không ngồi chỗ khác.

Khi task có output, máy in preempt ghế: bỏ seated, đi ra bằng path và quy trình report v6 giữ nguyên. Scene là biểu diễn, không quyết định task runner đã chạy hay thành công. Nếu UI báo thiếu chỗ, backend task vẫn phải phản ánh đúng trạng thái thật. Với reduced-motion/paused cần giữ task/output đọc được; không bắt backend chờ animation.

Assets: equipment-turns.png + turn-regions.json là4view cho6thiếtbịtrắng: bàn dài, bàn trắng, màn hình đơn, đôi, ghế xám, máy in. Với ghế, góc0logic hướng lên dùng hình lưng ghế, 90 dùngsideleft,180front,270sideright. Vật legacy9loại còn dùng xoay bitmap2D, chưa có đủ sprite4view; không khẳng định mọi cây/sofa/kệ đã có mặt sau mới. Giữ asset hướng tốt hơn của app thật nếu có. PNG vẫn là minh họa2D, không có độ chính xác đồ họa3D; bố trí và collision được kiểm tra theo footprint.

characters-seated.png + seated-regions.json có8nhânvật×3pose front/back/right(mirrorleft), fullbodyngồi không kèm ghế. Căn chân bằng crop riêng, giữ tỉ lệ, giảm chiều cao pose khi ngồi. Hiệu ứng⌨ là chỉ báo làm việc, không phải tool progress thật; trong app thật bật theo taskstate/toolstate từ runner.

Giữ mọi chức năng có sẵn: drag/snap/rotate thật, inventory, taxi, sourcefolder riêng, conversation history, stop/retry, Auth/Supabase. Không copy readonlylogin hoặc ?view=office bypass vào production.


# v8 — liên kết vật lý và kiến trúc

office-attachments.js: màn hình có mount:{u,v}, ghế có follow:{u,v}; deskId là parent. u/v là tọa độ trên mặt phẳng local của bàn theo kích thước chuẩn hóa, không dùng tọa độ screen cố định. sync suy ra x/y/rotation theo bàn và kích thước viewport. Màn hình có surface lift và depth=parent depth+3, tránh bị mặt bàn che. Front/back/side là sprite2D; chưa có mô phỏng cơ học3D hoặc tự chống màn hình chồng nhau.

Drop hit bằng cursor trên mặt bàn, không dùng cả hình vuông canvas. Vùng nhận chuột của từng sprite được giới hạn theo source image bounds để khoảng trong suốt của bàn không chặn màn hình/ghế. Kéo màn hình ra khỏi bàn sẽ tách; có nút Tách bộ. Gán Bàn liên kết và Bám lên bàn tạo mount thật; màn hình không còn chỉ có deskId metadata. Khi ghép món chưa có chủ vào bàn đã có chủ thì kế thừa chủ; không ghép món của2agent khác nhau. Thay chủ bàn vẫn cần xử lý foreign ownership theo model hiện có, không bỏ kiểm tra workspace.

Bố cục cũ attachmentVersion chưa1: nâng cấp các deskId hợp lệ bằng attach có bảo toàn ID, tạo tọa độ local và clamp trên mặt bàn/phía ghế, có thể làm món dịch nhẹ để bám đúng mặt bàn. Không reset phòng. Trong app thật migration phải có snapshot/rollback và atomic batch. Mọi thay đổi parent/children, kể cả move/rotate/scale/delete/owner, cần đồng bộ Supabase bằng transaction/version check; lưu canonical mount/follow, không gửi update từng animation frame. Xóa parent giữ món con và vị trí cuối, tháo liên kết. Nếu dùng scene graph/tile engine hiện có thì port sang parent transform thay vì copy x/y projection.

Kiến trúc: architecture.png + architecture-regions.json có4hướng cho tường trắng, vách kính, cửa đóng, cửa mở. office-rooms.js tạo opening khi cửa cùng trục đè lên đoạn tường, cắt collision đoạn đó và vẽ khe trên wall canvas. Cửa đóng có footprint riêng, cửa mở bỏ footprint cánh cửa. Pathfinding dùng cell intersection cho tường/cửa mỏng để không lọt qua khe do sample center; furniture vẫn dùng điểm để agent vào chỗ ghế không bị chặn nhầm. Chưa có tự nhận diện tên phòng, điện/mạng/điều hòa, quyền ra vào từng phòng hoặc tự mở cửa khi agent tới.

Giữ mọi backend/Auth/runner/taskhistory/taxi thật đang có. Layout chỉ biểu diễn cửa và vật dụng; mở cửa không tạo quyền truy cập source folder hoặc hệ thống. Server room và gameplay monetization là đề xuất trong file riêng, không được báo đã kết nối runtime hoặc thu tiền.


# v9 — Character Studio và idle simulation

Load character-studio.js, office-life.js trước cozy-office.js. living-office.css phải sau mọi CSS cũ. Không đổi ID agent/workspace/task/object; appearance/personality/showThoughts là field thêm, không thay model thực. character-studio.normalize chỉ nhận enum hợp lệ và hexcolor; map appearance theo variant mặc định nếu chưa có, không reset agent. Source cũ vẫn giữ atlas. Nếu production dùng spriteengine, tạo layeredrig tương đương, giữ chỉnh từng phần và7mẫu nam thực sự khác nhau.

CharacterStudio.draw vẽ limb độc lập, cycle theo quãng đường, view up/down/side/mirrorleft, seated và đạo cụ trà/phone/controller/headphone. Không bitmaprotate toàn thân thay đổi hướng. office-life.js chứa pure needs/choices/finish/cancel, không có gọi network. Tính cách balanced/social/gamer/quiet thay trọng số chọn hoạt động. localStorage pixel-office-life-v9 chỉ lưu needs, không lưu reservation/session active; pagehide và15s flush. Không claim deterministic giữa nhiều máy: production chọn1authority cho presence/life (runner hoặc phòngserver) rồi stream animationstate; không để mỗi client claim cùng sofa/WC. Giữ TTL/lease nếu mất kết nối.

cozy-office.js giữ ưu tiên: report job/taskdoing hủy leisure và bỏ giữ chỗ; trạng thái làmviệc lấy adapter backend thật. activityPlaces lấy affordance từ đồ đã bố trí, tìm approach trên grid; chọn route có thể tới. Reservation theo objectId, một người/vật. Sofa ngồi vẽ ở seatX/seatY/depth, internal position vẫn là điểm tiếp cận; đứngdậy trở lại approach. Đây là pose transition2D, không enginephysics hay reservation nhiều slot. Chưa cho nhiều người ngồi chungsofa; bàn dài vẫn1owner theo v8.

Khu vệ sinh là fixture vẽ bằngcanvas, solid và có objecttype restroom. Dùng cùng layout export/import, undo/redo, scale/rotation. Người dùng tự xây phòng/vách/cửa, cửa đóng chặn đường; không tự mở khóa cửa. Privacy ở dạng trạng thái WC/ẩn avatar, không dữ liệu nhạy cảm thực. Nếu đổi kiểu đồ trong production, map affordance thay hardcode label; không dựa vào tên đồ người dùng có thể sửa.

Phải merge adapter vào app hiện có: không thay Supabase Auth/RLS bằng demo reception/querybypass, không thay runner bằng taskmanual, không tự xóa taxi/source folders/session/history. Appearance vàlayout sync workspace-scoped có versioncheck. Chỉ update canonical appearance/layout khi thay đổi, không ghi SQLite/Supabase mỗi animationframe. Cấm idle activity tự gọi CLI/AI hoặc sửa file; real agent chạy khi người dùng giao task theo quyền hiện có.
