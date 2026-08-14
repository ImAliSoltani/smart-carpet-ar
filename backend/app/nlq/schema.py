"""What a planner is allowed to say, and what the shopper is told it heard.

`QueryPlan` is the entire contract. A planner — rules or model — may fill these
fields and nothing else, and every one of them is typed against the catalogue's
own enumerations, so a colour the shop does not stock cannot be expressed at
all. That is the "safe schema" the roadmap asks for, and it is doing real work
rather than documentation work: a language model asked for JSON will
occasionally answer with a colour it invented, and here that is a validation
error rather than a query.

`understood` is the other half, and it is not decoration. A filter applied
silently is a filter the visitor cannot argue with — they typed a sentence, got
eleven carpets, and have no way to know that «روشن» was read as four colour
families or that «ده میلیون» became a ceiling rather than a floor. Each entry
says one thing the search decided, in the shopper's own language, and the
interface renders them as removable chips.
"""

from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType


class QueryPlan(BaseModel):
    """A Persian sentence, understood as a catalogue query."""

    color: list[ColorFamily] = Field(default_factory=list, max_length=6)
    pattern: list[CarpetPattern] = Field(default_factory=list, max_length=4)
    material: list[CarpetMaterial] = Field(default_factory=list, max_length=4)
    room: list[RoomType] = Field(default_factory=list, max_length=3)

    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    min_width_cm: int | None = Field(default=None, ge=1, le=1000)
    max_width_cm: int | None = Field(default=None, ge=1, le=1000)
    min_length_cm: int | None = Field(default=None, ge=1, le=1000)
    max_length_cm: int | None = Field(default=None, ge=1, le=1000)

    #: Whatever the sentence said that no filter could hold — a name, a place,
    #: a word the vocabulary does not know. Passed to the ordinary text search,
    #: which is where a sentence's leftovers belong.
    text: str | None = Field(default=None, max_length=100)

    #: One phrase per decision, in Persian, for the shopper to check.
    understood: list[str] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def _bounds_in_order(self) -> "QueryPlan":
        """Swap reversed ranges rather than rejecting them.

        «از ده میلیون تا پنج میلیون» is a typo, not an attack, and a model
        producing `min > max` has understood the sentence and mislabelled the
        fields. Silently returning nothing would be the one outcome that
        teaches the shopper nothing.
        """
        if self.min_price is not None and self.max_price is not None:
            if self.min_price > self.max_price:
                self.min_price, self.max_price = self.max_price, self.min_price
        for low, high in (
            ("min_width_cm", "max_width_cm"),
            ("min_length_cm", "max_length_cm"),
        ):
            lo, hi = getattr(self, low), getattr(self, high)
            if lo is not None and hi is not None and lo > hi:
                setattr(self, low, hi)
                setattr(self, high, lo)
        return self

    @property
    def is_empty(self) -> bool:
        """Nothing was understood — the caller should say so rather than
        returning the whole catalogue as though it had answered."""
        return not any(
            [
                self.color,
                self.pattern,
                self.material,
                self.room,
                self.min_price,
                self.max_price,
                self.min_width_cm,
                self.max_width_cm,
                self.min_length_cm,
                self.max_length_cm,
                self.text,
            ]
        )
