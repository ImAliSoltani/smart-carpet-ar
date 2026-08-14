# کامپوننت‌های پایه

فایل‌های این پوشه از کاتالوگ [21st.dev](https://21st.dev) گرفته شده‌اند: یا پرایمیتیو رجیستری shadcn/ui هستند، یا کامپوننتی که در جای خودش تطبیق داده شده است.

| فایل | منبع |
|---|---|
| `button.tsx`، `badge.tsx`، `card.tsx` | وابستگی‌های رجیستری کارت محصول |
| `navigation-menu.tsx`، `sheet.tsx` | وابستگی‌های رجیستری [bundui/navigation-menu4](https://21st.dev/@bundui/components/navigation-menu4) |
| `zoomable-image.tsx` | [inference-sh/zoomable-image](https://21st.dev/@inference-sh/components/zoomable-image) — تگ `img` خام به `next/image` تبدیل شد و ظاهر لایت‌باکس در `globals.css` به پالت خودمان آمد |
| `input.tsx`، `textarea.tsx` | وابستگی‌های رجیستری [arihantcodes/multistep-form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form) — ارتفاع ۴۸ و اندازه‌ی قلم ۱۶ پیکسل، وگرنه سافاری iOS هنگام فوکوس صفحه را زوم می‌کند و برنمی‌گرداند |
| `hero-10.tsx`، `hero-10-utils/cta.tsx` | [felipemenezes098/hero-10](https://21st.dev/@felipemenezes098/components/hero-10) — بادبزن سه‌عکسی برای راست‌به‌چپ آینه شد (حاشیه‌های منطقی و چرخش‌های قرینه)، `<img>` به `next/image` رفت، و `cta` که در پاسخ رجیستری نبود نوشته شد |
| `features-grid.tsx` | [gooseui/features-grid](https://21st.dev/@gooseui/components/features-grid) — ورود پلکانی با اسکرول اضافه شد، چیپ آیکون طلایی شد (`primary` در نقشه‌ی ما زغالی است)، و `hover:bg-muted/50` برداشته شد چون `muted` اینجا رنگ متن است |
| `pagination.tsx` | [shadcn/pagination](https://21st.dev/@shadcn/components/pagination) — `buttonVariants` کنار گذاشته شد (چون `hover:bg-accent` در پالت ما طلایی است)، جهت شورون‌ها آینه شد، و `<a>` به `next/link` تبدیل شد |
| `file-dropzone.tsx`، `file-dropzone-utils/use-file-upload.ts` | [joyco/file-dropzone](https://21st.dev/@joyco/components/file-dropzone) — حالت چندفایلی حذف شد (تنها مصرف‌کننده یک عکس می‌پرسد)، `border-input`/`bg-accent` رجیستری به هیرلاین و کاغذ خودمان رفت چون طلایی فقط مال نشانه‌های ریز است، و `shadow-raised` گرفت که تعریفش «یک‌بار در هر صفحه» است. هوک `use-file-upload` در پاسخ رجیستری نبود و نوشته شد — مثل `cta` در hero-10 |

## روش کار (تصمیم ۱۴۰۵/۰۵/۱۳)

**کامپوننت را کامل برمی‌داریم، وابستگی‌هایش را نصب می‌کنیم، و بعد ویرایشش می‌کنیم.** نگه داشتن یک نسخه‌ی دست‌نخورده کنار نسخه‌ی واقعی کنار گذاشته شد: نسخه‌ای که هیچ‌وقت اجرا نمی‌شود هزینه‌ی نگهداری دارد و ارزشی اضافه نمی‌کند، و تاریخچه‌ی گیت همان کاری را می‌کند که قرار بود آن فایل بکند.

کامپوننت‌های تطبیق‌داده‌شده در `components/toranjan/` می‌نشینند، نه اینجا:

| فایل | از روی |
|---|---|
| `toranjan/carpet-card.tsx` | [beratberkayg/product-card-1](https://21st.dev/@beratberkayg/components/product-card-1) |
| `toranjan/site-header.tsx` | [bundui/navigation-menu4](https://21st.dev/@bundui/components/navigation-menu4) |
| `toranjan/product-detail.tsx` | [kavikatiyar/product-detail-page](https://21st.dev/@kavikatiyar/components/product-detail-page) |
| `toranjan/cart-view.tsx` | [kokonutd/interactive-checkout](https://21st.dev/@kokonutd/components/interactive-checkout) — ستون چپش از کاتالوگ به خود سبد تبدیل شد؛ `NumberFlow` حذف شد چون با ارقام فارسی `NaN` می‌دهد |
| `toranjan/checkout-form.tsx` | [arihantcodes/multistep-form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form) — شش گام به سه گام رسید و `useState` هر فیلد جای خود را به react-hook-form + zod داد |
| `(shop)/visual-search/visual-search-client.tsx` | چیدمانش دست‌ساز است، ولی ماشینش `ui/file-dropzone.tsx` بالاست. عکس پرس‌وجو با `layoutId` از دراپ‌زون به نوار نتایج سفر می‌کند — همان سازوکار گذار شبکه به صفحه‌ی محصول |
| `toranjan/faq-accordion.tsx` | ظاهر از [jatin-yadav05/interactive-accordion](https://21st.dev/@jatin-yadav05/components/interactive-accordion)، ولی **ماشینش از `ui/accordion.tsx` خودمان** — هوک‌های `useAccordion`/`useAutoHeight` که فوکوس چرخشی و `aria`ها و `inert` را دارند. نسخه‌ی وارداتی `<h3>` را داخل دکمه گذاشته بود و فنرهایش زمان نداشتند؛ هر دو اصلاح شدند |

## دام قلم که یک‌بار خوردیم

`font-figure` **فقط برای ارقام لاتین است.** Inter رقم فارسی ندارد، پس عددی که با `formatNumber` نوشته شده و کلاس `font-figure` گرفته باشد، روی قلم پیش‌فرض سیستم می‌افتد — که آشکارا قلم بقیه‌ی صفحه نیست. یک‌بار قیمت‌های صفحه‌ی سبد را برد. هر چیزی که `formatNumber`/`formatToman` چاپ می‌کند فارسی است و وزیرمتن می‌خواهد، یعنی هیچ کلاس قلمی نمی‌گیرد. (تا ۱۴۰۵/۰۵/۲۰ قلم Satoshi جلوی Inter می‌نشست؛ دلیل حذفش در یادداشت `--font-figure` در `globals.css` آمده و **حقوقی است، نه سلیقه‌ای**.)

## چرا فایل‌ها در مخزن‌اند و با `shadcn add` نصب نمی‌شوند

سهمیه‌ی رایگان ۲۱st **دو بار گرفتن کد در روز** است. هر بار اجرای دستور نصب، یک بار دیگر از همان سهمیه کم می‌کند؛ نگه داشتن فایل‌ها در مخزن یعنی این هزینه فقط یک‌بار پرداخت شده است.

## آنچه هنگام تطبیق باید سنجیده شود

- **راست‌به‌چپ:** هر `ml-`/`mr-`/`left`/`right` به معادل منطقی (`ms-`/`me-`/`start`/`end`) برود. مراقب `translate` که ذاتاً فیزیکی است و منطقی نمی‌شود — به `:dir()` بسته شود.
- **قیمت و عدد:** تومان با ارقام فارسی و بدون اعشار، از `lib/format.ts`.
- **بیرون از دامنه (بند ۶ نقشه‌ی راه):** امتیاز و نظرات کاربران، نشان تخفیف، ارسال رایگان. اگر کامپوننت این‌ها را دارد، حذف می‌شوند نه اینکه با داده‌ی ساختگی پر شوند.
- **رنگ‌ها انتخاب‌شدنی نیستند:** رنگ‌های ما از عکس استخراج شده‌اند، پس نمایشی‌اند نه کنترل.
- **کنش شاخص «در خانه‌ی من ببین» است**، نه «افزودن به سبد» — کسی از شبکه‌ی محصولات فرش نمی‌خرد.
- **پالت:** `hover:bg-accent` رجیستری در پالت ما طلایی می‌شود و طلایی فقط مال نشانه‌های ریز است؛ به‌جایش سطح کاغذی. **یک استثنا (۱۴۰۵/۰۵/۲۰، تصمیم کارفرما):** دکمه‌ی «در خانه‌ی من ببین» در صفحه‌ی محصول عمداً `bg-accent` است تا با قلبِ علاقه‌مندی هم‌رنگ باشد. این قاعده برای سطح‌های *اتفاقیِ* کامپوننت‌های واردشده است، نه برای کنش شاخص فروشگاه. هر استفاده‌ی تازه از طلایی به‌عنوان سطح باید کنتراستش اندازه‌گیری شود (آن یکی: ۴٫۷۲:۱).
- **مرز سرور/کلاینت:** اگر کامپوننتی «use client» است و پراپی از جنس *کامپوننت* می‌گیرد (مثل آیکون)، فایلی که آن پراپ را می‌سازد هم باید کلاینت باشد. تابع از مرز سرور به کلاینت رد نمی‌شود و کل صفحه با «Functions cannot be passed directly to Client Components» می‌افتد.
- **حرکت:** انیمیشن‌های کامپوننت نگه داشته می‌شوند، ولی زمان و easing از مقیاس خودمان. `framer-motion` از بلوک `prefers-reduced-motion` در CSS پیروی نمی‌کند چون با JS استایل اینلاین می‌گذارد؛ آنجا باید `useReducedMotion()` گذاشت.
