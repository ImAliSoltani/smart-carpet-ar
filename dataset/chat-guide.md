# ساخت تصاویر کاتالوگ — راهنمای کار دستی

این فایل **مشتق** است. از `backend/scripts/catalog_profiles.py` ساخته می‌شود:

```bash
cd backend && uv run python scripts/build_catalog_dataset.py
```

**۴۰ فرش × ۵ تصویر = ۲۰۰ تصویر.**

## روش کار

۱. برای **هر فرش یک گفتگوی تازه** باز کنید. همان چیزی که باعث می‌شود
   تصویر دوم عکسی *از* تصویر اول باشد، اگر گفتگو را ادامه دهید باعث
   می‌شود فرش هفدهم شبیه شانزدهم دربیاید. چهل گفتگو، نه یکی.
۲. پنج پیام را **به همین ترتیب** بفرستید. پیام اول فرش را می‌سازد؛ چهار
   پیام بعدی از همان فرش عکس می‌گیرند — چون تصویر پیام قبلی در گفتگو هست،
   لازم نیست چیزی را دوباره آپلود کنید.
۳. هر تصویر را با **همان نامی که زیرش نوشته شده** ذخیره کنید، در:

```
data/catalog-gen/
```

نام فایل تنها چیزی است که تصویر را به فرش وصل می‌کند. اگر نامش عوض شود،
اسکریپت ingest پیدایش نمی‌کند.

## پیش از پذیرفتن هر `flat` این‌ها را نگاه کنید

چهار تصویر دیگر فقط باید قشنگ باشند. `flat` **اندازه‌گیری می‌شود**:
پایپ‌لاین AR پرسپکتیوش را تصحیح و در فایل سه‌بعدی پخت می‌کند، امبدینگ
جست‌وجوی بصری از رویش حساب می‌شود، و فیلتر رنگ رنگ‌هایش را می‌خواند.
اشتباهش بعد از ingest قابل تعمیر نیست.

**مهم‌ترینشان پس‌زمینه است.** استخراج رنگ فقط پیکسل‌های *شفاف* را رد
می‌کند و JPEG آلفا ندارد، پس هرچه فرش نیست هم فرش حساب می‌شود. یک فرش
سرمه‌ای قم با حاشیه‌ی سفید، ۳۳٪ سفید خوانده شد و زیر «سفید» فایل شد.

| ببینید | اگر نبود، همین را بفرستید |
|---|---|
| از روبه‌رو و کاملاً صاف است؟ لبه‌ها موازی کادرند و ذوزنقه نیست؟ | «دقیقاً از بالا و عمود بر فرش، بدون هیچ پرسپکتیوی. لبه‌ها کاملاً موازی کادر.» |
| فرش کل کادر را پر کرده؟ **هیچ پس‌زمینه‌ای دیده نمی‌شود؟** | «فرش باید کل کادر را پر کند؛ چهار لبه‌ی فرش همان چهار لبه‌ی تصویر باشد و هیچ پس‌زمینه‌ای — حتی سفید — دیده نشود.» |
| چیزی رویش نیست؟ گلدان، میز، سایه‌ی چیز دیگر؟ | «هیچ شیئی روی فرش یا نزدیکش نباشد و هیچ سایه‌ای رویش نیفتد.» |
| نور یکنواخت است؟ لکه‌ی روشن یا تیره ندارد؟ | «نور یکنواخت و پخش روی تمام سطح، بدون لکه‌ی روشن و بدون سایه‌روشن.» |
| نسبت ابعادش با اندازه‌ای که خواسته‌ایم می‌خواند؟ | «نسبت ابعاد را دقیقاً همان چیزی کن که در پیام اول خواستم.» |

اگر بعد از دو بار اصلاح درست نشد، از اول شروع کنید — گفتگویی که یک بار
بد فهمیده، معمولاً همان را تکرار می‌کند.

## پیشرفت

