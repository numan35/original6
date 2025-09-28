// === project/app/jason-chat.tsx (geo insertions) ===
// Keep your existing file intact. Apply these additions in place.

// 1) Add to imports:
import { getUserLocation } from "@/lib/location"; // or "../lib/location"

// 2) Add to state hooks:
const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

// 3) Add a useEffect to request location once on mount:
useEffect(() => {
  (async () => {
    try {
      const loc = await getUserLocation();
      if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
        setCoords({ lat: loc.lat, lng: loc.lng });
      }
    } catch {/* ignore */}
  })();
}, []);

// 4) When sending request to Jason, merge geo into slots:
const slotsWithGeo = { ...(slots ?? {}) };
if (coords) {
  slotsWithGeo.lat = coords.lat;
  slotsWithGeo.lng = coords.lng;
}
const resp = await callJasonBrain(messages, slotsWithGeo);
