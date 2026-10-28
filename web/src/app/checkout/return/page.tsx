"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export default function CheckoutReturn() {
  const [message, setMessage] = useState("Verifying approved Sandbox order…");
  const [state, setState] = useState<"working" | "success" | "error">("working");

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("token");
    if (!orderId) {
      setMessage("No PayPal order token was returned. No capture was attempted.");
      setState("error");
      return;
    }
    fetch(`${API}/api/checkout/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not verify order.");
        setMessage(`PayPal Sandbox returned status: ${data.status}. Order: ${data.order_id}${data.capture_id ? ` · Capture: ${data.capture_id}` : ""}`);
        setState(data.status === "COMPLETED" ? "success" : "error");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Order verification failed.");
        setState("error");
      });
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="panel" style={{ width: "min(560px, 100%)" }}>
        <div className="eyebrow">PayPilot AI · Checkout return</div>
        <h1 style={{ fontSize: 34, letterSpacing: "-.05em", margin: "16px 0" }}>
          {state === "success" ? "Order completed." : state === "error" ? "We couldn't verify that order." : "Verifying your order…"}
        </h1>
        <p className={`notice ${state === "success" ? "success" : state === "error" ? "warn" : ""}`}>{message}</p>
        <p className="helper">This is a Sandbox flow. Check the status before treating the transaction as complete.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>Return to PayPilot AI</Link>
      </section>
    </main>
  );
}
