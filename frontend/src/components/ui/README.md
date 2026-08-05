# کامپوننت‌های پایه

فایل‌های این پوشه از کاتالوگ [21st.dev](https://21st.dev) گرفته شده‌اند: یا پرایمیتیو رجیستری shadcn/ui هستند، یا کامپوننتی که در جای خودش تطبیق داده شده است.

| فایل | منبع |
|---|---|
| `button.tsx`، `badge.tsx`، `card.tsx` | وابستگی‌های رجیستری کارت محصول |
| `navigation-menu.tsx`، `sheet.tsx` | وابستگی‌های رجیستری [bundui/navigation-menu4](https://21st.dev/@bundui/components/navigation-menu4) |
| `zoomable-image.tsx` | [inference-sh/zoomable-image](https://21st.dev/@inference-sh/components/zoomable-image) — تگ `img` خام به `next/image` تبدیل شد و ظاهر لایت‌باکس در `globals.css` به پالت خودمان آمد |
| `input.tsx`، `textarea.tsx` | وابستگی‌های رجیستری [arihantcodes/multistep-form](https://21st.dev/@arihantcodes_1f7b8c4d/components/multistep-form) — ارتفاع ۴۸ و اندازه‌ی قلم ۱۶ پیکسل، وگرنه سافاری iOS هنگام فوکوس صفحه را زوم می‌کند و برنمی‌گرداند |
| `pagination.tsx` | [shadcn/pagination](https://21st.dev/@shadcn/components/pagination) — `buttonVariants` کنار گذاشته شد (چون `hover:bg-accent` در پالت ما طلایی است)، جهت شورون‌ها آینه شد، و `<a>` به `next/link` تبدیل شد |

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

## دام قلم که یک‌بار خوردیم

`font-figure` **فقط برای ارقام لاتین است.** Satoshi به گلیف عددهای لاتین subset شده و Inter پشت آن هم رقم فارسی ندارد، پس عددی که با `formatNumber` نوشته شده و کلاس `font-figure` گرفته باشد، از هر دو رد می‌شود و روی قلم پیش‌فرض سیستم می‌افتد — که آشکارا قلم بقیه‌ی صفحه نیست. یک‌بار قیمت‌های صفحه‌ی سبد را برد. هر چیزی که `formatNumber`/`formatToman` چاپ می‌کند فارسی است و وزیرمتن می‌خواهد، یعنی هیچ کلاس قلمی نمی‌گیرد.

## چرا فایل‌ها در مخزن‌اند و با `shadcn add` نصب نمی‌شوند

سهمیه‌ی رایگان ۲۱st **دو بار گرفتن کد در روز** است. هر بار اجرای دستور نصب، یک بار دیگر از همان سهمیه کم می‌کند؛ نگه داشتن فایل‌ها در مخزن یعنی این هزینه فقط یک‌بار پرداخت شده است.

## آنچه هنگام تطبیق باید سنجیده شود

- **راست‌به‌چپ:** هر `ml-`/`mr-`/`left`/`right` به معادل منطقی (`ms-`/`me-`/`start`/`end`) برود. مراقب `translate` که ذاتاً فیزیکی است و منطقی نمی‌شود — به `:dir()` بسته شود.
- **قیمت و عدد:** تومان با ارقام فارسی و بدون اعشار، از `lib/format.ts`.
- **بیرون از دامنه (بند ۶ نقشه‌ی راه):** امتیاز و نظرات کاربران، نشان تخفیف، ارسال رایگان. اگر کامپوننت این‌ها را دارد، حذف می‌شوند نه اینکه با داده‌ی ساختگی پر شوند.
- **رنگ‌ها انتخاب‌شدنی نیستند:** رنگ‌های ما از عکس استخراج شده‌اند، پس نمایشی‌اند نه کنترل.
- **کنش شاخص «در خانه‌ی من ببین» است**، نه «افزودن به سبد» — کسی از شبکه‌ی محصولات فرش نمی‌خرد.
- **پالت:** `hover:bg-accent` رجیستری در پالت ما طلایی می‌شود و طلایی فقط مال نشانه‌های ریز است؛ به‌جایش سطح کاغذی.
- **حرکت:** انیمیشن‌های کامپوننت نگه داشته می‌شوند، ولی زمان و easing از مقیاس خودمان. `framer-motion` از بلوک `prefers-reduced-motion` در CSS پیروی نمی‌کند چون با JS استایل اینلاین می‌گذارد؛ آنجا باید `useReducedMotion()` گذاشت.