- [ ] ۱. `qom-silk-lachak-sormei` — فرش دستباف ابریشم قم — لچک‌ترنج زمینه سرمه‌ای
- [ ] ۲. `qom-silk-afshan-firoozei` — فرش دستباف ابریشم قم — افشان فیروزه‌ای
- [ ] ۳. `esfahan-kork-lachak-kerem` — فرش دستباف اصفهان — کرک و ابریشم، لچک‌ترنج نخودی
- [ ] ۴. `naeen-9la-afshan-sormei` — فرش دستباف نایین ۹ لا — افشان سرمه‌ای
- [ ] ۵. `tabriz-50raj-toranji-laki` — فرش دستباف تبریز ۵۰ رج — ترنجی لاکی
- [ ] ۶. `kashan-lachak-laki` — فرش دستباف کاشان — لچک‌ترنج لاکی
- [ ] ۷. `mashhad-afshan-arghavani` — فرش دستباف مشهد — افشان ارغوانی
- [ ] ۸. `kerman-golfarang-kerem` — فرش دستباف کرمان — گل فرنگ زمینه نخودی
- [ ] ۹. `arak-sultanabad-golfarang` — فرش دستباف اراک — سلطان‌آباد گل‌دار
- [ ] ۱۰. `birjand-toranji-sabz` — فرش دستباف بیرجند — ترنجی سبز
- [ ] ۱۱. `qashqai-ashayeri-ghermez` — گبه‌ی دستباف قشقایی — عشایری قرمز
- [ ] ۱۲. `baluch-kenareh-ghahvei` — کناره‌ی دستباف بلوچ — عشایری قهوه‌ای
- [ ] ۱۳. `hamedan-hendesi-ghermez` — فرش دستباف همدان — هندسی قرمز
- [ ] ۱۴. `ardabil-hendesi-abi` — فرش دستباف اردبیل — هندسی آبی
- [ ] ۱۵. `tabriz-patineh-vintage-tousi` — فرش دستباف تبریز — پتینه‌ی طوسی
- [ ] ۱۶. `yazd-sadeh-nokhodi` — فرش دستباف یزد — ساده‌ی نخودی
- [ ] ۱۷. `kashan-1200-lachak-sormei` — فرش ماشینی کاشان ۱۲۰۰ شانه — لچک‌ترنج سرمه‌ای
- [ ] ۱۸. `kashan-1200-afshan-talaei` — فرش ماشینی کاشان ۱۲۰۰ شانه — افشان طلایی
- [ ] ۱۹. `kashan-1500-lachak-firoozei` — فرش ماشینی کاشان ۱۵۰۰ شانه — لچک‌ترنج فیروزه‌ای
- [ ] ۲۰. `aran-1000-toranji-laki` — فرش ماشینی آران و بیدگل ۱۰۰۰ شانه — ترنجی لاکی
- [ ] ۲۱. `aran-700-goldar-laki` — فرش ماشینی آران و بیدگل ۷۰۰ شانه — گل‌دار لاکی
- [ ] ۲۲. `kashan-1200-goldar-surati` — فرش ماشینی کاشان ۱۲۰۰ شانه — گل‌دار صورتی
- [ ] ۲۳. `mashhad-modern-tousi` — فرش ماشینی مشهد — مدرن طوسی
- [ ] ۲۴. `kashan-1500-modern-abi` — فرش ماشینی کاشان ۱۵۰۰ شانه — مدرن آبی‌خاکستری
- [ ] ۲۵. `aran-modern-meshki` — فرش ماشینی آران و بیدگل — مدرن مشکی
- [ ] ۲۶. `kashan-modern-sefid` — فرش ماشینی کاشان — مدرن سفید
- [ ] ۲۷. `kashan-sadeh-nokhodi` — فرش ماشینی کاشان — ساده‌ی نخودی
- [ ] ۲۸. `aran-sadeh-tousi` — فرش ماشینی آران و بیدگل — ساده‌ی طوسی
- [ ] ۲۹. `kashan-sadeh-sabz` — فرش ماشینی کاشان — ساده‌ی سبز زیتونی
- [ ] ۳۰. `mashhad-vintage-narenji` — فرش ماشینی مشهد — وینتیج نارنجی
- [ ] ۳۱. `kashan-vintage-abi` — فرش ماشینی کاشان — وینتیج آبی
- [ ] ۳۲. `aran-hendesi-meshki-sefid` — فرش ماشینی آران و بیدگل — هندسی مشکی و سفید
- [ ] ۳۳. `kashan-hendesi-banafsh` — فرش ماشینی کاشان — هندسی بنفش
- [ ] ۳۴. `kashan-kodak-firoozei` — فرش ماشینی کاشان — اتاق کودک فیروزه‌ای
- [ ] ۳۵. `aran-kodak-surati` — فرش ماشینی آران و بیدگل — اتاق کودک صورتی
- [ ] ۳۶. `kashan-kenareh-afshan-sormei` — کناره‌ی ماشینی کاشان ۱۲۰۰ شانه — افشان سرمه‌ای
- [ ] ۳۷. `aran-kenareh-hendesi-ghahvei` — کناره‌ی ماشینی آران و بیدگل — هندسی قهوه‌ای
- [ ] ۳۸. `kashan-naharkhori-lachak-ghermez` — فرش ماشینی کاشان — لچک‌ترنج قرمز ناهارخوری
- [ ] ۳۹. `mashhad-naharkhori-modern-ghahvei` — فرش ماشینی مشهد — مدرن قهوه‌ای ناهارخوری
- [ ] ۴۰. `kashan-padari-ashayeri-narenji` — پادری ماشینی کاشان — عشایری نارنجی

