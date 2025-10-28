async function getRawUrl(path) {
  const base = `https://raw.githubusercontent.com/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}/`;
  return base + path;
}

async function fetchCSV(path) {
  const url = await getRawUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  const text = await res.text();
  const rows = text.trim().split(/\r?\n/).map(r => r.split(','));
  const header = rows.shift();
  return rows.map(r => Object.fromEntries(header.map((h,i)=>[h.trim(), r[i] ? r[i].trim() : ""])));
}

function fmtMoney(n) {
  const num = Number(n);
  return isFinite(num) ? num.toLocaleString(undefined, {style:'currency', currency:'USD', maximumFractionDigits:2}) : '—';
}

function shortDate(iso) {
  const d = new Date(iso);
  if (!isFinite(d)) return iso;
  return d.toLocaleDateString(undefined, {year:'2-digit', month:'2-digit', day:'2-digit'});
}

async function load() {
  try {
    const portfolioRows = await fetchCSV(CONFIG.FILES.portfolio);
    portfolioRows.sort((a,b)=> new Date(a.date) - new Date(b.date));
    const labels = portfolioRows.map(r => shortDate(r.date));
    const values = portfolioRows.map(r => Number(r.value));
    const last = portfolioRows[portfolioRows.length-1];

    document.getElementById('portfolioVal').textContent = `Portfolio: ${fmtMoney(last?.value || 0)}`;
    const goalPct = last?.value ? Math.min(100, (Number(last.value)/CONFIG.GOAL)*100).toFixed(1) : 0;
    document.getElementById('goalProg').textContent = `Goal: $${CONFIG.GOAL.toLocaleString()} (${goalPct}%)`;
    document.getElementById('lastUpdated').textContent = `Updated: ${last?.date ? shortDate(last.date) : '—'}`;

    const ctx = document.getElementById('portfolioChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Portfolio Value (USD)', data: values, tension: 0.25, fill: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display:false } }, y: { ticks: { callback: (v)=>'$'+v } } } }
    });

    const tradeRows = await fetchCSV(CONFIG.FILES.trades);
    tradeRows.sort((a,b)=> new Date(b.date) - new Date(a.date));
    const tbody = document.querySelector('#tradesTable tbody');
    tbody.innerHTML = '';
    for (const r of tradeRows.slice(0, 50)) {
      const tr = document.createElement('tr');
      function td(text, cls) { const el = document.createElement('td'); el.textContent = text; if (cls) el.className = cls; tr.appendChild(el); }
      const pl = Number(r.pl || 0);
      td(shortDate(r.date));
      td(r.symbol || '');
      td(r.side || '');
      td(r.qty || '');
      td(r.entry || '');
      td(r.exit || '');
      td(fmtMoney(pl), pl >= 0 ? 'pl-pos' : 'pl-neg');
      tbody.appendChild(tr);
    }
  } catch (e) {
    console.error(e);
    alert("Dashboard couldn't load data yet. Make sure /data files exist in the repo.");
  }
}

document.addEventListener('DOMContentLoaded', load);
