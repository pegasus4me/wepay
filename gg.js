# WePay — System Architecture Design

    > ** The Consumer Abstraction Layer for Autonomous AI Agent Payments **
> Built on x402 protocol · Fiat -in, fiat - out · OpenClaw - native

---

## 1. Vision & Positioning

WePay sits ** between ** the raw x402 payment rails(Coinbase) and end - users / agents.The analogy:

| Layer | Role | Example |
| ---| ---| ---|
| ** Payment Rail ** | Machine - to - machine protocol | x402(HTTP 402) |
| ** WePay ** | Orchestration + consumer UX | Apple Pay / Stripe |
| ** Agent Framework ** | Task execution & swarm | OpenClaw |

    WePay's moat is **orchestration + abstraction**: agent swarm coordination, Web2 merchant bridging, fiat on/off ramps, and consumer trust features.

---

## 2. High - Level Architecture

    ```mermaid
graph TB
    subgraph Consumers
        HU["👤 Human User"]
        AA["🤖 AI Agent (OpenClaw)"]
    end

    subgraph WePay["WePay Platform"]
        direction TB
        GW["API Gateway<br/>(Auth · Rate Limit · Routing)"]
        
        subgraph Core["Core Services"]
            IS["Intent Service<br/>(NL → structured intent)"]
            OS["Orchestration Service<br/>(Task planning · Agent swarm)"]
            PS["Payment Service<br/>(Settlement · Routing)"]
            WS["Wallet Service<br/>(Agentic wallets · Spending limits)"]
            MS["Merchant Service<br/>(Web2 bridge · Discovery)"]
            TS["Trust Service<br/>(Limits · Disputes · Insurance)"]
        end

        subgraph Data["Data Layer"]
            DB[("PostgreSQL<br/>Accounts · Txns")]
            RD[("Redis<br/>Sessions · Cache")]
            EV[("Event Bus<br/>Kafka / NATS")]
        end
    end

    subgraph External["External Systems"]
        X4["x402 Protocol<br/>(HTTP 402 rails)"]
        BC["Blockchain<br/>(USDC · Base L2)"]
        FI["Fiat Rails<br/>(Stripe · Adyen)"]
        MR["Merchants<br/>(Web2 sites)"]
        OC["OpenClaw<br/>(Agent Framework)"]
    end

    HU -->|Dashboard / SDK| GW
    AA -->|REST / WebSocket| GW
    GW --> IS
    GW --> OS
    IS --> OS
    OS --> PS
    OS --> WS
    OS --> MS
    PS --> X4
    PS --> FI
    WS --> BC
    MS --> MR
    OS -.-> OC
    PS --> DB
    WS --> DB
    OS --> EV
    TS --> DB
    PS --> TS
```

---

## 3. Core Services — Deep Dive

### 3.1 API Gateway

The single entry - point for all traffic(human dashboards, agent SDKs, webhooks).

| Concern | Implementation |
| ---| ---|
| Auth | JWT for humans, API keys + HMAC for agents |
| Rate limiting | Token - bucket per agent / account |
| Protocol | REST + WebSocket(real - time agent comms) |
| Discovery | OpenAPI spec + MCP - compatible tool declarations |

    ---

### 3.2 Intent Service

Translates natural - language or structured requests into actionable payment intents.

```
"Book me a flight LAX→JFK under $400 on Feb 20"
        ↓
{
  "type": "purchase",
  "category": "travel.flight",
  "constraints": {
    "origin": "LAX", "destination": "JFK",
    "max_price": { "amount": 400, "currency": "USD" },
    "date": "2026-02-20"
  },
  "approval": "auto"       // within spending limit
}
```

    ** Key responsibilities:**
        - NLP parsing via pluggable LLM(Claude, Gemini, etc.)
            - Constraint extraction & validation
                - Approval - rule evaluation(auto vs.human -in -the - loop)

---

### 3.3 Orchestration Service * (The core moat)*

    Manages multi - step, multi - agent workflows.This is where OpenClaw swarm coordination lives.

