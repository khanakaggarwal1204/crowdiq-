import { useState, useEffect, useRef, useCallback } from "react";


const LOCATIONS = [
 { id: 1, name: "Connaught Place", type: "Commercial District", lat: 28.6315, lng: 77.2167, icon: "CP", zone: "Central Delhi", capacity: 12000 },
 { id: 2, name: "Rajiv Chowk Metro", type: "Transit Hub", lat: 28.6330, lng: 77.2194, icon: "RC", zone: "Central Delhi", capacity: 8000 },
 { id: 3, name: "Select Citywalk", type: "Retail Mall", lat: 28.5290, lng: 77.2195, icon: "SC", zone: "South Delhi", capacity: 6000 },
 { id: 4, name: "India Gate", type: "Tourist Attraction", lat: 28.6129, lng: 77.2295, icon: "IG", zone: "Central Delhi", capacity: 15000 },
 { id: 5, name: "Lajpat Nagar", type: "Market District", lat: 28.5677, lng: 77.2433, icon: "LN", zone: "South Delhi", capacity: 9000 },
 { id: 6, name: "Kashmere Gate ISBT", type: "Bus Terminal", lat: 28.6681, lng: 77.2284, icon: "KG", zone: "North Delhi", capacity: 5000 },
 { id: 7, name: "AIIMS Hospital", type: "Healthcare Facility", lat: 28.5672, lng: 77.2100, icon: "AH", zone: "South Delhi", capacity: 4000 },
 { id: 8, name: "Hauz Khas Village", type: "Social District", lat: 28.5494, lng: 77.2001, icon: "HK", zone: "South Delhi", capacity: 3000 },
 { id: 9, name: "Chandni Chowk", type: "Heritage Market", lat: 28.6506, lng: 77.2334, icon: "CC", zone: "Old Delhi", capacity: 18000 },
 { id: 10, name: "Cyber Hub", type: "Food & Lifestyle", lat: 28.4944, lng: 77.0880, icon: "CH", zone: "Gurugram", capacity: 4500 },
 { id: 11, name: "Sarojini Nagar", type: "Market District", lat: 28.5717, lng: 77.1908, icon: "SN", zone: "South Delhi", capacity: 7000 },
 { id: 12, name: "Lotus Temple", type: "Tourist Attraction", lat: 28.5535, lng: 77.2588, icon: "LT", zone: "South Delhi", capacity: 10000 },
];


const TABS = [
 { id: "overview", label: "Live Overview", icon: "◉" },
 { id: "predict", label: "Predictive Analytics", icon: "◈" },
 { id: "alternatives", label: "Smart Routing", icon: "◎" },
 { id: "transit", label: "Transit Intel", icon: "◫" },
 { id: "heatmap", label: "Density Matrix", icon: "▦" },
 { id: "ai", label: "AI Command", icon: "◆" },
];


function sr(seed) { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); }


function getCrowd(id, hour, day = 0) {
 const peaks = [9, 10, 13, 14, 17, 18, 19, 20];
 const base = sr(id * 137 + hour * 31 + day * 97);
 const score = peaks.includes(hour) ? 0.45 + base * 0.52 : 0.08 + base * 0.48;
 return Math.min(Math.max(score, 0.04), 0.97);
}


function getUSI(id, hour) {
 const c = getCrowd(id, hour);
 const n = c * 0.75 + sr(id + hour + 51) * 0.25;
 const cg = c * 0.85 + sr(id + hour + 101) * 0.15;
 const w = c * 0.7 + sr(id + hour + 151) * 0.3;
 const s = 1 - (c * 0.35 + sr(id + hour + 201) * 0.15);
 return {
   usi: Math.round((c * 0.3 + n * 0.2 + cg * 0.25 + w * 0.15 + (1 - s) * 0.1) * 100),
   crowd: Math.round(c * 100), noise: Math.round(n * 100),
   congestion: Math.round(cg * 100), wait: Math.max(2, Math.round(w * 35)),
   safety: Math.round(s * 100), footfall: Math.round(c * (LOCATIONS.find(l => l.id === id)?.capacity || 5000)),
 };
}


function crowdColor(score) {
 if (score < 0.25) return "#00d4a8";
 if (score < 0.45) return "#00b4d8";
 if (score < 0.65) return "#f59e0b";
 if (score < 0.80) return "#f97316";
 return "#ef4444";
}


