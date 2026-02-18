
---

# Weppo — Programmable Settlement for Autonomous Agents

> Deterministic USDC settlement for Agent-to-Agent transactions.
> Built on Base. Gasless. Machine-native. Compatible with x402 payment intents.

---

## 1. The Vision

Autonomous agents need a way to:

* Charge other agents
* Pay for services
* Execute microtransactions
* Settle deterministically

Without:

* Invoices
* Human intervention
* Manual reconciliation
* Gas management complexity

Weppo is a programmable financial state machine that enables secure, seamless Agent-to-Agent (A2A) settlement using USDC on Base, while **integrating with x402 for standardized agent payment intents**.

---

## 2. The Core Problem

Today:

* Agents can call APIs.
* Agents cannot safely charge each other.
* Payments are human-oriented (Stripe, invoices, dashboards).
* Crypto wallets are not machine-friendly.
* Gas management breaks UX.

There is no native settlement layer designed for autonomous software agents that can **interpret x402 intents and execute deterministic on-chain settlements**.

---

## 3. The Solution

Weppo provides:

### 1️⃣ Agent Accounts (On-Chain Escrow)

Each agent has:

* A USDC balance (escrowed on Base)
* Deterministic settlement logic
* Transaction history
* Programmable spending state

Settlement happens on-chain using USDC, triggered by **x402-compatible payment intents**.

---

### 2️⃣ Programmable Charging

Agents can:

* Pre-authorize spending
* Define max budgets
* Execute per-call microcharges
* Enforce deterministic payment logic

Example:

```ts
await weppo.preAuthorize({
  agentId: "agent_A",
  maxAmount: 20 // USDC
});
```

Then:

```ts
await weppo.charge({
  from: "agent_A",
  to: "agent_B",
  amount: 0.05
});
```

Weppo:

* Interprets the x402 payment intent
* Verifies authorization
* Executes settlement in USDC
* Updates state
* Emits event logs

---

### 3️⃣ Gas Abstraction (Paymaster)

Agents do not manage gas.

* Transactions use account abstraction
* A paymaster covers gas fees
* Agents only think in USDC

This makes A2A transactions seamless.

---

## 4. Architecture

```mermaid
graph LR
    AgentA["🤖 Agent A"] --"1. Service Request"--> AgentB["🤖 Agent B"]

    AgentB --"2. x402 Payment Intent"--> Weppo["🧠 Weppo State Machine"]

    Weppo --"3. Validate + Settle (USDC)"--> Base["⛓️ Base Chain"]

    Base --"4. USDC Transfer"--> AgentB
```

---

## 5. Design Principles

### Deterministic

No invoices.
No async human approval.
Payment logic executes as code, triggered by x402 intents.

### Agent-Native

Accounts belong to agents — not humans.

### Escrow-Based

Agents deposit USDC before spending.
No credit risk.

### Composable

Built as a programmable primitive that other agent frameworks can integrate, **x402-first compatible**.

---

## 6. What Weppo Is (V1)

Weppo is:

* A programmable A2A settlement contract
* An SDK for agent-native charging
* A USDC-based escrow system on Base
* A gas-abstracted transaction layer
* **x402-compatible for standardized payment intents**

---

## 7. What Weppo Is Not (Yet)

* Not a marketplace
* Not a universal payment rail
* Not a fiat processor
* Not an enterprise budgeting tool
* Not a Visa replacement

---

## 8. Example Flow

### Step 1 — Deposit

Agent A deposits 50 USDC into Weppo escrow.

### Step 2 — Pre-Authorize

Agent A sets:

```ts
maxSpend = 10 USDC for Agent B
```

### Step 3 — Service Usage

Agent B charges 0.05 USDC per request.

Each charge:

* Validated via x402 intent
* Settled on-chain
* Gas paid by paymaster

### Step 4 — Settlement Complete

Balances update deterministically.

No disputes.
No invoices.
No humans.

---

## 9. Roadmap

* [ ] Smart contract: escrow + programmable authorization
* [ ] x402 adapter / integration
* [ ] Paymaster integration
* [ ] SDK for agents
* [ ] Event-based transaction indexing
* [ ] Agent identity layer (optional v2)

---

## 10. Positioning (Compressed)

Weppo =
**Programmable USDC settlement for autonomous agents, x402-compatible.**

---

This keeps your **A2A settlement vision intact**, while showing that **Weppo can leverage x402** as the standard for payment intents.

If you want, I can also rewrite the **landing page title & tagline** to reflect x402 integration and the “Stripe for agents” angle. That would make it ultra-sharp for builders.



# contracts

base sepolia 

Forwarder: 0xc4Bc93234b78B63F63A72F58E84B45311827d406
Weppo: 0x82D9828fdCAD4082721932201d10AF4446bBd0f9
MerchantGateway: 0xEF822A6b8960041C069800F6dd9D4E370f2C9047
