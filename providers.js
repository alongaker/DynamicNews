/* ================================================================
   providers.js
   Shared by index.html and api-keys.html so both pages always agree
   on which providers exist and where saved keys live.
   ================================================================ */

/* ----------------------------------------------------------------
   DATA PROVIDERS
   Each entry knows how to build a quote URL and how to pull
   { price, prevClose } out of that provider's response shape.
   Add a new provider by adding another entry here — the API Key
   Management page and the board both pick it up automatically.
   ---------------------------------------------------------------- */
const PROVIDERS = {
  finnhub: {
    label: "Finnhub",
    blurb: "Free tier, real-time US quotes.",
    signupUrl: "https://finnhub.io/register",
    buildUrl: (ticker, key) => `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${key}`,
    parse: (data) => ({ price: data.c, prevClose: data.pc }),
    buildHistoryUrl: (ticker, key, from, to) =>
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${key}`,
    parseHistory: (data) => (data && data.s === "ok" && Array.isArray(data.c)) ? data.c : null,
    buildNewsUrl: (ticker, key) => {
      const to = new Date();
      const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const fmt = (d) => d.toISOString().slice(0, 10);
      return `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fmt(from)}&to=${fmt(to)}&token=${key}`;
    },
    parseNews: (data) => {
      if (!Array.isArray(data)) return null;
      return data
        .filter((row) => row && row.headline && row.url)
        .map((row) => ({
          title: String(row.headline).trim(),
          url: row.url,
          source: row.source || "Finnhub",
        }));
    },
  },
  alphavantage: {
    label: "Alpha Vantage",
    blurb: "Free tier, slower rate limit (~25 calls/day).",
    signupUrl: "https://www.alphavantage.co/support/#api-key",
    buildUrl: (ticker, key) => `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${key}`,
    parse: (data) => {
      const q = data["Global Quote"] || {};
      return { price: parseFloat(q["05. price"]), prevClose: parseFloat(q["08. previous close"]) };
    },
    buildHistoryUrl: (ticker, key) =>
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${key}`,
    parseHistory: (data, from) => {
      const series = data && data["Time Series (Daily)"];
      if (!series) return null;
      const fromMs = from * 1000;
      return Object.keys(series)
        .sort()
        .filter((date) => new Date(date).getTime() >= fromMs)
        .map((date) => parseFloat(series[date]["4. close"]))
        .filter((n) => !isNaN(n));
    },
    buildNewsUrl: (ticker, key) =>
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker}&limit=20&apikey=${key}`,
    parseNews: (data) => {
      const feed = data && data.feed;
      if (!Array.isArray(feed)) return null;
      return feed
        .filter((row) => row && row.title && row.url)
        .map((row) => ({
          title: String(row.title).trim(),
          url: row.url,
          source: (row.source && String(row.source)) || "Alpha Vantage",
        }));
    },
  },
  twelvedata: {
    label: "Twelve Data",
    blurb: "Free tier, 800 calls/day.",
    signupUrl: "https://twelvedata.com/pricing",
    buildUrl: (ticker, key) => `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${key}`,
    parse: (data) => ({ price: parseFloat(data.close), prevClose: parseFloat(data.previous_close) }),
    buildHistoryUrl: (ticker, key, from, to) => {
      const start = new Date(from * 1000).toISOString().slice(0, 10);
      const end = new Date(to * 1000).toISOString().slice(0, 10);
      return `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&start_date=${start}&end_date=${end}&order=ASC&apikey=${key}`;
    },
    parseHistory: (data) => {
      const values = data && data.values;
      if (!Array.isArray(values)) return null;
      return values.map((row) => parseFloat(row.close)).filter((n) => !isNaN(n));
    },
    buildNewsUrl: (ticker, key) =>
      `https://api.twelvedata.com/news?symbol=${ticker}&apikey=${key}`,
    parseNews: (data) => {
      const rows = Array.isArray(data) ? data : (data && data.data);
      if (!Array.isArray(rows)) return null;
      return rows
        .filter((row) => row && (row.title || row.headline) && (row.url || row.link))
        .map((row) => ({
          title: String(row.title || row.headline).trim(),
          url: row.url || row.link,
          source: row.source || "Twelve Data",
        }));
    },
  },
  polygon: {
    label: "Polygon.io",
    blurb: "Paid plans for real-time; free tier is end-of-day.",
    signupUrl: "https://polygon.io/pricing",
    buildUrl: (ticker, key) => `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${key}`,
    parse: (data) => {
      const r = (data.results && data.results[0]) || {};
      return { price: r.c, prevClose: r.o };
    },
    buildHistoryUrl: (ticker, key, from, to) => {
      const start = new Date(from * 1000).toISOString().slice(0, 10);
      const end = new Date(to * 1000).toISOString().slice(0, 10);
      return `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${start}/${end}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`;
    },
    parseHistory: (data) => {
      const results = data && data.results;
      if (!Array.isArray(results)) return null;
      return results.map((row) => row.c).filter((n) => typeof n === "number" && !isNaN(n));
    },
    buildNewsUrl: (ticker, key) =>
      `https://api.polygon.io/v2/reference/news?ticker=${ticker}&limit=20&order=desc&apiKey=${key}`,
    parseNews: (data) => {
      const results = data && data.results;
      if (!Array.isArray(results)) return null;
      return results
        .filter((row) => row && row.title && row.article_url)
        .map((row) => ({
          title: String(row.title).trim(),
          url: row.article_url,
          source: (row.publisher && row.publisher.name) || "Polygon",
        }));
    },
  },
};

/* ----------------------------------------------------------------
   STORAGE
   apikeys: { providerId: "key string", ... } — one slot per provider,
   so switching providers later doesn't lose the key you already saved.
   ---------------------------------------------------------------- */
const APIKEYS_STORAGE_KEY = "marketboard_apikeys";
const ACTIVE_PROVIDER_STORAGE_KEY = "marketboard_active_provider";

function loadSavedApiKeys(){
  try{
    const saved = JSON.parse(localStorage.getItem(APIKEYS_STORAGE_KEY));
    return (saved && typeof saved === "object") ? saved : {};
  } catch(err){
    return {};
  }
}

function saveApiKeys(keys){
  localStorage.setItem(APIKEYS_STORAGE_KEY, JSON.stringify(keys));
}

function loadActiveProvider(){
  const saved = localStorage.getItem(ACTIVE_PROVIDER_STORAGE_KEY);
  return (saved && PROVIDERS[saved]) ? saved : "finnhub";
}

function saveActiveProvider(id){
  localStorage.setItem(ACTIVE_PROVIDER_STORAGE_KEY, id);
}

/* ----------------------------------------------------------------
   MULTI-PROVIDER HELPERS
   Active provider is preferred, but any saved key can fill in if the
   active one fails (e.g. Finnhub quotes + Twelve Data history).
   ---------------------------------------------------------------- */
function hasAnySavedApiKey(){
  const keys = loadSavedApiKeys();
  return Object.keys(PROVIDERS).some((id) => keys[id] && String(keys[id]).trim());
}

function orderedProviderIds(){
  const keys = loadSavedApiKeys();
  const active = loadActiveProvider();
  const withKeys = Object.keys(PROVIDERS).filter((id) => keys[id] && String(keys[id]).trim());
  return [
    ...withKeys.filter((id) => id === active),
    ...withKeys.filter((id) => id !== active),
  ];
}
