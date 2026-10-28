from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    category: str
    price: float
    description: str
    features: tuple[str, ...]
    image_emoji: str
    rating: float


PRODUCTS: tuple[Product, ...] = (
    Product(
        "desk-lamp-pro",
        "Halo Task Lamp",
        "Workspace",
        39.00,
        "Dimmable LED desk lamp with adjustable arm and warm/cool light modes.",
        ("dimmable", "adjustable", "LED", "low power"),
        "💡",
        4.7,
    ),
    Product(
        "keyboard-mech",
        "Keycraft Mechanical Keyboard",
        "Workspace",
        79.00,
        "Compact mechanical keyboard with tactile switches and a durable frame.",
        ("mechanical", "compact", "tactile", "USB-C"),
        "⌨️",
        4.6,
    ),
    Product(
        "mouse-ergonomic",
        "Contour Wireless Mouse",
        "Workspace",
        34.00,
        "Ergonomic wireless mouse with adjustable DPI and long battery life.",
        ("wireless", "ergonomic", "adjustable DPI"),
        "🖱️",
        4.5,
    ),
    Product(
        "headphones-focus",
        "Focus ANC Headphones",
        "Audio",
        119.00,
        "Over-ear headphones with active noise cancellation and all-day comfort.",
        ("noise cancellation", "wireless", "comfort"),
        "🎧",
        4.8,
    ),
    Product(
        "webcam-hd",
        "ClearView HD Webcam",
        "Workspace",
        59.00,
        "1080p webcam with privacy shutter and dual microphones.",
        ("1080p", "privacy shutter", "microphones"),
        "📷",
        4.4,
    ),
    Product(
        "stand-aluminum",
        "Lift Aluminum Laptop Stand",
        "Workspace",
        45.00,
        "Foldable laptop stand designed to improve screen height and airflow.",
        ("foldable", "aluminum", "portable"),
        "💻",
        4.6,
    ),
    Product(
        "speaker-mini",
        "Pulse Mini Speaker",
        "Audio",
        49.00,
        "Compact Bluetooth speaker for calls and everyday listening.",
        ("Bluetooth", "portable", "speakerphone"),
        "🔊",
        4.3,
    ),
    Product(
        "notebook-smart",
        "Grid Smart Notebook",
        "Productivity",
        24.00,
        "Reusable notebook for planning, notes, and focused work sessions.",
        ("reusable", "planning", "lightweight"),
        "📓",
        4.2,
    ),
)


def public_product(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "category": product.category,
        "price": product.price,
        "description": product.description,
        "features": list(product.features),
        "imageEmoji": product.image_emoji,
        "rating": product.rating,
    }


def get_product(product_id: str) -> Product | None:
    return next((product for product in PRODUCTS if product.id == product_id), None)
