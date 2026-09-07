const DEMO = {
  sports: [
    { id: "esports", label: "Киберспорт" },
    { id: "basketball", label: "Баскетбол" },
    { id: "football", label: "Футбол" }
  ],
  leagues: [
    { id: "cs2", sportId: "esports", label: "CS2 · Global Masters" },
    { id: "valorant", sportId: "esports", label: "Valorant · Champions Tour" },
    { id: "euroleague", sportId: "basketball", label: "Europe · EuroLeague" },
    { id: "champions", sportId: "football", label: "Europe · Champions League" }
  ],
  events: [
    {
      id: "demo-aurora-vertex",
      sportId: "esports",
      sportName: "Киберспорт",
      leagueId: "cs2",
      leagueName: "CS2 · Global Masters",
      team1: "Aurora Five",
      team2: "Vertex",
      dateLabel: "сегодня, 18:00",
      odds: [2.18, 1.67],
      lineType: "Победитель матча · BO3",
      candidate: {
        id: "demo-market-aurora",
        question: "CS2: Aurora Five vs Vertex (BO3)",
        marketType: "moneyline",
        outcomes: ["Aurora Five", "Vertex"],
        confidence: 98,
        timeDelta: 0,
        rulesConfirmed: true,
        asks: [
          [{ price: 0.53, size: 220 }, { price: 0.54, size: 500 }],
          [{ price: 0.48, size: 250 }, { price: 0.49, size: 700 }]
        ]
      }
    },
    {
      id: "demo-northwind-radian",
      sportId: "esports",
      sportName: "Киберспорт",
      leagueId: "cs2",
      leagueName: "CS2 · Global Masters",
      team1: "Northwind",
      team2: "Radian",
      dateLabel: "сегодня, 20:30",
      odds: [1.72, 2.10],
      lineType: "Победитель матча · BO3"
    },
    {
      id: "demo-ember-lotus",
      sportId: "esports",
      sportName: "Киберспорт",
      leagueId: "valorant",
      leagueName: "Valorant · Champions Tour",
      team1: "Ember",
      team2: "Lotus",
      dateLabel: "завтра, 16:00",
      odds: [2.05, 1.74],
      lineType: "Победитель матча · BO3",
      candidate: {
        id: "demo-market-ember",
        question: "Valorant: Ember vs Lotus",
        marketType: "moneyline",
        outcomes: ["Ember", "Lotus"],
        confidence: 96,
        timeDelta: 15,
        rulesConfirmed: false,
        asks: [
          [{ price: 0.54, size: 160 }, { price: 0.55, size: 300 }],
          [{ price: 0.47, size: 180 }, { price: 0.48, size: 420 }]
        ]
      }
    },
    {
      id: "demo-barcelona-olympiacos",
      sportId: "basketball",
      sportName: "Баскетбол",
      leagueId: "euroleague",
      leagueName: "Europe · EuroLeague",
      team1: "Barcelona",
      team2: "Olympiacos",
      dateLabel: "завтра, 21:45",
      odds: [2.25, 1.62],
      lineType: "Победитель матча",
      candidate: {
        id: "demo-market-euroleague",
        question: "EuroLeague: Barcelona vs Olympiacos",
        marketType: "moneyline",
        outcomes: ["Barcelona", "Olympiacos"],
        confidence: 99,
        timeDelta: 0,
        rulesConfirmed: false,
        asks: [
          [{ price: 0.47, size: 300 }, { price: 0.48, size: 600 }],
          [{ price: 0.59, size: 260 }, { price: 0.60, size: 500 }]
        ]
      }
    },
    {
      id: "demo-atlas-union",
      sportId: "football",
      sportName: "Футбол",
      leagueId: "champions",
      leagueName: "Europe · Champions League",
      team1: "Atlas FC",
      team2: "Union 04",
      dateLabel: "ср, 22:00",
      odds: [2.42, 2.78],
      lineType: "Победитель матча · без ничьей"
    }
  ]
};

const state = {
  activeView: "opportunities",
  sport: null,
  league: null,
  event: null,
  market: "team1",
  stage: 0,
  capital: 10000,
  feedFilter: "all",
  feedSport: "all",
  baseCurrency: "RUB",
  rubPerUsdc: 86.4,
  conversionFee: 0.005,
  depositFee: 0,
  withdrawalFee: 0,
  winlineFee: 0,
  polymarketFee: 0,
  priceMoveReserve: 0.0075,
  bookmakerRoundingRub: 1,
  polymarketMinOrderUsdc: 5,
  safetyBuffer: 0.015,
  watchIds: new Set()
};

const el = {
  trail: document.querySelector("#step-trail"),
  stage: document.querySelector("#source-stage"),
  results: document.querySelector("#match-results"),
  railScore: document.querySelector("#rail-score"),
  arbCard: document.querySelector("#arb-card"),
  arbTitle: document.querySelector("#arb-title"),
  trustVerdict: document.querySelector("#trust-verdict"),
  capital: document.querySelector("#capital-input"),
  allocationHelp: document.querySelector("#allocation-help"),
  resultExplanation: document.querySelector("#result-explanation"),
  capitalCurrency: document.querySelector("#capital-currency"),
  rulesToggle: document.querySelector("#rules-toggle"),
  rulesPanel: document.querySelector("#rules-panel"),
  toast: document.querySelector("#toast"),
  dialog: document.querySelector("#position-dialog"),
  economyDialog: document.querySelector("#economy-dialog"),
  opportunityList: document.querySelector("#opportunity-list"),
  opportunitySport: document.querySelector("#opportunity-sport"),
  scannerArbCount: document.querySelector("#scanner-arb-count"),
  scannerPotentialCount: document.querySelector("#scanner-potential-count"),
  scannerMatchCount: document.querySelector("#scanner-match-count"),
  scannerBookCount: document.querySelector("#scanner-book-count"),
  refreshOpportunitiesLabel: document.querySelector("#refresh-opportunities-label"),
  watchContent: document.querySelector("#watch-content"),
  watchToggle: document.querySelector("#watch-toggle")
};

