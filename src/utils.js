export const TRIP_META = {
  solo:       { label: 'Solo',       emoji: '🧍', desc: 'solo traveller — prioritise independent, self-paced activities; solo-friendly restaurants and bars where eating alone is comfortable; social spots like rooftop bars or communal eateries; easy navigation tips; optional guided group tours for meeting people.' },
  romantic:   { label: 'Romantic',   emoji: '💑', desc: 'romantic couple — intimate candlelit restaurants, sunset viewpoints, couples experiences, scenic walks, rooftop bars, boat rides, spa visits, and hidden gems away from crowds.' },
  historical: { label: 'Historical', emoji: '🏛', desc: 'history enthusiast — prioritise museums, ancient monuments, archaeological sites, UNESCO heritage sites, guided historical walking tours, and culturally significant landmarks. Include historical context in descriptions.' },
  family:     { label: 'Family',     emoji: '👨‍👩‍👧', desc: 'family with children — child-friendly activities, interactive museums, parks, zoos, theme parks, and restaurants with kids menus. Avoid very long walks; keep pace relaxed. Include tips about stroller access or age suitability.' },
  active:     { label: 'Active',     emoji: '🏃', desc: 'active traveller — hiking trails, cycling routes, water sports, rock climbing, surfing, kayaking, outdoor adventure activities, and sports. Include difficulty level and any equipment needed in descriptions.' }
};

export const BUDGET_META = {
  low:       { label: 'Low Budget',       range: '$0–$50/day',    color: '#68d391', desc: 'hostels or budget guesthouses, street food and local markets, free or low-cost attractions, public transport only. Avoid expensive tourist traps.' },
  medium:    { label: 'Medium Budget',    range: '$50–$100/day',  color: '#f6ad55', desc: 'mid-range hotels or B&Bs, casual sit-down restaurants, mix of paid and free attractions, occasional taxis.' },
  high:      { label: 'High Budget',      range: '$100–$300/day', color: '#a78bfa', desc: 'nice hotels or boutique stays, good restaurants with a full dining experience, premium attractions and experiences, comfortable transport.' },
  unlimited: { label: 'Unlimited Budget', range: '$300+/day',     color: '#60a5fa', desc: 'luxury 5-star hotels, fine dining and Michelin-starred restaurants, exclusive private tours, first-class transport and unique splurge experiences.' }
};

export function hex2rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function parseJSON(raw) {
  const s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(s);
}

export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtDate(s) {
  if (!s) return '';
  try { return new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

export function buildMessages(country, city, arrDate, arrTime, depDate, depTime, budgetTier, tripTypes) {
  const dest       = city ? `${city}, ${country}` : country;
  const nights     = daysBetween(arrDate, depDate);
  const bm         = BUDGET_META[budgetTier] || BUDGET_META.medium;
  const typeDescs  = tripTypes.map(t => TRIP_META[t]?.desc).filter(Boolean).join('\n- ');
  const typeLabels = tripTypes.map(t => TRIP_META[t] ? `${TRIP_META[t].emoji} ${TRIP_META[t].label}` : t).join(', ');

  const system = `You are an expert travel planner. Respond ONLY with valid JSON — no markdown, no code fences, no explanation. Use this exact schema:
{
  "destination": "City, Country",
  "summary": "One vivid sentence evoking this trip",
  "theme": {
    "primary":   "#RRGGBB (vibrant color from country flag/culture, must look good on dark #0f0f1a background)",
    "secondary": "#RRGGBB (second distinctive country color)",
    "accent":    "#RRGGBB (third accent, contrasting)",
    "flag":      "flag emoji",
    "vibe":      "2-4 word evocative description e.g. Romantic & Sophisticated"
  },
  "budget": {
    "currency": "local currency name",
    "symbol":   "currency symbol",
    "estimated_daily": 75,
    "tips":     ["3 practical money tips specific to this budget tier and destination"]
  },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": "Day N – Theme",
      "morning":   { "title":"","description":"","type":"activity|monument|leisure|food","lat":0.0,"lng":0.0 },
      "lunch":     { "name":"","cuisine":"","tip":"","lat":0.0,"lng":0.0 },
      "afternoon": { "title":"","description":"","type":"activity|monument|leisure|food","lat":0.0,"lng":0.0 },
      "dinner":    { "name":"","cuisine":"","tip":"","lat":0.0,"lng":0.0 },
      "evening":   { "title":"","description":"" }
    }
  ]
}
Rules:
- BUDGET TIER: ${bm.label} (${bm.range}). ALL recommendations MUST match this tier: ${bm.desc}
- TRIP TYPE(S): ${typeLabels}. Tailor every activity, restaurant and experience to suit:
- ${typeDescs}
- budget.estimated_daily should be a realistic single number within the tier's range for this destination.
- Use REAL popular restaurants, monuments and attractions with accurate coordinates.
- theme.primary/secondary/accent must be bright/vibrant and readable on a very dark background.
- Arrival day morning: if arriving after 14:00 use "Arrival & Hotel Check-in" for morning.
- Departure day: omit afternoon if departing before 12:00; omit lunch too if before 10:00.
- Day labels must have evocative themes that reflect the trip type(s) e.g. "Day 2 – Ancient Ruins & Local Markets".
- Descriptions 1-2 sentences, enthusiastic. Restaurant tips: best dish, booking advice, or timing.
- lat/lng must be accurate real-world coordinates for each location.`;

  const user = `Plan a ${nights}-night ${typeLabels} trip to ${dest}. Arrival: ${arrDate} at ${arrTime}. Departure: ${depDate} at ${depTime}. Budget: ${bm.label} (${bm.range}). Return only the JSON.`;
  return { system, user };
}

// encodeURIComponent ensures non-ASCII characters (e.g. Japanese city names) survive btoa
export function encodeShareData(tripData) {
  return btoa(encodeURIComponent(JSON.stringify(tripData)));
}

// Mirrors encodeShareData: atob → decodeURIComponent → JSON.parse
export function decodeShareData(hash) {
  const encoded = hash.startsWith('#') ? hash.slice(1) : hash;
  return JSON.parse(decodeURIComponent(atob(encoded)));
}