---

## ۱ از ۴۰ — فرش دستباف ابریشم قم — لچک‌ترنج زمینه سرمه‌ای

`qom-silk-lachak-sormei` · دستباف · ۷۰ رج · قم
رنگ‌های خواسته‌شده: blue, cream, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `qom-silk-lachak-sormei__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Qom, deep indigo field, ivory central medallion with fine curvilinear arabesques, symmetrical corner spandrels, narrow ivory-and-gold border, hand-knotted natural silk, fine lustrous pile that shifts tone with the light. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `qom-silk-lachak-sormei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `qom-silk-lachak-sormei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `qom-silk-lachak-sormei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `qom-silk-lachak-sormei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲ از ۴۰ — فرش دستباف ابریشم قم — افشان فیروزه‌ای

`qom-silk-afshan-firoozei` · دستباف · ۶۰ رج · قم
رنگ‌های خواسته‌شده: turquoise, cream, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `qom-silk-afshan-firoozei__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Qom, turquoise field with an all-over afshan scatter of flowering vines, no central medallion, ivory and soft gold blossoms, hand-knotted natural silk, fine lustrous pile that shifts tone with the light. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `qom-silk-afshan-firoozei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `qom-silk-afshan-firoozei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `qom-silk-afshan-firoozei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `qom-silk-afshan-firoozei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳ از ۴۰ — فرش دستباف اصفهان — کرک و ابریشم، لچک‌ترنج نخودی

`esfahan-kork-lachak-kerem` · دستباف · ۵۵ رج · اصفهان
رنگ‌های خواسته‌شده: cream, red, blue

**گفتگوی تازه باز کنید.**

### پیام ۱ → `esfahan-kork-lachak-kerem__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Isfahan, pale ivory field, lacquer-red medallion with silk highlights, indigo corner spandrels, dense floral tracery, wool pile with silk-highlighted motifs, the silk catching light against matte wool. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `esfahan-kork-lachak-kerem__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `esfahan-kork-lachak-kerem__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `esfahan-kork-lachak-kerem__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `esfahan-kork-lachak-kerem__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۴ از ۴۰ — فرش دستباف نایین ۹ لا — افشان سرمه‌ای

`naeen-9la-afshan-sormei` · دستباف · ۹ لا · نایین
رنگ‌های خواسته‌شده: blue, white, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `naeen-9la-afshan-sormei__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Nain, navy field with an all-over afshan of white and pale blue vine work, silk-highlighted outlines, restrained palette, wool pile with silk-highlighted motifs, the silk catching light against matte wool. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `naeen-9la-afshan-sormei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `naeen-9la-afshan-sormei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `naeen-9la-afshan-sormei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `naeen-9la-afshan-sormei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۵ از ۴۰ — فرش دستباف تبریز ۵۰ رج — ترنجی لاکی

`tabriz-50raj-toranji-laki` · دستباف · ۵۰ رج · تبریز
رنگ‌های خواسته‌شده: red, blue, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `tabriz-50raj-toranji-laki__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Tabriz, lacquer-red field, large navy-and-ivory central medallion, tight symmetrical floral field, short dense pile, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `tabriz-50raj-toranji-laki__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a potted olive tree in an unglazed terracotta pot, and a pair of leather slippers left at the edge of the rug. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `tabriz-50raj-toranji-laki__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `tabriz-50raj-toranji-laki__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `tabriz-50raj-toranji-laki__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۶ از ۴۰ — فرش دستباف کاشان — لچک‌ترنج لاکی

`kashan-lachak-laki` · دستباف · ۴۰ رج · کاشان
رنگ‌های خواسته‌شده: red, blue, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-lachak-laki__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Kashan, classic Kashan: madder-red field, indigo medallion, ivory spandrels, palmette-and-vine field, wide main border, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-lachak-laki__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-lachak-laki__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-lachak-laki__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-lachak-laki__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۷ از ۴۰ — فرش دستباف مشهد — افشان ارغوانی

`mashhad-afshan-arghavani` · دستباف · ۴۰ رج · مشهد
رنگ‌های خواسته‌شده: pink, red, purple

**گفتگوی تازه باز کنید.**

