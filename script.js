'use strict';

// ---------- 2026 NL defaults ----------
const STARTER_MAX_AGE = 35; // must be younger than this
const STARTER_PRICE_CAP = 555000; // cliff, not tapered
const STANDARD_TRANSFER_RATE = 0.02; // owner-occupied, non-starter
const NHG_CAP = 470000; // mortgage amount ceiling
const NHG_PREMIUM_RATE = 0.004;
const EIGENWONINGFORFAIT_RATE = 0.0035; // of price, used as a WOZ proxy

const el = (id) => document.getElementById(id);

const fields = {
  address: el('address'),
  price: el('price'),
  livingArea: el('livingArea'),
  hoaFee: el('hoaFee'),

  buyer1Age: el('buyer1Age'),
  buyer1Share: el('buyer1Share'),
  buyer1Starter: el('buyer1Starter'),
  buyer2Block: el('buyer2Block'),
  buyer2Age: el('buyer2Age'),
  buyer2Share: el('buyer2Share'),
  buyer2Starter: el('buyer2Starter'),

  downPayment: el('downPayment'),
  loanAmountDisplay: el('loanAmountDisplay'),
  interestRate: el('interestRate'),
  mortgageTerm: el('mortgageTerm'),
  deductionRate: el('deductionRate'),
  nhgToggle: el('nhgToggle'),
  nhgLabel: el('nhgLabel'),

  notaryFee: el('notaryFee'),
  valuationFee: el('valuationFee'),
  advisorFee: el('advisorFee'),
  surveyFee: el('surveyFee'),
  moveInFee: el('moveInFee'),
  renovationFee: el('renovationFee'),
  checksFee: el('checksFee'),
  upfrontResults: el('upfrontResults'),
  totalUpfrontValue: el('totalUpfrontValue'),

  maintenancePct: el('maintenancePct'),
  monthlyResults: el('monthlyResults'),
  netMonthlyValue: el('netMonthlyValue'),

  comparableRent: el('comparableRent'),
  appreciationRate: el('appreciationRate'),
  ownVsRentSlider: el('ownVsRentSlider'),
  ownVsRentSliderLabel: el('ownVsRentSliderLabel'),
  ownVsRentBox: el('ownVsRentBox'),

  sellingCostPct: el('sellingCostPct'),
  resellSlider: el('resellSlider'),
  resellSliderLabel: el('resellSliderLabel'),
  resellBox: el('resellBox'),
};

let buyerCount = 2;
let mortgageType = 'annuity';
let constructionType = 'existing';

// Whole-euro fields (price, fees, rent): strip every non-digit — works
// whether someone types "600000", "600.000" (NL thousands), or "600,000".
function parseInt_(raw) {
  if (raw == null) return 0;
  const digits = String(raw).replace(/\D/g, '');
  const value = parseInt(digits, 10);
  return Number.isFinite(value) ? value : 0;
}

