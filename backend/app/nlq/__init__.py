"""Natural-language querying: a Persian sentence in, a catalogue filter out.

The whole design rests on one refusal: **the language model never answers.** It
translates, and the shop answers. A model that knew the catalogue would invent
carpets, quote prices that were never charged and promise stock that is not
there, and it would do all three fluently — which is worse than doing them
badly, because nobody would catch it.

So the model's entire job is to turn «فرش روشن برای اتاق کودک تا ده میلیون» into
`{room: [kids_room], color: [cream, white], max_price: 10000000}`, and that
object is validated against the same `CatalogFilters` every other surface of the
shop uses. Anything outside the vocabulary is dropped rather than forwarded: a
colour the shop does not stock cannot survive the enum, and a negative price
cannot survive the field. The blast radius of a hallucination is therefore a
filter that comes back slightly wrong, never a product that does not exist.

That also answers the question of how the model "knows the shop". It does not
need to. It needs the vocabulary — nine patterns, seven materials, thirteen
colour families, six rooms, and the real price range — which is fifty lines of
prompt built from the enums themselves in `prompt.py`, so it cannot drift from
the taxonomy the way a hand-written prompt would.

Two planners implement the same `QueryPlanner` protocol:

- `RuleBasedPlanner` — no model, no network, no key. It reads the vocabulary
  directly and handles the phrasings people actually type. It is the default,
  and it is what makes this feature demo-proof: a dead API or an expired key
  degrades the answer instead of removing it.
- `OpenAiCompatiblePlanner` — any provider speaking the OpenAI chat schema, so
  DeepSeek, OpenRouter, a local llama.cpp server and OpenAI itself are one
  adapter and one environment variable apart. Its output goes through the same
  validation as everything else; it is a better translator, not a trusted one.
"""

from app.nlq.planner import (
    QueryPlanner,
    RuleBasedPlanner,
    get_planner,
    set_planner,
)
from app.nlq.schema import QueryPlan

__all__ = [
    "QueryPlan",
    "QueryPlanner",
    "RuleBasedPlanner",
    "get_planner",
    "set_planner",
]
