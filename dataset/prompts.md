# پرامپت‌های تولید تصویر کاتالوگ

این فایل **مشتق** است — از `backend/scripts/catalog_profiles.py` ساخته می‌شود.
دستی ویرایشش نکنید؛ پروفایل را عوض کنید و دوباره بسازیدش:

```bash
cd backend && uv run python scripts/build_catalog_dataset.py
```

**40 فرش × 5 تصویر = 200 تولید.**

## ترتیب، که اختیاری نیست

برای هر فرش **اول `flat` ساخته می‌شود**، و بعد همان فایل به‌عنوان تصویر
مرجع ضمیمه‌ی چهار پرامپت بعدی می‌شود. اگر پرامپت‌های ۲ تا ۵ مستقل اجرا
شوند، چهار فرش متفاوت به دست می‌آید و کاور با مدل AR یکی نخواهد بود.

## نام فایل

`<slug>__<shot>.png` — مثلاً `qom-silk-lachak-sormei__flat.png`.
اسکریپت ingest از روی همین نام فایل را به فرش وصل می‌کند.

---

## 1. فرش دستباف ابریشم قم — لچک‌ترنج زمینه سرمه‌ای

`qom-silk-lachak-sormei` · دستباف · ۷۰ رج · قم · lachak_toranj · silk

رنگ‌های خواسته‌شده: blue + cream, gold

**`qom-silk-lachak-sormei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Qom, deep indigo field, ivory central medallion with fine curvilinear arabesques, symmetrical corner spandrels, narrow ivory-and-gold border, hand-knotted natural silk, fine lustrous pile that shifts tone with the light. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`qom-silk-lachak-sormei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`qom-silk-lachak-sormei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`qom-silk-lachak-sormei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`qom-silk-lachak-sormei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 2. فرش دستباف ابریشم قم — افشان فیروزه‌ای

`qom-silk-afshan-firoozei` · دستباف · ۶۰ رج · قم · afshan · silk

رنگ‌های خواسته‌شده: turquoise + cream, gold

**`qom-silk-afshan-firoozei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Qom, turquoise field with an all-over afshan scatter of flowering vines, no central medallion, ivory and soft gold blossoms, hand-knotted natural silk, fine lustrous pile that shifts tone with the light. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`qom-silk-afshan-firoozei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`qom-silk-afshan-firoozei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`qom-silk-afshan-firoozei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`qom-silk-afshan-firoozei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 3. فرش دستباف اصفهان — کرک و ابریشم، لچک‌ترنج نخودی

`esfahan-kork-lachak-kerem` · دستباف · ۵۵ رج · اصفهان · lachak_toranj · mixed

رنگ‌های خواسته‌شده: cream + red, blue

**`esfahan-kork-lachak-kerem__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Isfahan, pale ivory field, lacquer-red medallion with silk highlights, indigo corner spandrels, dense floral tracery, wool pile with silk-highlighted motifs, the silk catching light against matte wool. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`esfahan-kork-lachak-kerem__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`esfahan-kork-lachak-kerem__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`esfahan-kork-lachak-kerem__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`esfahan-kork-lachak-kerem__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 4. فرش دستباف نایین ۹ لا — افشان سرمه‌ای

`naeen-9la-afshan-sormei` · دستباف · ۹ لا · نایین · afshan · wool

رنگ‌های خواسته‌شده: blue + white, cream

**`naeen-9la-afshan-sormei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Nain, navy field with an all-over afshan of white and pale blue vine work, silk-highlighted outlines, restrained palette, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`naeen-9la-afshan-sormei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`naeen-9la-afshan-sormei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`naeen-9la-afshan-sormei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`naeen-9la-afshan-sormei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 5. فرش دستباف تبریز ۵۰ رج — ترنجی لاکی

`tabriz-50raj-toranji-laki` · دستباف · ۵۰ رج · تبریز · medallion · wool

رنگ‌های خواسته‌شده: red + blue, cream

**`tabriz-50raj-toranji-laki__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Tabriz, lacquer-red field, large navy-and-ivory central medallion, tight symmetrical floral field, short dense pile, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`tabriz-50raj-toranji-laki__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`tabriz-50raj-toranji-laki__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`tabriz-50raj-toranji-laki__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`tabriz-50raj-toranji-laki__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 6. فرش دستباف کاشان — لچک‌ترنج لاکی

`kashan-lachak-laki` · دستباف · ۴۰ رج · کاشان · lachak_toranj · wool

رنگ‌های خواسته‌شده: red + blue, cream

**`kashan-lachak-laki__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Kashan, classic Kashan: madder-red field, indigo medallion, ivory spandrels, palmette-and-vine field, wide main border, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-lachak-laki__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-lachak-laki__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-lachak-laki__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-lachak-laki__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 7. فرش دستباف مشهد — افشان ارغوانی

