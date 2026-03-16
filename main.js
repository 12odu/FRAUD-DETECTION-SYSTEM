// ── BFDES Main JS ──────────────────────────────────────────────────────────

// ── CLOCK ────────────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── KNOWLEDGE BASE (localStorage) ────────────────────────────────────────────
const DEFAULT_RULES = [
  { id: 'R01', condition: 'Transaction country ≠ home_country AND time_since_last_txn < 30min', action: 'Flag: Card-Not-Present Geo-Anomaly', weight: 0.85, category: 'Location', active: true },
  { id: 'R02', condition: 'txn_amount > avg_amount × 5 AND merchant_category NOT in profile', action: 'Escalate: Unusual High-Value Spend', weight: 0.80, category: 'Amount', active: true },
  { id: 'R03', condition: 'velocity_count_1hr > 10 AND txn_amount < 50', action: 'Flag: Velocity Abuse / Card Testing', weight: 0.90, category: 'Velocity', active: true },
  { id: 'R04', condition: 'login_device NOT in known_devices AND password_reset_last_24hr = TRUE', action: 'Hold: Account Takeover Indicator', weight: 0.92, category: 'ATO', active: true },
  { id: 'R05', condition: 'card_not_present = TRUE AND billing_addr_mismatch = TRUE AND new_merchant = TRUE', action: 'Decline: CNP Fraud Cluster', weight: 0.88, category: 'CNP', active: true },
  { id: 'R06', condition: 'customer_travel_flag = TRUE AND txn_country = travel_destination', action: 'Mitigate: Legitimate Travel Override', weight: -0.70, category: 'Mitigating', active: true },
  { id: 'R07', condition: 'txn_time BETWEEN 02:00–04:00 AND txn_amount > avg_night_txn × 3', action: 'Soft Alert: Off-Hours High Spend', weight: 0.60, category: 'Time', active: true },
  { id: 'R08', condition: 'merchant_risk_score > 8 AND customer_age_days < 30', action: 'Hold: High-Risk Merchant / New Account', weight: 0.78, category: 'Merchant', active: true },
  { id: 'R09', condition: 'chargeback_count_90d > 2 AND same_merchant_flag = TRUE', action: 'Decline: Repeat Chargeback Pattern', weight: 0.82, category: 'History', active: true },
  { id: 'R10', condition: 'pre_approved_large_purchase = TRUE AND txn_amount WITHIN approved_range', action: 'Approve: Customer Pre-Authorised Txn', weight: -0.80, category: 'Mitigating', active: true },
];

function getRules() {
  const stored = localStorage.getItem('bfdes_rules');
  return stored ? JSON.parse(stored) : DEFAULT_RULES;
}
function saveRules(rules) { localStorage.setItem('bfdes_rules', JSON.stringify(rules)); }

// ── CUSTOMER PROFILES ─────────────────────────────────────────────────────────
const DEFAULT_PROFILES = [
  { id: 'C001', name: 'Alice Mwangi', avg_txn: 8200, home_country: 'KE', travel_flag: false, travel_dest: '', velocity_baseline: 3, known_devices: 2, account_age_days: 842, chargeback_count: 0 },
  { id: 'C002', name: 'James Odhiambo', avg_txn: 15400, home_country: 'KE', travel_flag: true, travel_dest: 'GB', velocity_baseline: 5, known_devices: 3, account_age_days: 1240, chargeback_count: 1 },
  { id: 'C003', name: 'Fatuma Hassan', avg_txn: 4500, home_country: 'KE', travel_flag: false, travel_dest: '', velocity_baseline: 2, known_devices: 1, account_age_days: 210, chargeback_count: 0 },
  { id: 'C004', name: 'David Kamau', avg_txn: 22000, home_country: 'KE', travel_flag: false, travel_dest: '', velocity_baseline: 7, known_devices: 4, account_age_days: 2100, chargeback_count: 2 },
];

function getProfiles() {
  const stored = localStorage.getItem('bfdes_profiles');
  return stored ? JSON.parse(stored) : DEFAULT_PROFILES;
}
function saveProfiles(p) { localStorage.setItem('bfdes_profiles', JSON.stringify(p)); }

// ── CASES ─────────────────────────────────────────────────────────────────────
function getCases() {
  const stored = localStorage.getItem('bfdes_cases');
  return stored ? JSON.parse(stored) : [];
}
function saveCases(c) { localStorage.setItem('bfdes_cases', JSON.stringify(c)); }

