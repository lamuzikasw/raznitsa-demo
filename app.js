const API = {
  winline: "https://back.winline.ru/banners/prematcheng",
  leonEvents: "/api/leon/events",
  fonbetEvents: "/api/fonbet/events",
  zenitEvents: "/api/zenit/events",
  pariEvents: "/api/pari/events",
  betboomEvents: "/api/betboom/events",
  ligaStavokEvents: "/api/ligastavok/events",
  betcityEvents: "/api/betcity/events",
  polymarketEvents: "https://gamma-api.polymarket.com/events",
  polymarketBook: "https://clob.polymarket.com/book?token_id=",
  kalshiEvents: "/api/kalshi/events",
  kalshiBook: "/api/kalshi/markets/",
  predictCategories: "/api/predict/categories",
  predictBook: "/api/predict/markets/",
  fxRapira: "/api/fx/rapira",
  fxUsdc: "https://api.coinbase.com/v2/exchange-rates?currency=USDC",
  fxUsd: "https://api.coinbase.com/v2/exchange-rates?currency=USD",
  polymarketSportTags: ["soccer", "basketball", "hockey", "baseball", "tennis", "table-tennis", "esports", "volleyball", "cricket", "nfl", "mma", "boxing"],
  kalshiSeries: [
    "KXATPMATCH", "KXWTAMATCH", "KXATPDOUBLES", "KXWTADOUBLES",
    "KXCS2GAME", "KXDOTA2GAME", "KXLOLGAME", "KXVOLLEYBALLMATCH",
    "KXTABLETENNISMATCH", "KXTTMATCH", "KXWTTMATCH", "KXNBAGAME", "KXWNBAGAME"
  ]
};

const SPORT_LABELS = {
  "american football": "Американский футбол",
  baseball: "Бейсбол",
  basketball: "Баскетбол",
  boxing: "Бокс",
  cricket: "Крикет",
  "cyber nba": "Кибербаскетбол",
  "e-games": "Киберспорт",
  "ice hockey": "Хоккей",
  mma: "MMA",
  soccer: "Футбол",
  tennis: "Теннис",
  "table tennis": "Настольный теннис",
  volleyball: "Волейбол"
};

const DATA_REFRESH_MS = 60000;
const OPPORTUNITY_REFRESH_MS = 30000;
const MAX_SCANNED_PAIRS = 100;
const SCAN_CONCURRENCY = 8;
const BOOK_REFRESH_SECONDS = 15;
const FX_REFRESH_MS = 60000;
const STALE_AFTER_MS = 60000;

const data = {
  winlineEvents: [],
  leonEvents: [],
  fonbetEvents: [],
  zenitEvents: [],
  pariEvents: [],
  betboomEvents: [],
  ligaStavokEvents: [],
  betcityEvents: [],
  bookmakerEvents: [],
  sports: [],
  leagues: [],
  polyMarkets: [],
  kalshiMarkets: [],
  predictMarkets: [],
  predictionMarkets: [],
  matchCache: new Map(),
  opportunities: [],
  crossComparisons: [],
  watchSnapshots: new Map(),
  scanAt: null,
  lastSync: null
};

const state = {
  sport: null,
  league: null,
  event: null,
  market: "team1",
  stage: 0,
  candidateId: null,
  capital: 10000,
  countdown: BOOK_REFRESH_SECONDS,
  nextDataRefreshAt: null,
  nextOpportunityRefreshAt: null,
  loadingData: true,
  backgroundRefresh: false,
  dataError: null,
  bookLoading: false,
  bookError: null,
  book: null,
  requestId: 0,
  scanRequestId: 0,
  scanLoading: false,
  scanError: null,
  activeView: "opportunities",
  comparisonMode: "book-predict",
  leftPlatform: "winline",
  rightPlatform: "auto",
  feedFilter: "all",
  feedSport: "all",
  feedPlatform: "all",
  feedBookmaker: "all",
  baseCurrency: "RUB",
  rubPerUsdt: 90,
  rubPerUsdc: 90,
  rubPerUsd: 90,
  fxSource: "Резервный курс — проверьте вручную",
  fxUpdatedAt: null,
  fxManual: false,
  conversionFee: 0.005,
  depositFee: 0,
  withdrawalFee: 0,
  winlineFee: 0,
  leonFee: 0,
  fonbetFee: 0,
  zenitFee: 0,
  pariFee: 0,
  betboomFee: 0,
  ligaStavokFee: 0,
  betcityFee: 0,
  polymarketFee: 0,
  kalshiFeeRate: 0.07,
  priceMoveReserve: 0.0075,
  safetyBuffer: 0.015,
  bookmakerRoundingRub: 1,
  polymarketMinOrderUsdc: 5,
  kalshiMinContracts: 1,
  predictfunEnabled: false,
  zenitEnabled: false,
  pariEnabled: false,
  betboomEnabled: false,
  ligaStavokEnabled: false,
  betcityEnabled: false,
  watchIds: new Set()
};

const el = {
  trail: document.querySelector("#step-trail"),
  stage: document.querySelector("#source-stage"),
  results: document.querySelector("#match-results"),
  railScore: document.querySelector("#rail-score"),
  arbCard: document.querySelector("#arb-card"),
  arbTitle: document.querySelector("#arb-title"),
  capital: document.querySelector("#capital-input"),
  allocationHelp: document.querySelector("#allocation-help"),
  resultExplanation: document.querySelector("#result-explanation"),
  rulesToggle: document.querySelector("#rules-toggle"),
  rulesPanel: document.querySelector("#rules-panel"),
  toast: document.querySelector("#toast"),
  dialog: document.querySelector("#position-dialog"),
  sourceStatus: document.querySelector("#source-status"),
  syncTime: document.querySelector("#sync-time"),
  refresh: document.querySelector("#refresh-match"),
  opportunityList: document.querySelector("#opportunity-list"),
  opportunitySport: document.querySelector("#opportunity-sport"),
  opportunityPlatform: document.querySelector("#opportunity-platform"),
  opportunityBookmaker: document.querySelector("#opportunity-bookmaker"),
  refreshOpportunities: document.querySelector("#refresh-opportunities"),
  refreshOpportunitiesLabel: document.querySelector("#refresh-opportunities-label"),
  opportunitiesCountdown: document.querySelector("#opportunities-countdown"),
  scannerArbCount: document.querySelector("#scanner-arb-count"),
  scannerPotentialCount: document.querySelector("#scanner-potential-count"),
  scannerMatchCount: document.querySelector("#scanner-match-count"),
  scannerBookCount: document.querySelector("#scanner-book-count"),
  trustVerdict: document.querySelector("#trust-verdict"),
  economyDialog: document.querySelector("#economy-dialog"),
  fxSource: document.querySelector("#fx-source"),
  capitalCurrency: document.querySelector("#capital-currency"),
  watchContent: document.querySelector("#watch-content"),
  watchToggle: document.querySelector("#watch-toggle")
};

const PLATFORM = {
  polymarket: {
    name: "Polymarket",
    upperName: "POLYMARKET",
    logo: "./assets/polymarket.svg",
    currency: "USDC",
    fallbackUrl: "https://polymarket.com"
  },
  kalshi: {
    name: "Kalshi",
    upperName: "KALSHI",
    logo: "./assets/kalshi.svg",
    logoDark: "./assets/kalshi-dark.svg",
    currency: "USD",
    fallbackUrl: "https://kalshi.com/markets"
  },
  predictfun: {
    name: "Predict.fun",
    upperName: "PREDICT.FUN",
    logo: "./assets/predict-fun.png",
    currency: "USDT",
    fallbackUrl: "https://predict.fun/markets/sports"
  }
};

const BOOKMAKER = {
  winline: {
    name: "Winline",
    upperName: "WINLINE",
    logo: "./assets/winline.svg",
    fallbackUrl: "https://winline.ru",
    sourceLabel: "XML feed"
  },
  leon: {
    name: "Leon",
    upperName: "LEON",
    logo: "./assets/leon.png",
    fallbackUrl: "https://leon.ru",
    sourceLabel: "JSON feed"
  },
  fonbet: {
    name: "Fonbet",
    upperName: "FONBET",
    logo: "./assets/fonbet.svg",
    fallbackUrl: "https://fon.bet/sports",
    sourceLabel: "listBase JSON"
  },
  zenit: {
    name: "Zenit",
    upperName: "ZENIT",
    logo: "./assets/zenit.png",
    fallbackUrl: "https://zenitbet.com/line",
    sourceLabel: "partner feed JSON"
  },
  pari: {
    name: "PARI",
    upperName: "PARI",
    logo: "./assets/pari.svg",
    fallbackUrl: "https://www.pari.ru/sports",
    sourceLabel: "partner feed JSON"
  },
  betboom: {
    name: "BetBoom",
    upperName: "BETBOOM",
    logo: "./assets/betboom.svg",
    fallbackUrl: "https://betboom.ru/sport",
    sourceLabel: "partner feed JSON"
  },
  ligastavok: {
    name: "Лига Ставок",
    upperName: "ЛИГА СТАВОК",
    logo: "./assets/liga-stavok.svg",
    fallbackUrl: "https://www.ligastavok.ru/",
    sourceLabel: "Match Center JSON"
  },
  betcity: {
    name: "Betcity",
    upperName: "BETCITY",
    logo: "./assets/betcity.svg",
    fallbackUrl: "https://betcity.ru/ru/line",
    sourceLabel: "partner feed JSON"
  }
};

function platformInfo(value) {
  return PLATFORM[value] || PLATFORM.polymarket;
}

function bookmakerInfo(value) {
  return BOOKMAKER[value] || BOOKMAKER.winline;
}

function bookmakerLogoClass(value) {
  if (value === "fonbet") return " is-fonbet";
  if (value === "pari") return " is-pari";
  if (value === "betboom") return " is-betboom";
  if (value === "ligastavok") return " is-ligastavok";
  if (value === "betcity") return " is-betcity";
  return "";
}

function activeBookmakerEvents() {
  return data.bookmakerEvents.filter(event => event.bookmaker === state.leftPlatform);
}

function activeSports() {
  return data.sports.filter(sport => sport.bookmaker === state.leftPlatform);
}

function activeLeagues() {
  return data.leagues.filter(league => league.bookmaker === state.leftPlatform);
}

function syncLeftPlatformUi() {
  const bookmaker = bookmakerInfo(state.leftPlatform);
  const select = document.querySelector("#left-platform");
  if (select) select.value = state.leftPlatform;
  const topGlyph = document.querySelector("#left-glyph");
  if (topGlyph) {
    topGlyph.classList.toggle("is-fonbet", state.leftPlatform === "fonbet");
    topGlyph.classList.toggle("is-pari", state.leftPlatform === "pari");
    topGlyph.classList.toggle("is-betboom", state.leftPlatform === "betboom");
    topGlyph.classList.toggle("is-ligastavok", state.leftPlatform === "ligastavok");
    topGlyph.classList.toggle("is-betcity", state.leftPlatform === "betcity");
    topGlyph.querySelector("img").src = bookmaker.logo;
  }
  const sourceTitle = document.querySelector("#source-title");
  if (sourceTitle) sourceTitle.textContent = `Линия ${bookmaker.name}`;
}

function syncRightPlatformUi(resolvedPlatform = null) {
  const select = document.querySelector("#right-platform");
  const glyph = document.querySelector("#right-glyph");
  if (select) select.value = state.rightPlatform;
  if (!glyph) return;
  const platform = resolvedPlatform || (state.rightPlatform === "auto" ? currentCandidate()?.market.platform : state.rightPlatform) || "polymarket";
  const provider = platformInfo(platform);
  glyph.hidden = platform === "kalshi";
  glyph.classList.toggle("platform-glyph--k", platform === "kalshi");
  const image = glyph.querySelector("img");
  if (image) image.src = provider.logo;
}

function updatePredictIntegrationUi(enabled) {
  state.predictfunEnabled = Boolean(enabled);
  document.querySelectorAll("[data-predict-option]").forEach(option => {
    option.disabled = !state.predictfunEnabled;
    option.textContent = state.predictfunEnabled ? "Predict.fun" : "Predict.fun — не подключён";
  });
  if (!state.predictfunEnabled && state.rightPlatform === "predictfun") state.rightPlatform = "auto";
  if (!state.predictfunEnabled && state.feedPlatform === "predictfun") state.feedPlatform = "all";
}

function updateZenitIntegrationUi(enabled) {
  state.zenitEnabled = Boolean(enabled);
  document.querySelectorAll("[data-zenit-option]").forEach(option => {
    option.disabled = !state.zenitEnabled;
    option.textContent = state.zenitEnabled ? "Zenit" : "Zenit — нужен ключ";
  });
  if (!state.zenitEnabled && state.leftPlatform === "zenit") {
    state.leftPlatform = "winline";
    syncLeftPlatformUi();
  }
  if (!state.zenitEnabled && state.feedBookmaker === "zenit") state.feedBookmaker = "all";
}

function updatePariIntegrationUi(enabled) {
  state.pariEnabled = Boolean(enabled);
  document.querySelectorAll("[data-pari-option]").forEach(option => {
    option.disabled = !state.pariEnabled;
    option.textContent = state.pariEnabled ? "PARI" : "PARI — нужен ключ";
  });
  if (!state.pariEnabled && state.leftPlatform === "pari") {
    state.leftPlatform = "winline";
    syncLeftPlatformUi();
  }
  if (!state.pariEnabled && state.feedBookmaker === "pari") state.feedBookmaker = "all";
}

function updateBetboomIntegrationUi(enabled) {
  state.betboomEnabled = Boolean(enabled);
  document.querySelectorAll("[data-betboom-option]").forEach(option => {
    option.disabled = !state.betboomEnabled;
    option.textContent = state.betboomEnabled ? "BetBoom" : "BetBoom — нужен доступ";
  });
  if (!state.betboomEnabled && state.leftPlatform === "betboom") {
    state.leftPlatform = "winline";
    syncLeftPlatformUi();
  }
  if (!state.betboomEnabled && state.feedBookmaker === "betboom") state.feedBookmaker = "all";
}

function updateLigaStavokIntegrationUi(enabled) {
  state.ligaStavokEnabled = Boolean(enabled);
  document.querySelectorAll("[data-ligastavok-option]").forEach(option => {
    option.disabled = !state.ligaStavokEnabled;
    option.textContent = state.ligaStavokEnabled ? "Лига Ставок" : "Лига Ставок — нужен ключ";
  });
  if (!state.ligaStavokEnabled && state.leftPlatform === "ligastavok") {
    state.leftPlatform = "winline";
    syncLeftPlatformUi();
  }
  if (!state.ligaStavokEnabled && state.feedBookmaker === "ligastavok") state.feedBookmaker = "all";
}

function updateBetcityIntegrationUi(enabled) {
  state.betcityEnabled = Boolean(enabled);
  document.querySelectorAll("[data-betcity-option]").forEach(option => {
    option.disabled = !state.betcityEnabled;
    option.textContent = state.betcityEnabled ? "Betcity" : "Betcity — нужен ключ";
  });
  if (!state.betcityEnabled && state.leftPlatform === "betcity") {
    state.leftPlatform = "winline";
    syncLeftPlatformUi();
  }
  if (!state.betcityEnabled && state.feedBookmaker === "betcity") state.feedBookmaker = "all";
}

const checkSvg = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const alertSvg = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 2 17h16L10 2Zm0 5v4m0 3h.01" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const searchSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value, fallback) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function loadWatchIds() {
  try {
    const saved = JSON.parse(localStorage.getItem("raznitsa-watchlist") || "[]");
    state.watchIds = new Set(Array.isArray(saved) ? saved.filter(item => typeof item === "string") : []);
  } catch {
    state.watchIds = new Set();
  }
}

