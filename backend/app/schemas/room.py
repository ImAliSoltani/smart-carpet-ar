"""API schemas for the room-based features."""

from pydantic import BaseModel, Field


class ScaleReferenceOut(BaseModel):
    """What the A4 sheet in the photo said about its scale."""

    correction_percent: float = Field(
        description=(
            "درصد اصلاحی که برگه‌ی A4 روی تخمین عمق اعمال کرد؛ "
            "منفی یعنی مدل اتاق را بزرگ‌تر دیده بود"
        )
    )
    measured_long_cm: float = Field(description="طول اندازه‌گیری‌شده‌ی برگه پیش از اصلاح")


class SizeSuggestion(BaseModel):
    width_cm: int
    length_cm: int
    carpet_count: int = Field(description="تعداد فرش‌های موجود در این اندازه")


class SizeGuideResponse(BaseModel):
    """What one room photo says about the carpet it can take."""

    confidence: float = Field(
        description="۰ تا ۱؛ اطمینان تشخیص کف. زیر ۰٫۴ یعنی عدد‌ها را با احتیاط بخوانید"
    )
    camera_height_m: float = Field(description="ارتفاع بازیابی‌شده‌ی دوربین از کف")
    #: Absent when the photo had no sheet in it, which is the ordinary case and
    #: not an error — the numbers then rest on the depth model alone.
    scale_reference: ScaleReferenceOut | None = None

    free_width_cm: int = Field(description="عرض بزرگ‌ترین محدوده‌ی آزادِ فرش‌شکل")
    free_length_cm: int = Field(description="طول همان محدوده")
    free_area_sqm: float = Field(description="مساحت کل کفِ در دسترس، نه فقط آن مستطیل")

    recommended: list[SizeSuggestion] = Field(
        default_factory=list,
        description="بزرگ‌ترین اندازه‌های موجود که در این محدوده جا می‌شوند، حداکثر شش تا",
    )
