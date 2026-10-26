# v14 pantry sprite

Project asset: preview/assets/pantry-white-v14.png, metadata pantry-white-v14-regions.json. Built-in image generation tool used as an edit/reference from pantry-fridge-atlas.png. Alpha54.5%zero;1536×1024 RGBA. Measured connected alpha components to choose crop metadata; no programmatic image editing.

Generation prompt: Transparent game furniture atlas for Pixel Office WHITE modern office; replace rustic wood/cream/green pantry with one modern white office counter in a2×2 grid, top-left front0°, top-right right90°, bottom-left rear180°, bottom-right left270°. Four isolated complete objects with transparent padding/gutters, consistent size and orthographic game elevation, fine illustrated pixel shading matching the original furniture. Matte white slab doors, three pale blue-gray drawers, silver handles, flush gray plinth, white quartz worktop, stainless sink and chrome faucet on left, compact silver espresso machine center, white/silver microwave right, two pale blue mugs and one small white plant pot. Low smooth white backsplash. No wooden shelving, hanging mugs, vines, gingham, country cabinetry, refrigerator, people, text, logo, UI, or opaque background. Side/rear views of the same object, not unrelated cabinets.

# v13 login illustration

Asset: preview/assets/entrance-white-v13.png. Generated with the built-in image generation tool as an edit of entrance.png. Brief: preserve the detailed chibi/pixel illustration, four walking characters and receptionist, same wide composition and blank login panel in the right third; replace wood facade/old furnishings with white modern office, pale blue glass, white tile, modern monitors/printer/pantry, green foliage and sunny daytime; no baked text or controls. HTML form stays separate. Original in-game sprite PNGs are unchanged.

# Assets v6
Built-in image generation:
1. Empty white office shell: giữ camera game overhead/front, trắng/xám nhạt, gạch trắng viền xám, ánh sáng mát, không đồ. File room-white.png.
2. Isolated equipment: bàn dài trống, monitor đơn, monitor đôi, printer trên tủ trắng, bàn trắng trống, ghế xám; nền alpha, overhead/front camera. equipment-white.png, dùngrectchínhxác.
3. Four employee styles: lavender/white bomber, blond/navy blazer, dark ponytail/coral hoodie, silver hair/headphones; mỗi kiểu front/back và2sidewalkposes; nền alpha. character-styles.png.

Ảnh dùng trong gói; các JSON source rectangles được tạo bằng phân tích alpha trên từng vùng hàng của asset, không sửa bitmap qua Python. Renderer tự chọn đúng frame và căn chân.


v7 built-in image generation: equipment direction atlas6rows×4views, legs point down while objects turn on floor; white long desk/desk/monitor/dual/chair/printer. Seated atlas8rows×3views(front/back/right) preserving8identities, bentknees and handsforward, no chair/desk baked in. Both actualalpha PNG. Metadata extracted by alpha component bounds inside manually verified row/column regions, no pixel-image modification through Python.


v8 built-in image generation: 4x4 architecture atlas: opaque white partition/glass partition/closeddoor/opendoor, four floor orientations, no floor/no people, alpha transparent. Source rectangles measured from alpha components in verified regions; renderer masks door openings in wall canvas.


v9 CharacterStudio là code-native pixel rig, không ảnh imagegen mới. Các layer và walk/seated/props sinh bằngcanvas; không chỉnh bằngPython các ảnh cũ. Giữ atlas cũ để đối chiếu phongcách. Khu vệ sinh cũng là fixturecanvas.


v9.1: Built-in image generation, reference characters-atlas.png bottom row An, exact originalstyle/identity, purplecardigan/creampants/brownbun/flower/crossbodypurse. Requested4complete fullbodywalkframes facingright in2x2grid, padding, alternatingstride, transparent. Saved assets/an-walk-full.png + source rectangles from largestalpha component percell. NoPythonimageediting. Original atlas bytes untouched.


v10: No new generated raster assets. Orthogonal walls/doors/newfixtures and directional furniture fallback are code-native canvas in planner-renderer.js, with footprint from shared model. Existing illustrated chibi atlases remain byte-for-byte unchanged. Original furniture images retained for horizontal directions.


v10: No new generated raster assets. Orthogonal walls/doors/newfixtures and directional furniture fallback are code-native canvas in planner-renderer.js, with footprint from shared model. Existing illustrated chibi atlases remain byte-for-byte unchanged. Original furniture images retained for horizontal directions.


v11 built-in imagegen: reference furniture-atlas.png for cozy shaded illustrated/pixel-texture prop style; create8isolated complete props, top row same pantrycounter infront/right/back/left, bottomrow same tall2doorfridge front/right/back/left. Counter includesoak top/cream sagecabinet/sink silverfaucet/espresso/microwave/mugrail/cups/plants. Fridge silver2doors/boldhandles/dispenser/magnet/rearcoil. Orthographic uprightverticals, transparentRGBA,no people/no labels, generouspadding. Finalprojectasset preview/assets/pantry-fridge-atlas.png + pantry-fridge-regions.json. Sheetcellwidths varied, metadata measures actualalpha components (noPythonimageedit). Roombackground is new code-native CSS/SVG in straight-office.js/css, no rasterbackgroundedit. Originalcharacter assets untouched.