function persistWatchIds() {
  try {
    localStorage.setItem("raznitsa-watchlist", JSON.stringify(Array.from(state.watchIds)));
  } catch {
    showToast("Не удалось сохранить наблюдение в этом браузере");
  }
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function childrenByTag(node, tagName) {
  return Array.from(node?.children || []).filter(child => child.tagName === tagName);
}

function parseWinline(xmlText) {
  const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseError = documentNode.querySelector("parsererror");
  if (parseError) throw new Error("Winline вернул некорректный XML");

  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const sportNode of childrenByTag(documentNode.documentElement, "Sport")) {
    const sportId = `winline:sport-${sportNode.getAttribute("Id") || sportNode.getAttribute("Name")}`;
    const sourceSportName = sportNode.getAttribute("Name") || "Другой спорт";
    const sportName = SPORT_LABELS[sourceSportName.toLowerCase()] || sourceSportName;

    for (const countryNode of childrenByTag(sportNode, "Country")) {
      const countryName = countryNode.getAttribute("Name") || "International";

      for (const tournamentNode of childrenByTag(countryNode, "Tournament")) {
        const tournamentName = tournamentNode.getAttribute("Name") || "Другой турнир";
        const tournamentId = tournamentNode.getAttribute("Id") || tournamentName;
        const leagueId = `${sportId}-league-${tournamentId}`;

        for (const matchNode of childrenByTag(tournamentNode, "Match")) {
          const lines = childrenByTag(matchNode, "line");
          const line = lines.find(lineNode => {
            const type = (lineNode.getAttribute("freetext") || "").toLowerCase();
            return type === "money line" || type === "2-way odds";
          }) || lines.find(lineNode => (lineNode.getAttribute("freetext") || "").toLowerCase() === "3-way odds");
          if (!line) continue;

          const team1 = matchNode.getAttribute("Team1") || "";
          const team2 = matchNode.getAttribute("Team2") || "";
          const lineType = line.getAttribute("freetext") || "2-way odds";
          const isThreeWay = lineType.toLowerCase() === "3-way odds";
          const odds1 = Number(line.getAttribute("odd1"));
          const odds2 = Number(line.getAttribute(isThreeWay ? "odd3" : "odd2"));
          const date = new Date(matchNode.getAttribute("MatchDate") || "");
          if (!team1 || !team2 || !Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1 || Number.isNaN(date.getTime())) continue;
          if (date.getTime() < now - 30 * 60 * 1000) continue;

          const eventId = matchNode.getAttribute("Id") || `${leagueId}-${date.getTime()}-${team1}-${team2}`;
          events.push({
            id: `winline:${String(eventId)}`,
            bookmaker: "winline",
            sportId,
            sportName,
            leagueId,
            leagueName: `${countryName} · ${tournamentName}`,
            countryName,
            tournamentName,
            team1,
            team2,
            normalizedTeams: [normalizeName(team1), normalizeName(team2)],
            date,
            url: safeUrl(matchNode.getAttribute("MatchUrl"), "https://winline.ru"),
            odds: [odds1, odds2],
            lineType,
            feedType: "prematch",
            sourceFormat: "XML feed",
            priceTimestamp: now
          });

          if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "winline", label: sportName, eventCount: 0, leagueIds: new Set() });
          sportMap.get(sportId).eventCount += 1;
          sportMap.get(sportId).leagueIds.add(leagueId);

          if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "winline", sportId, label: `${countryName} · ${tournamentName}`, eventCount: 0 });
          leagueMap.get(leagueId).eventCount += 1;
        }
      }
    }
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseLeon(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const seen = new Set();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(rawEvent?.kickoff || "");
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;

    const rawMarkets = Array.isArray(rawEvent?.markets) ? rawEvent.markets : [];
    const twoWay = rawMarkets.find(market => /^Победитель/i.test(String(market?.market || "")) && Array.isArray(market?.selections) && market.selections.length === 2);
    const threeWay = rawMarkets.find(market => /Исход 1Х2/i.test(String(market?.market || "")) && Array.isArray(market?.selections) && market.selections.length >= 3);
    const market = twoWay || threeWay;
    if (!market) continue;

    const selections = market.selections;
    const first = selections.find(selection => String(selection?.type) === "1") || selections[0];
    const second = selections.find(selection => String(selection?.type) === "2") || selections[selections.length - 1];
    const odds1 = Number(first?.odds);
    const odds2 = Number(second?.odds);
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sport || "Другой спорт");
    const countryName = String(rawEvent?.region || "Международные");
    const tournamentName = String(rawEvent?.league || "Другой турнир");
    const sportId = `leon:sport:${encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${encodeURIComponent(`${countryName}|${tournamentName}`.toLowerCase())}`;
    const rawUrl = safeUrl(rawEvent?.matchUrl, "https://leon.ru");
    const eventKey = rawUrl === "https://leon.ru/" ? `${date.getTime()}-${team1}-${team2}` : rawUrl.split("/").filter(Boolean).pop();
    const id = `leon:${eventKey}`;
    if (seen.has(id)) continue;
    seen.add(id);

    events.push({
      id,
      bookmaker: "leon",
      sportId,
      sportName,
      leagueId,
      leagueName: `${countryName} · ${tournamentName}`,
      countryName,
      tournamentName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: rawUrl,
      odds: [odds1, odds2],
      lineType: threeWay && market === threeWay ? "3-way odds" : String(market.market || "Победитель"),
      feedType: "prematch",
      sourceFormat: "JSON feed",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "leon", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "leon", sportId, label: `${countryName} · ${tournamentName}`, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseFonbet(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(Number(rawEvent?.startTime) * 1000);
    const odds1 = Number(rawEvent?.odds?.[0]);
    const odds2 = Number(rawEvent?.odds?.[1]);
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sportName || "Другой спорт");
    const leagueName = String(rawEvent?.leagueName || "Другой турнир");
    const sportId = `fonbet:sport:${rawEvent?.sportId || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.leagueId || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `fonbet:${rawEvent.id}`,
      bookmaker: "fonbet",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: "https://fon.bet/sports",
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "listBase JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "fonbet", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "fonbet", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseZenit(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.lines) ? rawPayload.lines : []) {
    const team1 = String(rawEvent?.C1 || "").trim();
    const team2 = String(rawEvent?.C2 || "").trim();
    const rawDate = String(rawEvent?.Date || "").trim().replace(" ", "T");
    const date = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(rawDate) ? rawDate : `${rawDate}+03:00`);
    const bets = Array.isArray(rawEvent?.Bets) ? rawEvent.Bets : [];
    const home = bets.find(item => item?.Type === "Bet_1");
    const draw = bets.find(item => item?.Type === "Bet_X" && Number(item?.Value) > 1);
    const away = bets.find(item => item?.Type === "Bet_2");
    const odds1 = Number(home?.Value);
    const odds2 = Number(away?.Value);
    if (!team1 || !team2 || draw || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.Sport_name || "Другой спорт");
    const leagueName = String(rawEvent?.League_name || "Другой турнир");
    const sportId = `zenit:sport:${rawEvent?.Sport_Id || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.League_Id || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `zenit:${rawEvent.Line}`,
      bookmaker: "zenit",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: "https://zenitbet.com/line",
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "partner feed JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "zenit", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "zenit", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parsePari(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(Number(rawEvent?.startTime) * 1000);
    const odds1 = Number(rawEvent?.odds?.[0]);
    const odds2 = Number(rawEvent?.odds?.[1]);
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sportName || "Другой спорт");
    const leagueName = String(rawEvent?.leagueName || "Другой турнир");
    const sportId = `pari:sport:${rawEvent?.sportId || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.leagueId || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `pari:${rawEvent.id}`,
      bookmaker: "pari",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: safeUrl(rawEvent?.url, "https://www.pari.ru/sports"),
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "partner feed JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "pari", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "pari", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseBetboom(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(Number(rawEvent?.startTime) * 1000);
    const odds1 = Number(rawEvent?.odds?.[0]);
    const odds2 = Number(rawEvent?.odds?.[1]);
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sportName || "Другой спорт");
    const leagueName = String(rawEvent?.leagueName || "Другой турнир");
    const sportId = `betboom:sport:${rawEvent?.sportId || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.leagueId || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `betboom:${rawEvent.id}`,
      bookmaker: "betboom",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: safeUrl(rawEvent?.url, "https://betboom.ru/sport"),
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "partner feed JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "betboom", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "betboom", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseLigaStavok(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(Number(rawEvent?.startTime) * 1000);
    const odds1 = Number(rawEvent?.odds?.[0]);
    const odds2 = Number(rawEvent?.odds?.[1]);
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sportName || "Другой спорт");
    const leagueName = String(rawEvent?.leagueName || "Другой турнир");
    const sportId = `ligastavok:sport:${rawEvent?.sportId || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.leagueId || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `ligastavok:${rawEvent.id}`,
      bookmaker: "ligastavok",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: safeUrl(rawEvent?.url, "https://www.ligastavok.ru/"),
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "Match Center JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "ligastavok", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "ligastavok", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parseBetcity(rawPayload) {
  const events = [];
  const sportMap = new Map();
  const leagueMap = new Map();
  const now = Date.now();

  for (const rawEvent of Array.isArray(rawPayload?.events) ? rawPayload.events : []) {
    const team1 = String(rawEvent?.team1 || "").trim();
    const team2 = String(rawEvent?.team2 || "").trim();
    const date = new Date(Number(rawEvent?.startTime) * 1000);
    const odds1 = Number(rawEvent?.odds?.[0]);
    const odds2 = Number(rawEvent?.odds?.[1]);
    if (!team1 || !team2 || Number.isNaN(date.getTime()) || date.getTime() < now - 30 * 60 * 1000) continue;
    if (!Number.isFinite(odds1) || !Number.isFinite(odds2) || odds1 <= 1 || odds2 <= 1) continue;

    const sportName = String(rawEvent?.sportName || "Другой спорт");
    const leagueName = String(rawEvent?.leagueName || "Другой турнир");
    const sportId = `betcity:sport:${rawEvent?.sportId || encodeURIComponent(sportName.toLowerCase())}`;
    const leagueId = `${sportId}:league:${rawEvent?.leagueId || encodeURIComponent(leagueName.toLowerCase())}`;
    events.push({
      id: `betcity:${rawEvent.id}`,
      bookmaker: "betcity",
      sportId,
      sportName,
      leagueId,
      leagueName,
      countryName: "",
      tournamentName: leagueName,
      team1,
      team2,
      normalizedTeams: [normalizeName(team1), normalizeName(team2)],
      date,
      url: safeUrl(rawEvent?.url, "https://betcity.ru/ru/line"),
      odds: [odds1, odds2],
      lineType: "2-way odds",
      feedType: "prematch",
      sourceFormat: "partner feed JSON",
      priceTimestamp: Number(rawPayload?.updatedAt) || now
    });

    if (!sportMap.has(sportId)) sportMap.set(sportId, { id: sportId, bookmaker: "betcity", label: sportName, eventCount: 0, leagueIds: new Set() });
    sportMap.get(sportId).eventCount += 1;
    sportMap.get(sportId).leagueIds.add(leagueId);
    if (!leagueMap.has(leagueId)) leagueMap.set(leagueId, { id: leagueId, bookmaker: "betcity", sportId, label: leagueName, eventCount: 0 });
    leagueMap.get(leagueId).eventCount += 1;
  }

  events.sort((a, b) => a.date - b.date);
  const sports = Array.from(sportMap.values())
    .map(item => ({ ...item, leagueIds: Array.from(item.leagueIds) }))
    .sort((a, b) => b.eventCount - a.eventCount || a.label.localeCompare(b.label));
  const leagues = Array.from(leagueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { events, sports, leagues };
}

function parsePolymarket(rawEvents) {
  const markets = [];
  const seenMarkets = new Set();
  for (const parent of Array.isArray(rawEvents) ? rawEvents : []) {
    const parentParticipants = String(parent.title || "").split(/\s+(?:vs\.?|v\.?|versus)\s+/i).map(item => item.trim()).filter(Boolean);
    const normalizedParentParticipants = parentParticipants.length === 2 ? parentParticipants.map(normalizeName) : [];
    for (const market of Array.isArray(parent.markets) ? parent.markets : []) {
      if (market.sportsMarketType !== "moneyline" || market.enableOrderBook !== true || market.closed === true || market.acceptingOrders === false) continue;
      const outcomes = parseArray(market.outcomes);
      const tokens = parseArray(market.clobTokenIds);
      const indicativePrices = parseArray(market.outcomePrices).map(Number);
      if (outcomes.length !== 2 || tokens.length !== 2 || seenMarkets.has(String(market.id))) continue;

      const isBinaryTeamMarket = outcomes.every(outcome => /^(yes|no)$/i.test(outcome));
      let matchTeams = outcomes.map(normalizeName);
      let binaryTeamIndex = null;
      if (isBinaryTeamMarket) {
        const binaryTeam = String(market.groupItemTitle || "").trim();
        if (!binaryTeam || /^draw\b/i.test(binaryTeam) || normalizedParentParticipants.length !== 2) continue;
        const normalizedBinaryTeam = normalizeName(binaryTeam);
        const similarities = normalizedParentParticipants.map(team => nameSimilarityNormalized(team, normalizedBinaryTeam));
        binaryTeamIndex = similarities[0] >= similarities[1] ? 0 : 1;
        if (similarities[binaryTeamIndex] < 0.68) continue;
        matchTeams = normalizedParentParticipants;
      }

      const start = new Date(market.gameStartTime || parent.startTime || parent.endDate || "");
      if (Number.isNaN(start.getTime())) continue;
      seenMarkets.add(String(market.id));
      markets.push({
        id: `polymarket:${String(market.id)}`,
        platform: "polymarket",
        question: market.question || parent.title || outcomes.join(" vs "),
        outcomes,
        normalizedOutcomes: outcomes.map(normalizeName),
        matchTeams,
        displayTeams: isBinaryTeamMarket ? parentParticipants : outcomes,
        binaryTeamIndex,
        marketKind: isBinaryTeamMarket ? "binary-team" : "two-team",
        tokens,
        indicativePrices,
        start,
        liquidity: Number(market.liquidityNum || market.liquidity || 0),
        marketType: market.sportsMarketType,
        eventSlug: parent.slug || market.slug || "",
        url: safeUrl(`https://polymarket.com/event/${parent.slug || market.slug || ""}`, "https://polymarket.com")
      });
    }
  }
  return markets;
}

function parseKalshi(rawResponses) {
  const markets = [];
  const seenEvents = new Set();
  const now = Date.now();

  for (const response of Array.isArray(rawResponses) ? rawResponses : []) {
    for (const event of Array.isArray(response?.events) ? response.events : []) {
      const eventTicker = String(event.event_ticker || "");
      if (!eventTicker || seenEvents.has(eventTicker) || event.category !== "Sports" || event.mutually_exclusive !== true) continue;

      const participants = String(event.title || "")
        .split(/\s+(?:vs\.?|v\.?|versus)\s+/i)
        .map(item => item.trim())
        .filter(Boolean);
      if (participants.length !== 2) continue;

      const eventMarkets = (Array.isArray(event.markets) ? event.markets : [])
        .filter(market => market.market_type === "binary" && ["active", "open"].includes(String(market.status || "").toLowerCase()));
      if (eventMarkets.length < 2) continue;

      const participantMarkets = participants.map(participant => {
        const normalizedParticipant = normalizeName(participant);
        return eventMarkets
          .map(market => {
            const outcomeName = market.yes_sub_title || market.title || "";
            return { market, score: nameSimilarityNormalized(normalizedParticipant, normalizeName(outcomeName)) };
          })
          .sort((a, b) => b.score - a.score)[0];
      });
      if (participantMarkets.some(item => !item || item.score < 0.56)) continue;
      if (participantMarkets[0].market.ticker === participantMarkets[1].market.ticker) continue;

      const startValue = participantMarkets[0].market.occurrence_datetime || participantMarkets[0].market.expected_expiration_time || event.strike_date;
      const start = new Date(startValue || "");
      if (Number.isNaN(start.getTime()) || start.getTime() < now - 30 * 60 * 1000) continue;

      const indicativePrices = participantMarkets.map(item => Number(item.market.yes_ask_dollars));
      if (indicativePrices.some(price => !Number.isFinite(price) || price <= 0 || price >= 1)) continue;

      const rules = participantMarkets.map(item => ({
        primary: String(item.market.rules_primary || ""),
        secondary: String(item.market.rules_secondary || "")
      }));
      const seriesSlug = String(event.series_ticker || "").toLowerCase();
      seenEvents.add(eventTicker);
      markets.push({
        id: `kalshi:${eventTicker}`,
        platform: "kalshi",
        question: event.title || participants.join(" vs "),
        outcomes: participants,
        normalizedOutcomes: participants.map(normalizeName),
        matchTeams: participants.map(normalizeName),
        displayTeams: participants,
        binaryTeamIndex: null,
        marketKind: "two-team",
        tokens: participantMarkets.map(item => String(item.market.ticker)),
        indicativePrices,
        start,
        liquidity: participantMarkets.reduce((sum, item) => sum + Number(item.market.open_interest_fp || 0), 0),
        marketType: "moneyline",
        eventSlug: eventTicker,
        url: safeUrl(`https://kalshi.com/markets/${seriesSlug}`, "https://kalshi.com/markets"),
        rules,
        settlementSources: Array.isArray(event.settlement_sources) ? event.settlement_sources : [],
        sourceUpdatedAt: Math.max(...participantMarkets.map(item => new Date(item.market.updated_time || 0).getTime()).filter(Number.isFinite), 0),
        feeType: event.fee_type_override || "general",
        feeMultiplier: Number(event.fee_multiplier_override || 1)
      });
    }
  }
  return markets;
}

function parsePredictFun(rawCategories) {
  const markets = [];
  const seenMarkets = new Set();
  const now = Date.now();

  for (const category of Array.isArray(rawCategories) ? rawCategories : []) {
    const sports = category?.variantDetails?.sports;
    const teams = Array.isArray(category?.teams) && category.teams.length === 2
      ? category.teams
      : Array.isArray(sports?.teams) && sports.teams.length === 2
        ? sports.teams
        : [];
    if (teams.length !== 2 || !Array.isArray(category?.markets)) continue;

    const participants = teams.map(team => String(team?.name || team?.alias || team?.abbreviation || "").trim());
    if (participants.some(name => !name)) continue;
    const matchTeams = participants.map(normalizeName);
    const start = new Date(category.startsAt || category.endsAt || "");
    if (Number.isNaN(start.getTime()) || start.getTime() < now - 30 * 60 * 1000) continue;

    for (const market of category.markets) {
      const marketId = String(market?.id || "");
      if (!marketId || seenMarkets.has(marketId) || market.marketType !== "SPORTS_MONEYLINE" || market.tradingStatus !== "OPEN") continue;
      const outcomes = Array.isArray(market.outcomes) ? market.outcomes : [];
      const yesIndex = outcomes.findIndex(outcome => /^yes$/i.test(String(outcome?.name || "")));
      const noIndex = outcomes.findIndex(outcome => /^no$/i.test(String(outcome?.name || "")));
      if (yesIndex < 0 || noIndex < 0) continue;

      const marketTeamName = String(market?.team?.name || market?.variantDetails?.sports?.team?.name || market?.title || "").trim();
      if (!marketTeamName || /^draw$/i.test(marketTeamName)) continue;
      const normalizedMarketTeam = normalizeName(marketTeamName);
      const teamScores = teams.map((team, index) => {
        const names = [team?.name, team?.alias, team?.abbreviation]
          .filter(Boolean)
          .map(normalizeName);
        return Math.max(...names.map(name => nameSimilarityNormalized(name, normalizedMarketTeam)), nameSimilarityNormalized(matchTeams[index], normalizedMarketTeam));
      });
      const binaryTeamIndex = teamScores[0] >= teamScores[1] ? 0 : 1;
      if (teamScores[binaryTeamIndex] < 0.56) continue;

      const yesOutcome = outcomes[yesIndex];
      const noOutcome = outcomes[noIndex];
      const yesAsk = Number(yesOutcome?.bestAsk?.price);
      const noAsk = Number(noOutcome?.bestAsk?.price);
      const indicativePrices = [yesAsk, noAsk];
      if (indicativePrices.some(price => !Number.isFinite(price) || price <= 0 || price >= 1)) continue;

      seenMarkets.add(marketId);
      markets.push({
        id: `predictfun:${marketId}`,
        platform: "predictfun",
        question: market.question || category.title || participants.join(" vs "),
        outcomes: ["Yes", "No"],
        normalizedOutcomes: ["yes", "no"],
        matchTeams,
        displayTeams: participants,
        binaryTeamIndex,
        marketKind: "binary-team",
        tokens: [`${marketId}:yes`, `${marketId}:no`],
        indicativePrices,
        start,
        liquidity: Number(market?.stats?.totalLiquidityUsd || category?.stats?.totalLiquidityUsd || 0),
        marketType: "moneyline",
        eventSlug: String(category.slug || ""),
        url: safeUrl(`https://predict.fun/market/${category.slug || ""}`, "https://predict.fun/markets/sports"),
        feeRate: Math.max(0, Number(market.feeRateBps || 0) / 10000),
        decimalPrecision: Math.max(0, Math.min(8, Number(market.decimalPrecision || 2))),
        sourceProvider: String(sports?.provider || "")
      });
    }
  }
  return markets;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(cs\s*:?\s*go|counter\s*strike|dota\s*2|league\s*of\s*legends|lol|valorant)\s+/i, "")
    .replace(/\bfootball club\b/g, " ")
    .replace(/\b(fk|fc|hc|bc)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function nameSimilarityNormalized(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) / Math.max(a.length, b.length) > 0.55) return 0.93;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const intersection = [...aTokens].filter(token => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  const tokenScore = union ? intersection / union : 0;
  if (intersection === 0 && (a.includes(" ") || b.includes(" ") || a[0] !== b[0])) return 0;
  const editScore = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return Math.max(tokenScore, editScore * 0.92);
}

function compareMarket(winlineEvent, predictionMarket) {
  if (winlineEvent.lineType.toLowerCase() === "3-way odds") return null;
  const hoursApart = Math.abs(winlineEvent.date - predictionMarket.start) / 3600000;
  if (hoursApart > 18) return null;
  const directParts = [
    nameSimilarityNormalized(winlineEvent.normalizedTeams[0], predictionMarket.matchTeams[0]),
    nameSimilarityNormalized(winlineEvent.normalizedTeams[1], predictionMarket.matchTeams[1])
  ];
  const swappedParts = [
    nameSimilarityNormalized(winlineEvent.normalizedTeams[0], predictionMarket.matchTeams[1]),
    nameSimilarityNormalized(winlineEvent.normalizedTeams[1], predictionMarket.matchTeams[0])
  ];
  const direct = (directParts[0] + directParts[1]) / 2;
  const swapped = (swappedParts[0] + swappedParts[1]) / 2;
  const mapping = direct >= swapped ? [0, 1] : [1, 0];
  const parts = direct >= swapped ? directParts : swappedParts;
  const namesScore = Math.max(direct, swapped);
  if (Math.min(...parts) < 0.56 || namesScore < 0.68) return null;

  const timeScore = hoursApart <= 1 ? 1 : hoursApart <= 3 ? 0.9 : hoursApart <= 6 ? 0.72 : 0.45;
  const confidence = Math.round((namesScore * 0.84 + timeScore * 0.16) * 100);
  const binarySide = predictionMarket.marketKind === "binary-team" ? mapping.indexOf(predictionMarket.binaryTeamIndex) : null;
  return { market: predictionMarket, mapping, binarySide, confidence, hoursApart, namesScore };
}