### پیام ۱ → `mashhad-afshan-arghavani__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Mashhad, magenta-plum field with large-scale afshan blossoms, navy outlines, generous open spacing between motifs, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `mashhad-afshan-arghavani__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `mashhad-afshan-arghavani__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `mashhad-afshan-arghavani__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `mashhad-afshan-arghavani__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: carved wooden ceiling beams overhead, a deep niche in the plaster holding three antique ceramic bowls, and a potted fig tree in a glazed pot. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۸ از ۴۰ — فرش دستباف کرمان — گل فرنگ زمینه نخودی

`kerman-golfarang-kerem` · دستباف · ۴۰ رج · کرمان
رنگ‌های خواسته‌شده: cream, pink, green

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kerman-golfarang-kerem__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Kerman, ivory field with European-style rose bouquets (gol farang), soft pink and sage green, scrolling leaf border, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kerman-golfarang-kerem__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a potted olive tree in an unglazed terracotta pot, and a pair of leather slippers left at the edge of the rug. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kerman-golfarang-kerem__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kerman-golfarang-kerem__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kerman-golfarang-kerem__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۹ از ۴۰ — فرش دستباف اراک — سلطان‌آباد گل‌دار

`arak-sultanabad-golfarang` · دستباف · ۳۵ رج · اراک
رنگ‌های خواسته‌شده: red, blue, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `arak-sultanabad-golfarang__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Arak (Sultanabad), Sultanabad village weave: large-scale angular floral sprays, brick-red field, indigo and gold, long soft pile, vegetable dyes, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 250:350 aspect ratio (a 250×350 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `arak-sultanabad-golfarang__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a tall paper floor lamp casting a warm pool of light, and two hardback books stacked on the floor. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `arak-sultanabad-golfarang__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `arak-sultanabad-golfarang__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `arak-sultanabad-golfarang__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۰ از ۴۰ — فرش دستباف بیرجند — ترنجی سبز

`birjand-toranji-sabz` · دستباف · ۴۰ رج · بیرجند
رنگ‌های خواسته‌شده: green, cream, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `birjand-toranji-sabz__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Birjand, olive-green field, ivory central medallion, gold vine border, restrained and symmetrical, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `birjand-toranji-sabz__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a potted olive tree in an unglazed terracotta pot, and a pair of leather slippers left at the edge of the rug. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `birjand-toranji-sabz__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `birjand-toranji-sabz__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `birjand-toranji-sabz__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۱ از ۴۰ — گبه‌ی دستباف قشقایی — عشایری قرمز

`qashqai-ashayeri-ghermez` · دستباف · ۳۰ رج · شیراز — قشقایی
رنگ‌های خواسته‌شده: red, orange, brown

**گفتگوی تازه باز کنید.**

### پیام ۱ → `qashqai-ashayeri-ghermez__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Shiraz, Qashqai nomadic weave: brick-red ground, angular geometric medallions and stylised animals, slightly asymmetric, hand-spun wool, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. deliberately imperfect symmetry, as a nomadic weave from memory. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `qashqai-ashayeri-ghermez__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a simple wooden ladder leaning against the wall with a folded blanket over one rung. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `qashqai-ashayeri-ghermez__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `qashqai-ashayeri-ghermez__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `qashqai-ashayeri-ghermez__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۲ از ۴۰ — کناره‌ی دستباف بلوچ — عشایری قهوه‌ای

`baluch-kenareh-ghahvei` · دستباف · ۳۰ رج · سیستان — بلوچ
رنگ‌های خواسته‌شده: brown, black, red

**گفتگوی تازه باز کنید.**

### پیام ۱ → `baluch-kenareh-ghahvei__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Sistan, Baluch nomadic runner: dark brown-black ground, small repeating geometric motifs, deep madder accents, dark tonal palette, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 80:300 aspect ratio (a 80×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `baluch-kenareh-ghahvei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `baluch-kenareh-ghahvei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `baluch-kenareh-ghahvei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `baluch-kenareh-ghahvei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۳ از ۴۰ — فرش دستباف همدان — هندسی قرمز

`hamedan-hendesi-ghermez` · دستباف · ۳۰ رج · همدان
رنگ‌های خواسته‌شده: red, gray, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `hamedan-hendesi-ghermez__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Hamedan, Hamedan village rug: rust-red field, bold angular geometric lattice, single-weft coarse weave, camel and ivory accents, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `hamedan-hendesi-ghermez__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a tall paper floor lamp casting a warm pool of light, and two hardback books stacked on the floor. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `hamedan-hendesi-ghermez__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `hamedan-hendesi-ghermez__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `hamedan-hendesi-ghermez__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۴ از ۴۰ — فرش دستباف اردبیل — هندسی آبی

`ardabil-hendesi-abi` · دستباف · ۳۵ رج · اردبیل
رنگ‌های خواسته‌شده: blue, white, gray

**گفتگوی تازه باز کنید.**

### پیام ۱ → `ardabil-hendesi-abi__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Ardabil, north-west Persian geometric: blue and white stepped lattice, crisp angular medallions, cool restrained palette, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `ardabil-hendesi-abi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `ardabil-hendesi-abi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `ardabil-hendesi-abi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `ardabil-hendesi-abi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۵ از ۴۰ — فرش دستباف تبریز — پتینه‌ی طوسی

