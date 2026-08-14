"""API schemas for the room-based features."""

from pydantic import BaseModel, Field

from app.models.enums import ColorFamily
from app.schemas.catalog import CarpetListItem


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


class RoomReading(BaseModel):
    """What the photograph said about the room, before any carpet is proposed.

    Returned to the shopper rather than kept behind the ranking, because the
    advice below rests on it: somebody who disagrees with «اتاق شما کم‌رنگ است»
    should be able to see that premise and stop reading, instead of wondering
    why the shop keeps offering them red.
    """

    floor_colors: list[ColorFamily] = Field(
        default_factory=list, description="رنگ‌های غالب کفِ فعلی اتاق"
    )
    room_colors: list[ColorFamily] = Field(
        default_factory=list, description="رنگ‌های غالب دیوارها و مبلمان"
    )
    colourfulness: float = Field(description="۰ تا ۱؛ چقدر از اتاق رنگِ نام‌بردنی دارد")
    lightness: float = Field(description="۰ تا ۱؛ روشنایی کلی اتاق بدون کف")
    warmth: str = Field(description="warm | cool | neutral")


class CarpetAdvice(BaseModel):
    carpet: CarpetListItem
    score: float = Field(description="مجموع امتیاز قواعد؛ فقط برای مرتب‌سازی معنا دارد")
    reasons: list[str] = Field(
        default_factory=list, description="چرا این فرش به این اتاق می‌آید، هر قاعده یک جمله"
    )
    caution: str | None = Field(
        default=None, description="اگر نکته‌ای هست که خریدار باید بداند، جدا از دلایل"
    )


class RoomAdviserResponse(BaseModel):
    """One room photo, and the carpets that suit it with the reason for each."""

    confidence: float = Field(
        description="۰ تا ۱؛ اطمینان تشخیص کف. زیر ۰٫۴ یعنی خواندنِ رنگ‌ها هم مطمئن نیست"
    )
    reading: RoomReading
    suggestions: list[CarpetAdvice] = Field(default_factory=list)