const checkSvg = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const searchSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pluralRu(value, one, few, many) {
  const number = Math.abs(value) % 100;
  const last = number % 10;
  if (number > 10 && number < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function currentSport() {
  return DEMO.sports.find(item => item.id === state.sport);
}

function currentLeague() {
  return DEMO.leagues.find(item => item.id === state.league);
}

function currentEvent() {
  return DEMO.events.find(item => item.id === state.event);
}

function currentSideIndex() {
  return state.market === "team2" ? 1 : 0;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatMoney(value, currency = state.baseCurrency) {
  const number = Number(value) || 0;
  if (currency === "RUB") return `${number.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
  return `${number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
}

function formatExactMoney(value, currency = state.baseCurrency) {
  const number = Number(value) || 0;
  const suffix = currency === "RUB" ? "₽" : "USDC";
  return `${number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
}

function formatDecimal(value, digits = 4) {
  return Number(value).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function loadWatchIds() {
  try {
    const saved = JSON.parse(localStorage.getItem("raznitsa-demo-watchlist") || "[]");
    state.watchIds = new Set(Array.isArray(saved) ? saved.filter(item => typeof item === "string") : []);
  } catch {
    state.watchIds = new Set();
  }
}

function persistWatchIds() {
  try {
    localStorage.setItem("raznitsa-demo-watchlist", JSON.stringify(Array.from(state.watchIds)));
  } catch {
    showToast("Не удалось сохранить наблюдение в этом браузере");
  }
}

function toBaseFromRub(value) {
  return state.baseCurrency === "RUB" ? value : value / state.rubPerUsdc;
}

function toBaseFromUsdc(value) {
  return state.baseCurrency === "USDC" ? value : value * state.rubPerUsdc;
}

function optionButton(item, selected, step) {
  return `
    <button class="option-button${selected ? " is-selected" : ""}" type="button" data-select-step="${step}" data-id="${escapeHtml(item.id)}">
      <span class="option-main"><strong title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</strong><small>${escapeHtml(item.meta || "")}</small></span>
      <span class="option-count${item.hasMatch ? " has-match" : ""}">${escapeHtml(item.code || "→")}</span>
    </button>`;
}

function matchedCount(predicate) {
  return DEMO.events.filter(event => event.candidate && predicate(event)).length;
}

function selectedForStep(step) {
  return [state.sport, state.league, state.event, state.market][step];
}

function renderTrail() {
  const event = currentEvent();
  const items = [
    { label: currentSport()?.label || "Вид спорта", step: 0 },
    { label: currentLeague()?.label || "Лига", step: 1 },
    { label: event ? `${event.team1} — ${event.team2}` : "Матч", step: 2 },
    { label: event ? event[`team${currentSideIndex() + 1}`] : "Исход", step: 3 }
  ];
  el.trail.innerHTML = items.map((item, index) => `
    <button class="trail-button${state.stage === item.step ? " is-current" : ""}" type="button" data-trail-step="${item.step}">${escapeHtml(item.label)}</button>
    ${index < items.length - 1 ? `<span class="trail-separator">/</span>` : ""}
  `).join("");
}

function renderSource() {
  renderTrail();
  const event = currentEvent();
  if (state.stage === 4 && event) {
    const side = currentSideIndex();
    el.stage.innerHTML = `
      <article class="source-ticket">
        <div class="ticket-meta"><span class="ticket-source"><img class="inline-platform-logo" src="./assets/winline.svg" alt="">Winline / demo snapshot</span><span class="ticket-time">${escapeHtml(event.dateLabel)}</span></div>
        <span class="ticket-competition">${escapeHtml(event.sportName)} · ${escapeHtml(event.leagueName)}</span>
        <h3>${escapeHtml(event.team1)}<br>— ${escapeHtml(event.team2)}</h3>
        <div class="ticket-price-row">
          <div class="ticket-market"><span class="ticket-market-label">Исход</span><strong>${escapeHtml(event[`team${side + 1}`])}</strong></div>
          <div class="ticket-odds"><span class="ticket-market-label">Коэфф.</span><strong>${event.odds[side].toFixed(2)}</strong></div>
        </div>
        <div class="ticket-actions"><span class="ticket-market-label">LOCAL DATA · ${escapeHtml(event.id)}</span><button class="text-button" type="button" data-change-event>Сменить матч</button></div>
      </article>`;
    return;
  }

  const titles = ["Выбери спорт", "Выбери лигу", "Выбери матч", "Выбери исход"];
  let options = [];
  if (state.stage === 0) {
    options = DEMO.sports.map(sport => {
      const events = DEMO.events.filter(eventItem => eventItem.sportId === sport.id);
      const leagues = DEMO.leagues.filter(league => league.sportId === sport.id);
      const pairs = matchedCount(eventItem => eventItem.sportId === sport.id);
      return { id: sport.id, label: sport.label, meta: `${events.length} ${pluralRu(events.length, "событие", "события", "событий")} · ${leagues.length} ${pluralRu(leagues.length, "турнир", "турнира", "турниров")}`, code: pairs ? `${pairs} совп.` : "→", hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs);
  }
  if (state.stage === 1) {
    options = DEMO.leagues.filter(league => league.sportId === state.sport).map(league => {
      const events = DEMO.events.filter(eventItem => eventItem.leagueId === league.id);
      const pairs = matchedCount(eventItem => eventItem.leagueId === league.id);
      return { id: league.id, label: league.label, meta: `${events.length} ${pluralRu(events.length, "событие", "события", "событий")}`, code: pairs ? `${pairs} совп.` : "→", hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs);
  }
  if (state.stage === 2) {
    options = DEMO.events
      .filter(eventItem => eventItem.leagueId === state.league)
      .sort((a, b) => Number(Boolean(b.candidate)) - Number(Boolean(a.candidate)) || a.team1.localeCompare(b.team1))
      .map(eventItem => ({
        id: eventItem.id,
        label: `${eventItem.team1} — ${eventItem.team2}`,
        meta: eventItem.dateLabel,
        code: eventItem.candidate ? "совпало" : `${eventItem.odds[0].toFixed(2)} / ${eventItem.odds[1].toFixed(2)}`,
        hasMatch: Boolean(eventItem.candidate)
      }));
  }
  if (state.stage === 3 && event) {
    options = [
      { id: "team1", label: `Победа · ${event.team1}`, meta: event.lineType, code: event.odds[0].toFixed(2) },
      { id: "team2", label: `Победа · ${event.team2}`, meta: event.lineType, code: event.odds[1].toFixed(2) }
    ];
  }

  el.stage.innerHTML = `
    <div class="stage-card">
      <div class="stage-head">
        <div class="stage-title">
          ${state.stage > 0 ? `<button class="back-button" type="button" data-back>← На шаг назад</button>` : ""}
          <h3>${titles[state.stage]}</h3>
        </div>
        <span class="step-counter">Шаг ${state.stage + 1} / 4</span>
      </div>
      <div class="option-grid">${options.map(item => optionButton(item, selectedForStep(state.stage) === item.id, state.stage)).join("")}</div>
    </div>`;
}

function calculateExpenses({ winlineStakeBase, polymarketStakeBase, payoutBase, capitalUsed }) {
  const conversion = polymarketStakeBase * state.conversionFee;
  const deposit = capitalUsed * state.depositFee;
  const withdrawal = payoutBase * state.withdrawalFee;
  const winline = winlineStakeBase * state.winlineFee;
  const polymarket = polymarketStakeBase * state.polymarketFee;
  const reserve = capitalUsed * state.priceMoveReserve;
  return { conversion, deposit, withdrawal, winline, polymarket, reserve, total: conversion + deposit + withdrawal + winline + polymarket + reserve };
}

function calculateExecution(odds, capital, asks) {
  const payoutUnitBase = state.baseCurrency === "RUB" ? state.rubPerUsdc : 1;
  let contracts = 0;
  let polymarketStakeUsdc = 0;
  let continuousCapital = 0;
  let levelsUsed = 0;
  for (const level of asks) {
    const costPerContract = payoutUnitBase * (1 / odds + level.price);
    const remaining = capital - continuousCapital;
    if (remaining <= 0.000001) break;
    const fill = Math.min(level.size, remaining / costPerContract);
    contracts += fill;
    polymarketStakeUsdc += fill * level.price;
    continuousCapital += fill * costPerContract;
    levelsUsed += 1;
  }
  if (!contracts) return null;
  const rawWinlineStakeRub = contracts * state.rubPerUsdc / odds;
  const rounding = Math.max(0.01, state.bookmakerRoundingRub);
  const winlineStakeRub = Math.max(rounding, Math.round(rawWinlineStakeRub / rounding) * rounding);
  const winlineStakeBase = toBaseFromRub(winlineStakeRub);
  const polymarketStakeBase = toBaseFromUsdc(polymarketStakeUsdc);
  const capitalUsed = winlineStakeBase + polymarketStakeBase;
  const winlinePayoutBase = toBaseFromRub(winlineStakeRub * odds);
  const polymarketPayoutBase = toBaseFromUsdc(contracts);
  const payout = Math.min(winlinePayoutBase, polymarketPayoutBase);
  const theoreticalPayout = polymarketPayoutBase;
  const theoreticalRoi = theoreticalPayout / continuousCapital - 1;
  const expenses = calculateExpenses({ winlineStakeBase, polymarketStakeBase, payoutBase: payout, capitalUsed });
  const netProfit = payout - capitalUsed - expenses.total;
  const netRoi = capitalUsed > 0 ? netProfit / capitalUsed : -1;
  return {
    payout,
    theoreticalPayout,
    winlineStakeRub,
    polymarketStakeUsdc,
    capitalUsed,
    continuousCapital,
    averagePrice: polymarketStakeUsdc / contracts,
    levelsUsed,
    complete: continuousCapital >= capital - 0.01,
    theoreticalRoi,
    netRoi,
    netProfit,
    expenses,
    contracts,
    polymarketMinimumMet: polymarketStakeUsdc >= state.polymarketMinOrderUsdc
  };
}

function estimateLevelNetRoi(odds, price) {
  const combinedPrice = 1 / odds + price;
  const grossRoi = 1 / combinedPrice - 1;
  const expenseRate = state.conversionFee + state.depositFee + state.withdrawalFee + state.winlineFee + state.polymarketFee + state.priceMoveReserve;
  return grossRoi - expenseRate;
}

function calculatePositiveCapacity(odds, asks) {
  const payoutUnitBase = state.baseCurrency === "RUB" ? state.rubPerUsdc : 1;
  let capital = 0;
  let polymarketStakeUsdc = 0;
  for (const level of asks) {
    if (estimateLevelNetRoi(odds, level.price) < state.safetyBuffer) break;
    capital += level.size * payoutUnitBase * (1 / odds + level.price);
    polymarketStakeUsdc += level.size * level.price;
  }
  return { capital, meetsMinimumOrder: polymarketStakeUsdc >= state.polymarketMinOrderUsdc };
}

function opportunityForEvent(event) {
  if (!event.candidate) return null;
  const variants = [0, 1].map(side => {
    const hedgeIndex = side === 0 ? 1 : 0;
    const ask = event.candidate.asks[hedgeIndex][0].price;
    return { side, hedgeIndex, combinedPrice: 1 / event.odds[side] + ask };
  });
  const best = variants.sort((a, b) => a.combinedPrice - b.combinedPrice)[0];
  return {
    id: `${event.id}:${best.side}`,
    event,
    candidate: event.candidate,
    side: best.side,
    hedgeIndex: best.hedgeIndex,
    odds: event.odds[best.side],
    outcome: event.candidate.outcomes[best.hedgeIndex],
    asks: event.candidate.asks[best.hedgeIndex]
  };
}

function opportunityMetrics(opportunity) {
  const payoutUnitBase = state.baseCurrency === "RUB" ? state.rubPerUsdc : 1;
  const depthCapital = opportunity.asks.reduce((sum, level) => sum + level.size * payoutUnitBase * (1 / opportunity.odds + level.price), 0);
  const referenceCapital = state.baseCurrency === "RUB" ? 10000 : 100;
  const execution = calculateExecution(opportunity.odds, Math.min(referenceCapital, depthCapital), opportunity.asks);
  if (!execution) return null;
  return {
    execution,
    grossRoi: execution.theoreticalRoi,
    netRoi: execution.netRoi,
    costRate: execution.capitalUsed > 0 ? execution.expenses.total / execution.capitalUsed : 0,
    capacity: calculatePositiveCapacity(opportunity.odds, opportunity.asks)
  };
}

function opportunityAssessment(opportunity, metrics) {
  const cleanPositive = metrics.netRoi > 0;
  const thresholdPassed = metrics.netRoi >= state.safetyBuffer;
  const volumeConfirmed = metrics.capacity.capital > 0 && metrics.capacity.meetsMinimumOrder;
  const economicsConfirmed = thresholdPassed && volumeConfirmed;
  const rulesConfirmed = opportunity.candidate.rulesConfirmed === true;
  const executable = economicsConfirmed && rulesConfirmed;
  const shared = { cleanPositive, thresholdPassed, economicsConfirmed, volumeConfirmed, rulesConfirmed, executable };
  if (executable) return { key: "executable", label: "Окно открыто", ...shared };
  if (economicsConfirmed) return { key: "potential", label: "Сверить условия", ...shared };
  return { key: "pair", label: cleanPositive ? "Ниже порога" : "Нет преимущества", ...shared };
}

function opportunityCard(opportunity, metrics) {
  const assessment = opportunityAssessment(opportunity, metrics);
  const netClass = assessment.thresholdPassed ? "is-positive" : metrics.netRoi > 0 ? "is-near" : "";
  const netPercent = formatPercent(metrics.netRoi);
  const grossPercent = formatPercent(metrics.grossRoi);
  const expensePercent = `${(metrics.costRate * 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const executionLimited = !metrics.execution.complete || !metrics.execution.polymarketMinimumMet;
  const executionTitle = !metrics.execution.polymarketMinimumMet
    ? "Ордер слишком мал"
    : metrics.execution.complete
      ? `На ${formatMoney(metrics.execution.capitalUsed)}`
      : `До ${formatMoney(metrics.execution.capitalUsed)}`;
  const executionCopy = !metrics.execution.polymarketMinimumMet
    ? `Минимум ${formatMoney(state.polymarketMinOrderUsdc, "USDC")}`
    : metrics.execution.complete
      ? "Демо-объёма хватает"
      : "В демо-данных не хватает объёма";
  const averagePrice = metrics.execution.averagePrice;
  const breakEvenPrice = 1 - 1 / opportunity.odds;
  const priceGap = averagePrice - breakEvenPrice;
  const combinedPrice = 1 / opportunity.odds + averagePrice;
  const meterPosition = Math.max(0, Math.min(100, ((combinedPrice - 0.96) / 0.08) * 100));
  const meterClass = combinedPrice < 1 ? "is-edge" : "is-miss";
  const meterCopy = combinedPrice < 1
    ? `Зазор ${(Math.abs(priceGap) * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}¢`
    : `До вилки не хватает ${(priceGap * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}¢`;
  const economyText = assessment.economicsConfirmed ? "Экономика подтверждена" : assessment.cleanPositive ? "Ниже порога" : "Преимущества нет";
  const economyDetail = assessment.economicsConfirmed
    ? `${netPercent} чистыми · порог ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
    : assessment.cleanPositive
      ? `${netPercent} < ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
      : `${netPercent} после расходов`;
  const isWatching = state.watchIds.has(opportunity.id);
  return `
    <article class="opportunity-card">
      <span class="opp-return ${netClass}">
        <span class="opp-status is-${assessment.key}">${assessment.label}</span>
        <strong>${netPercent}</strong>
        <small>теория ${grossPercent} · расходы ${expensePercent}</small>
      </span>
      <span class="opp-event">
        <span class="opp-market-meta">${escapeHtml(opportunity.event.sportName)} · ${escapeHtml(opportunity.event.dateLabel)}</span>
        <h3>${escapeHtml(opportunity.event.team1)} — ${escapeHtml(opportunity.event.team2)}</h3>
        <span class="opp-legs">
          <span class="opp-leg"><span class="opp-source-dot w" aria-hidden="true"><img src="./assets/winline.svg" alt=""></span> ${escapeHtml(opportunity.event[`team${opportunity.side + 1}`])} <b>${opportunity.odds.toFixed(2)}</b></span>
          <span class="opp-leg"><span class="opp-source-dot p" aria-hidden="true"><img src="./assets/polymarket.svg" alt=""></span> ${escapeHtml(opportunity.outcome)} <b>${Math.round(opportunity.asks[0].price * 1000) / 10}¢</b></span>
        </span>
        <span class="spread-meter ${meterClass}" style="--meter-pos: ${meterPosition}%">
          <span class="spread-meter-copy"><strong>${meterCopy}</strong><small>SUM ${combinedPrice.toFixed(4)}</small></span>
          <span class="spread-meter-track"><i></i><b></b></span>
          <span class="spread-meter-scale"><span>0.960</span><strong>БАРЬЕР 1.000</strong><span>1.040+</span></span>
        </span>
      </span>
      <span class="opp-execution">
        <strong>${executionTitle}</strong>
        <span class="execution-state${executionLimited ? " is-limited" : ""}">${executionCopy}</span>
        <span class="execution-age">Локальный snapshot · без API</span>
      </span>
      <span class="opp-check trust-stack">
        <span class="trust-signal is-ok"><i>✓</i><span><strong>Событие сошлось</strong><small>Связано заранее в демо-данных</small></span></span>
        <span class="trust-signal ${assessment.economicsConfirmed ? "is-ok" : "is-neutral"}"><i>${assessment.economicsConfirmed ? "✓" : "—"}</i><span><strong>${economyText}</strong><small>${economyDetail}</small></span></span>
        <span class="trust-signal ${assessment.rulesConfirmed ? "is-ok" : "is-warn"}"><i>${assessment.rulesConfirmed ? "✓" : "!"}</i><span><strong>${assessment.rulesConfirmed ? "Условия демо совпали" : "Овертайм и отмена не сверены"}</strong><small>${assessment.rulesConfirmed ? "Проверка задана в сценарии" : "В реальном сервисе сравниваются отдельно"}</small></span></span>
        <span class="opp-card-actions">
          <button class="opp-open" type="button" data-open-opportunity="${escapeHtml(opportunity.id)}">Открыть расчёт</button>
          <button class="opp-watch${isWatching ? " is-watching" : ""}" type="button" data-watch-opportunity="${escapeHtml(opportunity.id)}">${isWatching ? "✓ В наблюдении" : "+ В наблюдение"}</button>
        </span>
      </span>
    </article>`;
}

function allOpportunities() {
  return DEMO.events.map(opportunityForEvent).filter(Boolean);
}

function currentOpportunity() {
  return allOpportunities().find(item => item.event.id === state.event) || null;
}

function currentOpportunityId() {
  return currentOpportunity()?.id || null;
}

function renderWatch() {
  if (!el.watchContent) return;
  const watched = allOpportunities()
    .filter(opportunity => state.watchIds.has(opportunity.id))
    .map(opportunity => {
      const metrics = opportunityMetrics(opportunity);
      return metrics ? { opportunity, metrics, assessment: opportunityAssessment(opportunity, metrics) } : null;
    })
    .filter(Boolean);

  if (!watched.length) {
    el.watchContent.innerHTML = `
      <div class="watch-card">
        <span class="watch-index">00</span>
        <div><h1 id="watch-title">Пока ничего не добавлено.</h1><p>На карточке события нажми «+ В наблюдение». Сохранённые демо-пары появятся здесь.</p></div>
        <button class="secondary-action" type="button" data-nav="opportunities">Вернуться на радар</button>
      </div>`;
    return;
  }

  el.watchContent.innerHTML = `
    <div class="watch-list-head">
      <div><h1 id="watch-title">Наблюдение</h1><p>${watched.length} ${pluralRu(watched.length, "событие сохранено", "события сохранены", "событий сохранено")} в этом браузере.</p></div>
      <button class="secondary-action" type="button" data-nav="opportunities">Открыть радар</button>
    </div>
    <div class="watch-list">
      ${watched.map(({ opportunity, metrics, assessment }) => `
        <article class="watch-item">
          <div>
            <span class="watch-item-meta">${escapeHtml(opportunity.event.sportName)} · ${escapeHtml(opportunity.event.dateLabel)} · ${assessment.label}</span>
            <h2>${escapeHtml(opportunity.event.team1)} — ${escapeHtml(opportunity.event.team2)}</h2>
            <p>${formatPercent(metrics.netRoi)} чистыми · Winline ${opportunity.odds.toFixed(2)} · Polymarket ${Math.round(metrics.execution.averagePrice * 1000) / 10}¢</p>
          </div>
          <div class="watch-item-actions">
            <button class="watch-open" type="button" data-open-opportunity="${escapeHtml(opportunity.id)}">Открыть расчёт</button>
            <button type="button" data-unwatch="${escapeHtml(opportunity.id)}">Убрать</button>
          </div>
        </article>`).join("")}
    </div>`;
}

function toggleWatchById(id) {
  if (state.watchIds.has(id)) {
    state.watchIds.delete(id);
    showToast("Пара убрана из наблюдения");
  } else {
    if (!allOpportunities().some(item => item.id === id)) {
      showToast("Эта демо-пара больше недоступна");
      return;
    }
    state.watchIds.add(id);
    showToast("Добавлено в наблюдение");
  }
  persistWatchIds();
  renderWatch();
  renderOpportunities();
  if (state.activeView === "finder") renderTarget();
}

function toggleCurrentWatch() {
  const id = currentOpportunityId();
  if (!id) {
    showToast("Сначала выбери найденную пару");
    return;
  }
  toggleWatchById(id);
}

function renderOpportunitySportOptions(opportunities) {
  const sportIds = new Set(opportunities.map(item => item.event.sportId));
  const sports = DEMO.sports.filter(sport => sportIds.has(sport.id));
  el.opportunitySport.innerHTML = `<option value="all">Все виды</option>${sports.map(sport => `<option value="${escapeHtml(sport.id)}">${escapeHtml(sport.label)}</option>`).join("")}`;
  el.opportunitySport.value = state.feedSport;
}

function renderOpportunities() {
  const opportunities = allOpportunities();
  renderOpportunitySportOptions(opportunities);
  const decorated = opportunities.map(opportunity => ({ opportunity, metrics: opportunityMetrics(opportunity) }))
    .filter(item => item.metrics)
    .map(item => ({ ...item, assessment: opportunityAssessment(item.opportunity, item.metrics) }))
    .sort((a, b) => b.metrics.netRoi - a.metrics.netRoi);
  const activeCount = decorated.filter(item => item.assessment.executable).length;
  const potentialCount = decorated.filter(item => item.assessment.key === "potential").length;
  document.querySelectorAll("[data-radar-count]").forEach(node => { node.textContent = String(decorated.length); });
  el.scannerArbCount.textContent = String(activeCount);
  el.scannerPotentialCount.textContent = String(potentialCount);
  el.scannerMatchCount.textContent = String(opportunities.length);
  el.scannerBookCount.textContent = String(opportunities.length);
  document.querySelector("#scanner-verdict").textContent = activeCount
    ? `Окно открыто: ${activeCount}. Это демонстрационный сценарий.`
    : potentialCount ? `Математика есть: ${potentialCount}. Правила ещё спорят.` : "Сейчас без вилок. И это честно.";
  document.querySelector("#scanner-funnel").textContent = `${opportunities.length} совпали → ${opportunities.length} snapshot-стакана → ${activeCount + potentialCount} выше порога`;

  const filtered = decorated.filter(item => {
    if (state.feedSport !== "all" && item.opportunity.event.sportId !== state.feedSport) return false;
    if (state.feedFilter !== "all" && item.assessment.key !== state.feedFilter) return false;
    return true;
  });
  if (!filtered.length) {
    el.opportunityList.innerHTML = `<div class="scanner-empty"><p><strong>В этом demo-фильтре пусто</strong>Выбери «Все расчёты» или измени допущения экономики.</p></div>`;
    return;
  }
  el.opportunityList.innerHTML = filtered.map(item => opportunityCard(item.opportunity, item.metrics)).join("");
}

function renderTarget() {
  const event = currentEvent();
  if (!event || state.stage !== 4) {
    el.trustVerdict.innerHTML = "";
    el.watchToggle.disabled = true;
    el.watchToggle.classList.remove("is-watching");
    el.watchToggle.textContent = "+ Добавить в наблюдение";
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p>Собери исход слева. Вторую сторону найдём в локальном dataset.</p></div></div>`;
    el.railScore.textContent = "—";
    el.arbCard.classList.add("is-unavailable");
    return;
  }
  const candidate = event.candidate;
  if (!candidate) {
    el.trustVerdict.innerHTML = "";
    el.watchToggle.disabled = true;
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p><strong>В snapshot пары нет</strong>Выбери матч с отметкой «совпало».</p></div></div>`;
    el.railScore.textContent = "—";
    el.arbCard.classList.add("is-unavailable");
    return;
  }

  const side = currentSideIndex();
  const hedgeIndex = side === 0 ? 1 : 0;
  const bestAsk = candidate.asks[hedgeIndex][0];
  const watchId = currentOpportunityId();
  const isWatching = Boolean(watchId) && state.watchIds.has(watchId);
  el.railScore.textContent = "ПАРА";
  el.results.innerHTML = `
    <div class="match-summary">
      <span class="confidence-note">1 кандидат · связан заранее в демо-данных</span>
      <span class="match-summary-actions">
        <button class="manual-link" type="button" data-manual>Почему совпало</button>
        <button class="summary-watch${isWatching ? " is-watching" : ""}" type="button" data-watch-current>${isWatching ? "✓ В наблюдении" : "+ В наблюдение"}</button>
      </span>
    </div>
    <div class="candidate-list">
      <button class="candidate-card is-selected" type="button" aria-pressed="true">
        <span class="candidate-top"><span class="candidate-source"><img class="inline-platform-logo" src="./assets/polymarket.svg" alt="">POLYMARKET / DEMO</span><span class="candidate-confidence">Событие сошлось</span></span>
        <h3>${escapeHtml(candidate.question)}</h3>
        <span class="candidate-evidence"><span>Команды <b>совпали</b></span><span>Время <b>${candidate.timeDelta ? `Δ ${candidate.timeDelta} мин.` : "совпало"}</b></span><span>Формат <b>победитель матча</b></span></span>
        <span class="candidate-bottom"><span class="candidate-contract">Хедж: ${escapeHtml(candidate.outcomes[hedgeIndex])}</span><span class="candidate-price">${Math.round(bestAsk.price * 1000) / 10}¢ <small>snapshot · ${bestAsk.size} шт.</small><span class="selected-check">${checkSvg}</span></span></span>
      </button>
    </div>`;
  el.arbCard.classList.remove("is-unavailable");
  updateCalculation();
}

function updateCalculation() {
  const event = currentEvent();
  const candidate = event?.candidate;
  if (!event || !candidate || state.stage !== 4) return;
  const side = currentSideIndex();
  const hedgeIndex = side === 0 ? 1 : 0;
  const execution = calculateExecution(event.odds[side], state.capital, candidate.asks[hedgeIndex]);
  if (!execution) return;
  const safetyPassed = execution.netRoi >= state.safetyBuffer;
  const economicsConfirmed = safetyPassed && execution.polymarketMinimumMet;
  const theoreticalProfit = execution.theoreticalPayout - execution.continuousCapital;
  const expenseRate = execution.capitalUsed > 0 ? execution.expenses.total / execution.capitalUsed : 0;
  el.arbTitle.textContent = economicsConfirmed
    ? (candidate.rulesConfirmed ? "Демо-окно открыто" : "Выше порога. Сверь условия исхода")
    : execution.netRoi > 0 ? "Ниже порога" : "Преимущества нет";
  document.querySelector("#left-outcome").textContent = event[`team${side + 1}`];
  document.querySelector("#right-outcome").textContent = candidate.outcomes[hedgeIndex];
  document.querySelector("#left-odds").textContent = event.odds[side].toFixed(2);
  document.querySelector("#right-price").textContent = `${Math.round(execution.averagePrice * 1000) / 10}¢`;
  document.querySelector("#left-stake").textContent = formatMoney(execution.winlineStakeRub, "RUB");
  document.querySelector("#right-stake").textContent = formatMoney(toBaseFromUsdc(execution.polymarketStakeUsdc));
  const rightStakeSecondary = document.querySelector("#right-stake-secondary");
  rightStakeSecondary.textContent = state.baseCurrency === "RUB" ? formatMoney(execution.polymarketStakeUsdc, "USDC") : "";
  rightStakeSecondary.hidden = state.baseCurrency !== "RUB";
  el.allocationHelp.innerHTML = `<strong>Распределяем ${formatMoney(execution.capitalUsed)}</strong><span>Суммы разные, потому что одинаковая будущая выплата на площадках стоит по-разному.</span>`;
  document.querySelector("#equal-payout").textContent = formatMoney(execution.payout);
  const odds = event.odds[side];
  const winlinePayoutRub = execution.winlineStakeRub * odds;
  document.querySelector("#left-equation").textContent = `${formatMoney(execution.winlineStakeRub, "RUB")} × ${odds.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${formatMoney(winlinePayoutRub, "RUB")} выплаты`;
  document.querySelector("#right-equation").textContent = `${formatExactMoney(execution.polymarketStakeUsdc, "USDC")} → ${formatExactMoney(execution.contracts, "USDC")} выплаты при победе`;

  const examplePayout = 100;
  const winlineExampleCost = examplePayout / odds;
  const polymarketExampleCost = examplePayout * execution.averagePrice;
  const exampleSpent = winlineExampleCost + polymarketExampleCost;
  const exampleDifference = examplePayout - exampleSpent;
  const exampleRoi = exampleDifference / exampleSpent;
  const examplePayoutText = formatExactMoney(examplePayout);
  document.querySelector("#formula-roi").textContent = formatPercent(exampleRoi);
  document.querySelector("#formula-roi").classList.toggle("is-negative", exampleRoi <= 0);
  document.querySelector("#formula-intro").textContent = `Считаем, сколько нужно заплатить на каждой площадке, чтобы один из исходов вернул ${examplePayoutText}.`;
  document.querySelector("#formula-winline-cost").textContent = formatExactMoney(winlineExampleCost);
  document.querySelector("#formula-winline-operation").textContent = `${examplePayoutText} ÷ коэффициент ${odds.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.querySelector("#formula-polymarket-cost").textContent = formatExactMoney(polymarketExampleCost);
  document.querySelector("#formula-polymarket-operation").textContent = `${examplePayoutText} × цена ${formatDecimal(execution.averagePrice)}`;
  document.querySelector("#formula-spent").textContent = formatExactMoney(exampleSpent);
  document.querySelector("#formula-received").textContent = examplePayoutText;
  document.querySelector("#formula-difference").textContent = `${exampleDifference >= 0 ? "+" : ""}${formatExactMoney(exampleDifference)}`;
  document.querySelector("#formula-difference").classList.toggle("is-negative", exampleDifference <= 0);
  document.querySelector("#formula-result").textContent = `${formatExactMoney(exampleDifference)} ÷ ${formatExactMoney(exampleSpent)} × 100 = ${formatPercent(exampleRoi)} до расходов. После комиссий и резерва итог показан справа.`;
  document.querySelector("#profit-percent").textContent = formatPercent(execution.theoreticalRoi);
  document.querySelector("#profit-percent").classList.toggle("is-negative", execution.theoreticalRoi <= 0);
  document.querySelector("#profit-money").textContent = `${theoreticalProfit >= 0 ? "+" : ""}${formatMoney(theoreticalProfit)} до расходов`;
  document.querySelector("#net-profit-percent").textContent = formatPercent(execution.netRoi);
  document.querySelector("#net-profit-percent").classList.toggle("is-negative", execution.netRoi <= 0);
  document.querySelector("#net-profit-percent").classList.toggle("is-below-buffer", execution.netRoi > 0 && !safetyPassed);
  document.querySelector("#net-profit-money").textContent = `${execution.netProfit >= 0 ? "+" : ""}${formatMoney(execution.netProfit)} после расходов`;
  document.querySelector("#dialog-profit").textContent = `${execution.netProfit >= 0 ? "+" : ""}${formatMoney(execution.netProfit)}`;
  document.querySelector("#dialog-profit").classList.toggle("is-negative", execution.netProfit <= 0);
  el.resultExplanation.textContent = execution.netRoi < 0
    ? "Это не вилка: расчёт показывает убыток независимо от победителя."
    : safetyPassed
      ? "После расходов остаётся запас выше заданного порога. В реальном сервисе перед действием нужно сравнить условия исхода."
      : "Плюс есть, но он меньше защитного запаса и может исчезнуть при изменении цены.";
  document.querySelector("#expense-chip").textContent = `Расходы: ${formatMoney(execution.expenses.total)} · ${(expenseRate * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
  document.querySelector("#safety-chip").textContent = `Защитный запас ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%: ${safetyPassed ? "пройден" : "не пройден"}`;
  document.querySelector("#liquidity-chip").textContent = `Демо-объём: ${execution.contracts.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} контрактов`;
  document.querySelector("#capital-help").textContent = execution.complete ? "Демо-объёма достаточно для расчёта всей суммы." : `Можно распределить только ${formatMoney(execution.capitalUsed)} из ${formatMoney(state.capital)}.`;
  el.trustVerdict.innerHTML = `
    <div class="verdict-item is-ok"><i>✓</i><span><strong>Событие сошлось</strong><small>Связано заранее в демо-данных</small></span></div>
    <div class="verdict-item ${economicsConfirmed ? "is-ok" : "is-neutral"}"><i>${economicsConfirmed ? "✓" : "—"}</i><span><strong>${economicsConfirmed ? "Экономика подтверждена" : execution.netRoi > 0 ? "Ниже порога" : "Преимущества нет"}</strong><small>${formatPercent(execution.netRoi)} чистыми · порог ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% · демо-объём есть</small></span></div>
    <div class="verdict-item ${candidate.rulesConfirmed ? "is-ok" : "is-warn"}"><i>${candidate.rulesConfirmed ? "✓" : "!"}</i><span><strong>${candidate.rulesConfirmed ? "Условия демо совпали" : "Овертайм и отмена не сверены"}</strong><small>${candidate.rulesConfirmed ? "Проверка задана в сценарии" : "В реальном сервисе сравниваются отдельно"}</small></span></div>`;
  const watchId = currentOpportunityId();
  const isWatching = Boolean(watchId) && state.watchIds.has(watchId);
  el.watchToggle.disabled = !watchId;
  el.watchToggle.classList.toggle("is-watching", isWatching);
  el.watchToggle.textContent = isWatching ? "✓ Уже в наблюдении" : "+ Добавить в наблюдение";
}

function renderRules() {
  const event = currentEvent();
  const candidate = event?.candidate;
  if (!event || !candidate) return;
  const rulesMatch = candidate.rulesConfirmed === true;
  el.rulesPanel.innerHTML = `
    <div class="rules-explainer">
      <div class="rules-summary">
        <span>Как читать проверку</span>
        <h3>Зелёное задано в демонстрационном сценарии. Жёлтое в реальном сервисе нужно сверить на обеих площадках.</h3>
      </div>
      <div class="rule-grid" role="list" aria-label="Что проверено для этой демо-пары">
        <article class="plain-rule is-ok" role="listitem">
          <i>✓</i><div><span>Участники</span><strong>Одни и те же команды или игроки</strong><p>${escapeHtml(event.team1)} — ${escapeHtml(event.team2)}</p></div>
        </article>
        <article class="plain-rule ${candidate.timeDelta ? "is-warn" : "is-ok"}" role="listitem">
          <i>${candidate.timeDelta ? "!" : "✓"}</i><div><span>Начало события</span><strong>${candidate.timeDelta ? `Разница ${candidate.timeDelta} минут` : "Время совпало"}</strong><p>В публичном демо используется локальная временная метка: ${escapeHtml(event.dateLabel)}.</p></div>
        </article>
        <article class="plain-rule is-ok" role="listitem">
          <i>✓</i><div><span>Что считается победой</span><strong>Два противоположных исхода</strong><p>${escapeHtml(event.lineType)} · ${escapeHtml(candidate.marketType)}.</p></div>
        </article>
        <article class="plain-rule ${rulesMatch ? "is-ok" : "is-warn"}" role="listitem">
          <i>${rulesMatch ? "✓" : "!"}</i><div><span>Овертайм и дополнительные раунды</span><strong>${rulesMatch ? "В демо считаются одинаково" : "В реальном сервисе проверить вручную"}</strong><p>Публичная версия не получает официальные правила рынков.</p></div>
        </article>
        <article class="plain-rule ${rulesMatch ? "is-ok" : "is-warn"}" role="listitem">
          <i>${rulesMatch ? "✓" : "!"}</i><div><span>Отмена или перенос</span><strong>${rulesMatch ? "В демо возврат одинаковый" : "В реальном сервисе проверить вручную"}</strong><p>Площадки могут по-разному вернуть деньги или засчитать результат.</p></div>
        </article>
        <article class="plain-rule is-info" role="listitem">
          <i>i</i><div><span>Источник цен</span><strong>Вымышленный локальный снимок</strong><p>Сетевых запросов, API-ключей и production-коннекторов в репозитории нет.</p></div>
        </article>
        <article class="plain-rule is-info" role="listitem">
          <i>₽</i><div><span>Расходы</span><strong>Учтены в чистом результате</strong><p>Демо-курс 1 USDC = ${state.rubPerUsdc.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽ · конвертация ${(state.conversionFee * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%.</p></div>
        </article>
        <article class="plain-rule is-info" role="listitem">
          <i>%</i><div><span>Защитный запас</span><strong>${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% сверх расходов</strong><p>Меньший плюс считаем недостаточным: реальная цена может измениться между действиями.</p></div>
        </article>
      </div>
      <details class="rules-tech">
        <summary>Показать технические данные демо</summary>
        <dl>
          <div><dt>Формат Winline</dt><dd>${escapeHtml(event.lineType)}</dd></div>
          <div><dt>Формат Polymarket</dt><dd>${escapeHtml(candidate.marketType)}</dd></div>
          <div><dt>Минимальный ордер</dt><dd>${formatMoney(state.polymarketMinOrderUsdc, "USDC")}</dd></div>
          <div><dt>Округление Winline</dt><dd>${formatMoney(state.bookmakerRoundingRub, "RUB")}</dd></div>
        </dl>
      </details>
    </div>`;
}

function selectStep(step, id) {
  if (step === 0) {
    state.sport = id;
    state.league = null;
    state.event = null;
    state.stage = 1;
  } else if (step === 1) {
    state.league = id;
    state.event = null;
    state.stage = 2;
  } else if (step === 2) {
    state.event = id;
    state.stage = 3;
  } else if (step === 3) {
    state.market = id;
    state.stage = 4;
  }
  renderSource();
  renderTarget();
}

function setActiveView(view, scroll = true) {
  state.activeView = view;
  if (view === "watch") renderWatch();
  document.querySelectorAll("[data-view]").forEach(node => { node.hidden = node.dataset.view !== view; });
  document.querySelectorAll("[data-nav]").forEach(button => button.classList.toggle("is-active", button.dataset.nav === view));
  if (scroll) document.querySelector("#main-content").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openOpportunity(opportunityId) {
  const opportunity = allOpportunities().find(item => item.id === opportunityId);
  if (!opportunity) return;
  state.sport = opportunity.event.sportId;
  state.league = opportunity.event.leagueId;
  state.event = opportunity.event.id;
  state.market = opportunity.side === 0 ? "team1" : "team2";
  state.stage = 4;
  renderSource();
  renderTarget();
  setActiveView("finder");
  window.setTimeout(() => el.arbCard.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
}

function updateQuickAmounts() {
  const values = state.baseCurrency === "RUB" ? [5000, 10000, 25000] : [50, 100, 250];
  document.querySelectorAll("[data-amount]").forEach((button, index) => {
    button.dataset.amount = String(values[index]);
    button.textContent = values[index].toLocaleString("ru-RU");
    button.classList.toggle("is-active", Math.abs(state.capital - values[index]) < 0.001);
  });
  el.capital.value = state.capital.toLocaleString("ru-RU", { maximumFractionDigits: state.baseCurrency === "RUB" ? 0 : 2 });
  el.capitalCurrency.textContent = state.baseCurrency === "RUB" ? "₽" : "USDC";
}

function syncEconomyControls() {
  document.querySelectorAll("[data-economy-field]").forEach(control => {
    const key = control.dataset.economyField;
    if (!(key in state)) return;
    control.value = control.dataset.economyKind === "percent" ? state[key] * 100 : state[key];
  });
}

function updateEconomyUi() {
  const rate = state.rubPerUsdc.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const buffer = (state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  document.querySelectorAll("[data-economy-summary]").forEach(node => { node.textContent = `${state.baseCurrency} · demo курс ${rate} ₽ · buffer ${buffer}%`; });
  document.querySelector("#fx-source").textContent = "Демонстрационный курс · локально";
  document.querySelector("#economy-threshold-summary").textContent = `Чистая доходность ≥ ${buffer}%`;
  updateQuickAmounts();
}

let toastTimer;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("is-visible"), 3200);
}

document.addEventListener("click", event => {
  const selection = event.target.closest("[data-select-step]");
  if (selection) selectStep(Number(selection.dataset.selectStep), selection.dataset.id);

  const trail = event.target.closest("[data-trail-step]");
  if (trail) {
    state.stage = Number(trail.dataset.trailStep);
    renderSource();
    renderTarget();
  }

  if (event.target.closest("[data-back]")) {
    state.stage = Math.max(0, state.stage - 1);
    renderSource();
    renderTarget();
  }

  if (event.target.closest("[data-change-event]")) {
    state.stage = 2;
    renderSource();
    renderTarget();
  }

  const amount = event.target.closest("[data-amount]");
  if (amount) {
    state.capital = Number(amount.dataset.amount);
    updateQuickAmounts();
    updateCalculation();
  }

  const opportunity = event.target.closest("[data-open-opportunity]");
  if (opportunity) openOpportunity(opportunity.dataset.openOpportunity);

  const watchOpportunity = event.target.closest("[data-watch-opportunity]");
  if (watchOpportunity) toggleWatchById(watchOpportunity.dataset.watchOpportunity);

  if (event.target.closest("[data-watch-current]")) toggleCurrentWatch();

  const unwatch = event.target.closest("[data-unwatch]");
  if (unwatch) toggleWatchById(unwatch.dataset.unwatch);

  const filter = event.target.closest("[data-feed-filter]");
  if (filter) {
    state.feedFilter = filter.dataset.feedFilter;
    document.querySelectorAll("[data-feed-filter]").forEach(button => button.classList.toggle("is-active", button === filter));
    renderOpportunities();
  }

  if (event.target.closest("[data-manual]")) showToast("В публичном демо события связаны заранее. Алгоритма автосопоставления в репозитории нет.");

  const economyOpen = event.target.closest("[data-economy-open]");
  if (economyOpen) {
    syncEconomyControls();
    updateEconomyUi();
    if (typeof el.economyDialog.showModal === "function") el.economyDialog.showModal();
  }

  const navigation = event.target.closest("[data-nav]");
  if (navigation) {
    if (navigation.dataset.nav === "finder") {
      state.sport = null;
      state.league = null;
      state.event = null;
      state.market = "team1";
      state.stage = 0;
      renderSource();
      renderTarget();
    }
    setActiveView(navigation.dataset.nav);
  }
});

document.querySelector("[data-brand-nav]").addEventListener("click", event => {
  event.preventDefault();
  setActiveView("opportunities");
});

document.querySelector("#refresh-match").addEventListener("click", () => showToast("Публичное демо использует локальный snapshot. Сетевых обновлений нет."));
document.querySelector("#refresh-opportunities").addEventListener("click", () => {
  el.refreshOpportunitiesLabel.textContent = "Пересчитываем…";
  renderOpportunities();
  showToast("Демо-расчёты пересчитаны локально");
  window.setTimeout(() => { el.refreshOpportunitiesLabel.textContent = "Пересчитать демо"; }, 500);
});

el.opportunitySport.addEventListener("change", event => {
  state.feedSport = event.target.value;
  renderOpportunities();
});

el.capital.addEventListener("input", event => {
  const value = Number(event.target.value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  if (value > 0) {
    state.capital = Math.min(value, 10000000);
    document.querySelectorAll("[data-amount]").forEach(button => button.classList.remove("is-active"));
    updateCalculation();
  }
});

el.capital.addEventListener("blur", () => updateQuickAmounts());

el.rulesToggle.addEventListener("click", () => {
  const expanded = el.rulesToggle.getAttribute("aria-expanded") === "true";
  el.rulesToggle.setAttribute("aria-expanded", String(!expanded));
  el.rulesPanel.hidden = expanded;
  if (!expanded) renderRules();
});

document.querySelector("#build-position").addEventListener("click", () => {
  if (typeof el.dialog.showModal === "function") el.dialog.showModal();
});

el.watchToggle.addEventListener("click", toggleCurrentWatch);

document.querySelectorAll("[data-economy-field]").forEach(control => {
  control.addEventListener("input", event => {
    const key = event.target.dataset.economyField;
    if (key === "baseCurrency") {
      const nextCurrency = event.target.value;
      if (nextCurrency !== state.baseCurrency) {
        state.capital = state.baseCurrency === "RUB" ? state.capital / state.rubPerUsdc : state.capital * state.rubPerUsdc;
        state.baseCurrency = nextCurrency;
        state.capital = nextCurrency === "RUB" ? Math.round(state.capital) : Math.round(state.capital * 100) / 100;
      }
    } else {
      const value = Number(event.target.value);
      if (!Number.isFinite(value) || value < 0) return;
      state[key] = event.target.dataset.economyKind === "percent" ? value / 100 : value;
    }
    updateEconomyUi();
    renderOpportunities();
    updateCalculation();
  });
});

document.querySelector("#source-status").textContent = "Демо-режим";
document.querySelector("#sync-time").textContent = "локальный snapshot · без API";
document.querySelector("#dialog-winline-link").href = "https://winline.ru";
document.querySelector("#dialog-poly-link").href = "https://polymarket.com";

loadWatchIds();
syncEconomyControls();
updateEconomyUi();
renderSource();
renderTarget();
renderOpportunities();
renderWatch();
setActiveView("opportunities", false);