`mashhad-afshan-arghavani` · دستباف · ۴۰ رج · مشهد · afshan · wool

رنگ‌های خواسته‌شده: pink + red, purple

**`mashhad-afshan-arghavani__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Mashhad, magenta-plum field with large-scale afshan blossoms, navy outlines, generous open spacing between motifs, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`mashhad-afshan-arghavani__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`mashhad-afshan-arghavani__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`mashhad-afshan-arghavani__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`mashhad-afshan-arghavani__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 8. فرش دستباف کرمان — گل فرنگ زمینه نخودی

`kerman-golfarang-kerem` · دستباف · ۴۰ رج · کرمان · floral · wool

رنگ‌های خواسته‌شده: cream + pink, green

**`kerman-golfarang-kerem__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Kerman, ivory field with European-style rose bouquets (gol farang), soft pink and sage green, scrolling leaf border, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kerman-golfarang-kerem__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kerman-golfarang-kerem__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kerman-golfarang-kerem__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kerman-golfarang-kerem__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 9. فرش دستباف اراک — سلطان‌آباد گل‌دار

`arak-sultanabad-golfarang` · دستباف · ۳۵ رج · اراک · floral · wool

رنگ‌های خواسته‌شده: red + blue, gold

**`arak-sultanabad-golfarang__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Arak (Sultanabad), Sultanabad village weave: large-scale angular floral sprays, brick-red field, indigo and gold, long soft pile, vegetable dyes, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 250:350 aspect ratio (a 250×350 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`arak-sultanabad-golfarang__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`arak-sultanabad-golfarang__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`arak-sultanabad-golfarang__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`arak-sultanabad-golfarang__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 10. فرش دستباف بیرجند — ترنجی سبز

`birjand-toranji-sabz` · دستباف · ۴۰ رج · بیرجند · medallion · wool

رنگ‌های خواسته‌شده: green + cream, gold

**`birjand-toranji-sabz__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Birjand, olive-green field, ivory central medallion, gold vine border, restrained and symmetrical, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`birjand-toranji-sabz__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`birjand-toranji-sabz__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`birjand-toranji-sabz__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`birjand-toranji-sabz__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 11. گبه‌ی دستباف قشقایی — عشایری قرمز

`qashqai-ashayeri-ghermez` · دستباف · ۳۰ رج · شیراز — قشقایی · tribal · wool

رنگ‌های خواسته‌شده: red + orange, brown

