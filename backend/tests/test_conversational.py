"""Reading a Persian sentence as a catalogue query.

Two things are checked, and the second matters more than the first. One: that
ordinary phrasings come out as the right filter. Two: that a language model
cannot say anything the catalogue would not — because the whole safety argument
of this feature is the schema, and a schema nobody tests is a promise.
"""

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType
from app.nlq import rules
from app.nlq.planner import OpenAiCompatiblePlanner, RuleBasedPlanner
from app.nlq.prompt import build_system_prompt, label_for
from app.nlq.schema import QueryPlan
from app.nlq.vocabulary import COLOR_WORDS, MATERIAL_WORDS, PATTERN_WORDS, ROOM_WORDS

FLOOR = Decimal("1899000")
CEILING = Decimal("347600000")


def plan(query: str) -> QueryPlan:
    return rules.parse(query, price_floor=FLOOR, price_ceiling=CEILING)


class TestReadingASentence:
    def test_colour_room_and_budget_together(self) -> None:
        result = plan("فرش روشن برای اتاق کودک تا ده میلیون")
        assert RoomType.KIDS_ROOM in result.room
        assert ColorFamily.CREAM in result.color
        assert result.max_price == Decimal(10_000_000)

    def test_material_colour_and_an_exact_size(self) -> None:
        result = plan("فرش ابریشم قرمز ۲۰۰ در ۳۰۰")
        assert result.material == [CarpetMaterial.SILK]
        assert result.color == [ColorFamily.RED]
        assert (result.min_width_cm, result.max_width_cm) == (200, 200)
        assert (result.min_length_cm, result.max_length_cm) == (300, 300)

    def test_a_size_said_in_metres(self) -> None:
        """«دو در سه» is how a size is spoken; «۲۰۰ در ۳۰۰» is how it is written."""
        result = plan("فرش لچک‌ترنج پشمی دو در سه")
        assert (result.min_width_cm, result.min_length_cm) == (200, 300)
        assert result.pattern == [CarpetPattern.LACHAK_TORANJ]

    def test_a_preposition_decides_which_end_of_the_price(self) -> None:
        assert plan("فرش زیر ۵۰ میلیون").max_price == Decimal(50_000_000)
        assert plan("فرش از ۵ میلیون").min_price == Decimal(5_000_000)
        # A bare amount is a budget: nobody types a price to ask for carpets
        # that cost more than it.
        assert plan("فرش ۵ میلیون").max_price == Decimal(5_000_000)

    def test_cheap_and_expensive_are_claims_about_this_shop(self) -> None:
        """«ارزان» has no meaning without the catalogue's own range."""
        cheap = plan("فرش ارزان مدرن")
        assert cheap.max_price is not None and cheap.max_price < CEILING / 2
        assert cheap.pattern == [CarpetPattern.MODERN]

        expensive = plan("فرش گران ابریشمی")
        assert expensive.min_price is not None and expensive.min_price > CEILING / 2

        # Without a range there is nothing to be cheap relative to, and
        # inventing a number would be worse than not answering.
        assert rules.parse("فرش ارزان").max_price is None

    def test_a_suffix_does_not_break_a_word(self) -> None:
        """Persian attaches its suffixes, so the match cannot demand a whole token."""
        assert plan("فرش ابریشمی").material == [CarpetMaterial.SILK]
        assert plan("فرش قرمزه").color == [ColorFamily.RED]

    def test_a_word_inside_another_word_is_not_a_match(self) -> None:
        """The bug this rule exists for.

        «ابریشمی» contains «یشمی», which is one of the words for green, so a
        silk query came back as a green one — correctly, silently, and with a
        perfectly reasonable-looking result page.
        """
        assert ColorFamily.GREEN not in plan("فرش گران ابریشمی افشان").color
        assert plan("فرش گران ابریشمی افشان").material == [CarpetMaterial.SILK]

    def test_the_longer_phrase_wins(self) -> None:
        """«آبی تیره» is navy; «آبی» alone would have been turquoise."""
        assert plan("فرش آبی تیره").color == [ColorFamily.BLUE]

    def test_an_unreadable_sentence_understands_nothing_rather_than_everything(self) -> None:
        result = plan("سلام خوبی")
        assert result.is_empty
        assert result.understood == []

    def test_every_decision_is_said_back_in_persian(self) -> None:
        result = plan("فرش سرمه‌ای ابریشم برای پذیرایی تا ۵۰ میلیون")
        assert len(result.understood) == 4
        assert any("سرمه‌ای" in line for line in result.understood)
        assert any("پذیرایی" in line for line in result.understood)
        # Persian digits, because these lines are read rather than parsed.
        assert any("۵۰" in line for line in result.understood)


class TestNormalisation:
    def test_arabic_letters_and_digits_are_the_same_query(self) -> None:
        assert plan("فرش سرمه‌ای").color == plan("فرش سرمه ای").color
        assert plan("فرش ۲۰۰ در ۳۰۰").min_width_cm == plan("فرش 200 در 300").min_width_cm
        # Arabic kaf and ya, which an Arabic keyboard produces for Persian text.
        assert plan("فرش كودك").room == [RoomType.KIDS_ROOM]


