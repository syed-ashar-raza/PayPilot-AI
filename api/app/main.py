from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.catalog import PRODUCTS, public_product
from app.config import get_settings
from app.paypal import calculate_total, paypal_client
from app.recommender import recommend
from app.schemas import (
    CaptureOrderRequest,
    CaptureOrderResponse,
    CreateOrderRequest,
    CreateOrderResponse,
    RecommendationRequest,
    RecommendationResponse,
)

settings = get_settings()
app = FastAPI(
    title="PayPilot AI API",
    description="AI shopping recommendations and user-approved PayPal Sandbox checkout.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "paypilot-ai-api"}


@app.get("/api/products")
async def list_products() -> dict:
    return {"products": [public_product(product) for product in PRODUCTS]}


@app.get("/api/status")
async def status() -> dict:
    return {
        "ai_mode": "openai" if settings.openai_api_key else "demo-fallback",
        "paypal_configured": paypal_client.configured(),
        "paypal_environment": "sandbox",
    }


@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    message, recommendations, mode = await recommend(request.prompt, request.budget, request.limit)
    return RecommendationResponse(
        message=message,
        recommendations=recommendations,
        mode=mode,
    )


@app.post("/api/checkout/create", response_model=CreateOrderResponse)
async def create_checkout(request: CreateOrderRequest) -> CreateOrderResponse:
    items = [item.model_dump() for item in request.items]
    total = calculate_total(items)
    if total <= 0:
        raise HTTPException(status_code=422, detail="Order total must be positive.")
    order = await paypal_client.create_order(items)
    return CreateOrderResponse(**order)


@app.post("/api/checkout/capture", response_model=CaptureOrderResponse)
async def capture_checkout(request: CaptureOrderRequest) -> CaptureOrderResponse:
    result = await paypal_client.capture_order(request.order_id)
    return CaptureOrderResponse(**result)
