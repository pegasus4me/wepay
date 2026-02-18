Weppo

> A programmable payment layer for agents, built around metered endpoints + agent balances.

That’s it.

---

# What That Actually Means (No Abstraction)

## 1️⃣ Agent Balance

Each agent has:

* A balance
* A transaction log
* A programmable spending state

Think of it as:

“Stripe account, but designed for agents.”

---

## 2️⃣ Metered Endpoint

An agent can expose:

```ts
const endpoint = await weppo.meteredEndpoint({
  pricePerCall: 0.05
});
```

Every time it’s called:

* Payment is automatically deducted
* Settlement is recorded
* Reputation can increase

No invoices.
No human intervention.

---

## 3️⃣ Programmable Charging

Agents can:

* Pre-authorize budget
* Set max spend
* Auto-charge per usage
* Set per-token pricing
* Define microtransaction logic

That’s the programmable part.

---

# Why This Is Powerful

Because agents:

* Don’t want invoices
* Don’t want payment links
* Don’t want checkout pages

They want:

> Deterministic API-level charging.

That’s new.

Stripe is human-first.
You are agent-first.

---

# Now Here’s The Critical Part

This V1 works even if:

* The payer is a human-backed wallet
* The payer is another agent
* The settlement is Stripe
* The settlement is USDC

It’s rail-agnostic at first.

You abstract the complexity.

---

# So The Clean V1 Positioning Is:

Weppo =
“Usage-based programmable payments for AI agents.”



# Architecture (Simplified)

Agent A → Weppo SDK → Weppo Balance Engine
Agent B → Metered Endpoint → Weppo charges A
Weppo → Settles via Stripe/USDC

Done.

---

# Why This Is Smart For You

It aligns with:

* Your love for infra
* Your interest in financial abstraction
* Your desire for A2A economy

But it doesn’t require the entire future to exist first.

---

Now I’m going to push you:

If tomorrow an agent developer asks:

“Why shouldn’t I just use Stripe metered billing?”

What is your 1-line answer?

That answer will define your moat.
