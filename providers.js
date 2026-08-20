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
  },
  twelvedata: {
    label: "Twelve Data",
    blurb: "Free tier, 800 calls/day.",
    signupUrl: "https://twelvedata.com/pricing",
    buildUrl: (ticker, key) => `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${key}`,
    parse: (data) => ({ price: parseFloat(data.close), prevClose: parseFloat(data.previous_close) }),
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
  },
};

/* ----------------------------------------------------------------
   STORAGE
   apikeys: { providerId: "key string", ... } — one slot per provider,
   so switching providers later doesn't lose the key you already saved.
   ---------------------------------------------------------------- */
const APIKEYS_STORAGE_KEY = "marketboard_apikeys";
const ACTIVE_PROVIDER_STORAGE_KEY = "marketboard_active_provider";
const USE_MOCK_STORAGE_KEY = "marketboard_use_mock";

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

function loadUseMock(){
  const saved = localStorage.getItem(USE_MOCK_STORAGE_KEY);
  if (saved === null) return true; // default to demo data until a key is set active
  return saved === "true";
}

function saveUseMock(val){
  localStorage.setItem(USE_MOCK_STORAGE_KEY, val ? "true" : "false");
}