function addCase(txn, result) {
  const cases = getCases();
  cases.unshift({
    id: 'CASE-' + Date.now(),
    txn_id: txn.txn_id || ('TXN-' + Math.random().toString(36).substr(2,8).toUpperCase()),
    customer: txn.customer_name || txn.customer_id,
    amount: txn.amount,
    country: txn.country,
    merchant: txn.merchant,
    risk_score: result.score,
    classification: result.classification,
    rules_fired: result.rules_fired.map(r => r.id),
    explanation: result.explanation,
    timestamp: new Date().toISOString(),
    verdict: null
  });
  saveCases(cases.slice(0, 100)); // keep last 100
}

// ── INFERENCE ENGINE ──────────────────────────────────────────────────────────
function runInference(txn, profile) {
  const rules = getRules().filter(r => r.active);
  const fired = [];
  const mitigating = [];
  let score = 0;

  const flags = buildFlags(txn, profile);

  for (const rule of rules) {
    if (evaluateRule(rule, flags)) {
      if (rule.weight > 0) {
        score += rule.weight;
        fired.push(rule);
      } else {
        score += rule.weight;
        mitigating.push(rule);
      }
    }
  }

  score = Math.max(0, Math.min(1, score));

  let classification, cls;
  if (score < 0.30)      { classification = 'Approve';         cls = 'approve'; }
  else if (score < 0.60) { classification = 'Soft Alert';      cls = 'soft'; }
  else if (score < 0.80) { classification = 'Hold for Review'; cls = 'hold'; }
  else                   { classification = 'Decline';         cls = 'decline'; }

  const explanation = buildExplanation(fired, mitigating, score, txn, profile);

  return { score: +score.toFixed(3), classification, cls, rules_fired: fired, mitigating, explanation };
}

function buildFlags(txn, profile) {
  const f = {};
  // Geo anomaly
  f.geo_anomaly = (txn.country && profile && txn.country !== profile.home_country);
  // High value
  f.high_value = profile && txn.amount > profile.avg_txn * 5;
  // Velocity
  f.high_velocity = txn.velocity_1hr > 10 && txn.amount < 50;
  // ATO
  f.ato = txn.new_device && txn.recent_pw_reset;
  // CNP cluster
  f.cnp_cluster = txn.card_not_present && txn.billing_mismatch && txn.new_merchant;
  // Travel mitigating
  f.travel_ok = profile && profile.travel_flag && txn.country === profile.travel_dest;
  // Off hours
  const hour = txn.hour !== undefined ? txn.hour : new Date().getHours();
  f.off_hours = (hour >= 2 && hour <= 4) && txn.amount > 5000;
  // High risk merchant + new account
  f.risky_merchant_new_acct = txn.merchant_risk > 8 && profile && profile.account_age_days < 30;
  // Repeat chargeback
  f.repeat_chargeback = profile && profile.chargeback_count > 2 && txn.same_merchant;
  // Pre-approved
  f.pre_approved = txn.pre_approved;
  return f;
}

function evaluateRule(rule, flags) {
  const map = { R01: 'geo_anomaly', R02: 'high_value', R03: 'high_velocity', R04: 'ato', R05: 'cnp_cluster', R06: 'travel_ok', R07: 'off_hours', R08: 'risky_merchant_new_acct', R09: 'repeat_chargeback', R10: 'pre_approved' };
  const key = map[rule.id];
  if (key) return !!flags[key];
  return false;
}

function buildExplanation(fired, mitigating, score, txn, profile) {
  if (fired.length === 0 && mitigating.length === 0) {
    return 'No fraud indicators detected. Transaction matches established customer behaviour pattern.';
  }
  let parts = [];
  if (fired.length > 0) parts.push(`${fired.length} fraud indicator(s) triggered: ${fired.map(r => r.id).join(', ')}.`);
  if (mitigating.length > 0) parts.push(`${mitigating.length} mitigating factor(s) applied: ${mitigating.map(r => r.id).join(', ')}.`);
  if (score >= 0.80) parts.push('Transaction DECLINED due to critical risk threshold exceeded.');
  else if (score >= 0.60) parts.push('Transaction placed on HOLD pending analyst review.');
  else if (score >= 0.30) parts.push('Transaction flagged with SOFT ALERT — monitor for further activity.');
  else parts.push('Transaction APPROVED despite minor flags — mitigating factors reduced risk.');
  return parts.join(' ');
}

function classifyScore(score) {
  if (score < 0.30) return { label: 'Approve', cls: 'approve' };
  if (score < 0.60) return { label: 'Soft Alert', cls: 'soft' };
  if (score < 0.80) return { label: 'Hold for Review', cls: 'hold' };
  return { label: 'Decline', cls: 'decline' };
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function fmtAmount(n) { return 'KES ' + Number(n).toLocaleString(); }
function fmtScore(n) { return (Number(n) * 100).toFixed(0) + '%'; }
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return Math.round(diff) + 's ago';
  if (diff < 3600) return Math.round(diff/60) + 'm ago';
  return Math.round(diff/3600) + 'h ago';
}
