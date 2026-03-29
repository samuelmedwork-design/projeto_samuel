"use client";
import { PainArea, PainIntensity } from "@/contexts/DataContext";

interface BodyMapProps {
  painAreas: PainArea[];
  size?: "sm" | "md" | "lg";
}

function getPinColor(intensity: PainIntensity): string {
  if (intensity === "baixa") return "#3b82f6";
  if (intensity === "media") return "#eab308";
  return "#ef4444";
}

// Pin coordinates on a 200x460 viewBox
// Segments WITHOUT laterality have a single center coordinate
// Segments WITH laterality have left and right coordinates
const pinCoordinates: Record<string, {
  center?: { x: number; y: number };
  left?: { x: number; y: number };
  right?: { x: number; y: number };
}> = {
  // --- Without laterality ---
  "Olhos":     { center: { x: 100, y: 30 } },
  "Cabeça":    { center: { x: 100, y: 16 } },
  "Pescoço":   { center: { x: 100, y: 52 } },
  "Trapézio":  { center: { x: 100, y: 70 } },
  "Tórax":     { center: { x: 100, y: 108 } },
  "Lombar":    { center: { x: 100, y: 160 } },
  "Nádegas":   { center: { x: 100, y: 200 } },
  // --- With laterality ---
  "Ombros":          { left: { x: 62, y: 78 },  right: { x: 138, y: 78 } },
  "Braços":          { left: { x: 54, y: 105 }, right: { x: 146, y: 105 } },
  "Cotovelos":       { left: { x: 50, y: 132 }, right: { x: 150, y: 132 } },
  "Antebraços":      { left: { x: 46, y: 158 }, right: { x: 154, y: 158 } },
  "Punhos":          { left: { x: 42, y: 185 }, right: { x: 158, y: 185 } },
  "Mãos e Dedos":    { left: { x: 38, y: 206 }, right: { x: 162, y: 206 } },
  "Coxas":           { left: { x: 82, y: 262 }, right: { x: 118, y: 262 } },
  "Joelhos":         { left: { x: 80, y: 316 }, right: { x: 120, y: 316 } },
  "Panturrilhas":    { left: { x: 78, y: 362 }, right: { x: 122, y: 362 } },
  "Tornozelos":      { left: { x: 76, y: 406 }, right: { x: 124, y: 406 } },
  "Pés e Dedos":     { left: { x: 72, y: 436 }, right: { x: 128, y: 436 } },
};

const PIN_RADIUS = 8;

const sizeMap = { sm: 340, md: 460, lg: 580 };

