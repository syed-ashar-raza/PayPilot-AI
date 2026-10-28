# PayPilot AI

**An AI shopping copilot that turns a customer's goal into a transparent, user-approved checkout.**

PayPilot AI combines a product-recommendation assistant with a FastAPI backend and a PayPal Sandbox checkout flow. It is designed as a hackathon-ready, auditable prototype: the model may recommend products, but deterministic application code calculates prices and the customer explicitly approves checkout through PayPal.

## What is included

- Next.js + TypeScript storefront with responsive styling.
- FastAPI backend with a small curated catalogue.
- AI-powered recommendation endpoint using the OpenAI API when configured.
- Safe deterministic fallback mode so the app can be explored without an AI API key.
- PayPal Orders API integration: create an order, redirect the buyer to PayPal, and capture after buyer approval.
- Server-side price calculation; client-submitted prices are never trusted.
- Input validation, explicit checkout approval, clear Sandbox/demo status, and tests.
- Docker Compose setup, environment templates, GitHub Actions CI, and MIT license.

> **Honest status:** This repository is a runnable starter implementation. PayPal checkout requires your own eligible PayPal Developer/Sandbox credentials. AI recommendations use a real model only when `OPENAI_API_KEY` is configured; otherwise, the app explicitly uses its deterministic demo recommender. Do not describe either integration as live until you have configured and tested it.

## Architecture

```text
Browser (Next.js)
  ├── POST /api/recommendations ──> FastAPI ──> OpenAI API (optional)
  │                                      └────> deterministic fallback
  └── POST /api/checkout/create ──> FastAPI ──> PayPal Orders API (Sandbox)
                                            └──> approval URL in browser
      PayPal buyer approval ──> POST /api/checkout/capture ──> PayPal capture API
```

## Requirements

- Python 3.11+
- Node.js 20+
- npm
- Optional: Docker Desktop
- Optional: OpenAI API key for model-powered recommendations
- PayPal Sandbox REST app credentials for checkout

## Quick start (Windows PowerShell)

### 1. Backend

From the project root:

```powershell
cd api
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e ".[dev]"
Copy-Item .env.example .env
```

Open `api/.env` and add credentials if available. Never commit this file.

Start the API:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API health check: http://127.0.0.1:8000/health
Interactive API docs: http://127.0.0.1:8000/docs

### 2. Frontend (second PowerShell window)

```powershell
cd web
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

### `api/.env`

| Variable | Required? | Purpose |
|---|---|---|
| `APP_ENV` | No | `development` by default |
| `FRONTEND_ORIGIN` | No | Allowed browser origin, default `http://localhost:3000` |
| `OPENAI_API_KEY` | No | Enables model-backed product recommendations |
| `OPENAI_MODEL` | No | Defaults to `gpt-4.1-mini` |
| `PAYPAL_CLIENT_ID` | For checkout | Sandbox REST app client ID |
| `PAYPAL_CLIENT_SECRET` | For checkout | Sandbox REST app secret; backend only |
| `PAYPAL_BASE_URL` | No | Defaults to PayPal Sandbox API |
| `PAYPAL_RETURN_URL` | No | Defaults to `http://localhost:3000/checkout/return` |
| `PAYPAL_CANCEL_URL` | No | Defaults to `http://localhost:3000/checkout/cancel` |
| `CURRENCY` | No | Defaults to `USD` |

### `web/.env.local`

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Never put the PayPal client secret or an AI provider secret in a `NEXT_PUBLIC_` variable.

## PayPal Sandbox setup

1. Use the official [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and follow the hackathon team's guidance for country/account eligibility.
2. Create a Sandbox REST app if your account is eligible.
3. Put its Sandbox client ID and secret in `api/.env`.
4. Restart the API.
5. Add a product to the cart and choose **Continue to PayPal Sandbox**.
6. Approve the transaction with a Sandbox buyer account.
7. Return to `/checkout/return`; the frontend asks the backend to capture the approved order and displays the actual API status.

**Do not use fake country details, real payment credentials, or real buyer data.** This prototype is configured for Sandbox, not live money movement. If PayPal signup remains unavailable in your country, keep checkout clearly marked as unavailable until PayPal/hackathon support provides an approved path.

## Run tests

```powershell
cd api
.\.venv\Scripts\Activate.ps1
pytest
```

The tests do not require network access, API keys, or PayPal credentials.

## Docker Compose

With Docker Desktop running:

```powershell
Copy-Item api/.env.example api/.env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000/health

For model-backed recommendations or PayPal checkout, edit `api/.env` first and restart the services.

## Project safety boundaries

- No payment is captured until PayPal returns an approval flow and the backend receives the approved order ID.
- Product IDs, catalogue prices, quantities, and currency totals are validated server-side.
- AI output is used for recommendations only. It cannot set prices, create PayPal orders, or capture payments.
- The browser never receives `PAYPAL_CLIENT_SECRET`.
- The fallback recommender is a transparent demo mode, not represented as a live LLM.
- This is a hackathon prototype, not a production payment system. Before production use, add persistent order records, idempotency and replay protection, rate limiting, structured audit logs, monitoring, privacy review, and deployment-specific security controls.

## Hackathon submission checklist

- [ ] Confirm PayPal Sandbox eligibility and successfully run a Sandbox checkout.
- [ ] Configure an AI model and test recommendation quality, or document the fallback mode accurately.
- [ ] Run backend tests and frontend lint/build.
- [ ] Deploy a working demo or provide complete reproducible run instructions.
- [ ] Verify the Git repository is public and has the license visible.
- [ ] Record a public YouTube demo under 3 minutes showing the app functioning.
- [ ] Describe exactly which APIs/models were used; don't claim untested features.

## License

MIT. See `LICENSE`.
