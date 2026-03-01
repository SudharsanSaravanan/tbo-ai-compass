/**
 * Tavily search utility — guarantees exactly 3 local food spots for any destination.
 *
 * Fallback chain (runs until we have 3):
 *   Tier 1 — Tavily structured AI answer (numbered dish list)
 *   Tier 2 — Tavily second call (simpler query, different results)
 *   Tier 3 — TheMealDB area/category search (free, no auth, real dish images)
 *   Tier 4 — Generic pads at destination coordinates (never shows < 3)
 *
 * Images  → TheMealDB first (dish-specific), then Tavily images
 * Geocode → Mapbox Geocoding API with proximity bias
 */

// ─── Types ──────────────────────────────────────────────────────────────────


export interface FoodSpot {
    name: string;
    restaurant: string;
    image: string;
    lat: number;
    lng: number;
}

interface ParsedDish {
    dishName: string;
    description: string;
    restaurantHint: string;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Haversine distance in km between two coordinates. */
export function haversineKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Mapbox geocoding with proximity bias. Exported for use in components. */
export async function mapboxGeocode(
    query: string,
    proximityLng: number,
    proximityLat: number
): Promise<{ lat: number; lng: number } | null> {
    try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        if (!token) return null;
        const url =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
            `${encodeURIComponent(query)}.json` +
            `?access_token=${token}` +
            `&limit=1` +
            `&proximity=${proximityLng},${proximityLat}` +
            `&types=poi,place,locality`;
        const res = await fetch(url);
        const data = await res.json();
        const feature = data.features?.[0];
        if (!feature) return null;
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        return { lat, lng };
    } catch {
        return null;
    }
}

/**
 * Strictly bounded geocode — guaranteed to stay near the destination.
 *
 * Strategy (stops at first success, each tier post-validates distance):
 *
 *  Tier 1 — Mapbox Geocoding with `bbox` parameter (primary)
 *            • No rate limit issues, great hotel/resort/POI coverage
 *            • bbox hard-restricts the search region
 *            • Tries "${place} ${destination}" then "${place}" alone
 *
 *  Tier 2 — Nominatim without bounded=1 (fallback)
 *            • More comprehensive for natural landmarks, temples, beaches
 *            • Post-validates that result is within radiusKm
 *            • Tries "${place} ${destination}" then "${place}" alone
 *
 * Any result farther than `radiusKm` from the destination is rejected.
 */
export async function geocodeNearPoint(
    placeName: string,
    destinationName: string,
    destLat: number,
    destLng: number,
    radiusKm = 120
): Promise<{ lat: number; lng: number } | null> {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((destLat * Math.PI) / 180));
    const minLat = destLat - latDelta;
    const maxLat = destLat + latDelta;
    const minLng = destLng - lngDelta;
    const maxLng = destLng + lngDelta;

    const inRange = (lat: number, lng: number) =>
        haversineKm(destLat, destLng, lat, lng) <= radiusKm;

    // ── Tier 1: Mapbox with bbox (primary) ───────────────────────────────────
    // Mapbox has no strict rate limit for moderate use and covers hotels & POIs well.
    // bbox= forces Mapbox to only return features inside the box (not just biased).
    try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN as string;
        if (token) {
            const bboxStr = `${minLng},${minLat},${maxLng},${maxLat}`;
            const proxStr = `${destLng},${destLat}`;
            // Try with destination appended, then place name alone
            for (const q of [`${placeName} ${destinationName}`, placeName]) {
                const url =
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
                    `?access_token=${token}` +
                    `&limit=5` +
                    `&bbox=${bboxStr}` +
                    `&proximity=${proxStr}` +
                    `&types=poi,place,locality,address`;
                const res = await fetch(url);
                if (!res.ok) continue;
                const data = await res.json();
                for (const f of data.features ?? []) {
                    const [lng, lat] = f.geometry.coordinates as [number, number];
                    if (inRange(lat, lng)) return { lat, lng };
                }
            }
        }
    } catch { /* fall through */ }

    // ── Tier 2: Nominatim without bounded=1 (fallback) ───────────────────────
    // No bounded=1 — less strict, allows Nominatim to search globally but
    // we post-validate the result is within the destination radius.
    // Nominatim is rate-limited to ~1 req/sec; callers must add delays.
    try {
        for (const q of [`${placeName} ${destinationName}`, placeName]) {
            const url =
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(q)}&format=json&limit=5`;
            const res = await fetch(url, { headers: { "User-Agent": "TBO-AI-Compass/1.0" } });
            if (!res.ok) continue;
            const data: { lat: string; lon: string }[] = await res.json();
            for (const item of data) {
                const lat = parseFloat(item.lat);
                const lng = parseFloat(item.lon);
                if (inRange(lat, lng)) return { lat, lng };
            }
        }
    } catch { /* fall through */ }

    return null;
}

// ─── TheMealDB ───────────────────────────────────────────────────────────────

/** Cuisine area keywords → TheMealDB "area" value */
const AREA_MAP: { keywords: string[]; area: string }[] = [
    { keywords: ["india", "goa", "mumbai", "delhi", "chennai", "bangalore", "kolkata", "hyderabad", "rajasthan", "kerala", "tamil", "punjab", "gujarat", "bengal"], area: "Indian" },
    { keywords: ["japan", "tokyo", "osaka", "kyoto"], area: "Japanese" },
    { keywords: ["thai", "bangkok", "pattaya", "phuket", "chiang"], area: "Thai" },
    { keywords: ["china", "beijing", "shanghai", "guangzhou"], area: "Chinese" },
    { keywords: ["italy", "rome", "milan", "venice", "florence"], area: "Italian" },
    { keywords: ["mexico", "cancun", "oaxaca"], area: "Mexican" },
    { keywords: ["france", "paris", "lyon", "nice"], area: "French" },
    { keywords: ["greece", "athens", "santorini"], area: "Greek" },
    { keywords: ["turkey", "istanbul", "ankara"], area: "Turkish" },
    { keywords: ["vietnam", "hanoi", "ho chi minh", "saigon"], area: "Vietnamese" },
    { keywords: ["morocco", "marrakech", "fez"], area: "Moroccan" },
    { keywords: ["spain", "madrid", "barcelona", "seville"], area: "Spanish" },
];

function getTheMealDbArea(destination: string): string {
    const lower = destination.toLowerCase();
    for (const entry of AREA_MAP) {
        if (entry.keywords.some((k) => lower.includes(k))) {
            return entry.area;
        }
    }
    return "Indian"; // generous default — many travellers query Indian destinations
}

async function theMealDbAreaDishes(
    destination: string
): Promise<{ name: string; image: string }[]> {
    try {
        const area = getTheMealDbArea(destination);
        const url = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`;
        const res = await fetch(url);
        const data = await res.json();
        const meals: { strMeal: string; strMealThumb: string }[] = data.meals ?? [];
        // return first 5 so we have headroom for deduplication
        return meals.slice(0, 5).map((m) => ({
            name: m.strMeal,
            image: m.strMealThumb,
        }));
    } catch {
        return [];
    }
}