`tabriz-patineh-vintage-tousi` · دستباف · ۴۰ رج · تبریز
رنگ‌های خواسته‌شده: gray, pink, purple

**گفتگوی تازه باز کنید.**

### پیام ۱ → `tabriz-patineh-vintage-tousi__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Tabriz, overdyed patina rug: classical Persian medallion faded under a wash of soft grey, muted rose and bone showing through, worn low pile, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `tabriz-patineh-vintage-tousi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `tabriz-patineh-vintage-tousi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `tabriz-patineh-vintage-tousi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `tabriz-patineh-vintage-tousi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۶ از ۴۰ — فرش دستباف یزد — ساده‌ی نخودی

`yazd-sadeh-nokhodi` · دستباف · ۳۰ رج · یزد
رنگ‌های خواسته‌شده: cream, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `yazd-sadeh-nokhodi__flat.png`

```text
A top-down flat texture photograph of a hand-knotted Persian carpet from Yazd, undyed ivory flat field with a single narrow woven border, visible cotton texture, no medallion, minimal, flat cotton weave, matte and low, visible warp and weft. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `yazd-sadeh-nokhodi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `yazd-sadeh-nokhodi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `yazd-sadeh-nokhodi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `yazd-sadeh-nokhodi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۷ از ۴۰ — فرش ماشینی کاشان ۱۲۰۰ شانه — لچک‌ترنج سرمه‌ای

`kashan-1200-lachak-sormei` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: blue, cream, red

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-1200-lachak-sormei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, navy field, ivory medallion and corner spandrels, dense classical floral tracery, crisp machine-woven definition, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-1200-lachak-sormei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-1200-lachak-sormei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-1200-lachak-sormei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-1200-lachak-sormei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۸ از ۴۰ — فرش ماشینی کاشان ۱۲۰۰ شانه — افشان طلایی

`kashan-1200-afshan-talaei` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: gold, cream, brown

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-1200-afshan-talaei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, warm gold field with all-over afshan vine scatter, no medallion, bronze and cream tones, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-1200-afshan-talaei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-1200-afshan-talaei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-1200-afshan-talaei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-1200-afshan-talaei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۱۹ از ۴۰ — فرش ماشینی کاشان ۱۵۰۰ شانه — لچک‌ترنج فیروزه‌ای

`kashan-1500-lachak-firoozei` · ماشینی · ۱۵۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: turquoise, cream, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-1500-lachak-firoozei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, turquoise field, ivory medallion with gold outline, very fine machine-woven detail, classical spandrels, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 250:350 aspect ratio (a 250×350 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-1500-lachak-firoozei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a potted olive tree in an unglazed terracotta pot, and a pair of leather slippers left at the edge of the rug. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-1500-lachak-firoozei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-1500-lachak-firoozei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-1500-lachak-firoozei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۰ از ۴۰ — فرش ماشینی آران و بیدگل ۱۰۰۰ شانه — ترنجی لاکی

`aran-1000-toranji-laki` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: red, blue, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-1000-toranji-laki__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, lacquer-red field, large navy medallion, ivory border, traditional machine-woven Persian layout, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-1000-toranji-laki__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-1000-toranji-laki__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-1000-toranji-laki__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-1000-toranji-laki__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: carved wooden ceiling beams overhead, a deep niche in the plaster holding three antique ceramic bowls, and a potted fig tree in a glazed pot. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۱ از ۴۰ — فرش ماشینی آران و بیدگل ۷۰۰ شانه — گل‌دار لاکی

`aran-700-goldar-laki` · ماشینی · ۷۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: red, cream, green

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-700-goldar-laki__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, red field with large simple floral repeat, cream border, lower-density machine weave, softer motif edges, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-700-goldar-laki__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a tall paper floor lamp casting a warm pool of light, and two hardback books stacked on the floor. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-700-goldar-laki__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-700-goldar-laki__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-700-goldar-laki__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۲ از ۴۰ — فرش ماشینی کاشان ۱۲۰۰ شانه — گل‌دار صورتی

`kashan-1200-goldar-surati` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: pink, cream, green

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-1200-goldar-surati__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, dusty pink field, small scattered rose bouquets, ivory border, light and airy, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-1200-goldar-surati__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-1200-goldar-surati__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-1200-goldar-surati__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-1200-goldar-surati__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۳ از ۴۰ — فرش ماشینی مشهد — مدرن طوسی

`mashhad-modern-tousi` · ماشینی · ۱۰۰۰ شانه · مشهد
رنگ‌های خواسته‌شده: gray, white, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `mashhad-modern-tousi__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Mashhad, modern abstract: soft grey and white blurred bands, no traditional border, low-contrast contemporary design, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 250:350 aspect ratio (a 250×350 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `mashhad-modern-tousi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `mashhad-modern-tousi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `mashhad-modern-tousi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `mashhad-modern-tousi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۴ از ۴۰ — فرش ماشینی کاشان ۱۵۰۰ شانه — مدرن آبی‌خاکستری

`kashan-1500-modern-abi` · ماشینی · ۱۵۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: gray, blue, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-1500-modern-abi__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, contemporary abstract in slate blue and grey, viscose sheen, soft gradient wash, no border, machine-woven viscose, silky sheen, smooth short pile. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-1500-modern-abi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-1500-modern-abi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-1500-modern-abi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-1500-modern-abi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۵ از ۴۰ — فرش ماشینی آران و بیدگل — مدرن مشکی

`aran-modern-meshki` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: black, gray, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-modern-meshki__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, near-black field with fine white geometric line work, high contrast, contemporary, no traditional border, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-modern-meshki__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a tall paper floor lamp casting a warm pool of light, and two hardback books stacked on the floor. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-modern-meshki__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-modern-meshki__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-modern-meshki__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۶ از ۴۰ — فرش ماشینی کاشان — مدرن سفید

`kashan-modern-sefid` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: white, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-modern-sefid__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, off-white carved-pile rug: pattern readable only as relief and shadow, tonal, no colour contrast, machine-woven viscose, silky sheen, smooth short pile. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-modern-sefid__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-modern-sefid__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-modern-sefid__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-modern-sefid__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: carved wooden ceiling beams overhead, a deep niche in the plaster holding three antique ceramic bowls, and a potted fig tree in a glazed pot. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۷ از ۴۰ — فرش ماشینی کاشان — ساده‌ی نخودی

`kashan-sadeh-nokhodi` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: cream, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-sadeh-nokhodi__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, completely plain solid ivory pile, no pattern, no border, even colour, machine-woven viscose, silky sheen, smooth short pile. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-sadeh-nokhodi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a potted olive tree in an unglazed terracotta pot, and a pair of leather slippers left at the edge of the rug. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-sadeh-nokhodi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-sadeh-nokhodi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-sadeh-nokhodi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۸ از ۴۰ — فرش ماشینی آران و بیدگل — ساده‌ی طوسی

`aran-sadeh-tousi` · ماشینی · ۷۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: gray

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-sadeh-tousi__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, completely plain solid mid-grey pile, no pattern, even colour, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-sadeh-tousi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-sadeh-tousi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-sadeh-tousi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-sadeh-tousi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۲۹ از ۴۰ — فرش ماشینی کاشان — ساده‌ی سبز زیتونی

`kashan-sadeh-sabz` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: green

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-sadeh-sabz__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, completely plain solid olive-green pile, no pattern, even colour, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-sadeh-sabz__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a tall paper floor lamp casting a warm pool of light, and two hardback books stacked on the floor. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-sadeh-sabz__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-sadeh-sabz__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-sadeh-sabz__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۰ از ۴۰ — فرش ماشینی مشهد — وینتیج نارنجی

`mashhad-vintage-narenji` · ماشینی · ۱۰۰۰ شانه · مشهد
رنگ‌های خواسته‌شده: orange, brown, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `mashhad-vintage-narenji__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Mashhad, distressed vintage print: burnt orange and rust, deliberately worn and faded pattern, low contrast, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `mashhad-vintage-narenji__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `mashhad-vintage-narenji__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `mashhad-vintage-narenji__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `mashhad-vintage-narenji__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۱ از ۴۰ — فرش ماشینی کاشان — وینتیج آبی

`kashan-vintage-abi` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: blue, cream, gray

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-vintage-abi__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, faded vintage blue: washed-out classical pattern, distressed border, muted and dusty, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 200:300 aspect ratio (a 200×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-vintage-abi__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-vintage-abi__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-vintage-abi__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-vintage-abi__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۲ از ۴۰ — فرش ماشینی آران و بیدگل — هندسی مشکی و سفید

`aran-hendesi-meshki-sefid` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: black, white, gray

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-hendesi-meshki-sefid__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, bold black and white geometric repeat, sharp edges, high contrast, contemporary, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 150:225 aspect ratio (a 150×225 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-hendesi-meshki-sefid__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-hendesi-meshki-sefid__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-hendesi-meshki-sefid__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office in a Persian-Iranian apartment. The floor around the rug is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-hendesi-meshki-sefid__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۳ از ۴۰ — فرش ماشینی کاشان — هندسی بنفش

`kashan-hendesi-banafsh` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: purple, gray, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-hendesi-banafsh__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, violet and grey geometric blocks, playful but not childish, clean modern lines, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 100:150 aspect ratio (a 100×150 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-hendesi-banafsh__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-hendesi-banafsh__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-hendesi-banafsh__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-hendesi-banafsh__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۴ از ۴۰ — فرش ماشینی کاشان — اتاق کودک فیروزه‌ای

`kashan-kodak-firoozei` · ماشینی · ۱۰۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: turquoise, white, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-kodak-firoozei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, bright turquoise with simple rounded geometric shapes, soft high pile, cheerful but not cartoonish, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 100:150 aspect ratio (a 100×150 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-kodak-firoozei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-kodak-firoozei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-kodak-firoozei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom in a Persian-Iranian apartment. The floor around the rug is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-kodak-firoozei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: an orosi window — the traditional Persian lattice of coloured stained glass — throwing red, blue and amber patches of light across the floor, a low travertine plinth below it with a bronze ewer standing on it. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۵ از ۴۰ — فرش ماشینی آران و بیدگل — اتاق کودک صورتی

`aran-kodak-surati` · ماشینی · ۷۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: pink, white

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-kodak-surati__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, soft pink with cloud-like abstract shapes in white, long plush pile, gentle, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 100:150 aspect ratio (a 100×150 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-kodak-surati__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-kodak-surati__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-kodak-surati__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-kodak-surati__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۶ از ۴۰ — کناره‌ی ماشینی کاشان ۱۲۰۰ شانه — افشان سرمه‌ای

`kashan-kenareh-afshan-sormei` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: blue, red, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-kenareh-afshan-sormei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, narrow navy runner with continuous afshan vine pattern along its length, red and ivory accents, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 80:300 aspect ratio (a 80×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-kenareh-afshan-sormei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-kenareh-afshan-sormei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-kenareh-afshan-sormei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway in a Persian-Iranian apartment. The floor around the rug is a wide-plank whitewashed oak parquet floor, heavy visible grain, open knots and clear seams between the boards — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-kenareh-afshan-sormei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: carved wooden ceiling beams overhead, a deep niche in the plaster holding three antique ceramic bowls, and a potted fig tree in a glazed pot. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۷ از ۴۰ — کناره‌ی ماشینی آران و بیدگل — هندسی قهوه‌ای

`aran-kenareh-hendesi-ghahvei` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل
رنگ‌های خواسته‌شده: brown, cream, gold

**گفتگوی تازه باز کنید.**

### پیام ۱ → `aran-kenareh-hendesi-ghahvei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, brown runner with repeating angular geometric bands, cream and gold accents, dense weave, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 80:300 aspect ratio (a 80×300 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `aran-kenareh-hendesi-ghahvei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low ceramic bowl of pomegranates on the floor and a linen curtain half drawn at the window edge. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `aran-kenareh-hendesi-ghahvei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `aran-kenareh-hendesi-ghahvei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `aran-kenareh-hendesi-ghahvei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a tall brick arch in the far wall, a deep plaster alcove beside it holding a single large turquoise-glazed ceramic vessel, and two small framed Persian miniatures hung on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۸ از ۴۰ — فرش ماشینی کاشان — لچک‌ترنج قرمز ناهارخوری

`kashan-naharkhori-lachak-ghermez` · ماشینی · ۱۲۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: red, gold, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-naharkhori-lachak-ghermez__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, red field, gold medallion and spandrels, busy classical floral field that hides marks, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The rug completely fills the frame in 250:350 aspect ratio (a 250×350 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-naharkhori-lachak-ghermez__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a chevron parquet floor in weathered ash, grey-beige, with fine dark joints between the pieces. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a low dark-wood bench against the wall with a rustic stoneware vase of dried branches standing beside it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-naharkhori-lachak-ghermez__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-naharkhori-lachak-ghermez__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-naharkhori-lachak-ghermez__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۳۹ از ۴۰ — فرش ماشینی مشهد — مدرن قهوه‌ای ناهارخوری

`mashhad-naharkhori-modern-ghahvei` · ماشینی · ۱۲۰۰ شانه · مشهد
رنگ‌های خواسته‌شده: brown, gold, cream

**گفتگوی تازه باز کنید.**

### پیام ۱ → `mashhad-naharkhori-modern-ghahvei__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Mashhad, contemporary brown and gold abstract, very short pile, subtle sheen, no traditional border, machine-woven viscose, silky sheen, smooth short pile. The rug completely fills the frame in 250:350 aspect ratio (a 250×350 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The edges are cleanly bound with no fringe. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `mashhad-naharkhori-modern-ghahvei__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a slim walnut stool holding a folded wool throw, and a small brass tray on the floor next to it. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `mashhad-naharkhori-modern-ghahvei__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `mashhad-naharkhori-modern-ghahvei__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room in a Persian-Iranian apartment. The floor around the rug is a warm mid-brown walnut parquet in long planks, satin finish, the grain running away from the camera — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `mashhad-naharkhori-modern-ghahvei__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a colonnade of plain brick columns running down one side, a stone bench between two of them, and a big framed textile fragment lit on the far wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---

## ۴۰ از ۴۰ — پادری ماشینی کاشان — عشایری نارنجی

`kashan-padari-ashayeri-narenji` · ماشینی · ۷۰۰ شانه · کاشان
رنگ‌های خواسته‌شده: orange, red, brown

**گفتگوی تازه باز کنید.**

### پیام ۱ → `kashan-padari-ashayeri-narenji__flat.png`

```text
A top-down flat texture photograph of an Iranian machine-woven carpet from Kashan, small doormat-sized rug with tribal Qashqai-style geometric motifs, burnt orange and madder red, machine-woven polyester, soft even pile, slight sheen. The rug completely fills the frame in 100:150 aspect ratio (a 100×150 cm rug), edge to edge, with NO background visible on any side — the four edges of the rug are the four edges of the image. Photographed perfectly square-on from directly above, edges parallel to the frame, no perspective distortion whatsoever. The carpet's two short ends finish in their natural knotted warp fringe, and both fringed ends are fully visible inside the frame. Completely flat, no folds, no curled corners, nothing on it and nothing casting a shadow onto it. Even diffuse lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. A texture reference, not a styled product shot.
```

### پیام ۲ → `kashan-padari-ashayeri-narenji__cover.png`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — photograph it lying in the quiet corner of a beautiful, expensive, minimal home. The floor is a classic Iranian wood-look parquet in warm caramel tones, narrow boards, slightly worn where the light falls. Behind it: a warm lime-washed plaster wall with visible hand-troweled texture, the corner of the room showing where two walls meet, a slim brass strip along the skirting, and low golden daylight from a tall window just out of frame on the left throwing the soft-edged shadow of the window bars across the wall and the floor. In the corner stands a simple wooden ladder leaning against the wall with a folded blanket over one rung. The rug lies flat and slightly turned, its fringed end nearest the camera and **running out of the bottom edge of the frame**, so the photograph feels close rather than surveyed. Camera at standing height, tilted down about forty degrees. Vertical frame. Shot on medium-format film: warm golden light, gentle contrast, slightly muted and faded colours, soft natural shadows, shallow depth of field so the far wall falls a little out of focus. Serene, unstyled, luxurious. No people. Do not change the rug's design, its colours, or its proportions.
```

### پیام ۳ → `kashan-padari-ashayeri-narenji__macro.png`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

### پیام ۴ → `kashan-padari-ashayeri-narenji__room.png`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway in a Persian-Iranian apartment. The floor around the rug is a herringbone parquet floor in pale honey oak, the chevrons catching the light at different angles — parquet, never tile, stone or carpet. Natural window light, real furniture with some of it standing on the rug. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. The room is **tidy and cared-for**: lived in, but kept. Absolutely no clutter on the floor — no charger cables, no phone charging by the skirting, no power strips, no laundry, no scattered toys, no plastic bags, nothing left lying about. Warm and believable, an ordinary home on a good day — not a render, not a showroom, and not a mess.
```

### پیام ۵ → `kashan-padari-ashayeri-narenji__gallery.png`

```text
Place the attached rug — unchanged in pattern, colour and proportion — on the floor of a beautiful Persian museum gallery housed in a restored historic house. A tall room with warm lime-washed plaster walls, a polished stone floor, and a high ceiling. In the room: a long dark-wood visitors' bench with a folded kilim cushion on it, a tall brass floor lamp beside it, and a large framed calligraphy panel on the wall. A shaft of daylight falls across the rug and up the far wall, leaving the corners in soft shadow. The rug is the only thing on the floor and it is unmistakably the exhibit, but the room around it is furnished and lived-in rather than empty. Seen from standing height at a slight angle, with enough architecture around it to feel the height of the room. Vertical frame. Warm, still, reverent — shot on medium-format film, rich but muted colour, gentle contrast. No people.
```

---