function crowdLabel(score) {
 if (score < 0.25) return "Optimal";
 if (score < 0.45) return "Light";
 if (score < 0.65) return "Moderate";
 if (score < 0.80) return "Dense";
 return "Critical";
}


function StatusPill({ score }) {
 const color = crowdColor(score);
 const label = crowdLabel(score);
 return (
   <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 3, background: color + "15", border: `1px solid ${color}40`, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color, textTransform: "uppercase", fontFamily: "inherit" }}>
     <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
     {label}
   </span>
 );
}


function MeterBar({ value, max = 100, color = "#00d4a8" }) {
 return (
   <div style={{ position: "relative", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
     <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(value / max) * 100}%`, background: `linear-gradient(90deg, ${color}90, ${color})`, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
   </div>
 );
}


function Sparkline({ id, hour }) {
 const points = [];
 const w = 80, h = 28;
 const hrs = Array.from({ length: 12 }, (_, i) => Math.max(0, hour - 5 + i));
 const scores = hrs.map(hh => getCrowd(id, hh));
 const min = Math.min(...scores), max = Math.max(...scores);
 const range = max - min || 0.1;
 scores.forEach((s, i) => {
   const x = (i / (scores.length - 1)) * w;
   const y = h - ((s - min) / range) * (h - 4) - 2;
   points.push(`${x},${y}`);
 });
 const current = getCrowd(id, hour);
 const col = crowdColor(current);
 return (
   <svg width={w} height={h} style={{ overflow: "visible" }}>
     <defs>
       <linearGradient id={`sg${id}`} x1="0" y1="0" x2="0" y2="1">
         <stop offset="0%" stopColor={col} stopOpacity="0.3" />
         <stop offset="100%" stopColor={col} stopOpacity="0" />
       </linearGradient>
     </defs>
     <polyline points={points.join(" ")} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
   </svg>
 );
}


function RingGauge({ value, size = 56, label, sublabel }) {
 const r = (size - 6) / 2;
 const circ = 2 * Math.PI * r;
 const pct = Math.min(value, 100) / 100;
 const color = value < 33 ? "#00d4a8" : value < 66 ? "#f59e0b" : "#ef4444";
 return (
   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
     <div style={{ position: "relative", width: size, height: size }}>
       <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
         <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
         <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
           strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`} strokeLinecap="round"
           style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 4px ${color}80)` }} />
       </svg>
       <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
         <span style={{ fontSize: size * 0.23, fontWeight: 700, color, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
       </div>
     </div>
     {label && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>{label}</div>}
   </div>
 );
}


function OverviewTab({ hour }) {
 const [selected, setSelected] = useState(null);
 const sorted = [...LOCATIONS].sort((a, b) => getCrowd(b.id, hour) - getCrowd(a.id, hour));


 return (
   <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap: 16, transition: "all 0.3s" }}>
     <div>
       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
         {sorted.map((loc, idx) => {
           const score = getCrowd(loc.id, hour);
           const usi = getUSI(loc.id, hour);
           const color = crowdColor(score);
           const isSelected = selected?.id === loc.id;
           return (
             <div key={loc.id} onClick={() => setSelected(isSelected ? null : loc)}
               style={{ padding: "14px 16px", background: isSelected ? "rgba(0,212,168,0.05)" : "rgba(10,12,18,0.9)", cursor: "pointer", borderLeft: isSelected ? `2px solid #00d4a8` : "2px solid transparent", transition: "all 0.15s" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                   <div style={{ width: 32, height: 32, borderRadius: 6, background: color + "15", border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color, letterSpacing: "0.03em", fontFamily: "'JetBrains Mono', monospace" }}>
                     {loc.icon}
                   </div>
                   <div>
                     <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em", marginBottom: 1 }}>{loc.name}</div>
                     <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>{loc.type}</div>
                   </div>
                 </div>
                 <div style={{ textAlign: "right" }}>
                   <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-0.03em", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{usi.crowd}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.25)" }}>%</span></div>
                 </div>
               </div>
               <MeterBar value={usi.crowd} color={color} />
               <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
                 <StatusPill score={score} />
                 <div style={{ display: "flex", gap: 12 }}>
                   <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>USI <span style={{ color: "rgba(255,255,255,0.6)" }}>{usi.usi}</span></span>
                   <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>~<span style={{ color: "rgba(255,255,255,0.6)" }}>{usi.wait}</span>m</span>
                   <Sparkline id={loc.id} hour={hour} />
                 </div>
               </div>
             </div>
           );
         })}
       </div>
     </div>


     {selected && (
       <div style={{ background: "rgba(10,12,18,0.95)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 20, position: "sticky", top: 0, height: "fit-content" }}>
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
           <div>
             <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 3 }}>{selected.name}</div>
             <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{selected.zone} · {selected.type}</div>
           </div>
           <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
         </div>


         {(() => {
           const usi = getUSI(selected.id, hour);
           const metrics = [
             { label: "Crowd Density", value: usi.crowd, color: crowdColor(getCrowd(selected.id, hour)) },
             { label: "Noise Index", value: usi.noise, color: "#a855f7" },
             { label: "Congestion", value: usi.congestion, color: "#f97316" },
             { label: "Safety Score", value: usi.safety, color: "#00d4a8" },
           ];
           return (
             <>
               <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 24, padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                 <RingGauge value={usi.usi} size={64} label="Stress Index" />
                 <div style={{ textAlign: "center" }}>
                   <div style={{ fontSize: 28, fontWeight: 800, color: crowdColor(getCrowd(selected.id, hour)), fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{usi.crowd}%</div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Live Crowd</div>
                   <div style={{ marginTop: 8 }}><StatusPill score={getCrowd(selected.id, hour)} /></div>
                 </div>
                 <div style={{ textAlign: "center" }}>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{usi.wait}<span style={{ fontSize: 14, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>m</span></div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Wait</div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>{usi.footfall.toLocaleString()} ppl</div>
                 </div>
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                 {metrics.map(m => (
                   <div key={m.label}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                       <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{m.label}</span>
                       <span style={{ fontSize: 11, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</span>
                     </div>
                     <MeterBar value={m.value} color={m.color} />
                   </div>
                 ))}
               </div>
               <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(0,212,168,0.04)", border: "1px solid rgba(0,212,168,0.12)", borderRadius: 6 }}>
                 <div style={{ fontSize: 9, color: "#00d4a8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>AI Recommendation</div>
                 <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                   {usi.crowd > 70 ? `High crowd density detected. Best to visit after ${hour < 20 ? "8 PM" : "10 AM"}.` : usi.crowd > 45 ? "Moderate congestion. Expect short waits at key entry points." : "Optimal conditions. Good time to visit."}
                 </div>
               </div>
             </>
           );
         })()}
       </div>
     )}
   </div>
 );
}


function PredictTab({ hour }) {
 const [loc, setLoc] = useState(LOCATIONS[0]);
 const [day, setDay] = useState(0);
 const hours = Array.from({ length: 17 }, (_, i) => i + 6);
 const scores = hours.map(h => getCrowd(loc.id, h, day));
 const best = hours[scores.indexOf(Math.min(...scores))];
 const worst = hours[scores.indexOf(Math.max(...scores))];
 const maxH = 120;


 return (
   <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
     <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
       <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
         <select value={loc.id} onChange={e => setLoc(LOCATIONS.find(l => l.id == e.target.value))}
           style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.85)", fontSize: 12, outline: "none", cursor: "pointer", appearance: "none" }}>
           {LOCATIONS.map(l => <option key={l.id} value={l.id} style={{ background: "#0d1117" }}>{l.icon} — {l.name}</option>)}
         </select>
       </div>
       <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: 3 }}>
         {["Today", "Tomorrow", "+2 Days"].map((d, i) => (
           <button key={i} onClick={() => setDay(i)}
             style={{ padding: "7px 16px", borderRadius: 4, border: "none", background: day === i ? "rgba(0,212,168,0.12)" : "transparent", color: day === i ? "#00d4a8" : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.15s" }}>
             {d}
           </button>
         ))}
       </div>
     </div>


     <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
       {[
         { label: "Peak Hours", value: `${worst}:00`, sub: `${Math.round(getCrowd(loc.id, worst, day) * 100)}% capacity`, color: "#ef4444" },
         { label: "Optimal Window", value: `${best}:00`, sub: `${Math.round(getCrowd(loc.id, best, day) * 100)}% capacity`, color: "#00d4a8" },
         { label: "Current Load", value: `${Math.round(getCrowd(loc.id, hour, day) * 100)}%`, sub: getUSI(loc.id, hour).footfall.toLocaleString() + " estimated ppl", color: crowdColor(getCrowd(loc.id, hour, day)) },
       ].map((card, i) => (
         <div key={i} style={{ padding: "16px", background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
           <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>{card.label}</div>
           <div style={{ fontSize: 26, fontWeight: 800, color: card.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{card.value}</div>
           <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{card.sub}</div>
         </div>
       ))}
     </div>


     <div style={{ background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "20px 20px 14px" }}>
       <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Hourly Crowd Forecast · {loc.name}</div>
       <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: maxH + 20 }}>
         {hours.map(h => {
           const s = getCrowd(loc.id, h, day);
           const barH = Math.max(4, Math.round(s * maxH));
           const color = crowdColor(s);
           const isCurrent = h === hour && day === 0;
           const isOptimal = h === best;
           return (
             <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
               {isOptimal && <div style={{ position: "absolute", top: -18, fontSize: 8, color: "#00d4a8", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>▼ BEST</div>}
               <div style={{ width: "100%", height: barH, borderRadius: "3px 3px 0 0", background: isCurrent ? `linear-gradient(180deg, #fff 0%, ${color} 100%)` : `linear-gradient(180deg, ${color}cc 0%, ${color}60 100%)`, boxShadow: isCurrent ? `0 0 12px ${color}50` : "none", transition: "height 0.5s cubic-bezier(0.4,0,0.2,1)", position: "relative" }}>
                 {isCurrent && <div style={{ position: "absolute", top: -1, left: 0, right: 0, height: 2, background: "#fff", borderRadius: 2 }} />}
               </div>
               <span style={{ fontSize: 8, color: isCurrent ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>{h}</span>
             </div>
           );
         })}
       </div>
       <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
         {[["Low", "#00d4a8"], ["Moderate", "#f59e0b"], ["High", "#f97316"], ["Critical", "#ef4444"]].map(([l, c]) => (
           <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
             <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
             <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>{l}</span>
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}


function AlternativesTab({ hour }) {
 const [threshold, setThreshold] = useState(60);
 const sorted = [...LOCATIONS].sort((a, b) => getCrowd(a.id, hour) - getCrowd(b.id, hour));
 const overcrowded = sorted.filter(l => getCrowd(l.id, hour) * 100 > threshold).reverse();
 const clear = sorted.filter(l => getCrowd(l.id, hour) * 100 <= threshold);


 return (
   <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
     <div style={{ padding: "16px 20px", background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
         <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Overcrowding Threshold</div>
         <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: threshold > 70 ? "#ef4444" : threshold > 45 ? "#f59e0b" : "#00d4a8" }}>{threshold}%</div>
       </div>
       <input type="range" min={20} max={90} step={5} value={threshold} onChange={e => setThreshold(+e.target.value)}
         style={{ width: "100%", accentColor: "#00d4a8", cursor: "pointer" }} />
       <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>
         <span>20%</span><span>55%</span><span>90%</span>
       </div>
     </div>


     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
       <div>
         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
           <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
           <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Overcrowded — {overcrowded.length} locations</span>
         </div>
         {overcrowded.length === 0 ? (
           <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 8 }}>No overcrowded locations</div>
         ) : overcrowded.map(loc => {
           const s = getCrowd(loc.id, hour);
           const usi = getUSI(loc.id, hour);
           return (
             <div key={loc.id} style={{ padding: "12px 14px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, marginBottom: 6 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                 <div>
                   <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{loc.name}</div>
                   <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{loc.zone}</div>
                 </div>
                 <div style={{ textAlign: "right" }}>
                   <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{usi.crowd}%</div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>~{usi.wait}m wait</div>
                 </div>
               </div>
               <MeterBar value={usi.crowd} color="#ef4444" />
             </div>
           );
         })}
       </div>
       <div>
         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
           <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4a8", boxShadow: "0 0 8px #00d4a8" }} />
           <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>Recommended — {clear.length} locations</span>
         </div>
         {clear.length === 0 ? (
           <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 12, border: "1px dashed rgba(255,255,255,0.06)", borderRadius: 8 }}>All locations at capacity</div>
         ) : clear.map(loc => {
           const s = getCrowd(loc.id, hour);
           const usi = getUSI(loc.id, hour);
           const color = crowdColor(s);
           return (
             <div key={loc.id} style={{ padding: "12px 14px", background: "rgba(0,212,168,0.03)", border: `1px solid ${color}25`, borderRadius: 6, marginBottom: 6 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                 <div>
                   <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{loc.name}</div>
                   <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{loc.zone}</div>
                 </div>
                 <div style={{ textAlign: "right" }}>
                   <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{usi.crowd}%</div>
                   <StatusPill score={s} />
                 </div>
               </div>
               <MeterBar value={usi.crowd} color={color} />
             </div>
           );
         })}
       </div>
     </div>
   </div>
 );
}


function TransitTab({ hour }) {
 const routes = [
   { from: "Rajiv Chowk", to: "Kashmere Gate ISBT", mode: "Yellow Line", type: "Metro", dur: "22 min", stops: 4 },
   { from: "Hauz Khas", to: "Connaught Place", mode: "Yellow Line", type: "Metro", dur: "18 min", stops: 3 },
   { from: "AIIMS", to: "India Gate", mode: "Route 505", type: "Bus", dur: "35 min", stops: 7 },
   { from: "Lajpat Nagar", to: "Sarojini Nagar", mode: "Auto", type: "Road", dur: "12 min", stops: 0 },
   { from: "Chandni Chowk", to: "Cyber Hub", mode: "Yellow + Rapid", type: "Metro", dur: "52 min", stops: 11 },
   { from: "Lotus Temple", to: "Select Citywalk", mode: "Route 534", type: "Bus", dur: "28 min", stops: 5 },
 ];
 const hubs = LOCATIONS.filter(l => ["Transit Hub", "Bus Terminal"].includes(l.type));


 return (
   <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
       {hubs.map(loc => {
         const s = getCrowd(loc.id, hour);
         const usi = getUSI(loc.id, hour);
         const color = crowdColor(s);
         return (
           <div key={loc.id} style={{ padding: "16px", background: "rgba(10,12,18,0.8)", border: `1px solid ${color}20`, borderRadius: 8, borderLeft: `3px solid ${color}` }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
               <div>
                 <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{loc.name}</div>
                 <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, letterSpacing: "0.04em" }}>{loc.type.toUpperCase()}</div>
               </div>
               <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{usi.crowd}%</div>
                 <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>~{usi.wait}m wait</div>
               </div>
             </div>
             <MeterBar value={usi.crowd} color={color} />
             <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
               <StatusPill score={s} />
               <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>{usi.footfall.toLocaleString()} ppl</span>
             </div>
           </div>
         );
       })}
     </div>


     <div style={{ background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
       <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
         <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Active Route Intelligence · {hour}:00</span>
       </div>
       {routes.map((r, i) => {
         const congestion = sr(i * 73 + hour * 41);
         const color = crowdColor(congestion);
         const typeColor = r.type === "Metro" ? "#3b82f6" : r.type === "Bus" ? "#f59e0b" : "#a855f7";
         return (
           <div key={i} style={{ padding: "14px 18px", borderBottom: i < routes.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div style={{ flex: 1 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                 <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{r.from}</span>
                 <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>→</span>
                 <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{r.to}</span>
               </div>
               <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                 <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 3, background: typeColor + "15", color: typeColor, fontWeight: 700, letterSpacing: "0.04em" }}>{r.type}</span>
                 <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{r.mode}</span>
                 {r.stops > 0 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{r.stops} stops</span>}
               </div>
             </div>
             <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "'JetBrains Mono', monospace" }}>{r.dur}</div>
               </div>
               <StatusPill score={congestion} />
             </div>
           </div>
         );
       })}
     </div>
   </div>
 );
}


function HeatmapTab({ hour }) {
 const hours = [7, 9, 11, 13, 15, 17, 19, 21, 23];
 const avgUSI = Math.round(LOCATIONS.reduce((s, l) => s + getUSI(l.id, hour).usi, 0) / LOCATIONS.length);
 const busiest = LOCATIONS.reduce((b, l) => getCrowd(l.id, hour) > getCrowd(b.id, hour) ? l : b);
 const quietest = LOCATIONS.reduce((b, l) => getCrowd(l.id, hour) < getCrowd(b.id, hour) ? l : b);


 return (
   <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
       {[
         { label: "City USI", value: avgUSI, sub: "Urban Stress Index", color: avgUSI > 66 ? "#ef4444" : avgUSI > 33 ? "#f59e0b" : "#00d4a8" },
         { label: "Busiest Node", value: busiest.name.split(" ")[0], sub: `${Math.round(getCrowd(busiest.id, hour) * 100)}% capacity`, color: "#ef4444" },
         { label: "Quietest Node", value: quietest.name.split(" ")[0], sub: `${Math.round(getCrowd(quietest.id, hour) * 100)}% capacity`, color: "#00d4a8" },
       ].map((c, i) => (
         <div key={i} style={{ padding: "16px", background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
           <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>{c.label}</div>
           <div style={{ fontSize: 24, fontWeight: 800, color: c.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 4 }}>{c.value}</div>
           <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{c.sub}</div>
         </div>
       ))}
     </div>


     <div style={{ background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "18px", overflowX: "auto" }}>
       <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>Crowd Density Matrix · All Locations × Time</div>
       <div style={{ display: "grid", gridTemplateColumns: "130px repeat(9, 1fr)", gap: 2, minWidth: 600 }}>
         <div />
         {hours.map(h => (
           <div key={h} style={{ textAlign: "center", fontSize: 9, color: h === hour ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", fontWeight: h === hour ? 700 : 400, paddingBottom: 6, borderBottom: h === hour ? "2px solid #00d4a8" : "1px solid transparent" }}>{h}:00</div>
         ))}
         {LOCATIONS.map(loc => (
           <>
             <div key={`label-${loc.id}`} style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
               <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginRight: 5, fontFamily: "'JetBrains Mono', monospace" }}>{loc.icon}</span>
               {loc.name.length > 14 ? loc.name.slice(0, 13) + "…" : loc.name}
             </div>
             {hours.map(h => {
               const s = getCrowd(loc.id, h);
               const col = crowdColor(s);
               const isCurrent = h === hour;
               return (
                 <div key={h} title={`${loc.name} at ${h}:00 — ${Math.round(s * 100)}%`}
                   style={{ height: 22, borderRadius: 3, background: col, opacity: 0.12 + s * 0.75, outline: isCurrent ? `1px solid ${col}60` : "none", transition: "opacity 0.3s", cursor: "default" }} />
               );
             })}
           </>
         ))}
       </div>
       <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
         {[["Optimal", "#00d4a8"], ["Light", "#00b4d8"], ["Moderate", "#f59e0b"], ["Dense", "#f97316"], ["Critical", "#ef4444"]].map(([l, c]) => (
           <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
             <div style={{ width: 12, height: 12, borderRadius: 2, background: c, opacity: 0.7 }} />
             <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>{l}</span>
           </div>
         ))}
       </div>
     </div>


     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
       {LOCATIONS.map(loc => {
         const usi = getUSI(loc.id, hour);
         const color = usi.usi < 33 ? "#00d4a8" : usi.usi < 66 ? "#f59e0b" : "#ef4444";
         return (
           <div key={loc.id} style={{ padding: "12px 10px", background: "rgba(10,12,18,0.8)", border: `1px solid ${color}15`, borderRadius: 8, textAlign: "center" }}>
             <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: color + "80", marginBottom: 4, letterSpacing: "0.1em" }}>{loc.icon}</div>
             <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 6, lineHeight: 1.3 }}>{loc.name.length > 13 ? loc.name.slice(0, 12) + "…" : loc.name}</div>
             <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{usi.usi}</div>
             <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 2, letterSpacing: "0.06em" }}>USI</div>
             <div style={{ marginTop: 8 }}><MeterBar value={usi.usi} color={color} /></div>
           </div>
         );
       })}
     </div>
   </div>
 );
}


function AITab({ hour }) {
 const [messages, setMessages] = useState([]);
 const [input, setInput] = useState("");
 const [loading, setLoading] = useState(false);
 const endRef = useRef(null);


 const systemPrompt = `You are CrowdIQ Intelligence Engine, an enterprise AI advisor for urban mobility and crowd analytics in Delhi NCR, India.
Current time: ${hour}:00. Live sensor data:
${LOCATIONS.map(l => {
   const u = getUSI(l.id, hour);
   return `• ${l.name} [${l.type}]: Crowd ${u.crowd}%, USI ${u.usi}/100, Footfall ~${u.footfall.toLocaleString()}, Wait ${u.wait}min`;
 }).join("\n")}


You provide precise, data-driven recommendations. Be concise and authoritative. Use bullet points. Reference specific numbers from the data.`;


 useEffect(() => {
   const busy = LOCATIONS.filter(l => getUSI(l.id, hour).crowd > 70);
   const clear = LOCATIONS.filter(l => getUSI(l.id, hour).crowd < 30);
   setMessages([{
     role: "assistant", content: `**CrowdIQ Intelligence Engine · Active**\n\nLive city scan at **${hour}:00** complete. Monitoring ${LOCATIONS.length} nodes across Delhi NCR.\n\n**Critical alerts:** ${busy.length > 0 ? busy.map(l => l.name).join(", ") + ` (>${70}% capacity)` : "None"}\n\n**Low congestion:** ${clear.length > 0 ? clear.map(l => l.name).join(", ") : "All locations moderate+"}\n\nQuery the system for crowd forecasts, optimal routing, or urban stress analysis.`
   }]);
 }, []);


 useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);


 async function send() {
   if (!input.trim() || loading) return;
   const userMsg = { role: "user", content: input };
   const next = [...messages, userMsg];
   setMessages(next);
   setInput("");
   setLoading(true);
   try {
     const res = await fetch("https://api.anthropic.com/v1/messages", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: next.map(m => ({ role: m.role, content: m.content })) }),
     });
     const data = await res.json();
     setMessages(prev => [...prev, { role: "assistant", content: data.content?.[0]?.text || "No response received." }]);
   } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please retry." }]); }
   setLoading(false);
 }


 const quick = ["What's the best time to visit Chandni Chowk?", "Rajiv Chowk Metro crowd status?", "Safest route to AIIMS right now?", "Top 3 least crowded locations?"];


 function renderMsg(text) {
   return text.split("\n").map((line, i) => {
     const parts = line.split(/\*\*(.*?)\*\*/g);
     return (
       <div key={i} style={{ marginBottom: line === "" ? 8 : 2, lineHeight: 1.65 }}>
         {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{p}</strong> : <span key={j}>{p}</span>)}
       </div>
     );
   });
 }


 return (
   <div style={{ display: "flex", flexDirection: "column", height: 580, background: "rgba(10,12,18,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
     <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
       <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d4a8", boxShadow: "0 0 8px #00d4a8" }} />
       <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>CrowdIQ AI Engine · Live</span>
       <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace" }}>{LOCATIONS.length} nodes · {hour}:00</span>
     </div>


     <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
       {messages.map((msg, i) => (
         <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
           {msg.role === "assistant" && (
             <div style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(0,212,168,0.1)", border: "1px solid rgba(0,212,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2, fontSize: 9, color: "#00d4a8", fontWeight: 800 }}>IQ</div>
           )}
           <div style={{
             maxWidth: "78%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 3px 12px" : "3px 12px 12px 12px",
             background: msg.role === "user" ? "rgba(0,212,168,0.1)" : "rgba(255,255,255,0.04)",
             border: msg.role === "user" ? "1px solid rgba(0,212,168,0.2)" : "1px solid rgba(255,255,255,0.06)",
             fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6,
           }}>
             {renderMsg(msg.content)}
           </div>
         </div>
       ))}
       {loading && (
         <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
           <div style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(0,212,168,0.1)", border: "1px solid rgba(0,212,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#00d4a8", fontWeight: 800 }}>IQ</div>
           <div style={{ display: "flex", gap: 3, padding: "8px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "3px 12px 12px 12px" }}>
             {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#00d4a8", opacity: 0.6, animation: `pulse 1.2s ${i * 0.3}s infinite` }} />)}
           </div>
         </div>
       )}
       <div ref={endRef} />
     </div>


     <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
       <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
         {quick.map((q, i) => (
           <button key={i} onClick={() => setInput(q)}
             style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer", letterSpacing: "0.01em", transition: "all 0.15s", fontFamily: "inherit" }}>
             {q}
           </button>
         ))}
       </div>
       <div style={{ display: "flex", gap: 8 }}>
         <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
           placeholder="Query crowd intelligence..."
           style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.8)", fontSize: 12, outline: "none", fontFamily: "inherit", letterSpacing: "0.01em" }} />
         <button onClick={send} disabled={loading || !input.trim()}
           style={{ padding: "10px 20px", borderRadius: 6, background: loading || !input.trim() ? "rgba(0,212,168,0.05)" : "rgba(0,212,168,0.12)", border: `1px solid ${loading || !input.trim() ? "rgba(0,212,168,0.1)" : "rgba(0,212,168,0.3)"}`, color: loading || !input.trim() ? "rgba(0,212,168,0.3)" : "#00d4a8", fontSize: 11, fontWeight: 700, cursor: loading || !input.trim() ? "default" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.15s", fontFamily: "inherit" }}>
           Send
         </button>
       </div>
     </div>
   </div>
 );
}


export default function App() {
 const [tab, setTab] = useState("overview");
 const [now, setNow] = useState(new Date());
 useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
 const hour = now.getHours();
 const totalBusy = LOCATIONS.filter(l => getCrowd(l.id, hour) > 0.65).length;
 const avgUSI = Math.round(LOCATIONS.reduce((s, l) => s + getUSI(l.id, hour).usi, 0) / LOCATIONS.length);
 const usiColor = avgUSI < 33 ? "#00d4a8" : avgUSI < 66 ? "#f59e0b" : "#ef4444";


 return (
   <div style={{ fontFamily: "'Syne', 'DM Sans', system-ui, sans-serif", background: "#080b12", minHeight: "100vh", color: "rgba(255,255,255,0.75)" }}>
     <style>{`
       @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
       * { box-sizing: border-box; margin: 0; padding: 0; }
       body { background: #080b12; }
       ::-webkit-scrollbar { width: 3px; height: 3px; }
       ::-webkit-scrollbar-track { background: transparent; }
       ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
       select option { background: #0d1117; color: rgba(255,255,255,0.8); }
       @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
       @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
       input::placeholder { color: rgba(255,255,255,0.2); }
       input:focus { border-color: rgba(0,212,168,0.3) !important; }
     `}</style>


     <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,11,18,0.95)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
       <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
               <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4a8", boxShadow: "0 0 10px #00d4a8", animation: "pulse 2s infinite" }} />
               <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff", fontFamily: "'Syne', sans-serif" }}>CROWD<span style={{ color: "#00d4a8" }}>IQ</span></span>
             </div>
             <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
             <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>Delhi NCR Urban Intelligence</span>
           </div>
           <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
             {[
               { label: "City USI", val: avgUSI, color: usiColor, mono: true },
               { label: "Busy Nodes", val: `${totalBusy}/${LOCATIONS.length}`, color: totalBusy > 6 ? "#ef4444" : "#f59e0b", mono: true },
               { label: "Updated", val: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), color: "rgba(255,255,255,0.5)", mono: true },
             ].map((s, i) => (
               <div key={i} style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 2 }}>{s.label}</div>
                 <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: s.mono ? "'JetBrains Mono', monospace" : "inherit", letterSpacing: "-0.01em" }}>{s.val}</div>
               </div>
             ))}
           </div>
         </div>
       </div>
     </div>


     <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 0" }}>
       <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: 4, width: "fit-content" }}>
         {TABS.map(t => (
           <button key={t.id} onClick={() => setTab(t.id)}
             style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: tab === t.id ? "rgba(0,212,168,0.1)" : "transparent", color: tab === t.id ? "#00d4a8" : "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", borderBottom: tab === t.id ? "1px solid rgba(0,212,168,0.3)" : "1px solid transparent" }}>
             <span style={{ fontSize: 12, opacity: tab === t.id ? 1 : 0.5 }}>{t.icon}</span>
             {t.label}
           </button>
         ))}
       </div>


       <div style={{ animation: "fadein 0.25s ease" }} key={tab}>
         {tab === "overview" && <OverviewTab hour={hour} />}
         {tab === "predict" && <PredictTab hour={hour} />}
         {tab === "alternatives" && <AlternativesTab hour={hour} />}
         {tab === "transit" && <TransitTab hour={hour} />}
         {tab === "heatmap" && <HeatmapTab hour={hour} />}
         {tab === "ai" && <AITab hour={hour} />}
       </div>


       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
         <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>CROWDIQ v2.0 · DELHI NCR · {LOCATIONS.length} ACTIVE SENSORS</span>
         <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono', monospace" }}>REFRESH 30s · AI-POWERED ANALYTICS</span>
       </div>
     </div>
   </div>
 );
}




