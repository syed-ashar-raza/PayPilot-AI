import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="panel" style={{ width: "min(560px, 100%)" }}>
        <div className="eyebrow">PayPilot AI · Checkout cancelled</div>
        <h1 style={{ fontSize: 34, letterSpacing: "-.05em", margin: "16px 0" }}>No worries. You&apos;re still in control.</h1>
        <p className="lede">The PayPal approval flow was cancelled. PayPilot AI has not intentionally captured a payment.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to shopping</Link>
      </section>
    </main>
  );
}