// Rate/percentage fields: NL uses a comma for decimals ("3,7"), so
// normalize comma → period before parsing, instead of stripping it.
function parseRate(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(',', '.').replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function euro(n) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// Live-formats a whole-euro input with NL thousand separators as you type,
// preserving cursor position relative to the digits (not the punctuation).
function formatEuroValue(digits) {
  return digits ? Number(digits).toLocaleString('nl-NL') : '';
}

function attachEuroFormatting(input) {
  input.addEventListener('input', () => {
    const prevValue = input.value;
    const prevCursor = input.selectionStart ?? prevValue.length;
    const digitsBeforeCursor = prevValue.slice(0, prevCursor).replace(/\D/g, '').length;
    const digitsOnly = prevValue.replace(/\D/g, '');
    input.value = formatEuroValue(digitsOnly);

    let seen = 0;
    let pos = input.value.length;
    for (let i = 0; i < input.value.length; i++) {
      if (/\d/.test(input.value[i])) seen++;
      if (seen === digitsBeforeCursor) {
        pos = i + 1;
        break;
      }
    }
    if (digitsBeforeCursor === 0) pos = 0;
    input.setSelectionRange(pos, pos);
  });
}

// Appends a trailing "%" to rate fields, keeping the cursor to its left
// (so typing still feels like typing into a plain number field).
function formatPercentValue(raw) {
  return raw ? `${raw}%` : '';
}

function attachPercentFormatting(input) {
  input.addEventListener('input', () => {
    const prevValue = input.value;
    const prevCursor = input.selectionStart ?? prevValue.length;
    const raw = prevValue.replace(/%/g, '');
    input.value = formatPercentValue(raw);
    const pos = Math.min(prevCursor, raw.length);
    input.setSelectionRange(pos, pos);
  });
}

const PERCENT_FIELD_IDS = [
  'interestRate', 'deductionRate', 'maintenancePct', 'appreciationRate', 'sellingCostPct',
];

const EURO_FIELD_IDS = [
  'price', 'hoaFee', 'downPayment', 'notaryFee', 'valuationFee',
  'advisorFee', 'surveyFee', 'moveInFee', 'renovationFee', 'checksFee',
  'comparableRent',
];

function pct(n) {
  return `${n.toFixed(2)}%`;
}

function resultRow(label, sub, value) {
  const row = document.createElement('div');
  row.className = 'result-row';
  row.innerHTML = `
    <div class="result-label">
      <span class="result-code">${label}</span>
      ${sub ? `<span class="result-name">${sub}</span>` : ''}
    </div>
    <div class="result-right"><span class="result-value">${value}</span></div>
  `;
  return row;
}

// ---------- buyers ----------

function getBuyers() {
  const price = parseInt_(fields.price.value);
  const buyers = [
    {
      age: parseInt_(fields.buyer1Age.value),
      share: parseInt_(fields.buyer1Share.value),
      starter: fields.buyer1Starter.checked,
    },
  ];
  if (buyerCount === 2) {
    buyers.push({
      age: parseInt_(fields.buyer2Age.value),
      share: parseInt_(fields.buyer2Share.value),
      starter: fields.buyer2Starter.checked,
    });
  }
  const newBuild = constructionType === 'new';
  return buyers.map((b) => {
    if (newBuild) {
      return { ...b, eligible: false, newBuild: true, rate: 0, tax: 0 };
    }
    const eligible = b.starter && b.age > 0 && b.age < STARTER_MAX_AGE && price > 0 && price <= STARTER_PRICE_CAP;
    const rate = eligible ? 0 : STANDARD_TRANSFER_RATE;
    const sharePrice = price * (b.share / 100);
    return { ...b, eligible, newBuild: false, rate, tax: sharePrice * rate };
  });
}

// ---------- mortgage math ----------

function mortgagePayment(loanAmount, annualRatePct, termYears, type) {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (n <= 0) return { payment: 0, interestMonth1: 0, principalMonth1: 0 };

  if (type === 'linear') {
    const principalMonth1 = loanAmount / n;
    const interestMonth1 = loanAmount * r;
    return { payment: principalMonth1 + interestMonth1, interestMonth1, principalMonth1 };
  }

  const interestMonth1 = loanAmount * r;
  const payment = r === 0 ? loanAmount / n : (loanAmount * r) / (1 - Math.pow(1 + r, -n));
  return { payment, interestMonth1, principalMonth1: payment - interestMonth1 };
}

// Walks the amortization schedule month by month (capped at the loan's own
// term) and sums interest paid and the tax benefit it generated — needed
// because both shrink over time for an annuity, so month-1 figures alone
// would overstate a multi-year total.
function amortize(loanAmount, annualRatePct, termYears, type, months, price, deductionRatePct) {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  const m = Math.max(0, Math.min(months, n));
  const linearPrincipal = n > 0 ? loanAmount / n : 0;
  const annuityPayment = n <= 0 ? 0 : mortgagePayment(loanAmount, annualRatePct, termYears, 'annuity').payment;
  const ewfMonthly = (price * EIGENWONINGFORFAIT_RATE) / 12;

  let balance = loanAmount;
  let cumInterest = 0;
  let cumTaxBenefit = 0;
  for (let i = 0; i < m; i++) {
    const interest = balance * r;
    const principal = Math.min(type === 'linear' ? linearPrincipal : annuityPayment - interest, balance);
    balance -= principal;
    cumInterest += interest;
    cumTaxBenefit += Math.max(0, interest - ewfMonthly) * (deductionRatePct / 100);
  }
  return { balance, cumInterest, cumTaxBenefit };
}

function addMilestoneRow(card, label, value, opts) {
  const { pct, groupStart } = opts || {};
  const row = document.createElement('div');
  row.className = 'milestone-row' + (groupStart ? ' group-start' : '');
  const pctHtml = pct != null ? ` <span class="pct">(${pct})</span>` : '';
  row.innerHTML = `<span>${label}</span><span>${value}${pctHtml}</span>`;
  card.appendChild(row);
}

// "3y 6m" / "8m" / "5y" from a raw month count.
function formatYM(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} month${m === 1 ? '' : 's'}`;
  if (m === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y}y ${m}m`;
}

