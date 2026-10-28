"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  features: string[];
  imageEmoji: string;
  rating: number;
};
type CartItem = { product: Product; quantity: number };
type Recommendation = { product_id: string; reason: string };
const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [prompt, setPrompt] = useState("Help me build a focused home-office setup under $150.");
  const [budget, setBudget] = useState("150");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [aiMode, setAiMode] = useState("checking");
  const [paypalReady, setPaypalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"info" | "warn" | "success">("info");

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(async (res) => {
        if (!res.ok) throw new Error("API unavailable");
        const data = await res.json();
        setProducts(data.products);
      })
      .catch(() => setNotice("Start the FastAPI backend to load the catalogue. See README.md for the two-terminal setup."));
    fetch(`${API}/api/status`)
      .then((res) => res.json())
      .then((data) => { setAiMode(data.ai_mode); setPaypalReady(data.paypal_configured); })
      .catch(() => setAiMode("offline"));
    const params = new URLSearchParams(window.location.search);
    const cancelled = params.get("checkout") === "cancelled";
    if (cancelled) {
      setNotice("Checkout was cancelled. No payment was captured by PayPilot AI.");
      setNoticeKind("warn");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cart]);
  const count = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  function addToCart(product: Product) {
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id);
      if (found) return current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item);
      return [...current, { product, quantity: 1 }];
    });
    setNotice(`${product.name} added to your cart.`);
    setNoticeKind("success");
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current
      .map((item) => item.product.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0 && item.quantity <= 10));
  }

  async function askAssistant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const parsedBudget = budget.trim() ? Number(budget) : undefined;
      if (parsedBudget !== undefined && (!Number.isFinite(parsedBudget) || parsedBudget <= 0)) {
        throw new Error("Enter a valid positive budget, or leave it blank.");
      }
      const response = await fetch(`${API}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, budget: parsedBudget, limit: 3 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Recommendation request failed.");
      setAssistantMessage(data.message);
      setRecommendations(data.recommendations);
      setAiMode(data.mode);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not get recommendations.");
      setNoticeKind("warn");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    if (!cart.length) return;
    if (!paypalReady) {
      setNotice("PayPal Sandbox isn't configured yet. Add eligible Sandbox app credentials to api/.env; no payment has been started.");
      setNoticeKind("warn");
      return;
    }
    setBusy(true);
    setNotice("Creating a PayPal Sandbox order…");
    setNoticeKind("info");
    try {
      const response = await fetch(`${API}/api/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not create checkout.");
      window.location.assign(data.approval_url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Checkout failed.");
      setNoticeKind("warn");
      setBusy(false);
    }
  }

  const recommendedProducts = recommendations
    .map((recommendation) => ({ recommendation, product: products.find((product) => product.id === recommendation.product_id) }))
    .filter((item): item is { recommendation: Recommendation; product: Product } => Boolean(item.product));

  return (
    <main>
      <div className="shell">
        <header className="topbar">
          <a className="brand" href="#" aria-label="PayPilot AI home">
            <span className="brand-mark">P</span>
            <span>paypilot<span style={{ color: "var(--mint)" }}>.</span>ai</span>
          </a>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="nav-pill">AI COMMERCE LAB</span>
            <a className="nav-pill" href="#shop">Explore shop ↘</a>
          </div>
        </header>

        <section className="hero">
          <div>
            <div className="eyebrow">A more thoughtful way to shop</div>
            <h1>Good choices.<br /><span>Clear checkout.</span></h1>
            <p className="lede">Your AI shopping copilot turns a goal into a shortlist you can understand. Compare the trade-offs, keep control of your budget, and approve every payment yourself.</p>
            <div className="actions">
              <a className="btn btn-primary" href="#assistant">Find my best fit <span style={{ marginLeft: 9 }}>↘</span></a>
              <a className="btn btn-muted" href="#how-it-works">How it works</a>
            </div>
            <p className="helper" style={{ marginTop: 20 }}>A hackathon prototype · Sandbox checkout only · No autonomous payments</p>
          </div>
          <div className="orbit-card">
            <div className="orbit-label">YOUR SHOPPING PLAN</div>
            <div className="orbit-price">$150<span style={{ color: "var(--mint)", fontSize: 20 }}> budget</span></div>
            <div className="orbit-sub">A sample focused-work setup, matched to your needs.</div>
            <div className="mini-product">
              <div><strong>⌨️ Keycraft Mechanical Keyboard</strong><small>Comfortable, tactile typing</small></div>
              <span className="mini-price">$79</span>
            </div>
            <div className="mini-product">
              <div><strong>💡 Halo Task Lamp</strong><small>Adjustable, focused lighting</small></div>
              <span className="mini-price">$39</span>
            </div>
            <div className="mini-product">
              <div><strong>Budget remaining</strong><small>Before taxes/shipping</small></div>
              <span className="mini-price">$32</span>
            </div>
          </div>
        </section>

        <section className="section" id="assistant">
          <div className="section-head">
            <div><div className="eyebrow">01 / Tell us what matters</div><h2>Your brief. Your priorities.</h2></div>
            <p className="section-note">Describe the job to be done. The assistant recommends from a fixed catalogue and never invents checkout prices.</p>
          </div>
          <div className="workspace">
            <div className="panel">
              <div className="panel-title"><span>Shopping copilot</span><span className={`status ${aiMode === "openai" ? "ok" : ""}`}>{aiMode === "openai" ? "AI model connected" : aiMode === "demo-fallback" ? "Local demo mode" : aiMode === "offline" ? "API offline" : "Checking mode"}</span></div>
              <form onSubmit={askAssistant}>
                <label className="input-label" htmlFor="brief">What are you shopping for?</label>
                <textarea id="brief" className="text-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} minLength={3} maxLength={1000} required />
                <div className="form-row">
                  <div><label className="input-label" htmlFor="budget">Budget (USD)</label><input id="budget" className="text-input" type="number" min="1" max="10000" step="1" value={budget} onChange={(event) => setBudget(event.target.value)} /></div>
                  <div style={{ display: "flex", alignItems: "end" }}><button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Thinking…" : "Find options ↗"}</button></div>
                </div>
                <div className="helper">Recommendations are advisory. Prices come from the server-side demo catalogue. Confirm details before buying.</div>
              </form>
              {assistantMessage && <div className="notice">{assistantMessage}</div>}
              {recommendedProducts.length > 0 && <div className="result-list">{recommendedProducts.map(({ recommendation, product }) => <div className="result-card" key={product.id}><strong>{product.imageEmoji} {product.name} · {money(product.price)}</strong><p>{recommendation.reason}</p><button className="small-btn" style={{ marginTop: 10 }} onClick={() => addToCart(product)}>Add to cart</button></div>)}</div>}
            </div>

            <div className="panel" id="shop">
              <div className="panel-title"><span>Curated catalogue</span><span className="status ok">{products.length || "—"} products</span></div>
              <div className="product-grid">
                {products.map((product) => <article className="product-card" key={product.id}>
                  <div className="product-icon">{product.imageEmoji}</div>
                  <div className="product-top"><h3>{product.name}</h3><span className="product-price">{money(product.price)}</span></div>
                  <p>{product.description}</p>
                  <div className="product-meta"><span className="rating">★ {product.rating.toFixed(1)}</span><button className="small-btn" onClick={() => addToCart(product)}>Add +</button></div>
                </article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div><div className="eyebrow">02 / Stay in control</div><h2>A checkout you can trust.</h2></div>
            <p className="section-note">PayPilot prepares the order. PayPal handles buyer approval. You decide whether to proceed.</p>
          </div>
          <div className="workspace">
            <div className="panel">
              <div className="panel-title"><span>Your order</span><span className="status">{count} item{count === 1 ? "" : "s"}</span></div>
              {cart.length === 0 ? <p className="helper">Your cart is empty. Add a product from the catalogue or from your recommendations.</p> :
                <div className="cart-list">{cart.map((item) => <div className="cart-line" key={item.product.id}>
                  <div><strong>{item.product.imageEmoji} {item.product.name}</strong><small>{money(item.product.price)} each</small></div>
                  <div className="qty"><button aria-label={`Decrease ${item.product.name} quantity`} onClick={() => changeQuantity(item.product.id, -1)}>−</button><span>{item.quantity}</span><button aria-label={`Increase ${item.product.name} quantity`} onClick={() => changeQuantity(item.product.id, 1)}>+</button></div>
                </div>)}</div>}
              <div className="total-row"><span>Subtotal</span><strong>{money(total)}</strong></div>
              <div className="helper">Shipping and taxes are not included in this prototype. Final totals are recalculated by the API from the catalogue.</div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={!cart.length || busy} onClick={checkout}>Continue to PayPal Sandbox ↗</button>
              <div className={`notice ${paypalReady ? "success" : "warn"}`}>{paypalReady ? "PayPal Sandbox credentials detected. A real Sandbox order can be created." : "Sandbox checkout is not configured yet. Checkout stays disabled until server-side credentials are added."}</div>
            </div>
            <div className="panel" id="how-it-works">
              <div className="panel-title"><span>Built around clear boundaries</span><span className="status ok">User in control</span></div>
              <div className="result-list">
                <div className="result-card"><strong>01 · Recommend, don&apos;t decide</strong><p>AI suggests options from the catalogue; it cannot set prices or trigger payment capture.</p></div>
                <div className="result-card"><strong>02 · Verify with code</strong><p>The API validates product IDs and quantities, then calculates the subtotal from trusted server data.</p></div>
                <div className="result-card"><strong>03 · Ask before paying</strong><p>PayPal&apos;s hosted approval flow keeps the buyer in control before the backend attempts capture.</p></div>
                <div className="result-card"><strong>04 · Show the real status</strong><p>After buyer approval, the app reports the order status returned by PayPal Sandbox.</p></div>
              </div>
            </div>
          </div>
          {notice && <div className={`notice ${noticeKind}`} role="status" style={{ marginTop: 18 }}>{notice}</div>}
        </section>

        <section className="section">
          <div className="section-head">
            <div><div className="eyebrow">03 / Product principles</div><h2>Intelligence with guardrails.</h2></div>
          </div>
          <div className="feature-row">
            <div className="feature"><div className="feature-icon">⌕</div><h3>Grounded recommendations</h3><p>Every suggestion maps to a known product ID and catalogue entry. No fabricated SKUs or prices.</p></div>
            <div className="feature"><div className="feature-icon">⛨</div><h3>Payment boundaries</h3><p>Secrets remain on the server. AI never receives credentials and cannot initiate payment actions.</p></div>
            <div className="feature"><div className="feature-icon">↗</div><h3>Evidence over promises</h3><p>Demo mode, model mode, and Sandbox readiness are surfaced honestly instead of pretending everything is live.</p></div>
          </div>
        </section>

        <footer className="footer">
          <span>© 2026 PayPilot AI · Hackathon prototype</span>
          <span>Sandbox only · AI-assisted · Human-approved</span>
        </footer>
      </div>
    </main>
  );
}