```mermaid
sequenceDiagram
    participant User as User / Agent
    participant Orch as Orchestration
    participant Sub1 as Scout Agent 1
    participant Sub2 as Scout Agent 2
    participant Sub3 as Scout Agent 3
    participant Pay as Payment Service

    User->>Orch: "Book cheapest flight LAX-JFK"
    Orch->>Sub1: Search Google Flights
    Orch->>Sub2: Search Kayak
    Orch->>Sub3: Search airline direct
    Sub1-->>Orch: Result $320
    Sub2-->>Orch: Result $299
    Sub3-->>Orch: Result $340
    Orch->>Orch: Compare & select best
    Orch->>User: Confirm $299 on Kayak?
    User->>Orch: ✅ Approved
    Orch->>Pay: Execute payment $299
    Pay-->>Orch: Txn confirmed
    Orch-->>User: ✅ Booked — confirmation #XYZ
```

        ** Key responsibilities:**
            - Task decomposition into sub - tasks
                - Agent spawning & lifecycle(via OpenClaw SWARM protocol)
                    - Result aggregation & ranking
                        - Retry / fallback logic
                            - State machine per workflow(pending → executing → awaiting_approval → settled)

---

### 3.4 Payment Service

Routes payments across crypto and fiat rails.

```mermaid
graph LR
    subgraph Routing["Payment Router"]
        PR["Route Decision Engine"]
    end

    subgraph Crypto["Crypto Path"]
        X4["x402 Facilitator"]
        BC["Base L2 / USDC"]
    end

    subgraph Fiat["Fiat Path"]
        ST["Stripe Connect"]
        AD["Adyen"]
        VC["Virtual Cards"]
    end

    PR -->|Merchant accepts crypto| X4
    X4 --> BC
    PR -->|Merchant is Web2| ST
    PR -->|Merchant is Web2| AD
    PR -->|Fallback| VC
```

    ** Payment routing logic:**

| Merchant Type | Route | Settlement |
| ---| ---| ---|
| x402 - native(crypto) | Direct x402 | Instant, on - chain |
| Stripe / Adyen merchant | Fiat rails | T + 1 or instant |
| Unknown Web2 site | Virtual card issuance | Agent uses card at checkout |
| Freelancer / P2P | USDC transfer or PayPal | Instant or T + 1 |

** Fiat ↔ Crypto Bridge:**
    - User deposits fiat → converted to USDC(internal ledger)
        - Payment exits as fiat (Stripe) or crypto(x402) depending on merchant
            - User never sees crypto unless they choose to

---

### 3.5 Wallet Service

Manages agent wallets and spending controls.

| Feature | Detail |
| ---| ---|
| ** Agentic Wallets ** | Each agent gets a programmatic wallet(Coinbase MPC or smart - contract wallet) |
| ** Spending Limits ** | Per - transaction, daily, category - level caps |
| ** Allowlists ** | Approved merchant / category lists |
| ** Multi - sig ** | High - value txns require human co - sign |
| ** Balance Mgmt ** | Auto - fund from master account when agent wallet is low |

    ---

### 3.6 Merchant Service * (Web2 Bridge)*

    The critical differentiator — making WePay work with merchants that ** don't accept crypto**.

        ** Strategies:**
            1. ** Virtual Card Issuance ** — Mint a single - use Visa / Mastercard(via Marqeta or Stripe Issuing) for the agent to use at checkout
2. ** Browser Automation ** — Agent navigates the merchant site, fills checkout, pays with virtual card
3. ** Merchant Onboarding ** — For high - volume merchants, integrate directly via Stripe Connect or API partnerships
4. ** Receipt Parsing ** — Extract confirmation details from email / page for proof - of - purchase

---

### 3.7 Trust & Safety Service

The consumer - trust layer that x402 alone doesn't provide.

    | Feature | Implementation |
| ---| ---|
| ** Spending limits ** | Configurable per - user, per - agent, per - category |
| ** Anomaly detection ** | ML model flags unusual patterns |
| ** Dispute resolution ** | Escrow + human review queue |
| ** Insurance ** | Optional coverage for agent errors(partner with insurer) |
| ** Audit log ** | Immutable ledger of all agent actions + payments |
| ** Kill switch** | Instantly freeze agent spending |

    ---

