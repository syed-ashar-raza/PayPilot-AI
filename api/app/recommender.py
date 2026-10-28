import json
import re

from openai import AsyncOpenAI

from app.catalog import PRODUCTS, public_product
from app.config import get_settings


def _fallback_recommendations(prompt: str, budget: float | None, limit: int) -> list[dict]:
    terms = set(re.findall(r"[a-z0-9]+", prompt.lower()))
    ranked: list[tuple[int, float, object]] = []
    for product in PRODUCTS:
        searchable = " ".join(
            [product.name, product.category, product.description, *product.features]
        ).lower()
        score = sum(1 for term in terms if len(term) > 2 and term in searchable)
        if budget is not None and product.price > budget:
            continue
        ranked.append((score, product.rating, product))
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    chosen = ranked[:limit]
    result = []
    for score, _rating, product in chosen:
        reason = (
            "Matches terms in your request and fits the selected budget."
            if score
            else "A well-rated option in the catalogue that fits your budget."
        )
        result.append({"product_id": product.id, "reason": reason})
    return result


async def recommend(prompt: str, budget: float | None, limit: int) -> tuple[str, list[dict], str]:
    settings = get_settings()
    if not settings.openai_api_key:
        return (
            "I matched your request against our catalogue using transparent local ranking. "
            "Add OPENAI_API_KEY to enable model-powered recommendations.",
            _fallback_recommendations(prompt, budget, limit),
            "demo-fallback",
        )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    products = [
        public_product(product) for product in PRODUCTS if budget is None or product.price <= budget
    ]
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a shopping recommendation assistant. Recommend only products "
                        "from the provided catalogue. Never invent product IDs, prices, stock, "
                        "warranties, or claims. Return JSON with keys 'message' and "
                        "'recommendations'; recommendations is a list of objects with "
                        "'product_id' and concise 'reason'. Do not initiate payments."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "request": prompt,
                            "budget_usd": budget,
                            "limit": limit,
                            "catalogue": products,
                        }
                    ),
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        allowed = {product["id"] for product in products}
        valid = []
        for item in data.get("recommendations", []):
            product_id = item.get("product_id")
            reason = str(item.get("reason", ""))[:240]
            if product_id in allowed and product_id not in {x["product_id"] for x in valid}:
                valid.append(
                    {"product_id": product_id, "reason": reason or "Matches your request."}
                )
            if len(valid) >= limit:
                break
        if not valid:
            valid = _fallback_recommendations(prompt, budget, limit)
        message = str(data.get("message", "Here are catalogue options for your request."))[:500]
        return message, valid, "openai"
    except Exception:
        # Fail safely and keep the experience available; the UI reports the mode.
        return (
            "The AI provider was unavailable, so I used local catalogue ranking for this response.",
            _fallback_recommendations(prompt, budget, limit),
            "demo-fallback",
        )