export default function BodyMap({ painAreas, size = "md" }: BodyMapProps) {
  const h = sizeMap[size];
  const w = Math.round(h * (200 / 460));

  // Collect all pins to render
  const pins: { x: number; y: number; color: string; key: string }[] = [];

  for (const pain of painAreas) {
    const coords = pinCoordinates[pain.region];
    if (!coords) continue;

    const color = getPinColor(pain.intensity);

    if (coords.center) {
      // Segment without laterality -- always show center pin
      pins.push({ x: coords.center.x, y: coords.center.y, color, key: `${pain.region}-center` });
    } else {
      // Segment with laterality
      const showLeft =
        pain.side === "esquerdo" || pain.side === "ambos" || pain.side === "nsa";
      const showRight =
        pain.side === "direito" || pain.side === "ambos" || pain.side === "nsa";

      if (showLeft && coords.left) {
        pins.push({ x: coords.left.x, y: coords.left.y, color, key: `${pain.region}-left` });
      }
      if (showRight && coords.right) {
        pins.push({ x: coords.right.x, y: coords.right.y, color, key: `${pain.region}-right` });
      }
    }
  }

  return (
    <svg viewBox="0 0 200 460" width={w} height={h} className="select-none">
      {/* ══ Fixed base silhouette ══ */}
      <g fill="#d4d4d4" stroke="#a3a3a3" strokeWidth="1" strokeLinejoin="round">
        {/* Head */}
        <ellipse cx="100" cy="20" rx="18" ry="22" />
        {/* Neck */}
        <rect x="93" y="42" width="14" height="14" rx="3" />
        {/* Trapezius / shoulders connection */}
        <path d="M93 50 L68 64 Q60 68 58 76 L58 82 Q62 86 68 82 L80 74 L93 68 Z" />
        <path d="M107 50 L132 64 Q140 68 142 76 L142 82 Q138 86 132 82 L120 74 L107 68 Z" />
        {/* Torso */}
        <path d="M80 68 L120 68 L122 140 Q118 148 110 152 L100 154 L90 152 Q82 148 78 140 Z" />
        {/* Abdomen / Lombar */}
        <path d="M82 148 L118 148 L116 190 Q112 198 100 200 Q88 198 84 190 Z" />
        {/* Left arm upper */}
        <path d="M58 82 Q52 92 50 108 L48 126 Q46 134 50 138 L56 136 Q56 126 58 112 L62 96 L66 84 Z" />
        {/* Right arm upper */}
        <path d="M142 82 Q148 92 150 108 L152 126 Q154 134 150 138 L144 136 Q144 126 142 112 L138 96 L134 84 Z" />
        {/* Left forearm */}
        <path d="M48 136 Q44 150 42 168 L40 182 Q38 190 42 192 L48 190 Q48 178 50 164 L52 148 Z" />
        {/* Right forearm */}
        <path d="M152 136 Q156 150 158 168 L160 182 Q162 190 158 192 L152 190 Q152 178 150 164 L148 148 Z" />
        {/* Left hand */}
        <path d="M40 190 Q36 198 34 208 Q34 216 38 218 L46 216 Q48 208 48 200 L46 192 Z" />
        {/* Right hand */}
        <path d="M160 190 Q164 198 166 208 Q166 216 162 218 L154 216 Q152 208 152 200 L154 192 Z" />
        {/* Left thigh */}
        <path d="M86 196 Q82 220 80 250 L78 290 Q78 300 82 304 L88 302 Q88 290 90 258 L92 228 L94 202 Z" />
        {/* Right thigh */}
        <path d="M114 196 Q118 220 120 250 L122 290 Q122 300 118 304 L112 302 Q112 290 110 258 L108 228 L106 202 Z" />
        {/* Left knee */}
        <path d="M78 302 Q76 312 78 324 Q80 330 84 330 L88 328 Q90 320 88 308 L86 302 Z" />
        {/* Right knee */}
        <path d="M122 302 Q124 312 122 324 Q120 330 116 330 L112 328 Q110 320 112 308 L114 302 Z" />
        {/* Left calf */}
        <path d="M78 330 Q76 350 74 375 L74 400 Q76 406 80 406 L84 404 Q84 390 84 370 L86 345 L86 332 Z" />
        {/* Right calf */}
        <path d="M122 330 Q124 350 126 375 L126 400 Q124 406 120 406 L116 404 Q116 390 116 370 L114 345 L114 332 Z" />
        {/* Left ankle */}
        <path d="M74 404 Q72 412 74 420 Q76 424 80 422 L84 420 Q84 414 82 406 Z" />
        {/* Right ankle */}
        <path d="M126 404 Q128 412 126 420 Q124 424 120 422 L116 420 Q116 414 118 406 Z" />
        {/* Left foot */}
        <path d="M72 420 Q68 428 66 436 Q66 444 72 446 L82 444 Q86 440 84 430 L82 422 Z" />
        {/* Right foot */}
        <path d="M128 420 Q132 428 134 436 Q134 444 128 446 L118 444 Q114 440 116 430 L118 422 Z" />
      </g>

      {/* ══ Pain pins ══ */}
      {pins.map((pin) => (
        <g key={pin.key}>
          <circle
            cx={pin.x}
            cy={pin.y}
            r={PIN_RADIUS}
            fill={pin.color}
            stroke="#ffffff"
            strokeWidth="2.5"
          />
        </g>
      ))}
    </svg>
  );
}

/* ── Legend component ── */
export function BodyMapLegend() {
  const items = [
    { color: "#3b82f6", label: "Baixa" },
    { color: "#eab308", label: "Média" },
    { color: "#ef4444", label: "Alta" },
  ];

  return (
    <div className="flex items-center justify-center gap-5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6" fill={item.color} stroke="#ffffff" strokeWidth="2" />
          </svg>
          <span className="text-xs text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