// Shared by "own vs. rent" and "sell after..." — both boil down to the same
// question (what did owning for this long actually cost or make you) up to
// the point where they diverge: one compares that against rent, the other
// against what selling would net you. Renders every row through "money out
// of pocket (net)" and hands back the numbers the caller needs to finish.
function renderOwnershipBreakdown(box, months, ctx) {
  const { price, loanAmount, rate, term, mortgageType, deductionRate, hoaFee, maintenanceMonthly, kostenKoper, appreciationPct, payment } = ctx;
  const years = months / 12;
  const horizonLabel = formatYM(months);
  const amort = amortize(loanAmount, rate, term, mortgageType, months, price, deductionRate);
  const principalPaid = loanAmount - amort.balance;
  const appreciationGain = price * (Math.pow(1 + appreciationPct / 100, years) - 1);
  const monthlyCost = payment + hoaFee + maintenanceMonthly;
  const totalMonthlyEMI = payment * months;
  const totalMonthlyCost = monthlyCost * months;
  const totalCost = kostenKoper + totalMonthlyCost;
  const totalPayments = principalPaid + amort.cumInterest;
  const principalPct = totalPayments > 0 ? (principalPaid / totalPayments) * 100 : 0;
  const interestPct = totalPayments > 0 ? (amort.cumInterest / totalPayments) * 100 : 0;
  const rebatePct = amort.cumInterest > 0 ? (amort.cumTaxBenefit / amort.cumInterest) * 100 : 0;
  const netInterestPaid = amort.cumInterest - amort.cumTaxBenefit;
  const emiPctLabel = `of total monthly EMI for ${horizonLabel}`;

  addMilestoneRow(box, 'upfront buying cost', `− ${euro(kostenKoper)}`);
  addMilestoneRow(box, 'per month EMI', `${euro(payment)} /mo`);
  addMilestoneRow(box, 'per month cost (EMI + HOA + insurance)', `${euro(monthlyCost)} /mo`);
  addMilestoneRow(box, `total monthly EMI for ${horizonLabel}`, `− ${euro(totalMonthlyEMI)}`);
  addMilestoneRow(box, `total monthly cost for ${horizonLabel}`, `− ${euro(totalMonthlyCost)}`);

  const totalCostRow = document.createElement('div');
  totalCostRow.className = 'milestone-total';
  totalCostRow.innerHTML = `<span>total cost</span><span class="val">− ${euro(totalCost)}</span>`;
  box.appendChild(totalCostRow);

  addMilestoneRow(box, 'total principal paid', `+ ${euro(principalPaid)}`, { pct: `${principalPct.toFixed(0)}% ${emiPctLabel}` });
  addMilestoneRow(box, 'total interest paid', `− ${euro(amort.cumInterest)}`, { pct: `${interestPct.toFixed(0)}% ${emiPctLabel}` });
  addMilestoneRow(box, 'total tax rebate', `+ ${euro(amort.cumTaxBenefit)}`, { pct: `${rebatePct.toFixed(0)}% of interest recovered` });
  addMilestoneRow(box, 'net interest paid', `− ${euro(netInterestPaid)}`, { pct: 'total interest − total tax rebate' });
  addMilestoneRow(box, 'total home value gain', `+ ${euro(appreciationGain)}`, { pct: `${appreciationPct.toFixed(1)}%/yr` });

  const totalAssetMade = principalPaid + appreciationGain;
  const assetRow = document.createElement('div');
  assetRow.className = 'milestone-total';
  assetRow.innerHTML = `<span>total asset made</span><span class="val">${euro(totalAssetMade)}</span>`;
  box.appendChild(assetRow);

  // What actually left your pocket, net of what came back as equity
  // (principal), a refund (tax rebate), or a paper gain (appreciation).
  const pocketOut = totalCost - principalPaid - amort.cumTaxBenefit - appreciationGain;
  const pocketRow = document.createElement('div');
  pocketRow.className = 'milestone-total';
  pocketRow.innerHTML = `<span>money out of pocket (net)</span><span class="val">${pocketOut >= 0 ? '−' : '+'} ${euro(Math.abs(pocketOut))}</span>`;
  box.appendChild(pocketRow);
  const pocketNote = document.createElement('div');
  pocketNote.className = 'milestone-caption';
  pocketNote.textContent = 'total cost − principal paid − tax rebate − home value gain';
  box.appendChild(pocketNote);

  return { pocketOut, totalAssetMade, appreciationGain };
}

// ---------- render ----------