**`qashqai-ashayeri-ghermez__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Shiraz, Qashqai nomadic weave: brick-red ground, angular geometric medallions and stylised animals, slightly asymmetric, hand-spun wool, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. deliberately imperfect symmetry, as a nomadic weave from memory. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`qashqai-ashayeri-ghermez__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`qashqai-ashayeri-ghermez__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`qashqai-ashayeri-ghermez__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`qashqai-ashayeri-ghermez__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 12. کناره‌ی دستباف بلوچ — عشایری قهوه‌ای

`baluch-kenareh-ghahvei` · دستباف · ۳۰ رج · سیستان — بلوچ · tribal · wool

رنگ‌های خواسته‌شده: brown + black, red

**`baluch-kenareh-ghahvei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Sistan, Baluch nomadic runner: dark brown-black ground, small repeating geometric motifs, deep madder accents, dark tonal palette, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 80:300 aspect ratio (a 80×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`baluch-kenareh-ghahvei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`baluch-kenareh-ghahvei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`baluch-kenareh-ghahvei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`baluch-kenareh-ghahvei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 13. فرش دستباف همدان — هندسی قرمز

`hamedan-hendesi-ghermez` · دستباف · ۳۰ رج · همدان · geometric · wool

رنگ‌های خواسته‌شده: red + gray, cream

**`hamedan-hendesi-ghermez__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Hamedan, Hamedan village rug: rust-red field, bold angular geometric lattice, single-weft coarse weave, camel and ivory accents, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`hamedan-hendesi-ghermez__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`hamedan-hendesi-ghermez__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`hamedan-hendesi-ghermez__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`hamedan-hendesi-ghermez__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 14. فرش دستباف اردبیل — هندسی آبی

`ardabil-hendesi-abi` · دستباف · ۳۵ رج · اردبیل · geometric · wool

رنگ‌های خواسته‌شده: blue + white, gray

**`ardabil-hendesi-abi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Ardabil, north-west Persian geometric: blue and white stepped lattice, crisp angular medallions, cool restrained palette, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`ardabil-hendesi-abi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`ardabil-hendesi-abi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`ardabil-hendesi-abi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`ardabil-hendesi-abi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 15. فرش دستباف تبریز — پتینه‌ی طوسی

`tabriz-patineh-vintage-tousi` · دستباف · ۴۰ رج · تبریز · vintage · wool

رنگ‌های خواسته‌شده: gray + pink, purple

**`tabriz-patineh-vintage-tousi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Tabriz, overdyed patina rug: classical Persian medallion faded under a wash of soft grey, muted rose and bone showing through, worn low pile, hand-knotted wool pile, matte, dense, slightly uneven hand-spun yarn. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`tabriz-patineh-vintage-tousi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`tabriz-patineh-vintage-tousi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`tabriz-patineh-vintage-tousi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`tabriz-patineh-vintage-tousi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 16. فرش دستباف یزد — ساده‌ی نخودی

`yazd-sadeh-nokhodi` · دستباف · ۳۰ رج · یزد · plain · cotton

رنگ‌های خواسته‌شده: cream + white

**`yazd-sadeh-nokhodi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of a hand-knotted Persian carpet from Yazd, undyed ivory flat field with a single narrow woven border, visible cotton texture, no medallion, minimal, flat cotton weave, matte and low, visible warp and weft. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`yazd-sadeh-nokhodi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`yazd-sadeh-nokhodi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`yazd-sadeh-nokhodi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`yazd-sadeh-nokhodi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 17. فرش ماشینی کاشان ۱۲۰۰ شانه — لچک‌ترنج سرمه‌ای

`kashan-1200-lachak-sormei` · ماشینی · ۱۲۰۰ شانه · کاشان · lachak_toranj · acrylic

رنگ‌های خواسته‌شده: blue + cream, red

**`kashan-1200-lachak-sormei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, navy field, ivory medallion and corner spandrels, dense classical floral tracery, crisp machine-woven definition, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-1200-lachak-sormei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-1200-lachak-sormei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-1200-lachak-sormei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-1200-lachak-sormei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 18. فرش ماشینی کاشان ۱۲۰۰ شانه — افشان طلایی

`kashan-1200-afshan-talaei` · ماشینی · ۱۲۰۰ شانه · کاشان · afshan · acrylic

رنگ‌های خواسته‌شده: gold + cream, brown

**`kashan-1200-afshan-talaei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, warm gold field with all-over afshan vine scatter, no medallion, bronze and cream tones, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-1200-afshan-talaei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-1200-afshan-talaei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-1200-afshan-talaei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-1200-afshan-talaei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 19. فرش ماشینی کاشان ۱۵۰۰ شانه — لچک‌ترنج فیروزه‌ای

`kashan-1500-lachak-firoozei` · ماشینی · ۱۵۰۰ شانه · کاشان · lachak_toranj · acrylic

رنگ‌های خواسته‌شده: turquoise + cream, gold

**`kashan-1500-lachak-firoozei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, turquoise field, ivory medallion with gold outline, very fine machine-woven detail, classical spandrels, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 250:350 aspect ratio (a 250×350 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-1500-lachak-firoozei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-1500-lachak-firoozei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-1500-lachak-firoozei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-1500-lachak-firoozei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 20. فرش ماشینی آران و بیدگل ۱۰۰۰ شانه — ترنجی لاکی

`aran-1000-toranji-laki` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل · medallion · polyester

رنگ‌های خواسته‌شده: red + blue, cream

**`aran-1000-toranji-laki__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, lacquer-red field, large navy medallion, ivory border, traditional machine-woven Persian layout, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-1000-toranji-laki__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-1000-toranji-laki__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-1000-toranji-laki__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-1000-toranji-laki__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 21. فرش ماشینی آران و بیدگل ۷۰۰ شانه — گل‌دار لاکی

`aran-700-goldar-laki` · ماشینی · ۷۰۰ شانه · آران و بیدگل · floral · polyester

رنگ‌های خواسته‌شده: red + cream, green

**`aran-700-goldar-laki__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, red field with large simple floral repeat, cream border, lower-density machine weave, softer motif edges, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-700-goldar-laki__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-700-goldar-laki__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-700-goldar-laki__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-700-goldar-laki__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 22. فرش ماشینی کاشان ۱۲۰۰ شانه — گل‌دار صورتی

`kashan-1200-goldar-surati` · ماشینی · ۱۲۰۰ شانه · کاشان · floral · acrylic

رنگ‌های خواسته‌شده: pink + cream, green

**`kashan-1200-goldar-surati__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, dusty pink field, small scattered rose bouquets, ivory border, light and airy, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-1200-goldar-surati__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-1200-goldar-surati__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-1200-goldar-surati__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-1200-goldar-surati__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 23. فرش ماشینی مشهد — مدرن طوسی

`mashhad-modern-tousi` · ماشینی · ۱۰۰۰ شانه · مشهد · modern · polyester

رنگ‌های خواسته‌شده: gray + white, cream

**`mashhad-modern-tousi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Mashhad, modern abstract: soft grey and white blurred bands, no traditional border, low-contrast contemporary design, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 250:350 aspect ratio (a 250×350 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`mashhad-modern-tousi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`mashhad-modern-tousi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`mashhad-modern-tousi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`mashhad-modern-tousi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 24. فرش ماشینی کاشان ۱۵۰۰ شانه — مدرن آبی‌خاکستری

`kashan-1500-modern-abi` · ماشینی · ۱۵۰۰ شانه · کاشان · modern · viscose

رنگ‌های خواسته‌شده: gray + blue, white

**`kashan-1500-modern-abi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, contemporary abstract in slate blue and grey, viscose sheen, soft gradient wash, no border, machine-woven viscose, silky sheen, smooth short pile. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-1500-modern-abi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-1500-modern-abi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-1500-modern-abi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-1500-modern-abi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 25. فرش ماشینی آران و بیدگل — مدرن مشکی

`aran-modern-meshki` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل · modern · polyester

رنگ‌های خواسته‌شده: black + gray, white

**`aran-modern-meshki__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, near-black field with fine white geometric line work, high contrast, contemporary, no traditional border, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-modern-meshki__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-modern-meshki__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-modern-meshki__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-modern-meshki__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 26. فرش ماشینی کاشان — مدرن سفید

`kashan-modern-sefid` · ماشینی · ۱۲۰۰ شانه · کاشان · modern · viscose

رنگ‌های خواسته‌شده: white + cream

**`kashan-modern-sefid__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, off-white carved-pile rug: pattern readable only as relief and shadow, tonal, no colour contrast, machine-woven viscose, silky sheen, smooth short pile. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-modern-sefid__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-modern-sefid__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-modern-sefid__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-modern-sefid__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 27. فرش ماشینی کاشان — ساده‌ی نخودی

`kashan-sadeh-nokhodi` · ماشینی · ۱۲۰۰ شانه · کاشان · plain · viscose

رنگ‌های خواسته‌شده: cream + white

**`kashan-sadeh-nokhodi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, completely plain solid ivory pile, no pattern, no border, even colour, machine-woven viscose, silky sheen, smooth short pile. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-sadeh-nokhodi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-sadeh-nokhodi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-sadeh-nokhodi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-sadeh-nokhodi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 28. فرش ماشینی آران و بیدگل — ساده‌ی طوسی

`aran-sadeh-tousi` · ماشینی · ۷۰۰ شانه · آران و بیدگل · plain · polyester

رنگ‌های خواسته‌شده: gray

**`aran-sadeh-tousi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, completely plain solid mid-grey pile, no pattern, even colour, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-sadeh-tousi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-sadeh-tousi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-sadeh-tousi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-sadeh-tousi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 29. فرش ماشینی کاشان — ساده‌ی سبز زیتونی

`kashan-sadeh-sabz` · ماشینی · ۱۲۰۰ شانه · کاشان · plain · acrylic

رنگ‌های خواسته‌شده: green

**`kashan-sadeh-sabz__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, completely plain solid olive-green pile, no pattern, even colour, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-sadeh-sabz__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-sadeh-sabz__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-sadeh-sabz__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-sadeh-sabz__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 30. فرش ماشینی مشهد — وینتیج نارنجی

`mashhad-vintage-narenji` · ماشینی · ۱۰۰۰ شانه · مشهد · vintage · polyester

رنگ‌های خواسته‌شده: orange + brown, cream

**`mashhad-vintage-narenji__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Mashhad, distressed vintage print: burnt orange and rust, deliberately worn and faded pattern, low contrast, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`mashhad-vintage-narenji__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`mashhad-vintage-narenji__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`mashhad-vintage-narenji__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`mashhad-vintage-narenji__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 31. فرش ماشینی کاشان — وینتیج آبی

`kashan-vintage-abi` · ماشینی · ۱۲۰۰ شانه · کاشان · vintage · acrylic

رنگ‌های خواسته‌شده: blue + cream, gray

**`kashan-vintage-abi__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, faded vintage blue: washed-out classical pattern, distressed border, muted and dusty, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 200:300 aspect ratio (a 200×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-vintage-abi__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-vintage-abi__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-vintage-abi__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in living room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-vintage-abi__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 32. فرش ماشینی آران و بیدگل — هندسی مشکی و سفید

`aran-hendesi-meshki-sefid` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل · geometric · polyester

رنگ‌های خواسته‌شده: black + white, gray

**`aran-hendesi-meshki-sefid__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, bold black and white geometric repeat, sharp edges, high contrast, contemporary, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 150:225 aspect ratio (a 150×225 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-hendesi-meshki-sefid__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-hendesi-meshki-sefid__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-hendesi-meshki-sefid__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in home office. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-hendesi-meshki-sefid__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 33. فرش ماشینی کاشان — هندسی بنفش

`kashan-hendesi-banafsh` · ماشینی · ۱۲۰۰ شانه · کاشان · geometric · acrylic

رنگ‌های خواسته‌شده: purple + gray, white

**`kashan-hendesi-banafsh__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, violet and grey geometric blocks, playful but not childish, clean modern lines, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 100:150 aspect ratio (a 100×150 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-hendesi-banafsh__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-hendesi-banafsh__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-hendesi-banafsh__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-hendesi-banafsh__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 34. فرش ماشینی کاشان — اتاق کودک فیروزه‌ای

`kashan-kodak-firoozei` · ماشینی · ۱۰۰۰ شانه · کاشان · modern · polyester

رنگ‌های خواسته‌شده: turquoise + white, gold

**`kashan-kodak-firoozei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, bright turquoise with simple rounded geometric shapes, soft high pile, cheerful but not cartoonish, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 100:150 aspect ratio (a 100×150 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-kodak-firoozei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-kodak-firoozei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-kodak-firoozei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-kodak-firoozei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 35. فرش ماشینی آران و بیدگل — اتاق کودک صورتی

`aran-kodak-surati` · ماشینی · ۷۰۰ شانه · آران و بیدگل · modern · polyester

رنگ‌های خواسته‌شده: pink + white

**`aran-kodak-surati__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, soft pink with cloud-like abstract shapes in white, long plush pile, gentle, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 100:150 aspect ratio (a 100×150 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-kodak-surati__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-kodak-surati__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-kodak-surati__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in child's bedroom. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-kodak-surati__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 36. کناره‌ی ماشینی کاشان ۱۲۰۰ شانه — افشان سرمه‌ای

`kashan-kenareh-afshan-sormei` · ماشینی · ۱۲۰۰ شانه · کاشان · afshan · acrylic

رنگ‌های خواسته‌شده: blue + red, cream

**`kashan-kenareh-afshan-sormei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, narrow navy runner with continuous afshan vine pattern along its length, red and ivory accents, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 80:300 aspect ratio (a 80×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-kenareh-afshan-sormei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-kenareh-afshan-sormei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-kenareh-afshan-sormei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-kenareh-afshan-sormei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 37. کناره‌ی ماشینی آران و بیدگل — هندسی قهوه‌ای

`aran-kenareh-hendesi-ghahvei` · ماشینی · ۱۰۰۰ شانه · آران و بیدگل · geometric · polyester

رنگ‌های خواسته‌شده: brown + cream, gold

**`aran-kenareh-hendesi-ghahvei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Aran-o-Bidgol, brown runner with repeating angular geometric bands, cream and gold accents, dense weave, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 80:300 aspect ratio (a 80×300 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`aran-kenareh-hendesi-ghahvei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`aran-kenareh-hendesi-ghahvei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`aran-kenareh-hendesi-ghahvei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`aran-kenareh-hendesi-ghahvei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 38. فرش ماشینی کاشان — لچک‌ترنج قرمز ناهارخوری

`kashan-naharkhori-lachak-ghermez` · ماشینی · ۱۲۰۰ شانه · کاشان · lachak_toranj · acrylic

رنگ‌های خواسته‌شده: red + gold, cream

**`kashan-naharkhori-lachak-ghermez__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, red field, gold medallion and spandrels, busy classical floral field that hides marks, machine-woven heat-set acrylic, even velvety pile, very regular and crisp. The entire rug fills the frame in 250:350 aspect ratio (a 250×350 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-naharkhori-lachak-ghermez__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-naharkhori-lachak-ghermez__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-naharkhori-lachak-ghermez__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-naharkhori-lachak-ghermez__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 39. فرش ماشینی مشهد — مدرن قهوه‌ای ناهارخوری

`mashhad-naharkhori-modern-ghahvei` · ماشینی · ۱۲۰۰ شانه · مشهد · modern · viscose

رنگ‌های خواسته‌شده: brown + gold, cream

**`mashhad-naharkhori-modern-ghahvei__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Mashhad, contemporary brown and gold abstract, very short pile, subtle sheen, no traditional border, machine-woven viscose, silky sheen, smooth short pile. The entire rug fills the frame in 250:350 aspect ratio (a 250×350 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`mashhad-naharkhori-modern-ghahvei__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`mashhad-naharkhori-modern-ghahvei__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`mashhad-naharkhori-modern-ghahvei__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in dining room. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`mashhad-naharkhori-modern-ghahvei__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---

## 40. پادری ماشینی کاشان — عشایری نارنجی

`kashan-padari-ashayeri-narenji` · ماشینی · ۷۰۰ شانه · کاشان · tribal · polyester

رنگ‌های خواسته‌شده: orange + red, brown

**`kashan-padari-ashayeri-narenji__flat.png`** — **بدون مرجع — اول این**

```text
A top-down flat product photograph of an Iranian machine-woven carpet from Kashan, small doormat-sized rug with tribal Qashqai-style geometric motifs, burnt orange and madder red, machine-woven polyester, soft even pile, slight sheen. The entire rug fills the frame in 100:150 aspect ratio (a 100×150 cm rug), photographed perfectly square-on from directly above, with its edges parallel to the frame and no perspective distortion whatsoever. Isolated on a pure seamless white background (#FFFFFF). Completely flat on the surface, no folds, no curled corners, no objects on or near it, nothing casting a shadow onto it. Even diffuse studio lighting across the whole surface with no hotspots and no gradient. Sharp focus edge to edge so the weave is legible. Catalogue texture reference photograph, not a styled interior shot.
```

**`kashan-padari-ashayeri-narenji__cover.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug exactly as it is — the same pattern, the same colours, the same weave — create a premium e-commerce cover photograph of it. Show the rug at a slight three-quarter angle on a pale warm concrete floor, one corner turned up just enough to show the pile depth, soft directional daylight from one side and a long gentle shadow. Warm neutral background, generous empty space around the rug. Editorial catalogue photography, shallow depth of field at the far edge. Do not change the rug's design.
```

**`kashan-padari-ashayeri-narenji__macro.png`** — با ضمیمه‌ی `flat`

```text
Using the attached rug, create an extreme close-up macro photograph of its surface, filling the frame with about 15 centimetres of the pile — individual knots, fibres and the edge of one motif clearly visible. Raking side light so the texture reads as depth. The same colours and the same motif as the attached image. Sharp macro detail, shallow depth of field.
```

**`kashan-padari-ashayeri-narenji__room.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged in pattern and colour — on the floor of a real, lived-in hallway. Natural window light, real furniture partly standing on the rug, a Persian-Iranian apartment interior. Photographed from standing eye level, wide enough to see the walls and the furniture as well as the floor. Believable everyday photograph, not a render.
```

**`kashan-padari-ashayeri-narenji__gallery.png`** — با ضمیمه‌ی `flat`

```text
Place the attached rug — unchanged — alone in a quiet museum gallery: a large warm off-white room, polished pale floor, one wall visible, a single soft overhead light pooling on the rug, deep empty space around it. Nothing else in the frame. Calm, reverent, architectural photography with the rug as the only object. Shot straight on from a low standing height.
```

---
