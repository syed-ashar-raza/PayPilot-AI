from decimal import ROUND_HALF_UP, Decimal
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from app.catalog import get_product
from app.config import get_settings


def calculate_total(items: list[dict]) -> Decimal:
    total = Decimal("0.00")
    for item in items:
        product = get_product(item["product_id"])
        if product is None:
            raise HTTPException(status_code=422, detail=f"Unknown product: {item['product_id']}")
        total += Decimal(str(product.price)) * item["quantity"]
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class PayPalClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.paypal_base_url.rstrip("/")

    def configured(self) -> bool:
        return bool(self.settings.paypal_client_id and self.settings.paypal_client_secret)

    async def _token(self, client: httpx.AsyncClient) -> str:
        if not self.configured():
            raise HTTPException(
                status_code=503,
                detail="PayPal Sandbox is not configured. Add Sandbox app credentials to api/.env.",
            )
        response = await client.post(
            f"{self.base_url}/v1/oauth2/token",
            auth=(self.settings.paypal_client_id, self.settings.paypal_client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
        )
        if response.is_error:
            raise HTTPException(
                status_code=502, detail="PayPal authentication failed; check Sandbox credentials."
            )
        return response.json()["access_token"]

    async def create_order(self, items: list[dict]) -> dict:
        total = calculate_total(items)
        if total <= 0:
            raise HTTPException(status_code=422, detail="Order total must be positive.")
        async with httpx.AsyncClient(timeout=20.0) as client:
            token = await self._token(client)
            payload = {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": "paypilot-cart",
                        "description": "PayPilot AI demo purchase",
                        "amount": {
                            "currency_code": self.settings.currency,
                            "value": f"{total:.2f}",
                        },
                    }
                ],
                "application_context": {
                    "brand_name": "PayPilot AI",
                    "landing_page": "LOGIN",
                    "user_action": "PAY_NOW",
                    "return_url": self.settings.paypal_return_url,
                    "cancel_url": self.settings.paypal_cancel_url,
                },
            }
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
            if response.is_error:
                raise HTTPException(
                    status_code=502, detail="PayPal could not create the Sandbox order."
                )
            data = response.json()
            approval = next(
                (link["href"] for link in data.get("links", []) if link.get("rel") == "approve"),
                None,
            )
            if not data.get("id") or not approval:
                raise HTTPException(
                    status_code=502, detail="PayPal response did not contain an approval link."
                )
            # Never redirect to an arbitrary host supplied by a remote response.
            parsed = urlparse(approval)
            if (
                parsed.scheme != "https"
                or not parsed.hostname
                or not (parsed.hostname == "paypal.com" or parsed.hostname.endswith(".paypal.com"))
            ):
                raise HTTPException(
                    status_code=502, detail="PayPal returned an unexpected approval URL."
                )
            return {
                "order_id": data["id"],
                "approval_url": approval,
                "currency": self.settings.currency,
                "total": f"{total:.2f}",
            }

    async def capture_order(self, order_id: str) -> dict:
        async with httpx.AsyncClient(timeout=20.0) as client:
            token = await self._token(client)
            response = await client.post(
                f"{self.base_url}/v2/checkout/orders/{order_id}/capture",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={},
            )
            if response.is_error:
                detail = "PayPal capture failed. Check the order ID and Sandbox buyer approval."
                raise HTTPException(status_code=502, detail=detail)
            data = response.json()
            captures = [
                capture
                for unit in data.get("purchase_units", [])
                for capture in unit.get("payments", {}).get("captures", [])
            ]
            capture_id = captures[0].get("id") if captures else None
            return {
                "order_id": data.get("id", order_id),
                "status": data.get("status", "UNKNOWN"),
                "capture_id": capture_id,
                "message": "PayPal returned the capture status. This is a Sandbox transaction.",
            }


paypal_client = PayPalClient()
