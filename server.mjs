import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 4173);
const root = fileURLToPath(new URL("./", import.meta.url));
const kalshiOrigin = "https://external-api.kalshi.com/trade-api/v2";
const predictOrigin = "https://api.predict.fun";
const rapiraOrigin = "https://api.rapira.net";
const leonOrigin = "https://leon.ru/api-ext/betline-exports";
const fonbetOrigin = "https://line51w.bk6bba-resources.com";
const zenitOrigin = "https://zenitbet.com/external/line/partnersfeed";
const pariOrigin = "https://pari-lineservice-api.pfeed.ru";
const betboomOrigin = "https://ru-partner-feed.sporthub.bet/api/partner_feed/v1";
const ligaStavokOrigin = "https://match-center.playmaker24.ru";
const betcityOrigin = String(process.env.BETCITY_API_ORIGIN || "http://prt.betcity.ru/api/v2/events").trim();
const predictApiKey = String(process.env.PREDICT_FUN_API_KEY || "").trim();
const zenitFeedKey = String(process.env.ZENIT_FEED_KEY || "").trim();
const pariApiKey = String(process.env.PARI_API_KEY || "").trim();
const betboomPartner = String(process.env.BETBOOM_PARTNER || "").trim().toLowerCase();
const betboomAccessToken = String(process.env.BETBOOM_ACCESS_TOKEN || "").trim();
const ligaStavokApiKey = String(process.env.LIGA_STAVOK_API_KEY || "").trim();
const betcityApiKey = String(process.env.BETCITY_API_KEY || "").trim();
const leonFeeds = ["football-ru", "football", "eurocups", "esports", "tennis", "table-tennis", "hockey", "basketball"];
const fonbetCacheMs = 55000;
const pariCacheMs = 30000;
const betboomDirectoryCacheMs = 24 * 60 * 60 * 1000;
const betboomEventsCacheMs = 65000;
const ligaStavokCacheMs = 65000;
const betcityCacheMs = 65000;
const rapiraRateCacheMs = 60000;
const betboomMainMarketIds = [1, 71, 8489, 8494, 8565, 36041];
const allowedSeries = new Set([
  "KXATPMATCH", "KXWTAMATCH", "KXATPDOUBLES", "KXWTADOUBLES",
  "KXCS2GAME", "KXDOTA2GAME", "KXLOLGAME", "KXVOLLEYBALLMATCH",
  "KXTABLETENNISMATCH", "KXTTMATCH", "KXWTTMATCH", "KXNBAGAME", "KXWNBAGAME"
]);
const cache = new Map();
let fonbetInFlight = null;
let zenitInFlight = null;
let pariInFlight = null;
let betboomInFlight = null;
let ligaStavokInFlight = null;
let betcityInFlight = null;
let rapiraRateInFlight = null;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(value));
}

