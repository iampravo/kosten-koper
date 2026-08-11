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
  fundaLink: el('fundaLink'),
  importStatus: el('importStatus'),

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
  upfrontResults: el('upfrontResults'),
  totalUpfrontValue: el('totalUpfrontValue'),

  maintenancePct: el('maintenancePct'),
  monthlyResults: el('monthlyResults'),
  netMonthlyValue: el('netMonthlyValue'),

  comparableRent: el('comparableRent'),
  breakEvenResults: el('breakEvenResults'),
};

let buyerCount = 2;
let mortgageType = 'annuity';

function parseNum(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function euro(n) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

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
  const price = parseNum(fields.price.value);
  const buyers = [
    {
      age: parseNum(fields.buyer1Age.value),
      share: parseNum(fields.buyer1Share.value),
      starter: fields.buyer1Starter.checked,
    },
  ];
  if (buyerCount === 2) {
    buyers.push({
      age: parseNum(fields.buyer2Age.value),
      share: parseNum(fields.buyer2Share.value),
      starter: fields.buyer2Starter.checked,
    });
  }
  return buyers.map((b) => {
    const eligible = b.starter && b.age > 0 && b.age < STARTER_MAX_AGE && price > 0 && price <= STARTER_PRICE_CAP;
    const rate = eligible ? 0 : STANDARD_TRANSFER_RATE;
    const sharePrice = price * (b.share / 100);
    return { ...b, eligible, rate, tax: sharePrice * rate };
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

// ---------- render ----------

function render() {
  const price = parseNum(fields.price.value);
  const downPayment = parseNum(fields.downPayment.value);
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
  const notary = parseNum(fields.notaryFee.value);
  const valuation = parseNum(fields.valuationFee.value);
  const advisor = parseNum(fields.advisorFee.value);
  const survey = parseNum(fields.surveyFee.value);
  const nhgPremium = nhgOn ? loanAmount * NHG_PREMIUM_RATE : 0;

  fields.upfrontResults.innerHTML = '';
  buyers.forEach((b, i) => {
    const label = buyers.length > 1 ? `transfer tax — buyer ${i + 1}` : 'transfer tax (overdrachtsbelasting)';
    const sub = b.eligible ? 'starter exemption applied · 0%' : `standard rate · ${pct(b.rate * 100)}`;
    fields.upfrontResults.appendChild(resultRow(label, sub, euro(b.tax)));
  });
  if (nhgOn) {
    fields.upfrontResults.appendChild(resultRow('NHG premium', '0.4% of loan amount, one-time', euro(nhgPremium)));
  }

  const kostenKoper = transferTaxTotal + notary + valuation + advisor + survey + nhgPremium;
  const totalUpfront = kostenKoper + downPayment;
  fields.totalUpfrontValue.textContent = price > 0 ? euro(totalUpfront) : '—';

  // ---- monthly costs ----
  const rate = parseNum(fields.interestRate.value);
  const term = parseNum(fields.mortgageTerm.value) || 30;
  const deductionRate = parseNum(fields.deductionRate.value);
  const { payment, interestMonth1 } = mortgagePayment(loanAmount, rate, term, mortgageType);

  const ewfMonthly = (price * EIGENWONINGFORFAIT_RATE) / 12;
  const deductibleBase = Math.max(0, interestMonth1 - ewfMonthly);
  const taxBenefit = deductibleBase * (deductionRate / 100);

  const hoaFee = parseNum(fields.hoaFee.value);
  const maintenancePct = parseNum(fields.maintenancePct.value);
  const maintenanceMonthly = (price * maintenancePct) / 100 / 12;

  const netMonthly = payment - taxBenefit + hoaFee + maintenanceMonthly;

  fields.monthlyResults.innerHTML = '';
  fields.monthlyResults.appendChild(resultRow('mortgage payment', `${mortgageType} · month 1`, euro(payment)));
  fields.monthlyResults.appendChild(resultRow('tax benefit', 'hypotheekrenteaftrek, net of eigenwoningforfait', `− ${euro(taxBenefit)}`));
  if (hoaFee > 0) fields.monthlyResults.appendChild(resultRow('VvE / HOA', null, euro(hoaFee)));
  fields.monthlyResults.appendChild(resultRow('insurance & maintenance', `${maintenancePct}%/yr of price`, euro(maintenanceMonthly)));
  fields.netMonthlyValue.textContent = price > 0 ? euro(netMonthly) : '—';

  // ---- break-even vs renting ----
  const rent = parseNum(fields.comparableRent.value);
  fields.breakEvenResults.innerHTML = '';
  if (rent <= 0 || price <= 0) {
    fields.breakEvenResults.innerHTML = '<p class="empty-state">enter a comparable rent above 👆</p>';
  } else if (rent <= netMonthly) {
    fields.breakEvenResults.appendChild(
      resultRow('never', 'buying costs more per month than this rent, before counting upfront costs', '—')
    );
  } else {
    const months = Math.ceil(kostenKoper / (rent - netMonthly));
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const whenText = years > 0 ? `${years}y ${remMonths}m` : `${remMonths}m`;
    fields.breakEvenResults.appendChild(
      resultRow('break-even', `buying beats renting after ${whenText} (${months} months)`, whenText)
    );
    fields.breakEvenResults.appendChild(
      resultRow('monthly gap', 'renting minus net buying cost', euro(rent - netMonthly))
    );
  }
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// ---------- bookmarklet ----------

// Reads a Funda listing's <dl><dt>/<dd> feature table (works in NL or
// Chrome-translated EN — translation preserves the tag structure) plus its
// schema.org JSON-LD, and opens this site with the extracted fields.
function bookmarkletSource(siteUrl) {
  return `(function(){try{function grabDL(labels){var dls=document.querySelectorAll('dl');for(var i=0;i<dls.length;i++){var dts=dls[i].querySelectorAll('dt');var dds=dls[i].querySelectorAll('dd');for(var j=0;j<dts.length;j++){var key=(dts[j].textContent||'').trim().toLowerCase();for(var k=0;k<labels.length;k++){if(key.indexOf(labels[k])!==-1){return(dds[j]&&dds[j].textContent||'').trim();}}}}return null;}var price=null,addr=null;var lds=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<lds.length;i++){try{var j=JSON.parse(lds[i].textContent);var arr=Array.isArray(j)?j:[j];for(var k=0;k<arr.length;k++){var o=arr[k];if(o&&o.offers&&o.offers.price)price=o.offers.price;if(o&&o.address)addr=(o.address.streetAddress||'')+(o.address.addressLocality?(', '+o.address.addressLocality):'');}}catch(e){}}var d={a:addr,p:price||grabDL(['asking price','vraagprijs']),hoa:grabDL(['vve','homeowners']),liv:grabDL(['wonen','living']),url:location.href};var b64=btoa(unescape(encodeURIComponent(JSON.stringify(d))));window.open('${siteUrl}?import='+b64,'_blank');}catch(e){alert('Could not read this listing — enter details manually.');}})();`;
}

function setupBookmarklet() {
  const siteUrl = `${location.origin}${location.pathname}`;
  el('bookmarkletLink').href = 'javascript:' + encodeURIComponent(bookmarkletSource(siteUrl));
}

function applyImport(data) {
  if (data.a) fields.address.value = data.a;
  if (data.p) fields.price.value = String(data.p);
  if (data.hoa) {
    const n = parseNum(data.hoa);
    if (n > 0) fields.hoaFee.value = String(n);
  }
  if (data.liv) {
    const n = parseNum(data.liv);
    if (n > 0) fields.livingArea.value = String(n);
  }
  if (data.url) fields.fundaLink.value = data.url;
  fields.importStatus.textContent = 'imported from funda ✓';
}

function parseImportFromUrl() {
  const params = new URLSearchParams(location.search);
  const payload = params.get('import');
  if (!payload) return;
  try {
    const json = decodeURIComponent(escape(atob(payload)));
    applyImport(JSON.parse(json));
  } catch {
    fields.importStatus.textContent = 'could not read import link — enter details manually';
  }
  const url = new URL(location.href);
  url.searchParams.delete('import');
  history.replaceState({}, '', url);
}

// ---------- wiring ----------

function init() {
  setupBookmarklet();
  parseImportFromUrl();

  const debouncedRender = debounce(render, 80);
  document.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', debouncedRender);
  });

  el('buyerCountToggle').querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      buyerCount = Number(btn.dataset.count);
      el('buyerCountToggle').querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('selected', b === btn));
      fields.buyer2Block.style.display = buyerCount === 2 ? '' : 'none';
      el('buyersGrid').classList.toggle('single', buyerCount === 1);
      if (buyerCount === 1) {
        fields.buyer1Share.value = '100';
      } else if (parseNum(fields.buyer1Share.value) === 100) {
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
      const v = Math.min(100, Math.max(0, parseNum(fields.buyer1Share.value)));
      fields.buyer2Share.value = String(100 - v);
    }
  });

  render();
}

init();
