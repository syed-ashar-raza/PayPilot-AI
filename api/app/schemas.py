from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

ProductId = Annotated[str, StringConstraints(min_length=1, max_length=80)]


class RecommendationRequest(BaseModel):
    prompt: Annotated[str, StringConstraints(min_length=3, max_length=1000)]
    budget: float | None = Field(default=None, ge=1, le=10000)
    limit: int = Field(default=3, ge=1, le=6)


class Recommendation(BaseModel):
    product_id: str
    reason: str


class RecommendationResponse(BaseModel):
    message: str
    recommendations: list[Recommendation]
    mode: str


class CartItem(BaseModel):
    product_id: ProductId
    quantity: int = Field(ge=1, le=10)


class CreateOrderRequest(BaseModel):
    items: list[CartItem] = Field(min_length=1, max_length=20)


class CreateOrderResponse(BaseModel):
    order_id: str
    approval_url: str
    currency: str
    total: str


class CaptureOrderRequest(BaseModel):
    order_id: Annotated[str, StringConstraints(min_length=1, max_length=100)]


class CaptureOrderResponse(BaseModel):
    order_id: str
    status: str
    capture_id: str | None = None
    message: str