function render() {
  const price = parseInt_(fields.price.value);
  const downPayment = parseInt_(fields.downPayment.value);
  const loanAmount = Math.max(0, price - downPayment);
  fields.loanAmountDisplay.textContent = price > 0 ? euro(loanAmount) : '—';

  // NHG availability
  const overNhgCap = loanAmount > NHG_CAP;
  fields.nhgToggle.disabled = overNhgCap;
  if (overNhgCap) fields.nhgToggle.checked = false;
  fields.nhgLabel.textContent = overNhgCap
    ? `NHG not available — loan exceeds the €${NHG_CAP.toLocaleString('nl-NL')} limit`
    : 'use NHG (National Mortgage Guarantee) — 0.4% one-time premium, lower rate';
  const nhgOn = fields.nhgToggle.checked && !overNhgCap;

  // ---- buyers + transfer tax ----
  const buyers = getBuyers();
  const transferTaxTotal = buyers.reduce((sum, b) => sum + b.tax, 0);

  // ---- upfront costs ----
  const notary = parseInt_(fields.notaryFee.value);
  const valuation = parseInt_(fields.valuationFee.value);
  const advisor = parseInt_(fields.advisorFee.value);
  const survey = parseInt_(fields.surveyFee.value);
  const moveIn = parseInt_(fields.moveInFee.value);
  const renovation = parseInt_(fields.renovationFee.value);
  const checks = parseInt_(fields.checksFee.value);
  const nhgPremium = nhgOn ? loanAmount * NHG_PREMIUM_RATE : 0;

  fields.upfrontResults.innerHTML = '';
  if (buyers[0]?.newBuild) {
    fields.upfrontResults.appendChild(
      resultRow('transfer tax (overdrachtsbelasting)', 'new construction — VAT included, no transfer tax', euro(0))
    );
  } else {
    buyers.forEach((b, i) => {
      const label = buyers.length > 1 ? `transfer tax — buyer ${i + 1}` : 'transfer tax (overdrachtsbelasting)';
      const sub = b.eligible ? 'starter exemption applied · 0%' : `standard rate · ${pct(b.rate * 100)}`;
      fields.upfrontResults.appendChild(resultRow(label, sub, euro(b.tax)));
    });
  }
  if (nhgOn) {
    fields.upfrontResults.appendChild(resultRow('NHG premium', '0.4% of loan amount, one-time', euro(nhgPremium)));
  }
  if (moveIn > 0) fields.upfrontResults.appendChild(resultRow('move-in', null, euro(moveIn)));
  if (renovation > 0) fields.upfrontResults.appendChild(resultRow('renovation', null, euro(renovation)));
  if (checks > 0) fields.upfrontResults.appendChild(resultRow('extra checks', null, euro(checks)));

  const kostenKoper = transferTaxTotal + notary + valuation + advisor + survey + moveIn + renovation + checks + nhgPremium;
  const totalUpfront = kostenKoper + downPayment;
  fields.totalUpfrontValue.textContent = price > 0 ? euro(totalUpfront) : '—';

  // ---- monthly costs ----
  const rate = parseRate(fields.interestRate.value);
  const term = parseInt_(fields.mortgageTerm.value) || 30;
  const deductionRate = parseRate(fields.deductionRate.value);
  const { payment, interestMonth1 } = mortgagePayment(loanAmount, rate, term, mortgageType);

  const ewfMonthly = (price * EIGENWONINGFORFAIT_RATE) / 12;
  const deductibleBase = Math.max(0, interestMonth1 - ewfMonthly);
  const taxBenefit = deductibleBase * (deductionRate / 100);

  const hoaFee = parseInt_(fields.hoaFee.value);
  const maintenancePct = parseRate(fields.maintenancePct.value);
  const maintenanceMonthly = (price * maintenancePct) / 100 / 12;

  const netMonthly = payment - taxBenefit + hoaFee + maintenanceMonthly;

  fields.monthlyResults.innerHTML = '';
  fields.monthlyResults.appendChild(resultRow('mortgage payment', `${mortgageType} · month 1`, euro(payment)));
  fields.monthlyResults.appendChild(resultRow('tax benefit', 'hypotheekrenteaftrek, net of eigenwoningforfait', `− ${euro(taxBenefit)}`));
  if (hoaFee > 0) fields.monthlyResults.appendChild(resultRow('VvE / HOA', null, euro(hoaFee)));
  fields.monthlyResults.appendChild(resultRow('insurance & maintenance', `${maintenancePct}%/yr of price`, euro(maintenanceMonthly)));
  fields.netMonthlyValue.textContent = price > 0 ? euro(netMonthly) : '—';

  // ---- own vs. rent, and sell-after scenarios ----
  const rent = parseInt_(fields.comparableRent.value);
  const appreciationPct = parseRate(fields.appreciationRate.value);
  const sellingCostPct = parseRate(fields.sellingCostPct.value);

  const ctx = {
    price, loanAmount, rate, term, mortgageType, deductionRate,
    hoaFee, maintenanceMonthly, kostenKoper, appreciationPct, payment,
  };

  // ---- own vs. rent: single box, slider-driven horizon ----
  const ownMonths = parseInt(fields.ownVsRentSlider.value, 10);
  fields.ownVsRentSliderLabel.textContent = formatYM(ownMonths);
  fields.ownVsRentBox.innerHTML = '';

  if (price <= 0) {
    fields.ownVsRentBox.innerHTML = '<p class="empty-state">fill in a price above to see this</p>';
  } else {
    const box = fields.ownVsRentBox;
    const { pocketOut } = renderOwnershipBreakdown(box, ownMonths, ctx);
    const rentCost = rent * ownMonths;

    addMilestoneRow(box, 'rent paid, same period', rent > 0 ? `− ${euro(rentCost)}` : '—');

    const verdict = document.createElement('div');
    verdict.className = 'milestone-verdict';
    if (rent <= 0) {
      verdict.textContent = 'enter a comparable rent above to compare';
    } else {
      const diff = rentCost - pocketOut;
      verdict.innerHTML = `${diff >= 0 ? 'buying' : 'renting'} ahead by<strong>${euro(Math.abs(diff))}</strong>`;
    }
    box.appendChild(verdict);
  }

  // ---- sell after...: single box, its own slider-driven horizon ----
  const resellMonths = parseInt(fields.resellSlider.value, 10);
  fields.resellSliderLabel.textContent = formatYM(resellMonths);
  fields.resellBox.innerHTML = '';

  if (price <= 0) {
    fields.resellBox.innerHTML = '<p class="empty-state">fill in a price above to see this</p>';
  } else {
    const box = fields.resellBox;
    const { pocketOut } = renderOwnershipBreakdown(box, resellMonths, ctx);
    const salePrice = price * Math.pow(1 + appreciationPct / 100, resellMonths / 12);
    const sellingCosts = salePrice * (sellingCostPct / 100);

    addMilestoneRow(box, 'selling costs', `− ${euro(sellingCosts)}`, { pct: `${sellingCostPct.toFixed(1)}% of sale price` });

    const profit = -pocketOut - sellingCosts;
    const total = document.createElement('div');
    total.className = 'milestone-total';
    total.innerHTML = `<span>net ${profit >= 0 ? 'profit' : 'loss'}</span><span class="val">${profit >= 0 ? '+' : '−'} ${euro(Math.abs(profit))}</span>`;
    box.appendChild(total);
  }
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// ---------- wiring ----------

function init() {
  EURO_FIELD_IDS.forEach((id) => {
    const input = el(id);
    input.value = formatEuroValue(input.value.replace(/\D/g, ''));
    attachEuroFormatting(input);
  });

  PERCENT_FIELD_IDS.forEach((id) => {
    const input = el(id);
    input.value = formatPercentValue(input.value.replace(/%/g, ''));
    attachPercentFormatting(input);
  });

  const debouncedRender = debounce(render, 80);
  document.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', debouncedRender);
  });

  document.querySelectorAll('.collapsible').forEach((section) => {
    const head = section.querySelector('.card-head');
    const toggle = section.querySelector('.collapse-toggle');
    head.addEventListener('click', () => {
      const collapsed = section.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
  });

  el('constructionToggle').querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      constructionType = btn.dataset.type;
      el('constructionToggle').querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('selected', b === btn));
      render();
    });
  });

  el('buyerCountToggle').querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      buyerCount = Number(btn.dataset.count);
      el('buyerCountToggle').querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('selected', b === btn));
      fields.buyer2Block.style.display = buyerCount === 2 ? '' : 'none';
      el('buyersGrid').classList.toggle('single', buyerCount === 1);
      if (buyerCount === 1) {
        fields.buyer1Share.value = '100';
      } else if (parseInt_(fields.buyer1Share.value) === 100) {
        fields.buyer1Share.value = '50';
        fields.buyer2Share.value = '50';
      }
      render();
    });
  });

  el('mortgageTypeToggle').querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      mortgageType = btn.dataset.type;
      el('mortgageTypeToggle').querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('selected', b === btn));
      render();
    });
  });

  fields.buyer1Share.addEventListener('input', () => {
    if (buyerCount === 2) {
      const v = Math.min(100, Math.max(0, parseInt_(fields.buyer1Share.value)));
      fields.buyer2Share.value = String(100 - v);
    }
  });

  render();
}

init();