class TestTheSchemaIsTheSafetyArgument:
    def test_a_value_outside_the_vocabulary_cannot_be_expressed(self) -> None:
        """The one thing standing between a hallucination and the catalogue."""
        with pytest.raises(ValidationError):
            QueryPlan.model_validate({"color": ["burgundy"]})
        with pytest.raises(ValidationError):
            QueryPlan.model_validate({"room": ["bathroom"]})
        with pytest.raises(ValidationError):
            QueryPlan.model_validate({"max_price": -1})

    def test_a_reversed_range_is_repaired_rather_than_refused(self) -> None:
        """A model that swapped two fields understood the sentence. Returning
        nothing would be the one outcome that teaches the shopper nothing."""
        result = QueryPlan.model_validate({"min_price": 10_000_000, "max_price": 5_000_000})
        assert (result.min_price, result.max_price) == (Decimal(5_000_000), Decimal(10_000_000))

    def test_the_prompt_is_generated_from_the_enums(self) -> None:
        """So a new colour family reaches the model without anybody editing prose."""
        prompt = build_system_prompt(FLOOR, CEILING)
        for member in ColorFamily:
            assert member.value in prompt
            assert label_for(member) in prompt
        for member in RoomType:
            assert member.value in prompt
        assert str(int(CEILING)) in prompt


class TestVocabularyCoverage:
    @pytest.mark.parametrize(
        ("enum_type", "table"),
        [
            (ColorFamily, COLOR_WORDS),
            (CarpetPattern, PATTERN_WORDS),
            (CarpetMaterial, MATERIAL_WORDS),
            (RoomType, ROOM_WORDS),
        ],
    )
    def test_every_member_has_words_a_shopper_might_type(self, enum_type, table) -> None:
        """Adding an enum member and forgetting its synonyms makes it
        unsearchable by sentence, silently. This is the alarm."""
        missing = [member for member in enum_type if not table.get(member)]
        assert missing == [], f"no Persian words for {missing}"

    @pytest.mark.parametrize(
        ("enum_type", "table"),
        [
            (ColorFamily, COLOR_WORDS),
            (CarpetPattern, PATTERN_WORDS),
            (CarpetMaterial, MATERIAL_WORDS),
            (RoomType, ROOM_WORDS),
        ],
    )
    def test_each_members_first_word_finds_that_member(self, enum_type, table) -> None:
        for member, words in table.items():
            found = rules._find(rules.normalize(f"فرش {words[0]}"), table)
            assert member in found, f"{words[0]} did not find {member}"


class TestTheEndpoint:
    def test_a_sentence_becomes_the_catalogue_query_it_describes(
        self, client, admin_client
    ) -> None:
        for slug, material, rooms in [
            ("silk-living", "silk", ["living_room"]),
            ("wool-kids", "wool", ["kids_room"]),
        ]:
            created = admin_client.post(
                "/api/v1/admin/carpets",
                json={
                    "slug": slug,
                    "name": f"فرش {slug}",
                    "pattern": "afshan",
                    "material": material,
                    "colors": ["#8b1e1e"],
                    "suitable_rooms": rooms,
                },
            )
            assert created.status_code == 201, created.text
            admin_client.post(
                f"/api/v1/admin/carpets/{created.json()['id']}/variants",
                json={"width_cm": 200, "length_cm": 300, "price": "9000000", "stock": 1},
            )

        response = client.post(
            "/api/v1/search/conversational", json={"q": "فرش ابریشم برای پذیرایی"}
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert [item["slug"] for item in body["page"]["items"]] == ["silk-living"]
        assert body["filters"]["material"] == ["silk"]
        assert body["filters"]["room"] == ["living_room"]
        assert body["understood"]

    def test_an_unread_sentence_answers_nothing_rather_than_everything(
        self, client, admin_client
    ) -> None:
        """The bug the browser found.

        With no filters extracted, the plan runs as an empty query and the
        listing hands back the whole catalogue — seventy carpets presented as
        the answer to «سلام حالت چطوره», under a panel saying the sentence was
        not understood.
        """
        created = admin_client.post(
            "/api/v1/admin/carpets",
            json={
                "slug": "in-stock",
                "name": "فرش",
                "pattern": "afshan",
                "material": "wool",
                "colors": [],
                "suitable_rooms": [],
            },
        )
        assert created.status_code == 201

        body = client.post(
            "/api/v1/search/conversational", json={"q": "سلام حالت چطوره"}
        ).json()
        assert body["understood"] == []
        assert body["page"]["total"] == 0
        assert body["page"]["items"] == []

    def test_an_empty_question_is_rejected_rather_than_run(self, client) -> None:
        assert client.post("/api/v1/search/conversational", json={"q": ""}).status_code == 422


class TestPlannerFallback:
    async def test_the_rules_answer_when_the_model_cannot(self) -> None:
        """A dead endpoint degrades the answer; it does not remove the feature.

        This is the property the demo rests on, so it is tested against a base
        URL that cannot resolve rather than against a mock that agrees to fail.
        """
        planner = OpenAiCompatiblePlanner(
            base_url="http://127.0.0.1:1/v1", api_key="none", model="nothing"
        )
        result = await planner.plan(
            "فرش سرمه‌ای برای پذیرایی", price_floor=FLOOR, price_ceiling=CEILING
        )
        assert result.color == [ColorFamily.BLUE]
        assert result.room == [RoomType.LIVING_ROOM]

    async def test_the_default_planner_needs_nothing(self) -> None:
        result = await RuleBasedPlanner().plan("فرش ابریشم قرمز")
        assert result.material == [CarpetMaterial.SILK]
