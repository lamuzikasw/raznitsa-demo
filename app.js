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
        id: "poly-demo-1",
        question: "CS2: Aurora Five vs Vertex (BO3)",
        outcomes: ["Aurora Five", "Vertex"],
        confidence: 98,
        timeDelta: 0,
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
      odds: [1.88, 1.91],
      lineType: "Победитель матча · BO3",
      candidate: {
        id: "poly-demo-2",
        question: "Valorant: Ember vs Lotus",
        outcomes: ["Ember", "Lotus"],
        confidence: 96,
        timeDelta: 15,
        asks: [
          [{ price: 0.54, size: 160 }, { price: 0.55, size: 300 }],
          [{ price: 0.51, size: 180 }, { price: 0.52, size: 420 }]
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
        id: "poly-demo-3",
        question: "EuroLeague: Barcelona vs Olympiacos",
        outcomes: ["Barcelona", "Olympiacos"],
        confidence: 99,
        timeDelta: 0,
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
  sport: "esports",
  league: "cs2",
  event: "demo-aurora-vertex",
  market: "team1",
  stage: 4,
  capital: 100
};

const el = {
  trail: document.querySelector("#step-trail"),
  stage: document.querySelector("#source-stage"),
  results: document.querySelector("#match-results"),
  railScore: document.querySelector("#rail-score"),
  arbCard: document.querySelector("#arb-card"),
  arbTitle: document.querySelector("#arb-title"),
  capital: document.querySelector("#capital-input"),
  rulesToggle: document.querySelector("#rules-toggle"),
  rulesPanel: document.querySelector("#rules-panel"),
  toast: document.querySelector("#toast"),
  dialog: document.querySelector("#position-dialog"),
  refresh: document.querySelector("#refresh-match")
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

function formatUnits(value) {
  return `${Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ед.`;
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

function matchedCount(predicate) {
  return DEMO.events.filter(event => event.candidate && predicate(event)).length;
}

function optionButton(item, selected, step) {
  return `
    <button class="option-button${selected ? " is-selected" : ""}" type="button" data-select-step="${step}" data-id="${escapeHtml(item.id)}">
      <span class="option-main"><strong title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</strong><small>${escapeHtml(item.meta || "")}</small></span>
      <span class="option-count${item.hasMatch ? " has-match" : ""}">${escapeHtml(item.code || "→")}</span>
    </button>`;
}

function renderTrail() {
  const event = currentEvent();
  const side = currentSideIndex();
  const items = [
    { label: currentSport()?.label || "Вид спорта", step: 0 },
    { label: currentLeague()?.label || "Лига", step: 1 },
    { label: event ? `${event.team1} — ${event.team2}` : "Матч", step: 2 },
    { label: event ? event[`team${side + 1}`] : "Исход", step: 3 }
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
        <div class="ticket-meta">DEMO SNAPSHOT <span class="ticket-time">${escapeHtml(event.dateLabel)}</span></div>
        <span class="ticket-competition">${escapeHtml(event.sportName)} · ${escapeHtml(event.leagueName)}</span>
        <h3>${escapeHtml(event.team1)}<br>— ${escapeHtml(event.team2)}</h3>
        <div class="ticket-price-row">
          <div class="ticket-market"><span class="ticket-market-label">Исход</span><strong>${escapeHtml(event[`team${side + 1}`])}</strong></div>
          <div class="ticket-odds"><span class="ticket-market-label">Коэфф.</span><strong>${event.odds[side].toFixed(2)}</strong></div>
        </div>
        <div class="ticket-actions"><span class="ticket-market-label">LOCAL DATA · ${escapeHtml(event.id)}</span><button class="text-button" type="button" data-change-event>Изменить</button></div>
      </article>`;
    return;
  }

  const titles = ["Выберите вид спорта", "Выберите лигу", "Выберите матч", "Выберите исход"];
  let options = [];
  if (state.stage === 0) {
    options = DEMO.sports.map(sport => {
      const events = DEMO.events.filter(eventItem => eventItem.sportId === sport.id);
      const leagues = DEMO.leagues.filter(league => league.sportId === sport.id);
      const pairs = matchedCount(eventItem => eventItem.sportId === sport.id);
      return { id: sport.id, label: sport.label, meta: `${events.length} ${pluralRu(events.length, "событие", "события", "событий")} · ${leagues.length} ${pluralRu(leagues.length, "турнир", "турнира", "турниров")}`, code: pairs ? `${pairs} ${pluralRu(pairs, "пара", "пары", "пар")}` : "→", hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs);
  }
  if (state.stage === 1) {
    options = DEMO.leagues.filter(league => league.sportId === state.sport).map(league => {
      const events = DEMO.events.filter(eventItem => eventItem.leagueId === league.id);
      const pairs = matchedCount(eventItem => eventItem.leagueId === league.id);
      return { id: league.id, label: league.label, meta: `${events.length} ${pluralRu(events.length, "событие", "события", "событий")}`, code: pairs ? `${pairs} ${pluralRu(pairs, "пара", "пары", "пар")}` : "→", hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs);
  }
  if (state.stage === 2) {
    options = DEMO.events.filter(eventItem => eventItem.leagueId === state.league).map(eventItem => ({
      id: eventItem.id,
      label: `${eventItem.team1} — ${eventItem.team2}`,
      meta: eventItem.dateLabel,
      code: eventItem.candidate ? "есть пара" : `${eventItem.odds[0].toFixed(2)} / ${eventItem.odds[1].toFixed(2)}`,
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
      <div class="stage-head"><h3>${titles[state.stage]}</h3><span class="step-counter">Шаг ${state.stage + 1} / 4</span></div>
      <div class="option-grid">${options.map(item => optionButton(item, false, state.stage)).join("")}</div>
      ${state.stage > 0 ? `<button class="back-button" type="button" data-back>← Назад</button>` : ""}
    </div>`;
}

function calculateExecution(odds, capital, asks) {
  let contracts = 0;
  let polymarketStake = 0;
  let capitalUsed = 0;
  let levelsUsed = 0;
  for (const level of asks) {
    const costPerContract = 1 / odds + level.price;
    const remaining = capital - capitalUsed;
    if (remaining <= 0.000001) break;
    const fill = Math.min(level.size, remaining / costPerContract);
    contracts += fill;
    polymarketStake += fill * level.price;
    capitalUsed += fill * costPerContract;
    levelsUsed += 1;
  }
  if (!contracts) return null;
  return { payout: contracts, winlineStake: contracts / odds, polymarketStake, capitalUsed, averagePrice: polymarketStake / contracts, levelsUsed, complete: capitalUsed >= capital - 0.01 };
}

function renderTarget() {
  const event = currentEvent();
  const candidate = event?.candidate;
  if (!event || state.stage !== 4) {
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p>Закончите выбор слева — демо-пара появится автоматически.</p></div></div>`;
    el.railScore.textContent = "—";
    el.arbCard.classList.add("is-unavailable");
    return;
  }
  if (!candidate) {
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p><strong>В snapshot пары нет</strong>Выберите матч с отметкой «есть пара».</p></div></div>`;
    el.railScore.textContent = "—";
    el.arbCard.classList.add("is-unavailable");
    return;
  }

  const side = currentSideIndex();
  const hedgeIndex = side === 0 ? 1 : 0;
  const bestAsk = candidate.asks[hedgeIndex][0];
  el.railScore.textContent = `${candidate.confidence}%`;
  el.results.innerHTML = `
    <div class="match-summary"><span class="confidence-note">1 кандидат · локальный snapshot</span><button class="manual-link" type="button" data-manual>Что сравнили?</button></div>
    <div class="candidate-list">
      <button class="candidate-card is-selected" type="button" aria-pressed="true">
        <span class="candidate-top"><span class="candidate-source">POLYMARKET / DEMO</span><span class="candidate-confidence">${candidate.confidence}% совпадение</span></span>
        <h3>${escapeHtml(candidate.question)}</h3>
        <span class="candidate-bottom"><span class="candidate-contract">Хедж: ${escapeHtml(candidate.outcomes[hedgeIndex])}</span><span class="candidate-price">${Math.round(bestAsk.price * 100)}¢ <small>snapshot · ${bestAsk.size} шт.</small><span class="selected-check">${checkSvg}</span></span></span>
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
  const roi = execution.payout / execution.capitalUsed - 1;
  const profit = execution.payout - execution.capitalUsed;
  const isArb = roi > 0;

  el.arbTitle.textContent = isArb ? "Демо-вилка по snapshot" : "В демо-сценарии вилки нет";
  document.querySelector("#left-outcome").textContent = event[`team${side + 1}`];
  document.querySelector("#right-outcome").textContent = candidate.outcomes[hedgeIndex];
  document.querySelector("#left-odds").textContent = event.odds[side].toFixed(2);
  document.querySelector("#right-price").textContent = `${Math.round(execution.averagePrice * 1000) / 10}¢`;
  document.querySelector("#left-stake").textContent = formatUnits(execution.winlineStake);
  document.querySelector("#right-stake").textContent = formatUnits(execution.polymarketStake);
  document.querySelector("#equal-payout").textContent = formatUnits(execution.payout);
  document.querySelector("#profit-percent").textContent = `${roi >= 0 ? "+" : ""}${(roi * 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  document.querySelector("#profit-percent").classList.toggle("is-negative", !isArb);
  document.querySelector("#profit-money").textContent = `${profit >= 0 ? "+" : ""}${formatUnits(profit)}`;
  document.querySelector("#dialog-profit").textContent = `${profit >= 0 ? "+" : ""}${formatUnits(profit)}`;
  document.querySelector("#dialog-profit").classList.toggle("is-negative", !isArb);
  document.querySelector("#liquidity-chip").textContent = `${execution.payout.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} контрактов · ${execution.levelsUsed} ур.`;
  document.querySelector("#capital-help").textContent = execution.complete
    ? "Демонстрационный расчёт по локальной глубине"
    : `В snapshot исполнимо ${formatUnits(execution.capitalUsed)} из ${formatUnits(state.capital)}`;
}

function renderRules() {
  const event = currentEvent();
  const candidate = event?.candidate;
  if (!event || !candidate) return;
  el.rulesPanel.innerHTML = `
    <div class="rule-table" role="table" aria-label="Демонстрационное сравнение исходных данных">
      <div class="rule-row rule-row--head" role="row"><span>Параметр</span><span>Winline</span><span>Polymarket</span><span>Статус</span></div>
      <div class="rule-row" role="row"><span>Время начала</span><span>${escapeHtml(event.dateLabel)}</span><span>${escapeHtml(event.dateLabel)}</span><span class="rule-status">Совпадает</span></div>
      <div class="rule-row" role="row"><span>Формат рынка</span><span>${escapeHtml(event.lineType)}</span><span>Победитель матча</span><span class="rule-status">Демо</span></div>
      <div class="rule-row" role="row"><span>Источник</span><span>Локальный snapshot</span><span>Локальный snapshot</span><span class="rule-status">Без API</span></div>
    </div>`;
}

function selectStep(step, id) {
  if (step === 0) {
    state.sport = id;
    state.league = DEMO.leagues.find(item => item.sportId === id)?.id || null;
    state.event = DEMO.events.find(item => item.leagueId === state.league)?.id || null;
    state.stage = 1;
  } else if (step === 1) {
    state.league = id;
    state.event = DEMO.events.find(item => item.leagueId === id)?.id || null;
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
    el.capital.value = state.capital.toLocaleString("ru-RU");
    document.querySelectorAll("[data-amount]").forEach(button => button.classList.toggle("is-active", button === amount));
    updateCalculation();
  }

  if (event.target.closest("[data-manual]")) showToast("В демо заранее связаны участники, время и тип исхода");
});

el.refresh.addEventListener("click", () => showToast("Это локальный snapshot: сетевых обновлений в публичном демо нет"));

el.capital.addEventListener("input", event => {
  const value = Number(event.target.value.replace(/\D/g, ""));
  if (value > 0) {
    state.capital = Math.min(value, 10000000);
    document.querySelectorAll("[data-amount]").forEach(button => button.classList.remove("is-active"));
    updateCalculation();
  }
});

el.capital.addEventListener("blur", () => {
  el.capital.value = state.capital.toLocaleString("ru-RU");
});

el.rulesToggle.addEventListener("click", () => {
  const expanded = el.rulesToggle.getAttribute("aria-expanded") === "true";
  el.rulesToggle.setAttribute("aria-expanded", String(!expanded));
  el.rulesPanel.hidden = expanded;
  if (!expanded) renderRules();
});

document.querySelector("#build-position").addEventListener("click", () => {
  if (typeof el.dialog.showModal === "function") el.dialog.showModal();
});

document.querySelectorAll("[data-nav]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.nav === "scanner") document.querySelector("#scanner").scrollIntoView({ behavior: "smooth" });
    else showToast(button.dataset.nav === "feed" ? "В публичном демо показаны три локальные пары" : "Методика раскрывается в блоке сравнения правил");
  });
});

document.querySelector("#source-status").textContent = "Демо-режим";
document.querySelector("#sync-time").textContent = "локальный snapshot · без API";
document.querySelector("#match-count").textContent = String(DEMO.events.filter(event => event.candidate).length);
document.querySelector("#dialog-winline-link").href = "https://winline.ru";
document.querySelector("#dialog-poly-link").href = "https://polymarket.com";

renderSource();
renderTarget();