function candidateHedgeIndex(candidate, side) {
  if (candidate.market.marketKind === "binary-team") return candidate.binarySide === side ? 1 : null;
  return candidate.mapping[side === 0 ? 1 : 0];
}

function hedgeOutcomeLabel(candidate, event, side, hedgeIndex) {
  const outcome = candidate.market.outcomes[hedgeIndex];
  if (candidate.market.marketKind !== "binary-team") return outcome;
  const team = event[`team${side + 1}`];
  return /^no$/i.test(outcome) ? `${team} не победит` : `${team} победит`;
}

function findCandidates(winlineEvent) {
  if (!winlineEvent) return [];
  return data.predictionMarkets
    .map(market => compareMarket(winlineEvent, market))
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence || a.hoursApart - b.hoursApart)
    .slice(0, 4);
}

function rebuildMatchCache() {
  data.matchCache = new Map();
  for (const event of data.bookmakerEvents) {
    const candidates = findCandidates(event);
    if (candidates.length) data.matchCache.set(event.id, candidates);
  }
}

function currentSport() {
  return data.sports.find(item => item.id === state.sport);
}

function currentLeague() {
  return data.leagues.find(item => item.id === state.league);
}

function currentEvent() {
  return data.bookmakerEvents.find(item => item.id === state.event);
}

function currentCandidates() {
  const side = currentSideIndex();
  return (data.matchCache.get(state.event) || [])
    .filter(candidate =>
      candidateHedgeIndex(candidate, side) !== null &&
      (state.rightPlatform === "auto" || candidate.market.platform === state.rightPlatform)
    )
    .sort((a, b) => {
      const aIndex = candidateHedgeIndex(a, side);
      const bIndex = candidateHedgeIndex(b, side);
      const aValue = Number(a.market.indicativePrices[aIndex]);
      const bValue = Number(b.market.indicativePrices[bIndex]);
      const aPrice = Number.isFinite(aValue) ? aValue : Infinity;
      const bPrice = Number.isFinite(bValue) ? bValue : Infinity;
      return aPrice - bPrice || b.confidence - a.confidence || a.hoursApart - b.hoursApart;
    });
}

function currentCandidate() {
  return currentCandidates().find(candidate => candidate.market.id === state.candidateId) || null;
}

function currentOpportunity() {
  const side = currentSideIndex();
  const existing = data.opportunities.find(item =>
    item.event.id === state.event &&
    item.candidate.market.id === state.candidateId &&
    item.side === side
  );
  if (existing) return existing;
  const event = currentEvent();
  const candidate = currentCandidate();
  if (!event || !candidate || !state.book) return null;
  const hedgeIndex = candidateHedgeIndex(candidate, side);
  if (hedgeIndex === null) return null;
  const id = `${event.id}:${candidate.market.id}:${side}`;
  return { id, event, candidate, side, hedgeIndex, odds: event.odds[side], book: state.book };
}

function currentOpportunityId() {
  return currentOpportunity()?.id || "";
}

function currentSideIndex() {
  return state.market === "team2" ? 1 : 0;
}

function chooseInitialSelection() {
  let best = null;
  const bookmakerEvents = activeBookmakerEvents();
  for (const event of bookmakerEvents) {
    for (const candidate of data.matchCache.get(event.id) || []) {
      if (candidate.confidence < 82) continue;
      for (const side of [0, 1]) {
        const hedgeIndex = candidateHedgeIndex(candidate, side);
        if (hedgeIndex === null) continue;
        const indicative = candidate.market.indicativePrices[hedgeIndex];
        if (!Number.isFinite(indicative)) continue;
        const q = 1 / event.odds[side] + indicative;
        const rank = q - candidate.confidence / 10000;
        if (!best || rank < best.rank) best = { event, candidate, side, rank };
      }
    }
  }

  const selected = best?.event || bookmakerEvents[0];
  if (!selected) return;
  state.sport = selected.sportId;
  state.league = selected.leagueId;
  state.event = selected.id;
  state.market = best?.side === 1 ? "team2" : "team1";
  state.stage = best ? 4 : 0;
  state.candidateId = best?.candidate.market.id || null;
}

function resetFinderSelection() {
  state.stage = 0;
  state.sport = null;
  state.league = null;
  state.event = null;
  state.market = "team1";
  state.rightPlatform = "auto";
  state.candidateId = null;
  state.book = null;
  state.bookError = null;
}

function formatEventTime(date) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatPercent(value, digits = 2) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

function formatMoney(value, currency = state.baseCurrency) {
  const number = Number(value) || 0;
  if (currency === "RUB") {
    return `${number.toLocaleString("ru-RU", { minimumFractionDigits: Math.abs(number) < 100 ? 2 : 0, maximumFractionDigits: 2 })} ₽`;
  }
  return `${number.toLocaleString("ru-RU", { minimumFractionDigits: Math.abs(number) < 10 ? 2 : 0, maximumFractionDigits: 2 })} ${currency}`;
}

function formatExactMoney(value, currency = state.baseCurrency) {
  const number = Number(value) || 0;
  const suffix = currency === "RUB" ? "₽" : currency;
  return `${number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
}

function formatDecimal(value, digits = 4) {
  return Number(value).toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatUnits(value) {
  return formatMoney(value);
}

function rubToBase(value) {
  return state.baseCurrency === "RUB" ? value : value / state.rubPerUsdc;
}

function usdcToBase(value) {
  return state.baseCurrency === "USDC" ? value : value * state.rubPerUsdc;
}

function usdtToBase(value) {
  if (state.baseCurrency === "RUB") return value * state.rubPerUsdt;
  return value * state.rubPerUsdt / state.rubPerUsdc;
}

function usdToBase(value) {
  if (state.baseCurrency === "RUB") return value * state.rubPerUsd;
  return value * state.rubPerUsd / state.rubPerUsdc;
}

function marketToBase(value, platform) {
  if (platform === "kalshi") return usdToBase(value);
  if (platform === "predictfun") return usdtToBase(value);
  return usdcToBase(value);
}

function marketToRub(value, platform) {
  if (platform === "kalshi") return value * state.rubPerUsd;
  if (platform === "predictfun") return value * state.rubPerUsdt;
  return value * state.rubPerUsdc;
}

function marketRubRate(platform) {
  if (platform === "kalshi") return state.rubPerUsd;
  if (platform === "predictfun") return state.rubPerUsdt;
  return state.rubPerUsdc;
}

function baseToRub(value) {
  return state.baseCurrency === "RUB" ? value : value * state.rubPerUsdc;
}

function baseToUsdc(value) {
  return state.baseCurrency === "USDC" ? value : value / state.rubPerUsdc;
}

function pluralRu(value, one, few, many) {
  const number = Math.abs(value) % 100;
  const last = number % 10;
  if (number > 10 && number < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function syncEconomyControls() {
  document.querySelectorAll("[data-economy-field]").forEach(control => {
    const key = control.dataset.economyField;
    const value = state[key];
    if (control.dataset.economyKind === "percent") {
      control.value = Number((value * 100).toFixed(3));
    } else if (key === "rubPerUsdt" || key === "rubPerUsdc" || key === "rubPerUsd") {
      control.value = Number(value).toFixed(2);
    } else {
      control.value = value;
    }
  });
}

function updateEconomyUi() {
  const usdtRate = state.rubPerUsdt.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rate = state.rubPerUsdc.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdRate = state.rubPerUsd.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const buffer = (state.safetyBuffer * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  document.querySelectorAll("[data-economy-summary]").forEach(node => {
    node.textContent = `${state.baseCurrency} · USDT ${usdtRate} ₽ · USDC ${rate} ₽ · порог ${buffer}%`;
  });
  const threshold = document.querySelector("#economy-threshold-summary");
  if (threshold) threshold.textContent = `Чистая доходность ≥ ${buffer}%`;
  if (el.fxSource) {
    el.fxSource.textContent = state.fxUpdatedAt
      ? `${state.fxSource} · ${formatAge(state.fxUpdatedAt)}`
      : state.fxSource;
  }
  if (el.capitalCurrency) el.capitalCurrency.textContent = state.baseCurrency === "RUB" ? "₽" : "USDC";
}

function updateQuickAmounts() {
  const values = state.baseCurrency === "RUB" ? [5000, 10000, 25000] : [50, 100, 250];
  document.querySelectorAll("[data-amount]").forEach((button, index) => {
    const value = values[index] ?? values[values.length - 1];
    button.dataset.amount = String(value);
    button.textContent = value.toLocaleString("ru-RU");
    button.classList.toggle("is-active", Math.abs(state.capital - value) < 0.001);
  });
  el.capital.value = state.capital.toLocaleString("ru-RU", { maximumFractionDigits: state.baseCurrency === "RUB" ? 0 : 2 });
}

function applyEconomyChange() {
  updateEconomyUi();
  updateQuickAmounts();
  rebuildCrossComparisons();
  renderOpportunities();
  renderWatch();
  updateCalculation();
  if (!el.rulesPanel.hidden) renderRules();
}

async function loadFxRate() {
  if (state.fxManual) return;
  try {
    const [rapiraResponse, usdResponse] = await Promise.all([
      fetch(API.fxRapira, { cache: "no-store" }).catch(() => null),
      fetch(API.fxUsd, { cache: "no-store" }).catch(() => null)
    ]);
    let usdtRate;
    let usdcRate;
    let source;
    if (rapiraResponse?.ok) {
      const rapiraPayload = await rapiraResponse.json();
      usdtRate = Number(rapiraPayload?.usdtRub);
      usdcRate = Number(rapiraPayload?.usdcRub);
      source = "Rapira · ask USDT/RUB · USDC через USDC/USDT";
    }
    if (!Number.isFinite(usdtRate) || usdtRate <= 0 || !Number.isFinite(usdcRate) || usdcRate <= 0) {
      const usdcResponse = await fetch(API.fxUsdc, { cache: "no-store" });
      if (!usdcResponse.ok) throw new Error("Резервный FX не ответил");
      const usdcPayload = await usdcResponse.json();
      usdcRate = Number(usdcPayload?.data?.rates?.RUB);
      usdtRate = usdcRate;
      source = "Coinbase · резервный курс USDC/RUB";
    }
    let usdRate;
    if (usdResponse?.ok) {
      const usdPayload = await usdResponse.json();
      usdRate = Number(usdPayload?.data?.rates?.RUB);
    }
    if (!Number.isFinite(usdRate) || usdRate <= 0) usdRate = usdtRate;
    if (![usdtRate, usdcRate, usdRate].every(value => Number.isFinite(value) && value > 0)) throw new Error("Курс RUB отсутствует");
    state.rubPerUsdt = usdtRate;
    state.rubPerUsdc = usdcRate;
    state.rubPerUsd = usdRate;
    state.fxSource = source;
    state.fxUpdatedAt = Date.now();
    const usdtField = document.querySelector('[data-economy-field="rubPerUsdt"]');
    const usdcField = document.querySelector('[data-economy-field="rubPerUsdc"]');
    const usdField = document.querySelector('[data-economy-field="rubPerUsd"]');
    if (usdtField) usdtField.value = usdtRate.toFixed(2);
    if (usdcField) usdcField.value = usdcRate.toFixed(2);
    if (usdField) usdField.value = usdRate.toFixed(2);
    applyEconomyChange();
  } catch {
    state.fxSource = "Автокурс недоступен — проверьте вручную";
    state.fxUpdatedAt = null;
    updateEconomyUi();
  }
}

function optionButton(item, selected, step) {
  const matchClass = item.hasMatch ? " has-match" : "";
  return `
    <button class="option-button${selected ? " is-selected" : ""}" type="button" data-select-step="${step}" data-id="${escapeHtml(item.id)}">
      <span class="option-main"><strong title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</strong><small>${escapeHtml(item.meta || "")}</small></span>
      <span class="option-count${matchClass}">${escapeHtml(item.code || "→")}</span>
    </button>`;
}

function pairCountFor(predicate) {
  let count = 0;
  for (const event of activeBookmakerEvents()) {
    if (data.matchCache.has(event.id) && predicate(event)) count += 1;
  }
  return count;
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
    <button class="trail-button${state.stage === item.step ? " is-current" : ""}" type="button" data-trail-step="${item.step}" ${state.loadingData || !activeBookmakerEvents().length ? "disabled" : ""}>${escapeHtml(item.label)}</button>
    ${index < items.length - 1 ? `<span class="trail-separator">/</span>` : ""}
  `).join("");
}

function loadingMarkup(label) {
  return `<div class="data-loading"><div class="loading-label"><span class="spinner"></span>${escapeHtml(label)}</div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;
}

function errorMarkup(message) {
  return `<div class="api-error"><div>${alertSvg}<strong>Не удалось прочитать API</strong><span>${escapeHtml(message)}</span><button class="retry-button" type="button" data-retry>Повторить</button></div></div>`;
}

function renderSource() {
  syncLeftPlatformUi();
  renderTrail();
  if (state.loadingData && !state.backgroundRefresh) {
    el.stage.innerHTML = loadingMarkup(`Загружаем линию ${bookmakerInfo(state.leftPlatform).name}…`);
    return;
  }
  if (state.dataError) {
    el.stage.innerHTML = errorMarkup(state.dataError);
    return;
  }
  if (!activeBookmakerEvents().length) {
    el.stage.innerHTML = errorMarkup("В prematch-фиде нет двухисходных рынков для показа.");
    return;
  }
  if (state.stage === 4 && currentEvent()) {
    renderSourceTicket();
    return;
  }

  const titles = ["Выбери спорт", "Выбери лигу", "Выбери матч", "Выбери исход"];
  let options = [];
  if (state.stage === 0) {
    options = activeSports().map(item => {
      const pairs = pairCountFor(event => event.sportId === item.id);
      return { id: item.id, label: item.label, meta: `${item.eventCount} ${pluralRu(item.eventCount, "событие", "события", "событий")} · ${item.leagueIds.length} ${pluralRu(item.leagueIds.length, "турнир", "турнира", "турниров")}`, code: pairs ? `${pairs} совп.` : item.label.slice(0, 3).toUpperCase(), hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs || a.label.localeCompare(b.label));
  }
  if (state.stage === 1) {
    options = activeLeagues().filter(item => item.sportId === state.sport).map(item => {
      const pairs = pairCountFor(event => event.leagueId === item.id);
      return { id: item.id, label: item.label, meta: `${item.eventCount} ${pluralRu(item.eventCount, "событие", "события", "событий")}`, code: pairs ? `${pairs} совп.` : "→", hasMatch: pairs > 0, pairs };
    }).sort((a, b) => b.pairs - a.pairs || a.label.localeCompare(b.label));
  }
  if (state.stage === 2) {
    options = activeBookmakerEvents()
      .filter(item => item.leagueId === state.league)
      .sort((a, b) => {
        const matchOrder = Number(data.matchCache.has(b.id)) - Number(data.matchCache.has(a.id));
        return matchOrder || a.date - b.date || a.team1.localeCompare(b.team1);
      })
      .map(item => ({
        id: item.id,
        label: `${item.team1} — ${item.team2}`,
        meta: formatEventTime(item.date),
        code: data.matchCache.has(item.id) ? "совпало" : `${item.odds[0].toFixed(2)} / ${item.odds[1].toFixed(2)}`,
        hasMatch: data.matchCache.has(item.id)
      }));
  }
  if (state.stage === 3 && currentEvent()) {
    const event = currentEvent();
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

function renderSourceTicket() {
  const event = currentEvent();
  const side = currentSideIndex();
  const bookmaker = bookmakerInfo(event.bookmaker);
  el.stage.innerHTML = `
    <article class="source-ticket">
      <div class="ticket-meta"><span class="ticket-source"><img class="inline-platform-logo${bookmakerLogoClass(event.bookmaker)}" src="${bookmaker.logo}" alt="">${bookmaker.name} API / Prematch</span><span class="ticket-time">${escapeHtml(formatEventTime(event.date))}</span></div>
      <span class="ticket-competition">${escapeHtml(event.sportName)} · ${escapeHtml(event.leagueName)}</span>
      <h3>${escapeHtml(event.team1)}<br>— ${escapeHtml(event.team2)}</h3>
      <div class="ticket-price-row">
        <div class="ticket-market"><span class="ticket-market-label">Исход</span><strong>${escapeHtml(event[`team${side + 1}`])}</strong></div>
        <div class="ticket-odds"><span class="ticket-market-label">Коэфф.</span><strong>${event.odds[side].toFixed(2)}</strong></div>
      </div>
      <div class="ticket-actions"><span class="ticket-market-label">ID ${escapeHtml(event.id)} · ${escapeHtml(event.sourceFormat || bookmaker.sourceLabel)}</span><button class="text-button" type="button" data-change-event>Сменить матч</button></div>
    </article>`;
}

function renderTarget() {
  syncRightPlatformUi();
  if (!state.book) {
    el.trustVerdict.innerHTML = "";
    el.arbCard.classList.remove("has-stale-price");
    document.querySelector("#build-position").disabled = true;
    el.watchToggle.disabled = true;
    el.watchToggle.classList.remove("is-watching");
    el.watchToggle.textContent = "+ Добавить в наблюдение";
  }
  if (state.loadingData && !state.backgroundRefresh) {
    el.results.innerHTML = loadingMarkup("Загружаем спортивные рынки Polymarket и Kalshi…");
    el.arbCard.classList.add("is-unavailable");
    return;
  }
  if (state.dataError) {
    el.results.innerHTML = errorMarkup(state.dataError);
    el.arbCard.classList.add("is-unavailable");
    return;
  }
  const event = currentEvent();
  if (!event || state.stage !== 4) {
    el.railScore.textContent = "ИЩЕМ ПАРУ";
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p>Собери исход слева. Вторую сторону найдём сами.</p></div></div>`;
    el.arbCard.classList.add("is-unavailable");
    return;
  }

  const candidates = currentCandidates();
  if (!candidates.length) {
    const requestedPlatform = state.rightPlatform === "auto"
      ? (state.predictfunEnabled ? "Polymarket, Kalshi и Predict.fun" : "Polymarket и Kalshi")
      : platformInfo(state.rightPlatform).name;
    el.results.innerHTML = `<div class="empty-target"><div>${searchSvg}<p><strong>Здесь рынок не ответил</strong>${escapeHtml(requestedPlatform)} не нашли совместимую вторую сторону. Попробуй матч с отметкой «совпало».</p></div></div>`;
    el.railScore.textContent = "ПАРЫ НЕТ";
    el.arbCard.classList.add("is-unavailable");
    return;
  }

  const candidate = currentCandidate() || candidates[0];
  if (!currentCandidate()) state.candidateId = candidate.market.id;
  syncRightPlatformUi(candidate.market.platform);
  el.railScore.textContent = candidate.confidence >= 82 ? "ПАРА НАЙДЕНА" : "НУЖНА ПРОВЕРКА";
  const currentWatchId = currentOpportunityId();
  const isWatching = Boolean(currentWatchId) && state.watchIds.has(currentWatchId);
  el.results.innerHTML = `
    <div class="match-summary">
      <span class="confidence-note">${candidates.length} ${candidates.length === 1 ? "кандидат" : "кандидата"} · совпадение объясним по пунктам</span>
      <span class="match-summary-actions">
        <button class="manual-link" type="button" data-manual>Почему совпало</button>
        <button class="summary-watch${isWatching ? " is-watching" : ""}" type="button" data-watch-current ${state.book ? "" : "disabled"}>${isWatching ? "✓ В наблюдении" : "+ В наблюдение"}</button>
      </span>
    </div>
    <div class="candidate-list">${candidates.map(candidateItem => candidateCard(candidateItem)).join("")}</div>
    ${state.bookError ? `<div class="mismatch-alert">${alertSvg}<span><strong>Свежие предложения недоступны.</strong><br>${escapeHtml(state.bookError)}</span></div>` : ""}
    ${candidate.confidence < 82 ? `<div class="mismatch-alert">${alertSvg}<span><strong>Нужна ручная проверка события.</strong><br>Одно из названий или время начала отличается.</span></div>` : ""}`;

  const ready = candidate.confidence >= 82 && Boolean(state.book) && !state.bookError;
  el.arbCard.classList.toggle("is-unavailable", !ready);
  updateCalculation();
}