## 4. Data Architecture

    ```mermaid
erDiagram
    USER ||--o{ AGENT : owns
    USER ||--o{ WALLET : has
    AGENT ||--o{ WALLET : assigned
    AGENT ||--o{ TASK : executes
    TASK ||--o{ SUBTASK : decomposes
    TASK ||--|| PAYMENT : triggers
    PAYMENT ||--|| TRANSACTION : settles
    WALLET ||--o{ TRANSACTION : funds
    USER ||--o{ SPENDING_RULE : configures
    AGENT ||--o{ SPENDING_RULE : governed_by

    USER {
        uuid id PK
        string email
        string kyc_status
        enum tier
    }
    AGENT {
        uuid id PK
        uuid user_id FK
        string name
        enum status
        jsonb capabilities
    }
    WALLET {
        uuid id PK
        string address
        decimal balance_usdc
        decimal daily_limit
    }
    TASK {
        uuid id PK
        uuid agent_id FK
        enum status
        jsonb intent
        timestamp created_at
    }
    PAYMENT {
        uuid id PK
        uuid task_id FK
        decimal amount
        enum route
        enum status
    }
    TRANSACTION {
        uuid id PK
        string on_chain_hash
        string fiat_ref
        enum settlement_status
    }
    SPENDING_RULE {
        uuid id PK
        enum rule_type
        decimal max_amount
        jsonb categories
    }
```

---

## 5. Technology Stack

    | Layer | Technology | Rationale |
| ---| ---| ---|
| ** API ** | Node.js(Fastify) or Go | High throughput, low latency |
| ** Agent SDK ** | TypeScript / Python | Match OpenClaw ecosystem |
| ** Database ** | PostgreSQL + TimescaleDB | Relational + time - series for txn analytics |
| ** Cache ** | Redis | Sessions, rate limits, real - time state |
| ** Message Bus ** | NATS JetStream | Lightweight, agent - native pub / sub |
| ** Blockchain ** | Base L2(Coinbase) | x402 native chain, low fees |
| ** Fiat Rails ** | Stripe Connect + Issuing | Virtual cards, merchant payouts |
| ** Auth ** | Clerk or Auth0 | Human auth + API keys for agents |
| ** Infra ** | Kubernetes on GCP / AWS | Auto - scaling for agent traffic bursts |
| ** Monitoring ** | Datadog / Grafana | Real - time dashboards, alerting |
| ** Browser Automation ** | Playwright(headless) | Agent checkout on Web2 sites |

    ---

## 6. Agent Integration — SDK Design

    ```typescript
// WePay Agent SDK — TypeScript
import { WePay } from '@wepay/agent-sdk';

const wepay = new WePay({
  apiKey: process.env.WEPAY_API_KEY,
  agentId: 'agent_abc123',
});

// 1. Simple payment
const payment = await wepay.pay({
  to: 'merchant_xyz',
  amount: 29.99,
  currency: 'USD',
  memo: 'Monthly API subscription',
});

// 2. Intent-based (natural language)
const result = await wepay.execute({
  intent: 'Book a flight LAX to JFK under $400 for Feb 20',
  approvalMode: 'auto',            // or 'human-in-the-loop'
  maxBudget: { amount: 400, currency: 'USD' },
});

// 3. Swarm task (multi-agent)
const swarm = await wepay.swarm({
  task: 'Find and hire a logo designer under $200',
  agents: 3,                        // spawn 3 scout agents
  strategy: 'cheapest',             // or 'fastest', 'best-rated'
  timeout: '30m',
});

// 4. Spending controls
await wepay.setRules({
  dailyLimit: 500,
  perTransaction: 100,
  allowedCategories: ['travel', 'saas', 'food'],
  requireApproval: { above: 50 },
});
```

---

## 7. x402 Integration Flow

    ```mermaid
sequenceDiagram
    participant Agent as WePay Agent
    participant WP as WePay Platform
    participant Merch as Merchant (x402)
    participant Chain as Base L2

    Agent->>WP: POST /pay { merchant, amount }
    WP->>Merch: GET /resource
    Merch-->>WP: 402 Payment Required<br/>{ price: 0.01 USDC, address: 0x... }
    WP->>WP: Check agent wallet balance & rules
    WP->>Chain: Sign & submit USDC transfer
    Chain-->>WP: Txn hash confirmed
    WP->>Merch: GET /resource<br/>X-Payment-Proof: { txHash }
    Merch-->>WP: 200 OK + resource
    WP-->>Agent: ✅ Payment complete + resource
```

---