async function readKalshi(path, ttlMs) {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.savedAt < ttlMs) return cached.value;

  const upstream = await fetch(`${kalshiOrigin}${path}`, {
    headers: {
      accept: "application/json",
      "user-agent": "raznitsa-readonly-market-monitor/0.1"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!upstream.ok) throw new Error(`Kalshi ответил ${upstream.status}`);
  const value = await upstream.json();
  cache.set(path, { savedAt: Date.now(), value });
  return value;
}

async function readRapiraRate() {
  const cacheKey = "rapira:usdt-rub";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < rapiraRateCacheMs) return cached.value;
  if (rapiraRateInFlight) return rapiraRateInFlight;

  rapiraRateInFlight = (async () => {
    const upstream = await fetch(`${rapiraOrigin}/open/market/rates`, {
      headers: {
        accept: "application/json",
        "user-agent": "raznitsa-readonly-market-monitor/0.1"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!upstream.ok) throw new Error(`Rapira ответила ${upstream.status}`);
    const payload = await upstream.json();
    const rates = Array.isArray(payload?.data) ? payload.data : [];
    const usdtRub = rates.find(item => String(item?.symbol).toUpperCase() === "USDT/RUB");
    const usdcUsdt = rates.find(item => String(item?.symbol).toUpperCase() === "USDC/USDT");
    const usdtRubAsk = Number(usdtRub?.askPrice || usdtRub?.close);
    const usdcUsdtAsk = Number(usdcUsdt?.askPrice || usdcUsdt?.close || 1);
    if (!Number.isFinite(usdtRubAsk) || usdtRubAsk <= 0) throw new Error("Rapira не отдала ask USDT/RUB");
    const stablecoinCross = Number.isFinite(usdcUsdtAsk) && usdcUsdtAsk > 0 ? usdcUsdtAsk : 1;
    const value = {
      source: "Rapira",
      side: "ask",
      usdtRub: usdtRubAsk,
      usdcRub: usdtRubAsk * stablecoinCross,
      usdcUsdt: stablecoinCross,
      updatedAt: Date.now()
    };
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await rapiraRateInFlight;
  } finally {
    rapiraRateInFlight = null;
  }
}

async function readPredict(path, ttlMs) {
  if (!predictApiKey) {
    const error = new Error("Predict.fun API key не настроен");
    error.code = "PREDICT_KEY_MISSING";
    throw error;
  }

  const cacheKey = `predict:${path}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < ttlMs) return cached.value;

  const upstream = await fetch(`${predictOrigin}${path}`, {
    headers: {
      accept: "application/json",
      "x-api-key": predictApiKey,
      "user-agent": "raznitsa-readonly-market-monitor/0.1"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!upstream.ok) throw new Error(`Predict.fun ответил ${upstream.status}`);
  const value = await upstream.json();
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

async function readPredictSportsCategories() {
  const cacheKey = "predict:sports-categories";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 15000) return cached.value;

  const categories = [];
  let cursor = "";
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ first: "100", status: "OPEN" });
    if (cursor) query.set("after", cursor);
    const result = await readPredict(`/v1/categories?${query}`, 15000);
    categories.push(...(Array.isArray(result?.data) ? result.data : []));
    const nextCursor = String(result?.cursor || "");
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  const value = {
    success: true,
    enabled: true,
    data: categories.filter(category => category?.variantDetails?.sports && Array.isArray(category?.markets))
  };
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

async function readLeonFeed(feed) {
  const cacheKey = `leon:${feed}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 15000) return cached.value;

  const upstream = await fetch(`${leonOrigin}/${feed}`, {
    headers: {
      accept: "application/json",
      "user-agent": "raznitsa-readonly-market-monitor/0.1"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!upstream.ok) throw new Error(`Leon ${feed} ответил ${upstream.status}`);
  const value = await upstream.json();
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

async function readLeonEvents() {
  const cacheKey = "leon:all-events";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 15000) return cached.value;

  const results = await Promise.allSettled(leonFeeds.map(async feed => ({ feed, payload: await readLeonFeed(feed) })));
  const merged = new Map();
  const sources = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { feed, payload } = result.value;
    const events = Array.isArray(payload?.events) ? payload.events : [];
    sources.push({ feed, events: events.length });
    for (const event of events) {
      const key = String(event?.matchUrl || `${event?.sport}|${event?.kickoff}|${event?.team1}|${event?.team2}`);
      if (!merged.has(key)) merged.set(key, { ...event, sourceFeed: feed });
    }
  }

  if (!sources.length) throw new Error("Leon не отдал ни одного фида");
  const value = { success: true, events: Array.from(merged.values()), sources, updatedAt: Date.now() };
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

function compactFonbetPayload(payload) {
  const sportsById = new Map((Array.isArray(payload?.sports) ? payload.sports : []).map(item => [Number(item.id), item]));
  const factorsByEvent = new Map((Array.isArray(payload?.customFactors) ? payload.customFactors : []).map(item => [Number(item.e), item.factors || []]));
  const blocksByEvent = new Map((Array.isArray(payload?.eventBlocks) ? payload.eventBlocks : []).map(item => [Number(item.eventId), item]));
  const nowSeconds = Date.now() / 1000;

  function rootSport(segmentId) {
    let current = sportsById.get(Number(segmentId));
    for (let depth = 0; current && depth < 8; depth += 1) {
      if (current.kind === "sport") return current;
      current = sportsById.get(Number(current.parentId));
    }
    return null;
  }

  const events = [];
  for (const event of Array.isArray(payload?.events) ? payload.events : []) {
    if (event.place !== "line" || Number(event.level) !== 1 || !event.team1 || !event.team2 || Number(event.startTime) < nowSeconds - 1800) continue;

    const factors = factorsByEvent.get(Number(event.id)) || [];
    const home = factors.find(item => Number(item.f) === 921 && Number(item.v) > 1);
    const draw = factors.find(item => Number(item.f) === 922 && Number(item.v) > 1);
    const away = factors.find(item => Number(item.f) === 923 && Number(item.v) > 1);
    if (!home || draw || !away) continue;

    const block = blocksByEvent.get(Number(event.id));
    if (block?.state === "blocked") continue;
    if (block?.state === "partial" && Array.isArray(block.factors) && block.factors.some(id => Number(id) === 921 || Number(id) === 923)) continue;

    const league = sportsById.get(Number(event.sportId));
    const sport = rootSport(event.sportId);
    events.push({
      id: Number(event.id),
      sportId: Number(sport?.id || event.sportId),
      sportName: String(sport?.name || "Другой спорт"),
      leagueId: Number(event.sportId),
      leagueName: String(league?.name || "Другой турнир"),
      team1: String(event.team1),
      team2: String(event.team2),
      startTime: Number(event.startTime),
      odds: [Number(home.v), Number(away.v)]
    });
  }

  return {
    success: true,
    events,
    source: {
      endpoint: "events/listBase",
      rawEvents: Array.isArray(payload?.events) ? payload.events.length : 0,
      twoWayEvents: events.length,
      packetVersion: Number(payload?.packetVersion || 0)
    },
    updatedAt: Date.now()
  };
}

async function readFonbetEvents() {
  const cacheKey = "fonbet:list-base";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < fonbetCacheMs) return cached.value;
  if (fonbetInFlight) return fonbetInFlight;

  fonbetInFlight = (async () => {
    const upstream = await fetch(`${fonbetOrigin}/events/listBase?lang=ru&scopeMarket=1600`, {
      headers: {
        accept: "application/json",
        "user-agent": "raznitsa-readonly-market-monitor/0.1"
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!upstream.ok) throw new Error(`Fonbet ответил ${upstream.status}`);
    const value = compactFonbetPayload(await upstream.json());
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await fonbetInFlight;
  } finally {
    fonbetInFlight = null;
  }
}

async function readZenitEvents() {
  if (!zenitFeedKey) {
    const error = new Error("Zenit partner feed key не настроен");
    error.code = "ZENIT_KEY_MISSING";
    throw error;
  }

  const cacheKey = "zenit:partners-feed";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < 55000) return cached.value;
  if (zenitInFlight) return zenitInFlight;

  zenitInFlight = (async () => {
    const url = new URL(zenitOrigin);
    url.searchParams.set("key", zenitFeedKey);
    const upstream = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "raznitsa-readonly-market-monitor/0.1"
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!upstream.ok) throw new Error(`Zenit ответил ${upstream.status}`);
    const payload = await upstream.json();
    if (!payload || payload === false || !Array.isArray(payload.lines)) throw new Error("Zenit отклонил ключ или вернул пустой фид");
    const value = { success: true, lines: payload.lines, updatedAt: Date.now() };
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await zenitInFlight;
  } finally {
    zenitInFlight = null;
  }
}

function compactPariPayload(payload) {
  const nowSeconds = Date.now() / 1000;
  const events = [];

  for (const event of Array.isArray(payload?.events) ? payload.events : []) {
    const market = (Array.isArray(event?.markets) ? event.markets : [])
      .find(item => String(item?.type || "").toLowerCase() === "outcomes");
    const outcomes = Array.isArray(market?.outcomes) ? market.outcomes : [];
    const home = outcomes.find(item => Number(item?.f) === 921 && Number(item?.v) > 1);
    const draw = outcomes.find(item => Number(item?.f) === 922 && Number(item?.v) > 1);
    const away = outcomes.find(item => Number(item?.f) === 923 && Number(item?.v) > 1);
    if (!event?.team1 || !event?.team2 || !home || draw || !away) continue;
    if (Number(event?.startTime) < nowSeconds - 1800) continue;

    events.push({
      id: Number(event.id),
      sportId: Number(event?.sport?.id || 0),
      sportName: String(event?.sport?.name || "Другой спорт"),
      leagueId: Number(event?.tournament?.id || 0),
      leagueName: String(event?.tournament?.name || "Другой турнир"),
      team1: String(event.team1),
      team2: String(event.team2),
      startTime: Number(event.startTime),
      url: String(event?.url || "https://www.pari.ru/sports"),
      odds: [Number(home.v), Number(away.v)]
    });
  }

  return {
    success: true,
    enabled: true,
    events,
    source: {
      endpoint: "events?Language=Ru&Stage=Prematch&Period=Main&Markets=Outcomes",
      rawEvents: Array.isArray(payload?.events) ? payload.events.length : 0,
      twoWayEvents: events.length
    },
    updatedAt: Date.now()
  };
}

async function readPariEvents() {
  if (!pariApiKey) {
    const error = new Error("PARI API key не настроен");
    error.code = "PARI_KEY_MISSING";
    throw error;
  }

  const cacheKey = "pari:prematch-main-outcomes";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < pariCacheMs) return cached.value;
  if (pariInFlight) return pariInFlight;

  pariInFlight = (async () => {
    const url = new URL(`${pariOrigin}/events`);
    url.searchParams.set("Language", "Ru");
    url.searchParams.set("Stage", "Prematch");
    url.searchParams.set("Period", "Main");
    url.searchParams.set("Markets", "Outcomes");
    const upstream = await fetch(url, {
      headers: {
        accept: "application/json",
        "API-Key": pariApiKey,
        "user-agent": "raznitsa-readonly-market-monitor/0.1"
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!upstream.ok) throw new Error(`PARI ответил ${upstream.status}`);
    const value = compactPariPayload(await upstream.json());
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await pariInFlight;
  } finally {
    pariInFlight = null;
  }
}

function chunk(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function normalizeBetboomName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function isRelevantBetboomSport(sport) {
  return /(футбол|football|soccer|баскет|basket|хоккей|hockey|теннис|tennis|волейбол|volley|бейсбол|baseball|крикет|cricket|кибер|esport|dota|counter|mma|бокс|boxing)/i.test(String(sport?.name || ""));
}

async function postBetboom(path, body) {
  const upstream = await fetch(`${betboomOrigin}/${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-partner": betboomPartner,
      "x-access-token": betboomAccessToken,
      "user-agent": "raznitsa-readonly-market-monitor/0.1"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });

  if (upstream.status === 401) throw new Error("BetBoom отклонил или просрочил токен (401)");
  if (upstream.status === 403) throw new Error("IP сервера не добавлен в whitelist BetBoom (403)");
  if (upstream.status === 429) throw new Error("Превышен лимит запросов BetBoom (429)");
  if (!upstream.ok) throw new Error(`BetBoom ответил ${upstream.status}`);
  return upstream.json();
}

async function readBetboomDirectory() {
  const cacheKey = "betboom:directory";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < betboomDirectoryCacheMs) return cached.value;

  const sportsPayload = await postBetboom("sports/get", { locale: "ru" });
  const allSports = Array.isArray(sportsPayload?.sports) ? sportsPayload.sports : [];
  const sports = allSports.filter(isRelevantBetboomSport);
  const sportIds = sports.slice(0, 240).map(item => Number(item.id)).filter(Number.isFinite);
  const categoryPayloads = await Promise.all(chunk(sportIds, 30).slice(0, 8).map(sport_ids => (
    postBetboom("categories/get_by_sport_ids", { locale: "ru", sport_ids })
  )));
  const categories = categoryPayloads.flatMap(payload => Array.isArray(payload?.categories) ? payload.categories : []);
  const categoryIds = categories.slice(0, 300).map(item => Number(item.id)).filter(Number.isFinite);
  const tournamentPayloads = await Promise.all(chunk(categoryIds, 30).slice(0, 10).map(category_ids => (
    postBetboom("tournaments/get_by_category_ids", { locale: "ru", category_ids })
  )));
  const tournaments = tournamentPayloads.flatMap(payload => Array.isArray(payload?.tournaments) ? payload.tournaments : []);
  const value = { sports, categories, tournaments };
  cache.set(cacheKey, { savedAt: Date.now(), value });
  return value;
}

function resolveBetboomSides(match) {
  const home = match?.teams?.home_team;
  const away = match?.teams?.away_team;
  if (!home?.name || !away?.name) return null;

  const groups = new Map();
  for (const stake of Array.isArray(match?.stakes) ? match.stakes : []) {
    if (stake?.is_active === false || !betboomMainMarketIds.includes(Number(stake?.market_id)) || Number(stake?.factor) <= 1) continue;
    const key = `${stake.market_id}:${stake.period_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(stake);
  }

  const marketPriority = new Map(betboomMainMarketIds.map((id, index) => [id, index]));
  const candidates = Array.from(groups.values())
    .filter(group => group.length === 2)
    .sort((a, b) => (marketPriority.get(Number(a[0]?.market_id)) ?? 99) - (marketPriority.get(Number(b[0]?.market_id)) ?? 99));
  const homeNames = [home.name, home.short_name].map(normalizeBetboomName).filter(Boolean);
  const awayNames = [away.name, away.short_name].map(normalizeBetboomName).filter(Boolean);

  function score(stake, names) {
    const label = normalizeBetboomName(stake?.name);
    if (!label) return 0;
    return Math.max(0, ...names.map(name => label === name ? 100 : label.includes(name) || name.includes(label) ? 50 : 0));
  }

  for (const group of candidates) {
    const [first, second] = group;
    const firstLabel = normalizeBetboomName(first?.name);
    const secondLabel = normalizeBetboomName(second?.name);
    if (/^(п\s*1|1|команда\s*1|хозяева)/i.test(firstLabel) && /^(п\s*2|2|команда\s*2|гости)/i.test(secondLabel)) return [first, second];
    if (/^(п\s*2|2|команда\s*2|гости)/i.test(firstLabel) && /^(п\s*1|1|команда\s*1|хозяева)/i.test(secondLabel)) return [second, first];
    const direct = score(first, homeNames) + score(second, awayNames);
    const reverse = score(first, awayNames) + score(second, homeNames);
    if (direct > reverse && direct > 0) return [first, second];
    if (reverse > direct && reverse > 0) return [second, first];
  }
  return null;
}

function compactBetboomPayload(directory, matches) {
  const sportsById = new Map(directory.sports.map(item => [Number(item.id), item]));
  const categoriesById = new Map(directory.categories.map(item => [Number(item.id), item]));
  const tournamentsById = new Map(directory.tournaments.map(item => [Number(item.id), item]));
  const nowMs = Date.now();
  const events = [];

  for (const match of matches) {
    const sides = resolveBetboomSides(match);
    const tournament = tournamentsById.get(Number(match?.tournament_id));
    const category = categoriesById.get(Number(tournament?.category_id));
    const sport = sportsById.get(Number(category?.sport_id));
    const startMs = Date.parse(String(match?.start_dttm || ""));
    if (!sides || !tournament || !category || !sport || !Number.isFinite(startMs) || startMs < nowMs - 30 * 60 * 1000) continue;
    const [homeStake, awayStake] = sides;
    events.push({
      id: Number(match.id),
      sportId: Number(sport.id),
      sportName: String(sport.name || "Другой спорт"),
      leagueId: Number(tournament.id),
      leagueName: String(tournament.name || category.name || "Другой турнир"),
      team1: String(match.teams.home_team.name),
      team2: String(match.teams.away_team.name),
      startTime: startMs / 1000,
      url: "https://betboom.ru/sport",
      odds: [Number(homeStake.factor), Number(awayStake.factor)]
    });
  }

  return {
    success: true,
    enabled: true,
    events,
    source: {
      endpoint: "matches/get_by_tournament_ids",
      rawEvents: matches.length,
      twoWayEvents: events.length,
      tournamentCoverage: Math.min(directory.tournaments.length, 600),
      totalTournaments: directory.tournaments.length
    },
    updatedAt: Date.now()
  };
}

async function readBetboomEvents() {
  if (!betboomPartner || !betboomAccessToken) {
    const error = new Error("BetBoom partner credentials не настроены");
    error.code = "BETBOOM_CREDENTIALS_MISSING";
    throw error;
  }

  const cacheKey = "betboom:prematch-main-outcomes";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < betboomEventsCacheMs) return cached.value;
  if (betboomInFlight) return betboomInFlight;

  betboomInFlight = (async () => {
    const directory = await readBetboomDirectory();
    const tournamentIds = directory.tournaments.slice(0, 600).map(item => Number(item.id)).filter(Number.isFinite);
    const results = await Promise.allSettled(chunk(tournamentIds, 50).slice(0, 12).map(tournament_ids => (
      postBetboom("matches/get_by_tournament_ids", {
        locale: "ru",
        tournament_ids,
        market_ids: betboomMainMarketIds,
        type: "prematch"
      })
    )));
    const fulfilled = results.filter(result => result.status === "fulfilled").map(result => result.value);
    if (!fulfilled.length && results.length) throw results.find(result => result.status === "rejected")?.reason || new Error("BetBoom не вернул события");
    const uniqueMatches = new Map();
    for (const payload of fulfilled) {
      for (const match of Array.isArray(payload?.matches) ? payload.matches : []) uniqueMatches.set(Number(match.id), match);
    }
    const value = compactBetboomPayload(directory, Array.from(uniqueMatches.values()));
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await betboomInFlight;
  } finally {
    betboomInFlight = null;
  }
}

function normalizeLigaName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

function isRelevantLigaSport(value) {
  return /(футбол|football|soccer|баскет|basket|хоккей|hockey|теннис|tennis|волейбол|volley|бейсбол|baseball|крикет|cricket|кибер|esport|dota|counter|mma|бокс|boxing)/i.test(String(value || ""));
}

function resolveLigaSides(event) {
  const homeName = String(event?.event?.team1 || "").trim();
  const awayName = String(event?.event?.team2 || "").trim();
  if (!homeName || !awayName) return null;

  const marketContainers = Array.isArray(event?.outcomesWinner) ? event.outcomesWinner : [event?.outcomesWinner];
  const groups = [];
  for (const container of marketContainers.filter(Boolean)) {
    const outcomes = Array.isArray(container?.outcomes) ? container.outcomes : [];
    if (outcomes.length) groups.push(outcomes);
  }

  const blocks = Array.isArray(event?.outcomes) ? event.outcomes : Object.values(event?.outcomes || {});
  for (const block of blocks) {
    if (!block || block?.locked === true || block?.corrupted === true) continue;
    const markets = Array.isArray(block?.nsub) ? block.nsub : Object.values(block?.nsub || {});
    for (const market of markets) {
      if (!market || market?.locked === true || market?.corrupted === true || String(market?.type || "").toUpperCase() !== "WIN") continue;
      const outcomes = Array.isArray(market?.nsub) ? market.nsub : Object.values(market?.nsub || {});
      if (outcomes.length) groups.push(outcomes);
    }
  }

  const home = normalizeLigaName(homeName);
  const away = normalizeLigaName(awayName);
  function outcomeLabel(outcome) {
    return normalizeLigaName([outcome?.title, outcome?.adTitle, outcome?.eventTeam, outcome?.outcomeKey].filter(Boolean).join(" "));
  }
  function score(label, team) {
    if (!label || !team) return 0;
    return label === team ? 100 : label.includes(team) || team.includes(label) ? 50 : 0;
  }

  for (const rawGroup of groups) {
    const group = rawGroup.filter(outcome => outcome?.locked !== true && outcome?.corrupted !== true && Number(outcome?.value) > 1);
    if (group.length !== 2) continue;
    const [first, second] = group;
    const firstLabel = outcomeLabel(first);
    const secondLabel = outcomeLabel(second);
    const firstKey = normalizeLigaName(first?.outcomeKey);
    const secondKey = normalizeLigaName(second?.outcomeKey);
    if (/^(w?1|p1|п1|team1|home)$/.test(firstKey) && /^(w?2|p2|п2|team2|away)$/.test(secondKey)) return [first, second];
    if (/^(w?2|p2|п2|team2|away)$/.test(firstKey) && /^(w?1|p1|п1|team1|home)$/.test(secondKey)) return [second, first];
    const direct = score(firstLabel, home) + score(secondLabel, away);
    const reverse = score(firstLabel, away) + score(secondLabel, home);
    if (direct > reverse && direct > 0) return [first, second];
    if (reverse > direct && reverse > 0) return [second, first];
  }
  return null;
}

function compactLigaStavokPayload(indexEvents, detailedEvents) {
  const indexByPrematchId = new Map(indexEvents.map(item => [Number(item?.prematchId), item]));
  const nowMs = Date.now();
  const events = [];

  for (const event of detailedEvents) {
    const sides = resolveLigaSides(event);
    const indexEvent = indexByPrematchId.get(Number(event?.id));
    const team1 = String(event?.event?.team1 || indexEvent?.teams?.[0] || "").trim();
    const team2 = String(event?.event?.team2 || indexEvent?.teams?.[1] || "").trim();
    const rawDate = String(event?.event?.gameDt || indexEvent?.liveDatetime || "").trim();
    const startMs = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(rawDate) ? rawDate : `${rawDate}+03:00`);
    if (!sides || !team1 || !team2 || !Number.isFinite(startMs) || startMs < nowMs - 30 * 60 * 1000) continue;
    const [home, away] = sides;
    events.push({
      id: Number(event.id),
      sportId: Number(event?.gameId || event?.ids?.gameId || indexEvent?.sport?.id || 0),
      sportName: String(event?.gameTitle || indexEvent?.sport?.name || "Другой спорт"),
      leagueId: Number(event?.ids?.tournamentId || indexEvent?.tournament?.id || 0),
      leagueName: String(event?.tournamentTitle || indexEvent?.tournament?.name || "Другой турнир"),
      team1,
      team2,
      startTime: startMs / 1000,
      url: String(indexEvent?.prematchUrl || "https://www.ligastavok.ru/"),
      odds: [Number(home.value), Number(away.value)]
    });
  }

  return {
    success: true,
    enabled: true,
    events,
    source: {
      endpoint: "widget-api/Events + lds-api/actionLines",
      indexedEvents: indexEvents.length,
      requestedEvents: Math.min(indexEvents.length, 600),
      detailedEvents: detailedEvents.length,
      twoWayEvents: events.length
    },
    updatedAt: Date.now()
  };
}

async function readLigaStavokEvents() {
  if (!ligaStavokApiKey) {
    const error = new Error("Ключ API Лиги Ставок не настроен");
    error.code = "LIGA_STAVOK_KEY_MISSING";
    throw error;
  }

  const cacheKey = "ligastavok:prematch-main-outcomes";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < ligaStavokCacheMs) return cached.value;
  if (ligaStavokInFlight) return ligaStavokInFlight;

  ligaStavokInFlight = (async () => {
    const indexUrl = new URL(`${ligaStavokOrigin}/widget-api/Events`);
    indexUrl.searchParams.set("key", ligaStavokApiKey);
    const indexResponse = await fetch(indexUrl, {
      headers: { accept: "application/json", "user-agent": "raznitsa-readonly-market-monitor/0.1" },
      signal: AbortSignal.timeout(25000)
    });
    if (indexResponse.status === 401 || indexResponse.status === 403) throw new Error("Лига Ставок отклонила API-ключ");
    if (!indexResponse.ok) throw new Error(`Лига Ставок ответила ${indexResponse.status}`);

    const rawIndex = await indexResponse.json();
    const nowMs = Date.now();
    const maxDateMs = nowMs + 21 * 24 * 60 * 60 * 1000;
    const indexEvents = (Array.isArray(rawIndex) ? rawIndex : [])
      .filter(item => Number(item?.prematchId) > 0 && Array.isArray(item?.teams) && item.teams.length === 2 && isRelevantLigaSport(item?.sport?.name))
      .filter(item => {
        const timestamp = Date.parse(String(item?.liveDatetime || ""));
        return Number.isFinite(timestamp) && timestamp >= nowMs - 30 * 60 * 1000 && timestamp <= maxDateMs;
      })
      .sort((a, b) => Date.parse(a.liveDatetime) - Date.parse(b.liveDatetime))
      .slice(0, 600);

    const detailedEvents = [];
    for (const batch of chunk(indexEvents.map(item => Number(item.prematchId)), 200)) {
      const url = new URL(`${ligaStavokOrigin}/lds-api/actionLines`);
      url.searchParams.set("key", ligaStavokApiKey);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent": "raznitsa-readonly-market-monitor/0.1"
        },
        body: JSON.stringify({ ids: batch }),
        signal: AbortSignal.timeout(30000)
      });
      if (response.status === 401 || response.status === 403) throw new Error("Лига Ставок отклонила API-ключ");
      if (response.status === 429) throw new Error("Превышен лимит запросов Лиги Ставок (429)");
      if (!response.ok) throw new Error(`Лига Ставок actionLines ответила ${response.status}`);
      const payload = await response.json();
      detailedEvents.push(...(Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : []));
    }

    const value = compactLigaStavokPayload(indexEvents, detailedEvents);
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await ligaStavokInFlight;
  } finally {
    ligaStavokInFlight = null;
  }
}

function compactBetcityPayload(payload) {
  if (!Array.isArray(payload)) throw new Error("Betcity вернул ответ неизвестного формата");

  const nowSeconds = Date.now() / 1000;
  const events = [];
  let rawEvents = 0;

  for (const sport of payload) {
    for (const championship of Array.isArray(sport?.champs) ? sport.champs : []) {
      for (const event of Array.isArray(championship?.events) ? championship.events : []) {
        rawEvents += 1;
        const team1 = String(event?.ht_name || "").trim();
        const team2 = String(event?.at_name || "").trim();
        const startTime = Number(event?.ev_date);
        const home = Number(event?.kf?.["1"]);
        const draw = Number(event?.kf?.X);
        const away = Number(event?.kf?.["2"]);

        if (Number(event?.live) !== 0 || !team1 || !team2) continue;
        if (!Number.isFinite(startTime) || startTime < nowSeconds - 1800) continue;
        if (!Number.isFinite(home) || !Number.isFinite(away) || home <= 1 || away <= 1) continue;
        if (Number.isFinite(draw) && draw > 1) continue;

        events.push({
          id: Number(event?.ev_id),
          sportId: Number(sport?.sp_id || 0),
          sportName: String(sport?.sp_name || "Другой спорт"),
          leagueId: Number(championship?.ch_id || championship?.gl_ch_id || 0),
          leagueName: String(championship?.ch_name || "Другой турнир"),
          team1,
          team2,
          startTime,
          url: String(event?.url || "https://betcity.ru/ru/line"),
          odds: [home, away]
        });
      }
    }
  }

  return {
    success: true,
    enabled: true,
    events,
    source: {
      endpoint: "api/v2/events?rev=1&f=json&coming_days=21",
      rawEvents,
      twoWayPrematchEvents: events.length
    },
    updatedAt: Date.now()
  };
}

async function readBetcityEvents() {
  if (!betcityApiKey) {
    const error = new Error("Ключ API Betcity не настроен");
    error.code = "BETCITY_KEY_MISSING";
    throw error;
  }

  const cacheKey = "betcity:prematch-main-outcomes";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < betcityCacheMs) return cached.value;
  if (betcityInFlight) return betcityInFlight;

  betcityInFlight = (async () => {
    const url = new URL(betcityOrigin);
    url.searchParams.set("rev", "1");
    url.searchParams.set("f", "json");
    url.searchParams.set("coming_days", "21");
    const upstream = await fetch(url, {
      headers: {
        accept: "application/json",
        "accept-encoding": "gzip",
        PRTN: betcityApiKey,
        "user-agent": "raznitsa-readonly-market-monitor/0.1"
      },
      signal: AbortSignal.timeout(25000)
    });
    if (upstream.status === 401 || upstream.status === 403) throw new Error("Betcity отклонил API-ключ");
    if (upstream.status === 429) throw new Error("Превышен лимит запросов Betcity (429)");
    if (!upstream.ok) throw new Error(`Betcity ответил ${upstream.status}`);
    const payload = await upstream.json();
    if (payload?.ok === false && Number(payload?.reply?.error) === 513) throw new Error("Превышен лимит запросов Betcity (513)");
    if (String(payload?.error || payload?.message || "").toLowerCase().includes("not gzip")) throw new Error("Betcity требует Accept-Encoding: gzip");
    const value = compactBetcityPayload(payload);
    cache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  })();

  try {
    return await betcityInFlight;
  } finally {
    betcityInFlight = null;
  }
}

async function handleKalshi(requestUrl, response) {
  if (requestUrl.pathname === "/api/kalshi/events") {
    const seriesTicker = String(requestUrl.searchParams.get("series_ticker") || "").toUpperCase();
    if (!allowedSeries.has(seriesTicker)) {
      sendJson(response, 400, { error: "Неизвестная спортивная серия Kalshi" });
      return true;
    }
    const path = `/events?status=open&series_ticker=${encodeURIComponent(seriesTicker)}&with_nested_markets=true&limit=200`;
    sendJson(response, 200, await readKalshi(path, 15000));
    return true;
  }

  const match = requestUrl.pathname.match(/^\/api\/kalshi\/markets\/([A-Z0-9-]+)\/orderbook$/i);
  if (match) {
    const ticker = match[1].toUpperCase();
    const path = `/markets/${encodeURIComponent(ticker)}/orderbook?depth=100`;
    sendJson(response, 200, await readKalshi(path, 3000));
    return true;
  }

  if (requestUrl.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, service: "raznitsa-readonly-api" });
    return true;
  }
  return false;
}

async function handleRapira(requestUrl, response) {
  if (requestUrl.pathname === "/api/fx/rapira") {
    sendJson(response, 200, await readRapiraRate());
    return true;
  }
  return false;
}

async function handlePredict(requestUrl, response) {
  if (requestUrl.pathname === "/api/predict/status") {
    sendJson(response, 200, { enabled: Boolean(predictApiKey) });
    return true;
  }

  if (requestUrl.pathname === "/api/predict/categories") {
    if (!predictApiKey) {
      sendJson(response, 503, { enabled: false, code: "PREDICT_KEY_MISSING", error: "Добавьте PREDICT_FUN_API_KEY на сервере" });
      return true;
    }
    sendJson(response, 200, await readPredictSportsCategories());
    return true;
  }

  const match = requestUrl.pathname.match(/^\/api\/predict\/markets\/(\d+)\/orderbook$/);
  if (match) {
    if (!predictApiKey) {
      sendJson(response, 503, { enabled: false, code: "PREDICT_KEY_MISSING", error: "Добавьте PREDICT_FUN_API_KEY на сервере" });
      return true;
    }
    const marketId = match[1];
    sendJson(response, 200, await readPredict(`/v1/markets/${marketId}/orderbook`, 3000));
    return true;
  }
  return false;
}

async function handleLeon(requestUrl, response) {
  if (requestUrl.pathname === "/api/leon/events") {
    sendJson(response, 200, await readLeonEvents());
    return true;
  }
  return false;
}

async function handleFonbet(requestUrl, response) {
  if (requestUrl.pathname === "/api/fonbet/events") {
    sendJson(response, 200, await readFonbetEvents());
    return true;
  }
  return false;
}

async function handleZenit(requestUrl, response) {
  if (requestUrl.pathname === "/api/zenit/status") {
    sendJson(response, 200, { enabled: Boolean(zenitFeedKey) });
    return true;
  }
  if (requestUrl.pathname === "/api/zenit/events") {
    if (!zenitFeedKey) {
      sendJson(response, 503, { enabled: false, code: "ZENIT_KEY_MISSING", error: "Добавьте ZENIT_FEED_KEY на сервере" });
      return true;
    }
    sendJson(response, 200, await readZenitEvents());
    return true;
  }
  return false;
}

async function handlePari(requestUrl, response) {
  if (requestUrl.pathname === "/api/pari/status") {
    sendJson(response, 200, { enabled: Boolean(pariApiKey) });
    return true;
  }
  if (requestUrl.pathname === "/api/pari/events") {
    if (!pariApiKey) {
      sendJson(response, 503, { enabled: false, code: "PARI_KEY_MISSING", error: "Добавьте PARI_API_KEY на сервере" });
      return true;
    }
    sendJson(response, 200, await readPariEvents());
    return true;
  }
  return false;
}

async function handleBetboom(requestUrl, response) {
  const enabled = Boolean(betboomPartner && betboomAccessToken);
  if (requestUrl.pathname === "/api/betboom/status") {
    sendJson(response, 200, { enabled });
    return true;
  }
  if (requestUrl.pathname === "/api/betboom/events") {
    if (!enabled) {
      sendJson(response, 503, { enabled: false, code: "BETBOOM_CREDENTIALS_MISSING", error: "Добавьте BETBOOM_PARTNER и BETBOOM_ACCESS_TOKEN на сервере" });
      return true;
    }
    sendJson(response, 200, await readBetboomEvents());
    return true;
  }
  return false;
}

async function handleLigaStavok(requestUrl, response) {
  if (requestUrl.pathname === "/api/ligastavok/status") {
    sendJson(response, 200, { enabled: Boolean(ligaStavokApiKey) });
    return true;
  }
  if (requestUrl.pathname === "/api/ligastavok/events") {
    if (!ligaStavokApiKey) {
      sendJson(response, 503, { enabled: false, code: "LIGA_STAVOK_KEY_MISSING", error: "Добавьте LIGA_STAVOK_API_KEY на сервере" });
      return true;
    }
    sendJson(response, 200, await readLigaStavokEvents());
    return true;
  }
  return false;
}

async function handleBetcity(requestUrl, response) {
  if (requestUrl.pathname === "/api/betcity/status") {
    sendJson(response, 200, { enabled: Boolean(betcityApiKey), transport: new URL(betcityOrigin).protocol });
    return true;
  }
  if (requestUrl.pathname === "/api/betcity/events") {
    if (!betcityApiKey) {
      sendJson(response, 503, { enabled: false, code: "BETCITY_KEY_MISSING", error: "Добавьте BETCITY_API_KEY на сервере" });
      return true;
    }
    sendJson(response, 200, await readBetcityEvents());
    return true;
  }
  return false;
}

async function serveStatic(requestUrl, response) {
  const requested = requestUrl.pathname === "/" ? "index.html" : requestUrl.pathname.replace(/^\/+/, "");
  const relative = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, relative);
  let fileStats;
  try {
    fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const body = await readFile(filePath);
  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Только чтение" });
    return;
  }
  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  try {
    if (requestUrl.pathname.startsWith("/api/") && await handleRapira(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleKalshi(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handlePredict(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleLeon(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleFonbet(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleZenit(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handlePari(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleBetboom(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleLigaStavok(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/") && await handleBetcity(requestUrl, response)) return;
    if (requestUrl.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "API route not found" });
      return;
    }
    await serveStatic(requestUrl, response);
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : "Upstream error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`RAЗНИЦА доступна на http://127.0.0.1:${port}`);
});