async function mealDbImage(dishName: string): Promise<string> {
    try {
        const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(dishName)}`;
        const res = await fetch(url);
        const data = await res.json();
        const thumb = data.meals?.[0]?.strMealThumb as string | undefined;
        return thumb ?? "";
    } catch {
        return "";
    }
}

// ─── Dish name validator ─────────────────────────────────────────────────────

/**
 * Returns true only if `name` looks like an actual dish name.
 * Rejects article titles ("20 Famous Kerala Foods"), category names
 * ("Kerala cuisine"), and anything too long / number-prefixed.
 */
function isValidDishName(name: string): boolean {
    if (!name || name.length < 3 || name.length > 55) return false;
    // Must not start with a digit (catches "20 Famous...", "10 Best...")
    if (/^\d/.test(name)) return false;
    // Must not contain bulk article-title / generic words
    if (
        /\b(famous\s+\w+\s+food|foods|cuisine|best|top\s*\d|guide|tips|must.?try|dishes|recipe|restaurant|travel|things|places|visit|street food|snacks|list|overview|introduction)\b/i.test(
            name
        )
    )
        return false;
    // Should be at most 6 words
    if (name.trim().split(/\s+/).length > 6) return false;
    return true;
}

// ─── Answer parser ────────────────────────────────────────────────────────────

function parseDishes(answer: string): ParsedDish[] {
    const results: ParsedDish[] = [];
    const lines = answer.split(/\n+/);

    for (const line of lines) {
        if (results.length >= 3) break;

        const m = line.match(
            /^\s*\d+[.)]\s+\*{0,2}([^\*:\-–—\n]{3,60})\*{0,2}[:\-–—]?\s*(.*)$/
        );
        if (!m) continue;
        const rawName = m[1].trim();
        const rest = m[2].replace(/\*+/g, "").trim();

        if (!isValidDishName(rawName)) continue;

        const atMatch = rest.match(
            /(?:best tried at|best at|try (?:it )?at|where to try|eat (?:it )?at)[:\s]+([^.]+)/i
        );

        results.push({
            dishName: rawName,
            description: rest.slice(0, 140),
            restaurantHint: atMatch ? atMatch[1].trim() : "",
        });
    }
    return results;
}

/** Looser parse — used for the Tier 2 backup call. Strictly validates dish names. */
function parseDishesLoose(answer: string, results: { title: string; content: string }[]): ParsedDish[] {
    // Try structured parse first
    const structured = parseDishes(answer);
    if (structured.length > 0) return structured;

    // Fall back to mining result content for capitalised food-like nouns
    // (never use raw titles — they are almost always article headings)
    const out: ParsedDish[] = [];
    for (const r of results) {
        if (out.length >= 3) break;
        // Look for a food name mentioned inline: "Try [Dish Name]," / "famous for [Dish Name]."
        const m = r.content.match(
            /(?:try|eat|taste|enjoy|order|famous for|known for|speciality[:\s]+)\s+([A-Z][a-zA-Z\s]{2,35}?)(?:[,;.])/
        );
        if (m) {
            const candidate = m[1].trim();
            if (isValidDishName(candidate) && !out.some((o) => o.dishName === candidate)) {
                out.push({ dishName: candidate, description: r.content.slice(0, 120), restaurantHint: "" });
            }
        }
    }
    return out;
}

// ─── Tavily call helper ───────────────────────────────────────────────────────

async function tavilySearch(query: string, key: string) {
    const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            api_key: key,
            query,
            search_depth: "advanced",
            include_answer: "advanced",
            include_images: true,
            max_results: 5,
        }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
        answer?: string;
        images?: string[];
        results?: { title: string; content: string; image?: string }[];
    }>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchFoodSpots(
    destination: string,
    destinationLat: number,
    destinationLng: number
): Promise<FoodSpot[]> {
    const key = import.meta.env.VITE_TAVILY_KEY as string;
    if (!key) return [];

    let parsed: ParsedDish[] = [];
    let tavilyImages: string[] = [];

    try {
        // ── Tier 1: structured AI-answer query ──────────────────────────────────
        const data1 = await tavilySearch(
            `List exactly 3 must-try traditional dishes in ${destination}. ` +
            `Format: "1. [DISH NAME] - [one sentence description]. Best tried at: [restaurant or area in ${destination}]." ` +
            `Give only the 3 items, no preamble.`,
            key
        );
        if (data1) {
            tavilyImages = data1.images ?? [];
            parsed = parseDishes(data1.answer ?? "");

            // Also try mining snippets if answer parsing gave < 3
            if (parsed.length < 3) {
                for (const r of data1.results ?? []) {
                    if (parsed.length >= 3) break;
                    const m = r.content.match(
                        /(?:try|eat|taste|enjoy|famous for|known for)\s+([A-Z][a-zA-Z\s]{2,35}?)(?:[.,;])/
                    );
                    if (m) {
                        const name = m[1].trim();
                        if (isValidDishName(name) && !parsed.some((p) => p.dishName === name)) {
                            parsed.push({ dishName: name, description: r.content.slice(0, 120), restaurantHint: "" });
                        }
                    }
                }
            }
        }

        // ── Tier 2: second Tavily call with different phrasing ──────────────────
        if (parsed.length < 3) {
            const existing = parsed.map((p) => p.dishName).join(", ");
            const data2 = await tavilySearch(
                `What are ${3 - parsed.length} more iconic local foods to eat in ${destination}` +
                (existing ? `, not including ${existing}` : "") +
                `? For each: dish name, short description, where to eat it.`,
                key
            );
            if (data2) {
                if (data2.images?.length) tavilyImages = [...tavilyImages, ...data2.images];
                const more = parseDishesLoose(data2.answer ?? "", data2.results ?? []);
                for (const m of more) {
                    if (parsed.length >= 3) break;
                    if (!parsed.some((p) => p.dishName === m.dishName)) parsed.push(m);
                }
            }
        }

        // ── Tier 3: TheMealDB area search ────────────────────────────────────────
        if (parsed.length < 3) {
            const mdbDishes = await theMealDbAreaDishes(destination);
            for (const m of mdbDishes) {
                if (parsed.length >= 3) break;
                if (!parsed.some((p) => p.dishName.toLowerCase() === m.name.toLowerCase())) {
                    parsed.push({
                        dishName: m.name,
                        description: `A classic dish from the ${getTheMealDbArea(destination)} cuisine — widely loved and easy to find in ${destination}.`,
                        restaurantHint: `Local restaurants in ${destination}`,
                    });
                }
            }
        }

        // ── Tier 4: guaranteed pad ───────────────────────────────────────────────
        const genericNames = [
            `${destination} Street Platter`,
            `${destination} Signature Curry`,
            `Traditional ${destination} Sweet`,
        ];
        while (parsed.length < 3) {
            const idx = parsed.length;
            parsed.push({
                dishName: genericNames[idx] ?? `Local Specialty ${idx + 1}`,
                description: `A crowd favourite in ${destination}. Ask your hotel or locals for the best spots to try it.`,
                restaurantHint: `${destination} old market`,
            });
        }

        // ── Geocode + image for each dish ────────────────────────────────────────
        const spots: FoodSpot[] = [];

        for (let i = 0; i < 3; i++) {
            const { dishName, description, restaurantHint } = parsed[i];

            // Image: TheMealDB → Tavily images → empty
            let image = await mealDbImage(dishName);
            if (!image) image = tavilyImages[i] ?? tavilyImages[0] ?? "";

            // Geocode: restaurant hint → dish restaurant → fallback to destination
            const geo =
                (restaurantHint
                    ? await mapboxGeocode(`${restaurantHint} ${destination}`, destinationLng, destinationLat)
                    : null) ??
                (await mapboxGeocode(`${dishName} restaurant ${destination}`, destinationLng, destinationLat)) ??
                (await mapboxGeocode(`restaurant ${destination}`, destinationLng, destinationLat));

            spots.push({
                name: dishName,
                restaurant: description,
                image,
                lat: geo?.lat ?? destinationLat,
                lng: geo?.lng ?? destinationLng,
            });
        }

        return spots;
    } catch {
        return [];
    }
}
