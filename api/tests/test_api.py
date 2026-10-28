from fastapi.testclient import TestClient

from app.main import app
from app.paypal import calculate_total

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_products_are_available() -> None:
    response = client.get("/api/products")
    assert response.status_code == 200
    products = response.json()["products"]
    assert len(products) >= 6
    assert all(product["price"] > 0 for product in products)


def test_recommendations_fallback_is_usable(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.recommender.get_settings", lambda: type("Settings", (), {"openai_api_key": ""})()
    )
    response = client.post(
        "/api/recommendations",
        json={"prompt": "I need an ergonomic wireless mouse", "budget": 100, "limit": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "demo-fallback"
    assert data["recommendations"]
    assert all(item["product_id"] for item in data["recommendations"])


def test_rejects_short_prompt() -> None:
    response = client.post("/api/recommendations", json={"prompt": "hi"})
    assert response.status_code == 422


def test_checkout_refuses_unknown_product() -> None:
    response = client.post(
        "/api/checkout/create",
        json={"items": [{"product_id": "not-a-real-product", "quantity": 1}]},
    )
    assert response.status_code == 422


def test_total_is_calculated_from_server_catalogue() -> None:
    total = calculate_total([{"product_id": "desk-lamp-pro", "quantity": 2}])
    assert str(total) == "78.00"


def test_checkout_requires_server_credentials() -> None:
    response = client.post(
        "/api/checkout/create",
        json={"items": [{"product_id": "desk-lamp-pro", "quantity": 1}]},
    )
    assert response.status_code == 503
    assert "Sandbox" in response.json()["detail"]