## 8. Security Architecture

    ```mermaid
graph TB
    subgraph Perimeter["Security Perimeter"]
        WAF["WAF / DDoS Protection"]
        GW["API Gateway + mTLS"]
    end

    subgraph Identity["Identity Layer"]
        HAuth["Human Auth (OAuth 2.0 / Clerk)"]
        AAuth["Agent Auth (API Key + HMAC)"]
        RBAC["Role-Based Access Control"]
    end

    subgraph Wallet["Wallet Security"]
        MPC["MPC Wallets<br/>(No single private key)"]
        HSM["HSM Key Storage"]
        MS["Multi-sig for high value"]
    end

    subgraph Monitoring["Runtime Security"]
        AL["Audit Log (immutable)"]
        AD["Anomaly Detection"]
        KS["Kill Switch"]
    end

    WAF --> GW
    GW --> HAuth
    GW --> AAuth
    HAuth --> RBAC
    AAuth --> RBAC
    RBAC --> MPC
    MPC --> HSM
    MPC --> MS
    RBAC --> AL
    AL --> AD
    AD --> KS
```

    ** Key security measures:**
- ** MPC wallets ** — No single point of key compromise
    - ** Spending limits enforced server - side ** — Agent cannot bypass
        - ** Immutable audit trail ** — Every action logged with cryptographic proof
            - ** Kill switch** — Freeze any agent instantly from dashboard
                - ** Anomaly detection ** — ML flags unusual spending patterns in real - time

---

## 9. Revenue Model

    | Stream | Mechanism | Target |
| ---| ---| ---|
| ** Transaction fee ** | 1–2 % of payment volume | Primary revenue |
| ** SaaS tiers ** | Free / Pro / Enterprise | Agent limits, features |
| ** Virtual card issuance ** | $0.50 per card | Web2 bridge cost recovery |
| ** Premium trust ** | Insurance & dispute resolution | Enterprise upsell |
| ** Merchant tools ** | Dashboard for WePay - accepting merchants | Ecosystem lock -in |

    ---

## 10. Phased Rollout

### Phase 1 — Foundation * (Months 1–3)*
    -[] Core API gateway + auth
        - [] Wallet service(Coinbase MPC wallets)
            - [] x402 direct payments(crypto - native merchants)
                - [] Basic SDK(TypeScript)
                    - [] Dashboard MVP(deposit, view transactions, set limits)

### Phase 2 — Web2 Bridge * (Months 3–5)*
    -[] Stripe Connect integration
        - [] Virtual card issuance(Stripe Issuing / Marqeta)
            - [] Browser automation for agent checkout(Playwright)
                - [] Fiat on - ramp(user deposits USD → internal USDC)
                    - [] Intent service(NL → structured payment)

### Phase 3 — Swarm & Scale * (Months 5–8)*
    -[] OpenClaw swarm integration
        - [] Multi - agent orchestration
            - [] Python SDK
                - [] Trust & safety(anomaly detection, disputes)
                    - [] Merchant onboarding portal

### Phase 4 — Ecosystem * (Months 8–12)*
    -[] Marketplace(agents discover services)
        - [] Agent reputation system
            - [] Insurance partnerships
                - [] AP2 protocol compatibility(Google's standard)
                    - [] L402(Lightning) support as alternative rail

---

## 11. Competitive Moat Summary

                    ```mermaid
graph LR
    subgraph WePay_Moat["WePay Moat"]
        A["🔗 x402 + Fiat Bridge<br/>Works everywhere"]
        B["🤖 Swarm Orchestration<br/>Multi-agent coordination"]
        C["🛡️ Trust Layer<br/>Limits · Disputes · Insurance"]
        D["💳 Invisible Crypto<br/>Fiat in, fiat out"]
        E["🧩 SDK-first<br/>5-line integration"]
    end

    X402["x402 alone"] -.->|"Missing"| B
    X402 -.->|"Missing"| C
    X402 -.->|"Missing"| D
    Stripe["Stripe alone"] -.->|"Missing"| A
    Stripe -.->|"Missing"| B
```

---

## 12. Key Risks & Mitigations

                | Risk | Impact | Mitigation |
| ---| ---| ---|
| x402 builds consumer wallet | Direct competition | Move fast, build network effects, become their largest volume driver |
| Regulatory(money transmitter) | Licensing required | Partner with licensed entity(e.g., Stripe Treasury), apply for MSB |
| Agent errors cause financial loss | Trust damage | Spending limits, escrow, insurance, kill switch |
| Low initial merchant coverage | Poor UX | Virtual cards bridge any gap; prioritize high - demand merchants |
| OpenClaw pivots away | Dependency risk | Support multiple agent frameworks(LangChain, CrewAI, AutoGPT) |


