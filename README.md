# BFDES — Banking Fraud Detection Expert System

A fully functional browser-based expert system for banking fraud detection, built as part of Expert Systems Assignment 3. No server, no build step, no dependencies — open `index.html` and run.

## Live Demo

Host on GitHub Pages:  
`https://<your-username>.github.io/<repo-name>/`

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Live-simulated transaction feed with real-time fraud classification |
| **Analyze Transaction** | Manual transaction entry → full inference engine run with explanation |
| **Knowledge Base** | Add, edit, disable, or delete production rules (IF–THEN with weights) |
| **Case Queue** | Review flagged cases, submit analyst verdicts (Fraud / False Positive / Inconclusive) |
| **Customer Profiles** | Manage behavioural profiles used as inference baselines |

---

## Expert System Architecture

```
Transaction Input
       │
       ▼
Behavioural Profile Engine   ←──  Customer profile store
       │
       ▼
Inference Engine (Forward Chaining)
       │  applies weighted IF-THEN rules
       ▼
Risk Score [0.0 – 1.0]
       │
       ├─ < 0.30 → APPROVE
       ├─ < 0.60 → SOFT ALERT
       ├─ < 0.80 → HOLD FOR REVIEW
       └─ ≥ 0.80 → DECLINE
       │
       ▼
Explanation Module → Case Queue → Analyst Feedback → KB Update
```

---

## Production Rules (default set)

| ID | Category | Weight | Description |
|----|----------|--------|-------------|
| R01 | Location | +0.85 | Geo anomaly — foreign country, recent domestic txn |
| R02 | Amount | +0.80 | Unusual high-value spend vs. customer average |
| R03 | Velocity | +0.90 | Card testing — 10+ txns per hour under KES 50 |
| R04 | ATO | +0.92 | Account takeover — unknown device + password reset |
| R05 | CNP | +0.88 | Card-not-present fraud cluster |
| R06 | Mitigating | −0.70 | Customer travel notification active |
| R07 | Time | +0.60 | Off-hours high spend (02:00–04:00) |
| R08 | Merchant | +0.78 | High-risk merchant + new account |
| R09 | History | +0.82 | Repeat chargeback pattern |
| R10 | Mitigating | −0.80 | Pre-authorised large purchase |

---

## How to Run Locally

```bash
# Clone the repo
git clone https://github.com/<your-username>/bfdes.git
cd bfdes

# Open in browser — no server needed
open index.html
# or: python3 -m http.server 8080
```

## How to Deploy on GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder `/`
4. Your site will be live at `https://<username>.github.io/<repo>/`

---

## Data Storage

All data (rules, profiles, cases) is stored in **localStorage** — nothing leaves the browser. Resetting your browser storage returns the system to defaults.

---

## Project Structure

```
bfdes/
├── index.html              # Dashboard
├── css/
│   └── main.css            # All styles
├── js/
│   ├── main.js             # Inference engine, KB, profiles, utilities
│   └── dashboard.js        # Live feed simulation
└── pages/
    ├── analyze.html        # Transaction analysis
    ├── knowledgebase.html  # Rule management
    ├── cases.html          # Case queue
    └── profiles.html       # Customer profiles
```

---

## Assignment Context

This system was designed and built across three linked assignments:

- **Assignment 1** — Problem identification: banking fraud, existing approaches (rule-based, ML, hybrid), limitations
- **Assignment 2** — System requirements: 4-component architecture (Behavioural Profile Engine, Knowledge Base, Inference Engine, Explanation Module)
- **Assignment 3** — Full design + implementation: this repository

---

*Built for Expert Systems coursework. All transaction data is simulated.*