function candidateCard(candidate) {
  const provider = platformInfo(candidate.market.platform);
  const providerTitle = candidate.market.platform === "kalshi" ? "" : `${provider.upperName} / `;
  const selected = candidate.market.id === state.candidateId;
  const side = currentSideIndex();
  const oppositePolyIndex = candidateHedgeIndex(candidate, side);
  const outcome = hedgeOutcomeLabel(candidate, currentEvent(), side, oppositePolyIndex);
  const timeDifference = Math.round(candidate.hoursApart * 60);
  const namesStatus = candidate.namesScore >= 0.9 ? "совпали" : "сопоставлены";
  const eventStatus = candidate.confidence >= 82 ? "Событие сошлось" : "Проверить событие";
  const indicative = candidate.market.indicativePrices[oppositePolyIndex];
  let price = Number.isFinite(indicative) ? `≈${Math.round(indicative * 100)}¢ <small>индикативно</small>` : "проверить";
  if (selected && state.bookLoading) price = `<span class="spinner"></span>`;
  if (selected && state.book) price = `${Math.round(state.book.ask * 1000) / 10}¢ <small>ask · ${Number(state.book.size).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} шт.</small>`;

  return `
    <button class="candidate-card${selected ? " is-selected" : ""}" type="button" data-candidate="${escapeHtml(candidate.market.id)}" aria-pressed="${selected}">
      <span class="candidate-top"><span class="candidate-source"><img class="inline-platform-logo${candidate.market.platform === "kalshi" ? " inline-platform-logo--kalshi" : ""}" src="${provider.logo}" alt="${candidate.market.platform === "kalshi" ? "Kalshi" : ""}">${providerTitle}${escapeHtml(candidate.market.marketType)}</span><span class="candidate-confidence${candidate.confidence < 82 ? " is-low" : ""}">${eventStatus}</span></span>
      <h3>${escapeHtml(candidate.market.question)}</h3>
      <span class="candidate-evidence"><span>Команды <b>${namesStatus}</b></span><span>Время <b>${timeDifference === 0 ? "совпало" : `Δ ${timeDifference} мин.`}</b></span><span>Формат <b>победитель матча</b></span></span>
      <span class="candidate-bottom"><span class="candidate-contract">Хедж: ${escapeHtml(outcome)}</span><span class="candidate-price">${price}${selected && state.book ? `<span class="selected-check">${checkSvg}</span>` : ""}</span></span>
    </button>`;
}

async function fetchBookSnapshot(candidate, hedgeIndex, outcome) {
  const platform = candidate.market.platform;
  const token = candidate.market.tokens[hedgeIndex];
  const provider = platformInfo(platform);
  const [predictMarketId, predictOutcome = "yes"] = platform === "predictfun" ? String(token).split(":") : ["", ""];
  const url = platform === "kalshi"
    ? `${API.kalshiBook}${encodeURIComponent(token)}/orderbook?depth=100`
    : platform === "predictfun"
      ? `${API.predictBook}${encodeURIComponent(predictMarketId)}/orderbook`
      : `${API.polymarketBook}${encodeURIComponent(token)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${provider.name} ответил ${response.status}`);
  const rawBook = await response.json();
  const rawAsks = platform === "kalshi"
    ? (Array.isArray(rawBook?.orderbook_fp?.no_dollars) ? rawBook.orderbook_fp.no_dollars : [])
        .map(level => ({ price: 1 - Number(level[0]), size: Number(level[1]) }))
    : platform === "predictfun"
      ? (() => {
          const book = rawBook?.data || rawBook;
          const precision = 10 ** Number(candidate.market.decimalPrecision || 2);
          const levels = predictOutcome === "no" ? book?.bids : book?.asks;
          return (Array.isArray(levels) ? levels : []).map(level => ({
            price: predictOutcome === "no" ? Math.round((1 - Number(level[0])) * precision) / precision : Number(level[0]),
            size: Number(level[1])
          }));
        })()
    : (Array.isArray(rawBook.asks) ? rawBook.asks : [])
        .map(level => ({ price: Number(level.price), size: Number(level.size) }));
  const asks = rawAsks
    .filter(level => Number.isFinite(level.price) && Number.isFinite(level.size) && level.size > 0)
    .sort((a, b) => a.price - b.price);
  if (!asks.length) throw new Error("Сейчас нет предложений на покупку противоположного исхода");
  return {
    ask: asks[0].price,
    size: asks[0].size,
    asks,
    timestamp: Number(platform === "predictfun" ? rawBook?.data?.updateTimestampMs : rawBook.timestamp) || Date.now(),
    receivedAt: Date.now(),
    token,
    outcome,
    platform,
    currency: provider.currency,
    feeMultiplier: Number(candidate.market.feeMultiplier || 1),
    feeRate: Number(candidate.market.feeRate || 0),
    minOrderSize: Number(rawBook.min_order_size || 0),
    tickSize: Number(rawBook.tick_size || 0)
  };
}

async function loadBookForSelection() {
  const event = currentEvent();
  const candidates = currentCandidates();
  const candidate = currentCandidate() || candidates[0];
  if (!candidate || !event || state.stage !== 4) {
    state.book = null;
    updateCalculation();
    return;
  }

  const side = currentSideIndex();
  const candidatesToLoad = state.rightPlatform === "auto" ? candidates : [candidate];
  const requestId = ++state.requestId;
  const previousBook = state.book;
  const previousCandidateId = state.candidateId;
  const silentRefresh = Boolean(previousBook && candidatesToLoad.some(item => {
    const hedgeIndex = candidateHedgeIndex(item, side);
    return hedgeIndex !== null && item.market.tokens[hedgeIndex] === previousBook.token;
  }));
  state.bookLoading = true;
  state.bookError = null;
  if (!silentRefresh) {
    state.book = null;
    renderTarget();
  }

  try {
    const settled = await Promise.allSettled(candidatesToLoad.map(async item => {
      const hedgeIndex = candidateHedgeIndex(item, side);
      if (hedgeIndex === null) throw new Error("Для выбранного исхода нет комплементарного рынка");
      const book = await fetchBookSnapshot(item, hedgeIndex, hedgeOutcomeLabel(item, event, side, hedgeIndex));
      return { candidate: item, book };
    }));
    if (requestId !== state.requestId) return;
    const available = settled.filter(result => result.status === "fulfilled").map(result => result.value);
    if (!available.length) {
      const rejected = settled.find(result => result.status === "rejected");
      throw rejected?.reason || new Error("Нет доступных предложений на второй стороне");
    }
    const odds = event.odds[side];
    available.sort((a, b) =>
      estimateLevelNetRoi(odds, b.book.ask, b.candidate.market.platform, b.book.feeMultiplier, b.book.feeRate, event.bookmaker) -
      estimateLevelNetRoi(odds, a.book.ask, a.candidate.market.platform, a.book.feeMultiplier, a.book.feeRate, event.bookmaker)
    );
    const best = available[0];
    state.candidateId = best.candidate.market.id;
    state.book = best.book;
    state.countdown = BOOK_REFRESH_SECONDS;
  } catch (error) {
    if (requestId !== state.requestId) return;
    if (silentRefresh) {
      state.book = previousBook;
    } else {
      state.bookError = error instanceof Error ? error.message : "Не удалось прочитать вторую площадку";
    }
  } finally {
    if (requestId === state.requestId) {
      state.bookLoading = false;
      if (silentRefresh && state.book && previousCandidateId === state.candidateId) {
        updateSelectedCandidatePrice();
        updateCalculation();
      } else {
        renderTarget();
        renderRules();
      }
    }
  }
}

function updateSelectedCandidatePrice() {
  const candidate = currentCandidate();
  if (!candidate || !state.book) return;
  const selectedCard = Array.from(el.results.querySelectorAll("[data-candidate]")).find(card => card.dataset.candidate === candidate.market.id);
  const price = selectedCard?.querySelector(".candidate-price");
  if (!price) return;
  price.innerHTML = `${Math.round(state.book.ask * 1000) / 10}¢ <small>ask · ${Number(state.book.size).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} шт.</small><span class="selected-check">${checkSvg}</span>`;
}

function updateFinderSourcePrice() {
  const event = currentEvent();
  if (!event || state.stage !== 4) return;
  const odds = el.stage.querySelector(".ticket-odds strong");
  if (odds) odds.textContent = event.odds[currentSideIndex()].toFixed(2);
}

function bookmakerFeeRate(bookmaker) {
  if (bookmaker === "leon") return state.leonFee;
  if (bookmaker === "fonbet") return state.fonbetFee;
  if (bookmaker === "zenit") return state.zenitFee;
  if (bookmaker === "pari") return state.pariFee;
  if (bookmaker === "betboom") return state.betboomFee;
  if (bookmaker === "ligastavok") return state.ligaStavokFee;
  if (bookmaker === "betcity") return state.betcityFee;
  return state.winlineFee;
}

function calculateExpenses({ winlineStakeBase, marketStakeBase, payoutBase, capitalUsed, platform, bookmaker, contracts, averagePrice, feeMultiplier = 1, feeRate = 0 }) {
  const conversion = marketStakeBase * state.conversionFee;
  const deposit = capitalUsed * state.depositFee;
  const withdrawal = payoutBase * state.withdrawalFee;
  const bookmakerCost = winlineStakeBase * bookmakerFeeRate(bookmaker);
  const platformFee = platform === "kalshi"
    ? marketToBase(Math.ceil(state.kalshiFeeRate * feeMultiplier * contracts * averagePrice * (1 - averagePrice) * 10000) / 10000, platform)
    : platform === "predictfun"
      ? marketToBase(contracts, platform) * feeRate
      : marketStakeBase * state.polymarketFee;
  const priceReserve = capitalUsed * state.priceMoveReserve;
  const total = conversion + deposit + withdrawal + bookmakerCost + platformFee + priceReserve;
  return { conversion, deposit, withdrawal, bookmakerCost, platformFee, priceReserve, total };
}

function calculateExecution(odds, capital, asks, platform = "polymarket", feeMultiplier = 1, feeRate = 0, bookmaker = "winline") {
  let contracts = 0;
  let marketStakeUnits = 0;
  let continuousCapital = 0;
  let levelsUsed = 0;
  const payoutPerContractBase = marketToBase(1, platform);

  for (const level of asks) {
    const costPerContract = payoutPerContractBase * (1 / odds + level.price);
    const remainingCapital = capital - continuousCapital;
    if (remainingCapital <= 0.000001) break;
    const fillSize = Math.min(level.size, remainingCapital / costPerContract);
    if (fillSize <= 0) continue;
    contracts += fillSize;
    marketStakeUnits += fillSize * level.price;
    continuousCapital += fillSize * costPerContract;
    levelsUsed += 1;
  }

  if (!contracts) return null;
  const rawWinlineStakeRub = marketToRub(contracts, platform) / odds;
  const rounding = Math.max(0.01, state.bookmakerRoundingRub);
  const winlineStakeRub = Math.max(rounding, Math.floor((rawWinlineStakeRub + 0.0000001) / rounding) * rounding);
  const winlineStakeBase = rubToBase(winlineStakeRub);
  const marketStakeBase = marketToBase(marketStakeUnits, platform);
  const capitalUsed = winlineStakeBase + marketStakeBase;
  const winlinePayoutBase = rubToBase(winlineStakeRub * odds);
  const marketPayoutBase = marketToBase(contracts, platform);
  const payout = Math.min(winlinePayoutBase, marketPayoutBase);
  const theoreticalPayout = marketPayoutBase;
  const theoreticalRoi = theoreticalPayout / continuousCapital - 1;
  const averagePrice = marketStakeUnits / contracts;
  const expenses = calculateExpenses({ winlineStakeBase, marketStakeBase, payoutBase: payout, capitalUsed, platform, bookmaker, contracts, averagePrice, feeMultiplier, feeRate });
  const netProfit = payout - capitalUsed - expenses.total;
  const netRoi = capitalUsed > 0 ? netProfit / capitalUsed : -1;
  const marketMinimumMet = platform === "kalshi"
    ? contracts >= state.kalshiMinContracts
    : platform === "predictfun"
      ? contracts > 0
      : marketStakeUnits >= state.polymarketMinOrderUsdc;
  return {
    payout,
    theoreticalPayout,
    winlineStakeRub,
    winlineStakeBase,
    marketStakeUnits,
    marketStakeBase,
    marketCurrency: platformInfo(platform).currency,
    platform,
    capitalUsed,
    continuousCapital,
    averagePrice,
    levelsUsed,
    complete: continuousCapital >= capital - 0.01,
    theoreticalRoi,
    netRoi,
    netProfit,
    expenses,
    contracts,
    marketMinimumMet,
    roundingDeltaBase: continuousCapital - capitalUsed
  };
}

function estimateLevelNetRoi(odds, price, platform = "polymarket", feeMultiplier = 1, feeRate = 0, bookmaker = "winline") {
  const combinedPrice = 1 / odds + price;
  const platformFee = platform === "kalshi"
    ? state.kalshiFeeRate * feeMultiplier * price * (1 - price)
    : platform === "predictfun"
      ? feeRate
      : price * state.polymarketFee;
  const variableExpenses =
    price * state.conversionFee +
    combinedPrice * state.depositFee +
    state.withdrawalFee +
    (1 / odds) * bookmakerFeeRate(bookmaker) +
    platformFee +
    combinedPrice * state.priceMoveReserve;
  return (1 - combinedPrice - variableExpenses) / combinedPrice;
}

function calculatePositiveCapacity(odds, asks, platform = "polymarket", feeMultiplier = 1, feeRate = 0, bookmaker = "winline") {
  let capital = 0;
  let contracts = 0;
  let marketStakeUnits = 0;
  let levels = 0;
  for (const level of asks) {
    const combinedPrice = 1 / odds + level.price;
    const netRoi = estimateLevelNetRoi(odds, level.price, platform, feeMultiplier, feeRate, bookmaker);
    if (netRoi < state.safetyBuffer) break;
    capital += marketToBase(level.size * combinedPrice, platform);
    contracts += level.size;
    marketStakeUnits += level.size * level.price;
    levels += 1;
  }
  const meetsMinimumOrder = platform === "kalshi"
    ? contracts >= state.kalshiMinContracts
    : platform === "predictfun"
      ? contracts > 0
      : marketStakeUnits >= state.polymarketMinOrderUsdc;
  return { capital, contracts, marketStakeUnits, levels, meetsMinimumOrder };
}

function opportunityMetrics(opportunity) {
  const platform = opportunity.candidate.market.platform;
  const feeMultiplier = opportunity.book.feeMultiplier || 1;
  const feeRate = opportunity.book.feeRate || 0;
  const depthCapital = opportunity.book.asks.reduce((sum, level) => sum + marketToBase(level.size * (1 / opportunity.odds + level.price), platform), 0);
  const referenceCapital = state.baseCurrency === "RUB" ? 10000 : 100;
  const execution = calculateExecution(opportunity.odds, Math.min(referenceCapital, depthCapital), opportunity.book.asks, platform, feeMultiplier, feeRate, opportunity.event.bookmaker);
  if (!execution) return null;
  const capacity = calculatePositiveCapacity(opportunity.odds, opportunity.book.asks, platform, feeMultiplier, feeRate, opportunity.event.bookmaker);
  return {
    execution,
    grossRoi: execution.theoreticalRoi,
    netRoi: execution.netRoi,
    costRate: execution.capitalUsed > 0 ? execution.expenses.total / execution.capitalUsed : 0,
    capacity,
    depthCapital
  };
}

function quoteAgeMs(book) {
  return Math.max(0, Date.now() - (Number(book?.receivedAt) || Number(book?.timestamp) || 0));
}

function pricingAgeMs(event, book) {
  const winlineAge = Math.max(0, Date.now() - (Number(event?.priceTimestamp) || 0));
  return Math.max(winlineAge, quoteAgeMs(book));
}

function opportunityAssessment(opportunity, metrics) {
  const stale = pricingAgeMs(opportunity.event, opportunity.book) > STALE_AFTER_MS;
  const eventMatched = opportunity.candidate.confidence >= 82;
  const cleanPositive = metrics.netRoi > 0;
  const thresholdPassed = metrics.netRoi >= state.safetyBuffer;
  const volumeConfirmed = metrics.execution.complete && metrics.execution.marketMinimumMet;
  const economicsConfirmed = thresholdPassed && volumeConfirmed;
  const executable = !stale && eventMatched && economicsConfirmed;
  let key = "pair";
  let label = cleanPositive ? "Ниже порога" : "Нет преимущества";
  if (stale) {
    key = "stale";
    label = "Цена ушла";
  } else if (executable) {
    key = "executable";
    label = "Возможность";
  } else if (thresholdPassed) {
    key = "potential";
    label = "Мало объёма";
  }
  return { key, label, stale, eventMatched, cleanPositive, thresholdPassed, volumeConfirmed, economicsConfirmed, executable };
}

function canonicalTeamKey(teams) {
  const normalized = (Array.isArray(teams) ? teams : []).map(normalizeName).filter(Boolean);
  return normalized.length === 2 ? normalized.slice().sort().join("::") : "";
}

function comparisonStatus(netRoi, stale = false) {
  if (stale) return { key: "stale", label: "ЦЕНА УШЛА" };
  if (netRoi >= state.safetyBuffer) return { key: "potential", label: "ВЫШЕ ПОРОГА" };
  if (netRoi > 0) return { key: "near", label: "ПЛЮС ДО ПОРОГА" };
  return { key: "miss", label: "НЕТ ПРЕИМУЩЕСТВА" };
}

function buildBookBookComparisons() {
  const groups = new Map();
  for (const event of data.bookmakerEvents) {
    if (event.lineType.toLowerCase() === "3-way odds") continue;
    if (!event.odds.every(value => Number.isFinite(value) && value > 1)) continue;
    const key = canonicalTeamKey(event.normalizedTeams);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }

  const bestByRoute = new Map();
  for (const [matchKey, events] of groups) {
    for (let firstIndex = 0; firstIndex < events.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < events.length; secondIndex += 1) {
        const first = events[firstIndex];
        const second = events[secondIndex];
        if (first.bookmaker === second.bookmaker) continue;
        const hoursApart = Math.abs(first.date - second.date) / 3600000;
        if (hoursApart > 2) continue;

        const direct = first.normalizedTeams[0] === second.normalizedTeams[0] && first.normalizedTeams[1] === second.normalizedTeams[1];
        const swapped = first.normalizedTeams[0] === second.normalizedTeams[1] && first.normalizedTeams[1] === second.normalizedTeams[0];
        if (!direct && !swapped) continue;
        const mapping = direct ? [0, 1] : [1, 0];

        let best = null;
        for (const firstSide of [0, 1]) {
          const secondSide = mapping[1 - firstSide];
          const firstOdds = Number(first.odds[firstSide]);
          const secondOdds = Number(second.odds[secondSide]);
          const firstCost = 100 / firstOdds;
          const secondCost = 100 / secondOdds;
          const spent = firstCost + secondCost;
          const expenses =
            firstCost * bookmakerFeeRate(first.bookmaker) +
            secondCost * bookmakerFeeRate(second.bookmaker) +
            spent * (state.depositFee + state.priceMoveReserve) +
            100 * state.withdrawalFee;
          const grossRoi = 100 / spent - 1;
          const netRoi = (100 - spent - expenses) / spent;
          const candidate = { firstSide, secondSide, firstOdds, secondOdds, firstCost, secondCost, spent, expenses, grossRoi, netRoi };
          if (!best || candidate.netRoi > best.netRoi) best = candidate;
        }
        if (!best) continue;

        const route = [first.bookmaker, second.bookmaker].sort().join(":");
        const timeBucket = Math.round((first.date.getTime() + second.date.getTime()) / (2 * 2 * 60 * 60 * 1000));
        const routeKey = `${matchKey}:${timeBucket}:${route}`;
        const comparison = {
          id: `book-book:${routeKey}`,
          type: "book-book",
          typeLabel: "БК ↔ БК",
          sportName: first.sportName,
          eventTitle: `${first.team1} — ${first.team2}`,
          date: first.date < second.date ? first.date : second.date,
          confidence: hoursApart <= 1 ? 100 : 92,
          hoursApart,
          payout: 100,
          spent: best.spent,
          expenses: best.expenses,
          grossRoi: best.grossRoi,
          netRoi: best.netRoi,
          updatedAt: data.lastSync?.getTime() || Date.now(),
          legs: [
            { kind: "bookmaker", source: first.bookmaker, outcome: first[`team${best.firstSide + 1}`], quote: best.firstOdds.toFixed(2), quoteLabel: "коэффициент", cost: best.firstCost, url: first.url },
            { kind: "bookmaker", source: second.bookmaker, outcome: second[`team${best.secondSide + 1}`], quote: best.secondOdds.toFixed(2), quoteLabel: "коэффициент", cost: best.secondCost, url: second.url }
          ]
        };
        const previous = bestByRoute.get(routeKey);
        if (!previous || comparison.netRoi > previous.netRoi) bestByRoute.set(routeKey, comparison);
      }
    }
  }
  return Array.from(bestByRoute.values()).sort((a, b) => b.netRoi - a.netRoi).slice(0, 36);
}

function predictionTeamOffers(market) {
  if (!Array.isArray(market?.matchTeams) || market.matchTeams.length !== 2) return new Map();
  const offers = new Map();
  if (market.marketKind === "binary-team") {
    const yesIndex = market.outcomes.findIndex(outcome => /^yes$/i.test(String(outcome)));
    const noIndex = market.outcomes.findIndex(outcome => /^no$/i.test(String(outcome)));
    const representedSide = Number(market.binaryTeamIndex);
    if (yesIndex < 0 || noIndex < 0 || ![0, 1].includes(representedSide)) return offers;
    const otherSide = 1 - representedSide;
    offers.set(market.matchTeams[representedSide], { price: Number(market.indicativePrices[yesIndex]), index: yesIndex });
    offers.set(market.matchTeams[otherSide], { price: Number(market.indicativePrices[noIndex]), index: noIndex });
    return offers;
  }
  for (const side of [0, 1]) offers.set(market.matchTeams[side], { price: Number(market.indicativePrices[side]), index: side });
  return offers;
}

function predictionPreviewFee(market, price) {
  if (market.platform === "kalshi") return state.kalshiFeeRate * Number(market.feeMultiplier || 1) * 100 * price * (1 - price);
  if (market.platform === "predictfun") return 100 * Number(market.feeRate || 0);
  return 100 * price * state.polymarketFee;
}

function buildPredictPredictComparisons() {
  const groups = new Map();
  for (const market of data.predictionMarkets) {
    const key = canonicalTeamKey(market.matchTeams);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { markets: [], displayNames: new Map() });
    const group = groups.get(key);
    group.markets.push(market);
    for (const side of [0, 1]) {
      const normalized = market.matchTeams[side];
      const display = String(market.displayTeams?.[side] || market.outcomes?.[side] || normalized).trim();
      if (!group.displayNames.has(normalized) || display.length > group.displayNames.get(normalized).length) group.displayNames.set(normalized, display);
    }
  }

  const bestByRoute = new Map();
  for (const [matchKey, group] of groups) {
    const teams = matchKey.split("::");
    for (let firstIndex = 0; firstIndex < group.markets.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < group.markets.length; secondIndex += 1) {
        const first = group.markets[firstIndex];
        const second = group.markets[secondIndex];
        if (first.platform === second.platform) continue;
        const hoursApart = Math.abs(first.start - second.start) / 3600000;
        if (hoursApart > 2) continue;
        const firstOffers = predictionTeamOffers(first);
        const secondOffers = predictionTeamOffers(second);

        let best = null;
        for (const [firstTeam, secondTeam] of [[teams[0], teams[1]], [teams[1], teams[0]]]) {
          const firstOffer = firstOffers.get(firstTeam);
          const secondOffer = secondOffers.get(secondTeam);
          if (!firstOffer || !secondOffer) continue;
          if (![firstOffer.price, secondOffer.price].every(price => Number.isFinite(price) && price > 0 && price < 1)) continue;
          const firstCost = 100 * firstOffer.price;
          const secondCost = 100 * secondOffer.price;
          const spent = firstCost + secondCost;
          const expenses =
            predictionPreviewFee(first, firstOffer.price) +
            predictionPreviewFee(second, secondOffer.price) +
            spent * (state.conversionFee + state.depositFee + state.priceMoveReserve) +
            100 * state.withdrawalFee;
          const grossRoi = 100 / spent - 1;
          const netRoi = (100 - spent - expenses) / spent;
          const candidate = { firstTeam, secondTeam, firstOffer, secondOffer, firstCost, secondCost, spent, expenses, grossRoi, netRoi };
          if (!best || candidate.netRoi > best.netRoi) best = candidate;
        }
        if (!best) continue;

        const route = [first.platform, second.platform].sort().join(":");
        const timeBucket = Math.round((first.start.getTime() + second.start.getTime()) / (2 * 2 * 60 * 60 * 1000));
        const routeKey = `${matchKey}:${timeBucket}:${route}`;
        const comparison = {
          id: `predict-predict:${routeKey}`,
          type: "predict-predict",
          typeLabel: "ПРЕДИКТ ↔ ПРЕДИКТ",
          sportName: "Prediction market",
          eventTitle: `${group.displayNames.get(teams[0]) || teams[0]} — ${group.displayNames.get(teams[1]) || teams[1]}`,
          date: first.start < second.start ? first.start : second.start,
          confidence: hoursApart <= 1 ? 100 : 92,
          hoursApart,
          payout: 100,
          spent: best.spent,
          expenses: best.expenses,
          grossRoi: best.grossRoi,
          netRoi: best.netRoi,
          updatedAt: data.lastSync?.getTime() || Date.now(),
          legs: [
            { kind: "prediction", source: first.platform, outcome: group.displayNames.get(best.firstTeam) || best.firstTeam, quote: `${(best.firstOffer.price * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}¢`, quoteLabel: "цена контракта", cost: best.firstCost, url: first.url },
            { kind: "prediction", source: second.platform, outcome: group.displayNames.get(best.secondTeam) || best.secondTeam, quote: `${(best.secondOffer.price * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}¢`, quoteLabel: "цена контракта", cost: best.secondCost, url: second.url }
          ]
        };
        const previous = bestByRoute.get(routeKey);
        if (!previous || comparison.netRoi > previous.netRoi) bestByRoute.set(routeKey, comparison);
      }
    }
  }
  return Array.from(bestByRoute.values()).sort((a, b) => b.netRoi - a.netRoi).slice(0, 36);
}

function rebuildCrossComparisons() {
  data.crossComparisons = [...buildBookBookComparisons(), ...buildPredictPredictComparisons()];
}

function formatAge(timestamp) {
  let normalized = Number(timestamp) || Date.now();
  if (normalized < 1000000000000) normalized *= 1000;
  const seconds = Math.max(0, Math.round((Date.now() - normalized) / 1000));
  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} мин. назад`;
}

function updateOpportunityAges() {
  document.querySelectorAll(".execution-age[data-received-at]").forEach(node => {
    node.textContent = `Цена: ${formatAge(node.dataset.receivedAt)}`;
  });
}

function formatCountdown(targetTime) {
  if (!Number.isFinite(targetTime)) return "—";
  const totalSeconds = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateRefreshTimers() {
  const dataCountdown = formatCountdown(state.nextDataRefreshAt);
  if (state.loadingData) {
    el.syncTime.textContent = "получаем свежие цены";
  } else if (state.dataError) {
    el.syncTime.textContent = `повтор через ${dataCountdown}`;
  } else if (data.lastSync) {
    const age = Date.now() - data.lastSync < 10000 ? "только что" : formatAge(data.lastSync);
    el.syncTime.textContent = `${age} · обновление через ${dataCountdown}`;
  }

  if (!el.opportunitiesCountdown) return;
  if (state.scanLoading) {
    el.opportunitiesCountdown.textContent = "Цены пар обновляются…";
  } else if (Number.isFinite(state.nextOpportunityRefreshAt)) {
    el.opportunitiesCountdown.textContent = `Цены пар через ${formatCountdown(state.nextOpportunityRefreshAt)}`;
  } else {
    el.opportunitiesCountdown.textContent = "Цены пар после загрузки";
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

function buildScanSeeds() {
  const seeds = [];
  const usedMarkets = new Set();
  for (const event of data.bookmakerEvents) {
    const bestByPlatform = new Map();
    for (const candidate of data.matchCache.get(event.id) || []) {
      const marketSourceKey = `${event.bookmaker}:${candidate.market.id}`;
      if (candidate.confidence < 82 || usedMarkets.has(marketSourceKey)) continue;
      for (const side of [0, 1]) {
        const hedgeIndex = candidateHedgeIndex(candidate, side);
        if (hedgeIndex === null) continue;
        const price = candidate.market.indicativePrices[hedgeIndex];
        if (!Number.isFinite(price)) continue;
        const combinedPrice = 1 / event.odds[side] + price;
        const previous = bestByPlatform.get(candidate.market.platform);
        if (!previous || combinedPrice < previous.combinedPrice) bestByPlatform.set(candidate.market.platform, { candidate, side, hedgeIndex, combinedPrice });
      }
    }
    for (const bestSide of bestByPlatform.values()) {
      usedMarkets.add(`${event.bookmaker}:${bestSide.candidate.market.id}`);
      seeds.push({
        event,
        candidate: bestSide.candidate,
        side: bestSide.side,
        hedgeIndex: bestSide.hedgeIndex,
        indicativeRoi: 1 / bestSide.combinedPrice - 1
      });
    }
  }

  const bySport = new Map();
  for (const seed of seeds) {
    const groupKey = `${seed.event.sportId}:${seed.candidate.market.platform}`;
    if (!bySport.has(groupKey)) bySport.set(groupKey, []);
    bySport.get(groupKey).push(seed);
  }
  const groups = Array.from(bySport.values()).map(group => group.sort((a, b) => b.indicativeRoi - a.indicativeRoi || b.candidate.confidence - a.candidate.confidence));
  groups.sort((a, b) => b[0].indicativeRoi - a[0].indicativeRoi);

  const balanced = [];
  for (let row = 0; balanced.length < MAX_SCANNED_PAIRS; row += 1) {
    let added = false;
    for (const group of groups) {
      if (!group[row]) continue;
      balanced.push(group[row]);
      added = true;
      if (balanced.length === MAX_SCANNED_PAIRS) break;
    }
    if (!added) break;
  }
  return balanced;
}

async function scanOpportunities() {
  if (state.scanLoading || state.dataError || !data.matchCache.size) return;
  const requestId = ++state.scanRequestId;
  const seeds = buildScanSeeds();
  const keepVisibleCards = data.opportunities.length > 0;
  state.scanLoading = true;
  state.scanError = null;
  if (keepVisibleCards) {
    el.refreshOpportunities.disabled = true;
    updateRefreshTimers();
  } else {
    renderOpportunities();
  }

  const snapshotRequests = new Map();
  const settled = await mapWithConcurrency(seeds, SCAN_CONCURRENCY, async seed => {
    const outcome = hedgeOutcomeLabel(seed.candidate, seed.event, seed.side, seed.hedgeIndex);
    const platform = seed.candidate.market.platform;
    const token = seed.candidate.market.tokens[seed.hedgeIndex];
    const snapshotKey = `${platform}:${token}`;
    if (!snapshotRequests.has(snapshotKey)) {
      snapshotRequests.set(snapshotKey, fetchBookSnapshot(seed.candidate, seed.hedgeIndex, outcome));
    }
    const snapshot = await snapshotRequests.get(snapshotKey);
    const book = { ...snapshot, outcome };
    return {
      id: `${seed.event.id}:${seed.candidate.market.id}:${seed.side}`,
      event: seed.event,
      candidate: seed.candidate,
      side: seed.side,
      hedgeIndex: seed.hedgeIndex,
      odds: seed.event.odds[seed.side],
      book
    };
  });

  if (requestId !== state.scanRequestId) return;
  data.opportunities = settled
    .filter(result => result.status === "fulfilled")
    .map(result => result.value)
    .sort((a, b) => (opportunityMetrics(b)?.netRoi ?? -Infinity) - (opportunityMetrics(a)?.netRoi ?? -Infinity));
  data.scanAt = new Date();
  state.nextOpportunityRefreshAt = Date.now() + OPPORTUNITY_REFRESH_MS;
  state.scanLoading = false;
  if (!data.opportunities.length) state.scanError = "Свежие предложения по найденным парам сейчас недоступны";
  renderOpportunities();
  renderWatch();
}

function sportCategoryName(value) {
  const key = normalizeName(value);
  const aliases = [
    [/настольн|table tennis|ping pong/, "Настольный теннис"],
    [/американск|american football|\bnfl\b/, "Американский футбол"],
    [/кибер|cyber|esport|e games|counter strike|dota|valorant|league of legends|rocket league/, "Киберспорт"],
    [/футзал|futsal|футбол|football|soccer/, "Футбол"],
    [/баскетбол|basketball/, "Баскетбол"],
    [/хоккей|ice hockey|hockey/, "Хоккей"],
    [/волейбол|volleyball/, "Волейбол"],
    [/бейсбол|baseball/, "Бейсбол"],
    [/бильярд|billiard|snooker/, "Бильярд"],
    [/дартс|darts/, "Дартс"],
    [/шахмат|chess/, "Шахматы"],
    [/велоспорт|cycling/, "Велоспорт"],
    [/гандбол|handball/, "Гандбол"],
    [/регби|rugby/, "Регби"],
    [/теннис|tennis/, "Теннис"],
    [/крикет|cricket/, "Крикет"],
    [/бокс|boxing|bare knuckle/, "Бокс"],
    [/единобор|mma|mixed martial/, "Единоборства"]
  ];
  return aliases.find(([pattern]) => pattern.test(key))?.[1] || String(value || "Другой спорт").trim();
}

function renderOpportunitySportOptions() {
  const modeHasClassic = ["all", "book-predict"].includes(state.comparisonMode);
  const modeHasBookmakers = ["all", "book-predict", "book-book"].includes(state.comparisonMode);
  const modeHasCross = ["all", "book-book", "predict-predict"].includes(state.comparisonMode);
  const relevantBookmakerEvents = modeHasBookmakers
    ? data.bookmakerEvents.filter(event => state.feedBookmaker === "all" || event.bookmaker === state.feedBookmaker)
    : [];
  const relevantClassic = modeHasClassic
    ? data.opportunities.filter(item =>
      (state.feedBookmaker === "all" || item.event.bookmaker === state.feedBookmaker)
      && (state.feedPlatform === "all" || item.candidate.market.platform === state.feedPlatform))
    : [];
  const relevantCross = modeHasCross
    ? data.crossComparisons.filter(item =>
      (state.comparisonMode === "all" || item.type === state.comparisonMode)
      && (state.feedBookmaker === "all" || item.legs.some(leg => leg.kind === "bookmaker" && leg.source === state.feedBookmaker))
      && (state.feedPlatform === "all" || item.legs.some(leg => leg.kind === "prediction" && leg.source === state.feedPlatform)))
    : [];
  const sportCounts = new Map();
  for (const item of relevantClassic) {
    const sport = sportCategoryName(item.event.sportName);
    sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
  }
  for (const item of relevantCross) {
    const sport = sportCategoryName(item.sportName);
    sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
  }
  const sportNames = Array.from(new Set([
    ...relevantBookmakerEvents.map(event => sportCategoryName(event.sportName)),
    ...relevantCross.map(item => sportCategoryName(item.sportName))
  ])).sort((a, b) => (sportCounts.get(b) || 0) - (sportCounts.get(a) || 0) || a.localeCompare(b));
  if (state.feedSport !== "all" && !sportNames.includes(state.feedSport)) state.feedSport = "all";
  el.opportunitySport.innerHTML = `<option value="all">Все виды · ${relevantClassic.length + relevantCross.length}</option>${sportNames.map(sport => `<option value="${escapeHtml(sport)}">${escapeHtml(sport)} · ${sportCounts.get(sport) || 0}</option>`).join("")}`;
  el.opportunitySport.value = state.feedSport;
  if (el.opportunityPlatform) el.opportunityPlatform.value = state.feedPlatform;
  if (el.opportunityBookmaker) el.opportunityBookmaker.value = state.feedBookmaker;
}

function updateComparisonModeUi() {
  const copy = {
    all: "Собираем лучшие сочетания среди всех подключённых площадок. Полный расчёт пока доступен для БК ↔ предикт.",
    "book-predict": "Букмекер против prediction market. Глубину второй площадки проверяем по реальным заявкам.",
    "predict-predict": "Покупаем противоположные исходы на двух prediction markets. Пока показываем предварительную цену из фидов.",
    "book-book": "Ставим на противоположные исходы у двух букмекеров. Пока показываем расчёт цены без подтверждения лимитов."
  };
  document.querySelectorAll("[data-comparison-mode]").forEach(button => {
    const active = button.dataset.comparisonMode === state.comparisonMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const description = document.querySelector("#comparison-mode-copy");
  if (description) description.textContent = copy[state.comparisonMode] || copy.all;
  const bookmakerFilter = document.querySelector("[data-bookmaker-filter]");
  const predictionFilter = document.querySelector("[data-prediction-filter]");
  if (bookmakerFilter) bookmakerFilter.hidden = state.comparisonMode === "predict-predict";
  if (predictionFilter) predictionFilter.hidden = state.comparisonMode === "book-book";
  const feedHead = document.querySelector("#feed-head");
  if (feedHead) feedHead.hidden = state.comparisonMode !== "book-predict";
  const controls = document.querySelector(".scanner-controls");
  if (controls) controls.dataset.comparisonLayout = state.comparisonMode;
}

function comparisonSourceInfo(leg) {
  return leg.kind === "bookmaker" ? bookmakerInfo(leg.source) : platformInfo(leg.source);
}

function comparisonAmount(value, type) {
  const suffix = type === "book-book" ? "₽" : "$";
  return `${Number(value).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${suffix}`;
}

function comparisonCard(comparison, isDemo = false) {
  const stale = !isDemo && Date.now() - Number(comparison.updatedAt || 0) > STALE_AFTER_MS;
  const status = isDemo ? { key: "demo", label: "ДЕМО ИНТЕРФЕЙСА" } : comparisonStatus(comparison.netRoi, stale);
  const typeNote = comparison.type === "book-book"
    ? "Лимиты ставок и правила расчёта ещё не подтверждены"
    : "Доступный объём и правила двух prediction markets ещё не подтверждены";
  const currencyName = comparison.type === "book-book" ? "рублях" : "долларовом эквиваленте";
  const legMarkup = comparison.legs.map((leg, index) => {
    const source = comparisonSourceInfo(leg);
    return `
      <a class="comparison-leg" href="${escapeHtml(leg.url || source.fallbackUrl)}" target="_blank" rel="noreferrer">
        <span class="comparison-logo is-${escapeHtml(leg.source)}"><img src="${escapeHtml(source.logo)}" alt=""></span>
        <span class="comparison-leg-copy">
          <small>СТОРОНА ${String(index + 1).padStart(2, "0")} · ${escapeHtml(source.name)}</small>
          <strong>${escapeHtml(leg.outcome)}</strong>
          <span>${escapeHtml(leg.quoteLabel)} <b>${escapeHtml(leg.quote)}</b></span>
        </span>
        <span class="comparison-leg-cost"><small>Чтобы получить 100</small><strong>${comparisonAmount(leg.cost, comparison.type)}</strong></span>
      </a>`;
  }).join('<span class="comparison-plus" aria-hidden="true">+</span>');
  return `
    <article class="cross-comparison-card${isDemo ? " is-demo" : ""}">
      <div class="comparison-summary">
        <span class="comparison-status is-${status.key}">${status.label}</span>
        <strong class="comparison-roi${comparison.netRoi <= 0 ? " is-negative" : ""}">${formatPercent(comparison.netRoi)}</strong>
        <small>после заданных вычетов</small>
      </div>
      <div class="comparison-main">
        <span class="comparison-meta">${escapeHtml(comparison.typeLabel)} · ${isDemo ? "НЕ РЫНОЧНЫЕ ДАННЫЕ" : `${escapeHtml(comparison.sportName)} · ${escapeHtml(formatEventTime(comparison.date))}`}</span>
        <h3>${escapeHtml(comparison.eventTitle)}</h3>
        <div class="comparison-route">${legMarkup}</div>
        <div class="comparison-payoff" aria-label="Как получен результат">
          <span><small>Платим</small><strong>${comparisonAmount(comparison.spent, comparison.type)}</strong></span>
          <i aria-hidden="true">→</i>
          <span><small>Получаем при любом исходе</small><strong>${comparisonAmount(comparison.payout, comparison.type)}</strong></span>
          <i aria-hidden="true">→</i>
          <span class="comparison-payoff-result"><small>До вычетов</small><strong>${formatPercent(comparison.grossRoi)}</strong></span>
        </div>
      </div>
      <div class="comparison-verification">
        <span class="trust-signal is-ok"><i>✓</i><span><strong>Событие сошлось</strong><small>${comparison.confidence}% · время Δ ${Math.round(comparison.hoursApart * 60)} мин.</small></span></span>
        <span class="trust-signal is-warn"><i>!</i><span><strong>${isDemo ? "Так будет выглядеть пара" : "Предварительный расчёт"}</strong><small>${isDemo ? "Ждём реальные совпавшие рынки" : typeNote}</small></span></span>
        <details class="comparison-details"><summary>Почему предварительно</summary><p>Суммы нормализованы к выплате 100 в ${currencyName}. Перед действием нужно проверить доступный объём, лимиты, комиссии и одинаковые правила исхода.</p></details>
      </div>
    </article>`;
}

function demoComparison(type) {
  if (type === "book-book") {
    const firstOdds = 2.12;
    const secondOdds = 2.10;
    const firstCost = 100 / firstOdds;
    const secondCost = 100 / secondOdds;
    const spent = firstCost + secondCost;
    const expenses = spent * state.priceMoveReserve;
    return {
      id: "demo:book-book", type, typeLabel: "БК ↔ БК", sportName: "Демо", eventTitle: "Team Alpha — Team Beta", date: new Date(), confidence: 100, hoursApart: 0,
      payout: 100, spent, expenses, grossRoi: 100 / spent - 1, netRoi: (100 - spent - expenses) / spent,
      legs: [
        { kind: "bookmaker", source: "winline", outcome: "Team Alpha", quote: firstOdds.toFixed(2), quoteLabel: "коэффициент", cost: firstCost, url: "https://winline.ru" },
        { kind: "bookmaker", source: "betboom", outcome: "Team Beta", quote: secondOdds.toFixed(2), quoteLabel: "коэффициент", cost: secondCost, url: "https://betboom.ru/sport" }
      ]
    };
  }
  const firstPrice = 0.47;
  const secondPrice = 0.48;
  const spent = (firstPrice + secondPrice) * 100;
  const expenses = predictionPreviewFee({ platform: "polymarket" }, firstPrice)
    + predictionPreviewFee({ platform: "kalshi", feeMultiplier: 1 }, secondPrice)
    + spent * (state.conversionFee + state.priceMoveReserve);
  return {
    id: "demo:predict-predict", type: "predict-predict", typeLabel: "ПРЕДИКТ ↔ ПРЕДИКТ", sportName: "Демо", eventTitle: "Team Alpha — Team Beta", date: new Date(), confidence: 100, hoursApart: 0,
    payout: 100, spent, expenses, grossRoi: 100 / spent - 1, netRoi: (100 - spent - expenses) / spent,
    legs: [
      { kind: "prediction", source: "polymarket", outcome: "Team Alpha", quote: "47¢", quoteLabel: "цена контракта", cost: 47, url: "https://polymarket.com" },
      { kind: "prediction", source: "kalshi", outcome: "Team Beta", quote: "48¢", quoteLabel: "цена контракта", cost: 48, url: "https://kalshi.com/markets" }
    ]
  };
}

function opportunityCard(opportunity, metrics) {
  const provider = platformInfo(opportunity.candidate.market.platform);
  const bookmaker = bookmakerInfo(opportunity.event.bookmaker);
  const marketLegLabel = opportunity.candidate.market.platform === "kalshi" ? "" : `${provider.name}: `;
  const assessment = opportunityAssessment(opportunity, metrics);
  const netClass = assessment.stale ? "is-stale" : assessment.thresholdPassed ? "is-positive" : metrics.netRoi > 0 ? "is-near" : "";
  const netPercent = formatPercent(metrics.netRoi);
  const grossPercent = formatPercent(metrics.grossRoi);
  const expensePercent = `${(metrics.costRate * 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const executionLimited = assessment.stale || !assessment.volumeConfirmed;
  const executionTitle = assessment.stale
    ? "Нужно обновить цену"
    : !metrics.execution.marketMinimumMet
      ? "Ордер слишком мал"
      : metrics.execution.complete
        ? `На ${formatMoney(metrics.execution.capitalUsed)}`
        : `До ${formatMoney(metrics.execution.capitalUsed)}`;
  const executionCopy = !metrics.execution.marketMinimumMet
    ? (opportunity.candidate.market.platform === "kalshi" ? `Минимум ${state.kalshiMinContracts} контракт` : `Минимум ${formatMoney(state.polymarketMinOrderUsdc, "USDC")}`)
    : metrics.execution.complete
      ? "Объёма хватает"
      : "На рынке не хватает объёма";
  const timeDifference = Math.round(opportunity.candidate.hoursApart * 60);
  const averagePrice = metrics.execution.averagePrice;
  const breakEvenPrice = 1 - 1 / opportunity.odds;
  const priceGap = averagePrice - breakEvenPrice;
  const combinedPrice = 1 / opportunity.odds + averagePrice;
  const meterPosition = Math.max(0, Math.min(100, ((combinedPrice - 0.96) / 0.08) * 100));
  const meterClass = combinedPrice < 1 ? "is-edge" : "is-miss";
  const meterCopy = combinedPrice < 1
    ? `Зазор ${(Math.abs(priceGap) * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}¢`
    : `До вилки не хватает ${(priceGap * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}¢`;
  const economyText = assessment.stale
    ? "Расчёт остановлен"
    : assessment.economicsConfirmed
      ? "Математика сошлась"
      : assessment.cleanPositive
        ? "Ниже порога"
        : "Нет преимущества";
  const economyDetail = assessment.stale
    ? "Нужна свежая котировка"
    : assessment.economicsConfirmed
      ? `${netPercent} чистыми · порог ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
      : assessment.cleanPositive
        ? `${netPercent} < ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`
        : `${netPercent} после вычетов`;
  const isWatching = state.watchIds.has(opportunity.id);
  return `
    <article class="opportunity-card">
      <span class="opp-return ${netClass}">
        <span class="opp-status is-${assessment.key}">${assessment.label}</span>
        <strong>${netPercent}</strong>
        <small>теория ${grossPercent} · комиссии + резерв ${expensePercent}</small>
      </span>
      <span class="opp-event">
        <span class="opp-market-meta">${escapeHtml(opportunity.event.sportName)} · ${escapeHtml(formatEventTime(opportunity.event.date))}</span>
        <h3>${escapeHtml(opportunity.event.team1)} — ${escapeHtml(opportunity.event.team2)}</h3>
        <span class="opp-legs">
          <span class="opp-leg"><span class="opp-source-dot w${bookmakerLogoClass(opportunity.event.bookmaker)}" aria-hidden="true"><img src="${bookmaker.logo}" alt=""></span> ${bookmaker.name}: ${escapeHtml(opportunity.event[`team${opportunity.side + 1}`])} <b>${opportunity.odds.toFixed(2)}</b></span>
          <span class="opp-leg"><span class="opp-source-dot p${opportunity.candidate.market.platform === "kalshi" ? " is-kalshi" : ""}" aria-hidden="true"><img src="${provider.logo}" alt=""></span> ${marketLegLabel}${escapeHtml(opportunity.book.outcome)} <b>${Math.round(opportunity.book.ask * 1000) / 10}¢</b></span>
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
        <span class="execution-age" data-received-at="${Number(opportunity.book.receivedAt) || Date.now()}">Цена: ${formatAge(opportunity.book.receivedAt)}</span>
      </span>
      <span class="opp-check trust-stack">
        <span class="trust-signal is-ok"><i>✓</i><span><strong>Событие сошлось</strong><small>Команды · ${timeDifference === 0 ? "время совпало" : `время Δ ${timeDifference} мин.`}</small></span></span>
        <span class="trust-signal ${assessment.stale ? "is-blocked" : assessment.economicsConfirmed ? "is-ok" : "is-neutral"}"><i>${assessment.stale ? "×" : assessment.economicsConfirmed ? "✓" : "—"}</i><span><strong>${economyText}</strong><small>${economyDetail}</small></span></span>
        <span class="trust-signal is-warn"><i>!</i><span><strong>Проверь правила исхода</strong><small>Убедись, что обе площадки рассчитывают победителя одинаково</small></span></span>
        <span class="opp-card-actions">
          <button class="opp-open" type="button" data-open-opportunity="${escapeHtml(opportunity.id)}">Открыть расчёт</button>
          <button class="opp-watch${isWatching ? " is-watching" : ""}" type="button" data-watch-opportunity="${escapeHtml(opportunity.id)}">${isWatching ? "✓ В наблюдении" : "+ В наблюдение"}</button>
        </span>
      </span>
    </article>`;
}

function renderOpportunities() {
  if (!el.opportunityList) return;
  updateComparisonModeUi();
  const modeHasClassic = ["all", "book-predict"].includes(state.comparisonMode);
  const modeHasCross = ["all", "book-book", "predict-predict"].includes(state.comparisonMode);
  const relevantCross = modeHasCross
    ? data.crossComparisons.filter(comparison => state.comparisonMode === "all" || comparison.type === state.comparisonMode)
    : [];
  const hasVisibleSource = (modeHasClassic && data.opportunities.length > 0) || relevantCross.length > 0;
  el.refreshOpportunities.disabled = state.loadingData || state.scanLoading;
  if (state.loadingData && !hasVisibleSource) {
    el.opportunityList.innerHTML = `<div class="scanner-loading"><p><span class="spinner"></span><strong>Сводим рынки</strong>Читаем линии. Без догадок и старых цен.</p></div>`;
    return;
  }
  if (state.dataError) {
    el.opportunityList.innerHTML = errorMarkup(state.dataError);
    return;
  }
  if (state.scanLoading && modeHasClassic && !hasVisibleSource) {
    el.opportunityList.innerHTML = `<div class="scanner-loading"><p><span class="spinner"></span><strong>Проверяем доступный объём</strong>Считаем цену на реальных заявках, а не по одной красивой цифре.</p></div>`;
    return;
  }
  if (state.scanError && state.comparisonMode === "book-predict") {
    el.opportunityList.innerHTML = `<div class="scanner-empty"><p><strong>Prediction markets не отдали свежие цены</strong>${escapeHtml(state.scanError)}. Старые данные не показываем.</p></div>`;
    return;
  }

  renderOpportunitySportOptions();
  const decorated = (modeHasClassic ? data.opportunities : [])
    .map(opportunity => {
      const metrics = opportunityMetrics(opportunity);
      return metrics ? { opportunity, metrics, assessment: opportunityAssessment(opportunity, metrics) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.metrics.netRoi - a.metrics.netRoi);
  const crossDecorated = relevantCross.map(comparison => {
    const stale = Date.now() - Number(comparison.updatedAt || 0) > STALE_AFTER_MS;
    return { comparison, status: comparisonStatus(comparison.netRoi, stale), stale };
  });
  const activeCount = decorated.filter(item => item.assessment.executable).length;
  const thresholdCount = decorated.filter(item => !item.assessment.stale && item.assessment.thresholdPassed).length
    + crossDecorated.filter(item => item.status.key === "potential").length;
  const pairCount = decorated.length + crossDecorated.length;
  const eventKeys = new Set([
    ...decorated.map(item => `${canonicalTeamKey(item.opportunity.event.normalizedTeams) || item.opportunity.event.id}:${Math.round(item.opportunity.event.date.getTime() / 7200000)}`),
    ...crossDecorated.map(item => `${normalizeName(item.comparison.eventTitle)}:${Math.round(item.comparison.date.getTime() / 7200000)}`)
  ]);
  document.querySelectorAll("[data-radar-count]").forEach(node => { node.textContent = String(pairCount); });
  el.scannerArbCount.textContent = String(activeCount);
  el.scannerPotentialCount.textContent = String(thresholdCount);
  el.scannerMatchCount.textContent = String(eventKeys.size);
  el.scannerBookCount.textContent = String(pairCount);
  const scannerVerdict = document.querySelector("#scanner-verdict");
  const scannerFunnel = document.querySelector("#scanner-funnel");
  if (scannerVerdict) {
    scannerVerdict.textContent = activeCount > 0
      ? `Ценовых возможностей: ${activeCount}. Перед ставкой проверь одинаковый расчёт исхода.`
      : thresholdCount > 0
        ? `Выше порога: ${thresholdCount}. Для готовой возможности пока не хватает подтверждённого объёма.`
        : relevantCross.length > 0
          ? "Пары найдены, но преимущества после комиссий и резерва сейчас нет."
          : "Совпавших рынков этого типа пока нет.";
  }
  if (scannerFunnel) {
    scannerFunnel.textContent = `${eventKeys.size} событий → ${pairCount} цен проверено → ${activeCount} возможностей`;
  }

  const filteredClassic = decorated.filter(item => {
    if (state.feedSport !== "all" && sportCategoryName(item.opportunity.event.sportName) !== state.feedSport) return false;
    if (state.feedBookmaker !== "all" && item.opportunity.event.bookmaker !== state.feedBookmaker) return false;
    if (state.feedPlatform !== "all" && item.opportunity.candidate.market.platform !== state.feedPlatform) return false;
    if (state.feedFilter === "potential" && (!item.assessment.thresholdPassed || item.assessment.stale)) return false;
    if (state.feedFilter === "executable" && !item.assessment.executable) return false;
    if (state.feedFilter === "stale" && !item.assessment.stale) return false;
    return true;
  });
  const filteredCross = crossDecorated.filter(item => {
    const comparison = item.comparison;
    if (state.feedSport !== "all" && sportCategoryName(comparison.sportName) !== state.feedSport) return false;
    if (state.feedBookmaker !== "all" && !comparison.legs.some(leg => leg.kind === "bookmaker" && leg.source === state.feedBookmaker)) return false;
    if (state.feedPlatform !== "all" && !comparison.legs.some(leg => leg.kind === "prediction" && leg.source === state.feedPlatform)) return false;
    if (state.feedFilter === "executable") return false;
    if (state.feedFilter === "potential" && item.status.key !== "potential") return false;
    if (state.feedFilter === "stale" && !item.stale) return false;
    return true;
  });
  const filtered = [
    ...filteredClassic.map(item => ({ kind: "classic", score: item.metrics.netRoi, item })),
    ...filteredCross.map(item => ({ kind: "cross", score: item.comparison.netRoi, item }))
  ].sort((a, b) => b.score - a.score);

  if (!filtered.length) {
    const canShowDemo = ["book-book", "predict-predict"].includes(state.comparisonMode)
      && relevantCross.length === 0
      && state.feedFilter === "all"
      && state.feedSport === "all"
      && state.feedBookmaker === "all"
      && state.feedPlatform === "all";
    if (canShowDemo) {
      el.opportunityList.innerHTML = comparisonCard(demoComparison(state.comparisonMode), true);
      return;
    }
    const messages = {
      executable: "Сейчас нет пары, где одновременно сошлись свежая цена, доступный объём и заданный порог.",
      potential: "Сейчас нет пар с чистым результатом выше заданного порога.",
      stale: "Все прочитанные цены пока актуальны."
    };
    const message = messages[state.feedFilter] || "Этот фильтр не оставил ни одного расчёта.";
    el.opportunityList.innerHTML = `<div class="scanner-empty"><p><strong>${state.feedFilter === "stale" ? "Ушедших цен нет" : "Здесь пока пусто"}</strong>${message}<br><button class="empty-reset" type="button" data-reset-filters>Показать все расчёты</button></p></div>`;
    return;
  }
  el.opportunityList.innerHTML = filtered.map(row => row.kind === "classic"
    ? opportunityCard(row.item.opportunity, row.item.metrics)
    : comparisonCard(row.item.comparison)).join("");
}

function renderWatch() {
  if (!el.watchContent) return;
  const available = new Map(data.watchSnapshots);
  data.opportunities.forEach(item => available.set(item.id, item));
  const watched = Array.from(available.values())
    .filter(item => state.watchIds.has(item.id))
    .map(opportunity => {
      const metrics = opportunityMetrics(opportunity);
      return metrics ? { opportunity, metrics, assessment: opportunityAssessment(opportunity, metrics) } : null;
    })
    .filter(Boolean);

  if (!watched.length) {
    el.watchContent.innerHTML = `
      <div class="watch-card">
        <span class="watch-index">00</span>
        <div><h1 id="watch-title">Пока ничего не добавлено.</h1><p>На карточке события нажми «+ В наблюдение». Сохранённые пары появятся здесь.</p></div>
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
            <span class="watch-item-meta">${escapeHtml(opportunity.event.sportName)} · ${escapeHtml(formatEventTime(opportunity.event.date))} · ${assessment.label}</span>
            <h2>${escapeHtml(opportunity.event.team1)} — ${escapeHtml(opportunity.event.team2)}</h2>
            <p>${formatPercent(metrics.netRoi)} чистыми · ${bookmakerInfo(opportunity.event.bookmaker).name} ${opportunity.odds.toFixed(2)} · ${platformInfo(opportunity.candidate.market.platform).name} ${Math.round(opportunity.book.ask * 1000) / 10}¢</p>
          </div>
          <div class="watch-item-actions">
            <button class="watch-open" type="button" data-open-opportunity="${escapeHtml(opportunity.id)}">Открыть расчёт</button>
            <button type="button" data-unwatch="${escapeHtml(opportunity.id)}">Убрать</button>
          </div>
        </article>`).join("")}
    </div>`;
}

function toggleCurrentWatch() {
  const id = currentOpportunityId();
  if (!id) {
    showToast("Эта пара ещё не попала в радар. Сначала обнови цены");
    return;
  }
  toggleWatchById(id, currentOpportunity());
}

function toggleWatchById(id, opportunity = null) {
  if (state.watchIds.has(id)) {
    state.watchIds.delete(id);
    showToast("Пара убрана из наблюдения");
  } else {
    const resolvedOpportunity = opportunity || data.opportunities.find(item => item.id === id) || data.watchSnapshots.get(id);
    if (!resolvedOpportunity) {
      showToast("Сначала дождись свежей цены");
      return;
    }
    data.watchSnapshots.set(id, resolvedOpportunity);
    state.watchIds.add(id);
    showToast("Добавлено в наблюдение");
  }
  persistWatchIds();
  renderWatch();
  renderOpportunities();
  if (state.activeView === "finder") renderTarget();
}

function updateCalculation() {
  const event = currentEvent();
  const candidate = currentCandidate();
  if (!event || !candidate || !state.book) return;

  const side = currentSideIndex();
  const odds = event.odds[side];
  const platform = candidate.market.platform;
  const provider = platformInfo(platform);
  const bookmaker = bookmakerInfo(event.bookmaker);
  const execution = calculateExecution(odds, state.capital, state.book.asks, platform, state.book.feeMultiplier || 1, state.book.feeRate || 0, event.bookmaker);
  if (!execution) return;
  const {
    payout,
    theoreticalPayout,
    winlineStakeRub,
    marketStakeUnits,
    marketCurrency,
    capitalUsed,
    continuousCapital,
    averagePrice,
    levelsUsed,
    complete,
    theoreticalRoi,
    netRoi,
    netProfit,
    expenses,
    contracts,
    marketMinimumMet
  } = execution;
  const theoreticalProfit = theoreticalPayout - continuousCapital;
  const stale = pricingAgeMs(event, state.book) > STALE_AFTER_MS;
  const safetyPassed = netRoi >= state.safetyBuffer;
  const economicsConfirmed = safetyPassed && marketMinimumMet;
  const timeDifference = Math.round(candidate.hoursApart * 60);
  const executionFriction = theoreticalProfit - netProfit - expenses.total;
  const deductionsTotal = theoreticalProfit - netProfit;

  el.arbTitle.textContent = stale
    ? "Цена ушла. Расчёт остановлен"
    : economicsConfirmed
      ? (complete ? "Ценовая возможность" : "Выше порога. Объём ограничен")
      : netRoi > 0
        ? "Ниже порога"
        : "Преимущества нет";
  document.querySelector("#left-outcome").textContent = event[`team${side + 1}`];
  document.querySelector("#right-outcome").textContent = state.book.outcome;
  const leftGlyph = document.querySelector("#calc-left-glyph");
  leftGlyph.classList.toggle("is-fonbet", event.bookmaker === "fonbet");
  leftGlyph.classList.toggle("is-pari", event.bookmaker === "pari");
  leftGlyph.classList.toggle("is-betboom", event.bookmaker === "betboom");
  leftGlyph.classList.toggle("is-ligastavok", event.bookmaker === "ligastavok");
  leftGlyph.classList.toggle("is-betcity", event.bookmaker === "betcity");
  leftGlyph.querySelector("img").src = bookmaker.logo;
  const leftName = document.querySelector("#calc-left-name");
  if (leftName.firstChild) leftName.firstChild.nodeValue = bookmaker.name;
  document.querySelector("#formula-bookmaker-name").textContent = bookmaker.name;
  document.querySelector("#left-odds").textContent = odds.toFixed(2);
  document.querySelector("#right-price").textContent = `${Math.round(averagePrice * 1000) / 10}¢`;
  document.querySelector("#left-stake").textContent = formatMoney(winlineStakeRub, "RUB");
  document.querySelector("#right-stake").textContent = formatMoney(marketToBase(marketStakeUnits, platform));
  const rightStakeSecondary = document.querySelector("#right-stake-secondary");
  rightStakeSecondary.textContent = formatMoney(marketStakeUnits, marketCurrency);
  rightStakeSecondary.hidden = state.baseCurrency === marketCurrency;
  const rightGlyph = document.querySelector("#calc-right-glyph");
  rightGlyph.hidden = false;
  rightGlyph.classList.toggle("platform-glyph--k", platform === "kalshi");
  rightGlyph.querySelector("img").src = provider.logoDark || provider.logo;
  rightGlyph.querySelector("img").alt = platform === "kalshi" ? "Kalshi" : "";
  const rightName = document.querySelector("#calc-right-name");
  if (rightName.firstChild) rightName.firstChild.nodeValue = platform === "kalshi" ? "" : provider.name;
  document.querySelector("#formula-market-name").textContent = provider.name;
  el.allocationHelp.innerHTML = `<strong>Распределяем ${formatMoney(capitalUsed)}</strong><span>Суммы разные, потому что одинаковая будущая выплата на площадках стоит по-разному.</span>`;
  document.querySelector("#equal-payout").textContent = formatMoney(payout);
  const winlinePayoutRub = winlineStakeRub * odds;
  document.querySelector("#left-equation").textContent = `${formatMoney(winlineStakeRub, "RUB")} × ${odds.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${formatMoney(winlinePayoutRub, "RUB")} выплаты`;
  document.querySelector("#right-equation").textContent = `${formatExactMoney(marketStakeUnits, marketCurrency)} → ${formatExactMoney(contracts, marketCurrency)} выплаты при победе`;

  const examplePayout = 100;
  const winlineExampleCost = examplePayout / odds;
  const marketExampleCost = examplePayout * averagePrice;
  const exampleSpent = winlineExampleCost + marketExampleCost;
  const exampleDifference = examplePayout - exampleSpent;
  const exampleRoi = exampleDifference / exampleSpent;
  const examplePayoutText = formatExactMoney(examplePayout);
  document.querySelector("#formula-roi").textContent = formatPercent(exampleRoi);
  document.querySelector("#formula-roi").classList.toggle("is-negative", exampleRoi <= 0);
  document.querySelector("#formula-intro").textContent = `Считаем, сколько нужно заплатить на каждой площадке, чтобы один из исходов вернул ${examplePayoutText}.`;
  document.querySelector("#formula-winline-cost").textContent = formatExactMoney(winlineExampleCost);
  document.querySelector("#formula-winline-operation").textContent = `${examplePayoutText} ÷ коэффициент ${odds.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.querySelector("#formula-polymarket-cost").textContent = formatExactMoney(marketExampleCost);
  document.querySelector("#formula-polymarket-operation").textContent = `${examplePayoutText} × цена ${formatDecimal(averagePrice)}`;
  document.querySelector("#formula-spent").textContent = formatExactMoney(exampleSpent);
  document.querySelector("#formula-received").textContent = examplePayoutText;
  document.querySelector("#formula-difference").textContent = `${exampleDifference >= 0 ? "+" : ""}${formatExactMoney(exampleDifference)}`;
  document.querySelector("#formula-difference").classList.toggle("is-negative", exampleDifference <= 0);
  document.querySelector("#formula-result").textContent = `${formatExactMoney(exampleDifference)} ÷ ${formatExactMoney(exampleSpent)} × 100 = ${formatPercent(exampleRoi)} до вычетов. Комиссии, резерв цены и округление показаны справа отдельно.`;
  document.querySelector("#profit-percent").textContent = formatPercent(theoreticalRoi);
  document.querySelector("#profit-percent").classList.toggle("is-negative", theoreticalRoi <= 0);
  document.querySelector("#profit-money").textContent = `${theoreticalProfit >= 0 ? "+" : ""}${formatMoney(theoreticalProfit)} по текущим ценам`;
  document.querySelector("#net-profit-percent").textContent = formatPercent(netRoi);
  document.querySelector("#net-profit-percent").classList.toggle("is-negative", netRoi <= 0);
  document.querySelector("#net-profit-percent").classList.toggle("is-below-buffer", netRoi > 0 && !safetyPassed);
  document.querySelector("#net-profit-money").textContent = `${netProfit >= 0 ? "+" : ""}${formatMoney(netProfit)} после вычетов`;
  document.querySelector("#dialog-profit").textContent = `${netProfit >= 0 ? "+" : ""}${formatMoney(netProfit)}`;
  document.querySelector("#dialog-profit").classList.toggle("is-negative", netProfit <= 0);
  el.resultExplanation.textContent = stale
    ? "Цены устарели — принимать решение по этому расчёту нельзя."
    : netRoi < 0
      ? "Это не вилка: расчёт показывает убыток независимо от победителя."
      : safetyPassed
        ? "После всех вычетов результат выше порога сервиса. Сам порог не вычитается: это только фильтр интересных пар."
        : "Результат положительный, но ниже порога сервиса. Порог не вычитается из прибыли.";
  const formatDeduction = value => `${value > 0.0001 ? "−" : value < -0.0001 ? "+" : ""}${formatMoney(Math.abs(value))}`;
  document.querySelector("#expense-total").textContent = formatDeduction(deductionsTotal);
  document.querySelector("#expense-breakdown").innerHTML = `
    <div><dt>Конвертация в ${escapeHtml(marketCurrency)}</dt><dd>${formatDeduction(expenses.conversion)}</dd></div>
    <div><dt>Комиссии ${escapeHtml(bookmaker.name)} + ${escapeHtml(provider.name)}</dt><dd>${formatDeduction(expenses.bookmakerCost + expenses.platformFee)}</dd></div>
    <div><dt>Ввод и вывод</dt><dd>${formatDeduction(expenses.deposit + expenses.withdrawal)}</dd></div>
    <div><dt>Резерв движения цены</dt><dd>${formatDeduction(expenses.priceReserve)}</dd></div>
    <div><dt>Округление ставки</dt><dd>${formatDeduction(executionFriction)}</dd></div>`;
  const thresholdPercent = (state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  const safetyChip = document.querySelector("#safety-chip");
  safetyChip.classList.toggle("is-passed", safetyPassed);
  safetyChip.innerHTML = `<span>Порог сервиса ${thresholdPercent}%</span><strong>${safetyPassed ? "Пройден" : "Не пройден"}</strong><small>Не вычитается из результата</small>`;
  document.querySelector("#liquidity-chip").textContent = `Объём ${provider.name}: ${contracts.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} контрактов`;
  document.querySelector("#capital-help").textContent = !marketMinimumMet
    ? (platform === "kalshi"
      ? `Доступно меньше минимального объёма ${state.kalshiMinContracts} контракт`
      : `Сумма ордера ${formatMoney(marketStakeUnits, "USDC")} меньше разрешённого минимума ${formatMoney(state.polymarketMinOrderUsdc, "USDC")}`)
    : complete
      ? "Свежих предложений достаточно для расчёта всей суммы."
      : `По текущим предложениям можно распределить только ${formatMoney(capitalUsed)} из ${formatMoney(state.capital)}.`;
  el.trustVerdict.innerHTML = `
    <div class="verdict-item is-ok"><i>✓</i><span><strong>Событие сошлось</strong><small>Команды сопоставлены · ${timeDifference === 0 ? "время совпало" : `время Δ ${timeDifference} мин.`}</small></span></div>
    <div class="verdict-item ${stale ? "is-blocked" : economicsConfirmed ? "is-ok" : "is-neutral"}"><i>${stale ? "×" : economicsConfirmed ? "✓" : "—"}</i><span><strong>${stale ? "Расчёт остановлен" : !marketMinimumMet ? "Ордер ниже минимума" : economicsConfirmed ? "Экономика подтверждена" : netRoi > 0 ? "Ниже порога" : "Преимущества нет"}</strong><small>${stale ? "Нужны свежие котировки" : `${formatPercent(netRoi)} чистыми · порог ${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% · ${complete ? "объём есть" : "объём ограничен"}`}</small></span></div>
    <div class="verdict-item is-warn"><i>!</i><span><strong>Проверь правила исхода</strong><small>Убедись, что обе площадки одинаково рассчитывают победителя</small></span></div>`;
  el.arbCard.classList.toggle("has-stale-price", stale);
  document.querySelector("#build-position").disabled = stale;
  const watchableId = currentOpportunityId();
  el.watchToggle.disabled = !watchableId;
  el.watchToggle.classList.toggle("is-watching", Boolean(watchableId) && state.watchIds.has(watchableId));
  el.watchToggle.textContent = watchableId && state.watchIds.has(watchableId) ? "✓ Уже в наблюдении" : "+ Добавить в наблюдение";
  const bookmakerLink = document.querySelector("#dialog-winline-link");
  bookmakerLink.href = event.url;
  document.querySelector("#dialog-bookmaker-logo").src = bookmaker.logo;
  document.querySelector("#dialog-bookmaker-logo").classList.toggle("is-fonbet", event.bookmaker === "fonbet");
  document.querySelector("#dialog-bookmaker-logo").classList.toggle("is-pari", event.bookmaker === "pari");
  document.querySelector("#dialog-bookmaker-logo").classList.toggle("is-betboom", event.bookmaker === "betboom");
  document.querySelector("#dialog-bookmaker-logo").classList.toggle("is-ligastavok", event.bookmaker === "ligastavok");
  document.querySelector("#dialog-bookmaker-logo").classList.toggle("is-betcity", event.bookmaker === "betcity");
  document.querySelector("#dialog-bookmaker-label").textContent = `Открыть ${bookmaker.name}`;
  const marketLink = document.querySelector("#dialog-market-link");
  marketLink.href = candidate.market.url;
  document.querySelector("#dialog-market-logo").src = provider.logo;
  document.querySelector("#dialog-market-label").textContent = `Открыть ${provider.name}`;
}

function renderRules() {
  const event = currentEvent();
  const candidate = currentCandidate();
  if (!event || !candidate) return;
  const platform = candidate.market.platform;
  const provider = platformInfo(platform);
  const bookmaker = bookmakerInfo(event.bookmaker);
  const timeDifference = Math.round(candidate.hoursApart * 60);
  const isBinaryTeamMarket = candidate.market.marketKind === "binary-team";
  const winlineOutcomeCount = event.lineType.toLowerCase() === "3-way odds" ? 3 : 2;
  const winlinePriceStale = Date.now() - event.priceTimestamp > STALE_AFTER_MS;
  const clobPriceStale = !state.book || quoteAgeMs(state.book) > STALE_AFTER_MS;
  const priceStale = winlinePriceStale || clobPriceStale;
  const feeBookmaker = `${(bookmakerFeeRate(event.bookmaker) * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% от ставки`;
  const feePrediction = platform === "kalshi"
    ? `${(state.kalshiFeeRate * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% × цена × (1 − цена) + ${(state.conversionFee * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% конвертация`
    : platform === "predictfun"
      ? `до ${((candidate.market.feeRate || 0) * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% от выплаты по feeRateBps + ${(state.conversionFee * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% конвертация`
      : `${(state.polymarketFee * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% ордер + ${(state.conversionFee * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% конвертация`;
  const timeMatches = timeDifference <= 60;
  const formatNeedsCheck = winlineOutcomeCount !== 2 || isBinaryTeamMarket;
  el.rulesPanel.innerHTML = `
    <div class="rules-explainer">
      <div class="rules-summary">
        <span>Как читать проверку</span>
        <h3>Зелёное мы сверили автоматически. Жёлтое нужно открыть на площадках и проверить самому.</h3>
      </div>
      <div class="rule-grid" role="list" aria-label="Что проверено для этой пары">
        <article class="plain-rule is-ok" role="listitem">
          <i>✓</i><div><span>Участники</span><strong>Одни и те же команды или игроки</strong><p>${escapeHtml(event.team1)} — ${escapeHtml(event.team2)}</p></div>
        </article>
        <article class="plain-rule ${timeMatches ? "is-ok" : "is-warn"}" role="listitem">
          <i>${timeMatches ? "✓" : "!"}</i><div><span>Начало события</span><strong>${timeMatches ? "Время совпало" : `Разница ${timeDifference} минут`}</strong><p>${bookmaker.name}: ${escapeHtml(formatEventTime(event.date))} · ${provider.name}: ${escapeHtml(formatEventTime(candidate.market.start))}</p></div>
        </article>
        <article class="plain-rule ${formatNeedsCheck ? "is-warn" : "is-ok"}" role="listitem">
          <i>${formatNeedsCheck ? "!" : "✓"}</i><div><span>Что считается победой</span><strong>${formatNeedsCheck ? "Нужно сравнить формулировки" : "Два противоположных исхода"}</strong><p>${isBinaryTeamMarket ? `На ${provider.name} это вопрос «Да / Нет». Убедись, что выбранное «Нет» точно покрывает второй исход ${bookmaker.name}.` : platform === "kalshi" ? "Kalshi публикует отдельный YES-контракт на победу каждого участника матча." : "На обеих площадках выбирается победитель матча из двух участников."}</p></div>
        </article>
        <article class="plain-rule is-warn" role="listitem">
          <i>!</i><div><span>Правила расчёта исхода</span><strong>Проверить один раз перед ставкой</strong><p>Открой условия обеих площадок и убедись, что победитель, перенос и отмена трактуются одинаково.</p></div>
        </article>
        <article class="plain-rule ${priceStale ? "is-warn" : "is-ok"}" role="listitem">
          <i>${priceStale ? "!" : "✓"}</i><div><span>Актуальность цен</span><strong>${priceStale ? "Одна из цен устарела" : "Обе цены свежие"}</strong><p>${bookmaker.name}: ${formatAge(event.priceTimestamp)} · ${provider.name}: ${state.book ? formatAge(state.book.receivedAt) : "цена ещё загружается"}</p></div>
        </article>
        <article class="plain-rule is-info" role="listitem">
          <i>₽</i><div><span>Комиссии и резерв цены</span><strong>Вычитаются из результата</strong><p>Курс 1 ${provider.currency} = ${marketRubRate(platform).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽ · ${bookmaker.name} ${feeBookmaker} · ${provider.name} ${feePrediction}.</p></div>
        </article>
        <article class="plain-rule is-info" role="listitem">
          <i>%</i><div><span>Порог сервиса</span><strong>${(state.safetyBuffer * 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })}% чистого результата</strong><p>Не вычитается из прибыли. Пара ниже порога просто не получает статус возможности.</p></div>
        </article>
      </div>
      <details class="rules-tech">
        <summary>Показать технические данные</summary>
        <dl>
          <div><dt>Формат ${bookmaker.name}</dt><dd>${escapeHtml(event.lineType)}</dd></div>
          <div><dt>Формат ${provider.name}</dt><dd>${escapeHtml(candidate.market.marketType)}</dd></div>
          <div><dt>Количество исходов</dt><dd>${bookmaker.name}: ${winlineOutcomeCount} · ${provider.name}: 2</dd></div>
          <div><dt>Минимальный ордер</dt><dd>${platform === "kalshi" ? `${state.kalshiMinContracts} контракт` : platform === "predictfun" ? "Проверить на площадке" : formatMoney(state.polymarketMinOrderUsdc, "USDC")}</dd></div>
          <div><dt>Округление ${bookmaker.name}</dt><dd>${formatMoney(state.bookmakerRoundingRub, "RUB")}</dd></div>
        </dl>
      </details>
    </div>`;
}

async function loadData(background = false) {
  if (state.loadingData && background) return;
  const previousEventId = state.event;
  if (!background) data.opportunities = [];
  state.loadingData = true;
  state.nextDataRefreshAt = null;
  state.backgroundRefresh = background;
  state.dataError = null;
  state.scanError = null;
  el.refresh.disabled = true;
  el.refreshOpportunities.disabled = true;
  el.refreshOpportunitiesLabel.textContent = "Обновляем…";
  el.sourceStatus.textContent = "Обновляем информацию…";
  el.syncTime.textContent = "получаем свежие цены";
  if (!background) {
    renderSource();
    renderTarget();
    renderOpportunities();
    renderWatch();
  }

  try {
    const startDate = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const polyUrls = API.polymarketSportTags.map(tag => {
      const url = new URL(API.polymarketEvents);
      url.searchParams.set("active", "true");
      url.searchParams.set("closed", "false");
      url.searchParams.set("tag_slug", tag);
      url.searchParams.set("related_tags", "true");
      url.searchParams.set("limit", "100");
      url.searchParams.set("offset", "0");
      url.searchParams.set("start_date_min", startDate);
      url.searchParams.set("order", "startTime");
      url.searchParams.set("ascending", "true");
      return url;
    });

    const kalshiUrls = API.kalshiSeries.map(seriesTicker => {
      const url = new URL(API.kalshiEvents, window.location.origin);
      url.searchParams.set("status", "open");
      url.searchParams.set("series_ticker", seriesTicker);
      url.searchParams.set("with_nested_markets", "true");
      url.searchParams.set("limit", "200");
      return url;
    });

    const [winlineResponse, leonResult, fonbetResult, zenitResult, pariResult, betboomResult, ligaStavokResult, betcityResult, polyResults, kalshiResults, predictResult] = await Promise.all([
      fetch(API.winline, { cache: "no-store" }),
      Promise.resolve(fetch(API.leonEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.fonbetEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.zenitEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.pariEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.betboomEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.ligaStavokEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.resolve(fetch(API.betcityEvents, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      ),
      Promise.allSettled(polyUrls.map(url => fetch(url, { cache: "no-store" }))),
      Promise.allSettled(kalshiUrls.map(url => fetch(url, { cache: "no-store" }))),
      Promise.resolve(fetch(API.predictCategories, { cache: "no-store" })).then(
        response => ({ status: "fulfilled", value: response }),
        reason => ({ status: "rejected", reason })
      )
    ]);
    if (!winlineResponse.ok) throw new Error(`Winline ответил ${winlineResponse.status}`);
    const leonResponse = leonResult.status === "fulfilled" && leonResult.value.ok ? leonResult.value : null;
    const fonbetResponse = fonbetResult.status === "fulfilled" && fonbetResult.value.ok ? fonbetResult.value : null;
    const zenitResponse = zenitResult.status === "fulfilled" && zenitResult.value.ok ? zenitResult.value : null;
    const pariResponse = pariResult.status === "fulfilled" && pariResult.value.ok ? pariResult.value : null;
    const betboomResponse = betboomResult.status === "fulfilled" && betboomResult.value.ok ? betboomResult.value : null;
    const ligaStavokResponse = ligaStavokResult.status === "fulfilled" && ligaStavokResult.value.ok ? ligaStavokResult.value : null;
    const betcityResponse = betcityResult.status === "fulfilled" && betcityResult.value.ok ? betcityResult.value : null;
    const polyResponses = polyResults.filter(result => result.status === "fulfilled" && result.value.ok).map(result => result.value);
    const kalshiResponses = kalshiResults.filter(result => result.status === "fulfilled" && result.value.ok).map(result => result.value);
    const predictResponse = predictResult.status === "fulfilled" && predictResult.value.ok ? predictResult.value : null;
    updatePredictIntegrationUi(Boolean(predictResponse));
    updateZenitIntegrationUi(Boolean(zenitResponse));
    updatePariIntegrationUi(Boolean(pariResponse));
    updateBetboomIntegrationUi(Boolean(betboomResponse));
    updateLigaStavokIntegrationUi(Boolean(ligaStavokResponse));
    updateBetcityIntegrationUi(Boolean(betcityResponse));
    if (!polyResponses.length && !kalshiResponses.length && !predictResponse) throw new Error("Prediction markets не ответили");

    const [winlineText, leonPage, fonbetPage, zenitPage, pariPage, betboomPage, ligaStavokPage, betcityPage, polyPages, kalshiPages, predictPage] = await Promise.all([
      winlineResponse.text(),
      leonResponse ? leonResponse.json() : Promise.resolve({ events: [] }),
      fonbetResponse ? fonbetResponse.json() : Promise.resolve({ events: [] }),
      zenitResponse ? zenitResponse.json() : Promise.resolve({ lines: [] }),
      pariResponse ? pariResponse.json() : Promise.resolve({ events: [] }),
      betboomResponse ? betboomResponse.json() : Promise.resolve({ events: [] }),
      ligaStavokResponse ? ligaStavokResponse.json() : Promise.resolve({ events: [] }),
      betcityResponse ? betcityResponse.json() : Promise.resolve({ events: [] }),
      Promise.all(polyResponses.map(response => response.json())),
      Promise.all(kalshiResponses.map(response => response.json())),
      predictResponse ? predictResponse.json() : Promise.resolve({ data: [] })
    ]);
    const parsedWinline = parseWinline(winlineText);
    const parsedLeon = parseLeon(leonPage);
    const parsedFonbet = parseFonbet(fonbetPage);
    const parsedZenit = parseZenit(zenitPage);
    const parsedPari = parsePari(pariPage);
    const parsedBetboom = parseBetboom(betboomPage);
    const parsedLigaStavok = parseLigaStavok(ligaStavokPage);
    const parsedBetcity = parseBetcity(betcityPage);
    data.winlineEvents = parsedWinline.events;
    data.leonEvents = parsedLeon.events;
    data.fonbetEvents = parsedFonbet.events;
    data.zenitEvents = parsedZenit.events;
    data.pariEvents = parsedPari.events;
    data.betboomEvents = parsedBetboom.events;
    data.ligaStavokEvents = parsedLigaStavok.events;
    data.betcityEvents = parsedBetcity.events;
    data.bookmakerEvents = [...data.winlineEvents, ...data.leonEvents, ...data.fonbetEvents, ...data.zenitEvents, ...data.pariEvents, ...data.betboomEvents, ...data.ligaStavokEvents, ...data.betcityEvents];
    data.sports = [...parsedWinline.sports, ...parsedLeon.sports, ...parsedFonbet.sports, ...parsedZenit.sports, ...parsedPari.sports, ...parsedBetboom.sports, ...parsedLigaStavok.sports, ...parsedBetcity.sports];
    data.leagues = [...parsedWinline.leagues, ...parsedLeon.leagues, ...parsedFonbet.leagues, ...parsedZenit.leagues, ...parsedPari.leagues, ...parsedBetboom.leagues, ...parsedLigaStavok.leagues, ...parsedBetcity.leagues];
    data.polyMarkets = parsePolymarket(polyPages.flat());
    data.kalshiMarkets = parseKalshi(kalshiPages);
    data.predictMarkets = parsePredictFun(predictPage?.data);
    data.predictionMarkets = [...data.polyMarkets, ...data.kalshiMarkets, ...data.predictMarkets];
    data.lastSync = new Date();
    rebuildMatchCache();
    rebuildCrossComparisons();

    if (background && previousEventId && data.bookmakerEvents.some(item => item.id === previousEventId)) {
      state.event = previousEventId;
      const event = currentEvent();
      state.sport = event.sportId;
      state.league = event.leagueId;
      const candidates = currentCandidates();
      state.candidateId = candidates.some(item => item.market.id === state.candidateId) ? state.candidateId : candidates[0]?.market.id || null;
    } else {
      chooseInitialSelection();
      if (state.activeView === "finder") resetFinderSelection();
    }

    el.sourceStatus.textContent = "Информация обновлена";
    el.syncTime.textContent = "только что";
    el.scannerMatchCount.textContent = String(data.matchCache.size);
  } catch (error) {
    state.dataError = error instanceof Error ? error.message : "Неизвестная ошибка загрузки";
    el.sourceStatus.textContent = "Не удалось обновить";
    el.syncTime.textContent = "проверьте соединение и повторите";
    el.scannerMatchCount.textContent = "—";
  } finally {
    state.loadingData = false;
    state.nextDataRefreshAt = Date.now() + DATA_REFRESH_MS;
    state.backgroundRefresh = false;
    el.refresh.disabled = false;
    el.refreshOpportunities.disabled = false;
    el.refreshOpportunitiesLabel.textContent = "Обновить информацию";
    const quietFinderUpdate = background && state.activeView === "finder" && state.stage === 4 && currentEvent() && currentCandidate();
    if (quietFinderUpdate) {
      updateFinderSourcePrice();
    } else {
      renderSource();
      renderTarget();
    }
    renderOpportunities();
  }

  if (!state.dataError) {
    scanOpportunities();
    if (state.activeView === "finder" && state.candidateId) await loadBookForSelection();
  }
}

function selectStep(step, id) {
  if (step === 0) {
    state.sport = id;
    const league = data.leagues.find(item => item.sportId === id);
    state.league = league?.id || null;
    state.event = activeBookmakerEvents().find(item => item.leagueId === state.league)?.id || null;
    state.stage = 1;
  } else if (step === 1) {
    state.league = id;
    state.event = activeBookmakerEvents().find(item => item.leagueId === id)?.id || null;
    state.stage = 2;
  } else if (step === 2) {
    state.event = id;
    state.stage = 3;
  } else if (step === 3) {
    state.market = id;
    state.stage = 4;
    state.candidateId = currentCandidates()[0]?.market.id || null;
    state.book = null;
    state.bookError = null;
  }
  renderSource();
  renderTarget();
  if (state.stage === 4 && state.candidateId) loadBookForSelection();
}

let toastTimer;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove("is-visible"), 3200);
}

function setActiveView(view, scroll = true) {
  const allowedViews = new Set(["opportunities", "finder", "watch", "method"]);
  if (!allowedViews.has(view)) view = "opportunities";
  state.activeView = view;
  document.querySelectorAll("[data-view]").forEach(section => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll("[data-nav]").forEach(button => {
    const active = button.dataset.nav === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "watch") renderWatch();
  if (window.location.hash !== `#${view}`) window.history.pushState({ view }, "", `#${view}`);
  if (!scroll) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openOpportunity(opportunityId) {
  const opportunity = data.opportunities.find(item => item.id === opportunityId);
  if (!opportunity) return;
  state.leftPlatform = opportunity.event.bookmaker;
  state.sport = opportunity.event.sportId;
  state.league = opportunity.event.leagueId;
  state.event = opportunity.event.id;
  state.market = opportunity.side === 1 ? "team2" : "team1";
  state.rightPlatform = opportunity.candidate.market.platform;
  state.stage = 4;
  state.candidateId = opportunity.candidate.market.id;
  state.book = opportunity.book;
  state.bookError = null;
  state.bookLoading = false;
  state.countdown = BOOK_REFRESH_SECONDS;
  setActiveView("finder");
  renderSource();
  renderTarget();
  renderRules();
  loadBookForSelection();
}

document.addEventListener("click", event => {
  const comparisonModeButton = event.target.closest("[data-comparison-mode]");
  if (comparisonModeButton) {
    state.comparisonMode = comparisonModeButton.dataset.comparisonMode;
    state.feedFilter = "all";
    state.feedSport = "all";
    state.feedBookmaker = "all";
    state.feedPlatform = "all";
    document.querySelectorAll("[data-feed-filter]").forEach(item => item.classList.toggle("is-active", item.dataset.feedFilter === "all"));
    renderOpportunities();
    return;
  }

  const watchNavButton = event.target.closest("#watch-content [data-nav]");
  if (watchNavButton) {
    setActiveView(watchNavButton.dataset.nav);
    return;
  }

  const resetFilters = event.target.closest("[data-reset-filters]");
  if (resetFilters) {
    state.feedFilter = "all";
    state.feedSport = "all";
    state.feedBookmaker = "all";
    state.feedPlatform = "all";
    document.querySelectorAll("[data-feed-filter]").forEach(item => item.classList.toggle("is-active", item.dataset.feedFilter === "all"));
    renderOpportunities();
    return;
  }

  const unwatchButton = event.target.closest("[data-unwatch]");
  if (unwatchButton) {
    state.watchIds.delete(unwatchButton.dataset.unwatch);
    persistWatchIds();
    renderWatch();
    renderOpportunities();
    showToast("Пара убрана из наблюдения");
    return;
  }

  const watchOpportunityButton = event.target.closest("[data-watch-opportunity]");
  if (watchOpportunityButton) {
    toggleWatchById(watchOpportunityButton.dataset.watchOpportunity);
    return;
  }

  if (event.target.closest("[data-watch-current]")) {
    toggleCurrentWatch();
    return;
  }

  const opportunityButton = event.target.closest("[data-open-opportunity]");
  if (opportunityButton) openOpportunity(opportunityButton.dataset.openOpportunity);

  const selection = event.target.closest("[data-select-step]");
  if (selection) selectStep(Number(selection.dataset.selectStep), selection.dataset.id);

  const trail = event.target.closest("[data-trail-step]");
  if (trail && !trail.disabled) {
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

  const candidateButton = event.target.closest("[data-candidate]");
  if (candidateButton) {
    state.candidateId = candidateButton.dataset.candidate;
    state.book = null;
    state.bookError = null;
    renderTarget();
    loadBookForSelection();
  }

  const quickAmount = event.target.closest("[data-amount]");
  if (quickAmount) {
    state.capital = Number(quickAmount.dataset.amount);
    el.capital.value = state.capital.toLocaleString("ru-RU");
    document.querySelectorAll("[data-amount]").forEach(button => button.classList.toggle("is-active", button === quickAmount));
    updateCalculation();
  }

  if (event.target.closest("[data-manual]")) {
    if (currentEvent() && currentCandidate()) {
      el.rulesToggle.setAttribute("aria-expanded", "true");
      el.rulesPanel.hidden = false;
      renderRules();
      el.rulesToggle.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      showToast("Сначала выбери событие и вторую сторону");
    }
  }
  if (event.target.closest("[data-retry]")) loadData(false);
});

el.refresh.addEventListener("click", () => loadData(true));
el.refreshOpportunities.addEventListener("click", () => loadData(true));

document.querySelectorAll("[data-feed-filter]").forEach(button => {
  button.addEventListener("click", () => {
    state.feedFilter = button.dataset.feedFilter;
    document.querySelectorAll("[data-feed-filter]").forEach(item => item.classList.toggle("is-active", item === button));
    renderOpportunities();
  });
});

el.opportunitySport.addEventListener("change", event => {
  state.feedSport = event.target.value;
  renderOpportunities();
});

el.opportunityBookmaker.addEventListener("change", event => {
  state.feedBookmaker = event.target.value;
  renderOpportunities();
});

el.opportunityPlatform.addEventListener("change", event => {
  state.feedPlatform = event.target.value;
  renderOpportunities();
});

document.querySelector("#right-platform").addEventListener("change", event => {
  state.rightPlatform = event.target.value;
  const candidates = currentCandidates();
  state.candidateId = candidates[0]?.market.id || null;
  state.book = null;
  state.bookError = null;
  renderTarget();
  loadBookForSelection();
});

document.querySelector("#left-platform").addEventListener("change", event => {
  state.leftPlatform = event.target.value;
  resetFinderSelection();
  syncLeftPlatformUi();
  renderSource();
  renderTarget();
});

document.querySelectorAll("[data-economy-open]").forEach(button => {
  button.addEventListener("click", () => {
    syncEconomyControls();
    updateEconomyUi();
    const form = el.economyDialog.querySelector(".economy-form");
    if (form) form.scrollTop = 0;
    if (typeof el.economyDialog.showModal === "function") el.economyDialog.showModal();
  });
});

document.querySelectorAll("[data-economy-field]").forEach(control => {
  control.addEventListener("input", event => {
    const key = event.target.dataset.economyField;
    if (key === "baseCurrency") {
      const nextCurrency = event.target.value;
      if (nextCurrency !== state.baseCurrency) {
        state.capital = state.baseCurrency === "RUB"
          ? state.capital / state.rubPerUsdc
          : state.capital * state.rubPerUsdc;
        state.baseCurrency = nextCurrency;
        state.capital = nextCurrency === "RUB" ? Math.round(state.capital) : Math.round(state.capital * 100) / 100;
      }
      applyEconomyChange();
      return;
    }
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value < 0) return;
    state[key] = event.target.dataset.economyKind === "percent" ? value / 100 : value;
    if (key === "rubPerUsdt" || key === "rubPerUsdc" || key === "rubPerUsd") {
      state.fxManual = true;
      state.fxSource = "Ручной курс";
      state.fxUpdatedAt = Date.now();
    }
    applyEconomyChange();
  });
});

el.capital.addEventListener("input", event => {
  const normalized = event.target.value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const value = Number(normalized);
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

el.watchToggle.addEventListener("click", toggleCurrentWatch);

document.querySelectorAll("[data-nav]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.nav === "finder") {
      resetFinderSelection();
      renderSource();
      renderTarget();
    }
    setActiveView(button.dataset.nav);
  });
});

document.querySelector("[data-brand-nav]").addEventListener("click", event => {
  event.preventDefault();
  setActiveView("opportunities");
});

window.addEventListener("popstate", () => {
  const view = window.location.hash.replace("#", "") || "opportunities";
  setActiveView(view, false);
});

window.setInterval(() => {
  if (!state.book || state.bookLoading) return;
  state.countdown -= 1;
  if (state.countdown <= 0) {
    state.countdown = BOOK_REFRESH_SECONDS;
    loadBookForSelection();
  }
  document.querySelector("#countdown").textContent = `00:${String(state.countdown).padStart(2, "0")}`;
}, 1000);

window.setInterval(() => {
  updateRefreshTimers();
  if (document.visibilityState !== "visible") return;

  const now = Date.now();
  if (!state.loadingData && Number.isFinite(state.nextDataRefreshAt) && now >= state.nextDataRefreshAt) {
    state.nextDataRefreshAt = null;
    loadData(true);
    return;
  }

  if (state.activeView === "opportunities" && !state.loadingData && !state.scanLoading && Number.isFinite(state.nextOpportunityRefreshAt) && now >= state.nextOpportunityRefreshAt) {
    state.nextOpportunityRefreshAt = null;
    scanOpportunities();
  }
}, 1000);

window.setInterval(() => {
  if (state.activeView === "opportunities" && data.opportunities.length) updateOpportunityAges();
}, 5000);

window.setInterval(() => {
  if (document.visibilityState !== "visible" || state.fxManual) return;
  loadFxRate();
}, FX_REFRESH_MS);

loadWatchIds();
const initialView = window.location.hash.replace("#", "") || "opportunities";
setActiveView(initialView, false);
syncEconomyControls();
updateEconomyUi();
updateQuickAmounts();
renderSource();
renderTarget();
renderOpportunities();
renderWatch();
loadFxRate();
loadData(false);
