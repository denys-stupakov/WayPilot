import {useState, useEffect, useRef, useCallback} from "react";
import {createPortal} from "react-dom";

const EPSILON_DEFAULT = "0.001";
const EPSILON_MIN = 1e-12;
const EPSILON_MAX = 0.5;
const ITERATIONS_MAX = 15;

function isValidEpsilon(val) {
  const n = parseFloat(val);
  return !isNaN(n) && n > EPSILON_MIN && n < EPSILON_MAX;
}

const DEMO_FN = {
  f:    x => x*x - 2,
  df:   x => 2*x,
  root: 1.4142,
  x0:   2.5,
  xmin: -0.5, xmax: 3.5,
  ymin: -2.5, ymax: 7,
};
const DEMO_NITER = 3;

function LatexFormula({ latex }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trySet = () => {
      if (typeof el.setValue === "function") {
        el.setValue(latex || "", { suppressChangeNotifications: true });
      } else {
        el.setAttribute("value", latex || "");
      }
    };
    if (el.isConnected) trySet();
    else el.addEventListener("mount", trySet, { once: true });
  }, [latex]);
  return (
    <math-field read-only ref={ref} style={{ display:"inline-block", background:"transparent", border:"none", padding:0, fontSize:"inherit", color:"inherit", minWidth:"1em" }} />
  );
}

function DemoCanvas() {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fn = DEMO_FN;
    const W = canvas.offsetWidth || 560;
    const H = 460;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    const { xmin, xmax, ymin, ymax, x0, root } = fn;
    const tx = x => (x - xmin) / (xmax - xmin) * W;
    const ty = y => (1 - (y - ymin) / (ymax - ymin)) * H;

    ctx.fillStyle = "#16161a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let gx = Math.ceil(xmin); gx <= xmax; gx++) { ctx.beginPath(); ctx.moveTo(tx(gx), 0); ctx.lineTo(tx(gx), H); ctx.stroke(); }
    for (let gy = Math.ceil(ymin); gy <= ymax; gy++) { ctx.beginPath(); ctx.moveTo(0, ty(gy)); ctx.lineTo(W, ty(gy)); ctx.stroke(); }

    ctx.fillStyle = "rgba(220,220,224,0.3)";
    ctx.font = "12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    for (let gx = Math.ceil(xmin); gx <= xmax; gx++) {
      if (gx === 0) continue;
      ctx.fillText(gx, tx(gx), ty(0) + 16);
    }
    ctx.textAlign = "right";
    for (let gy = Math.ceil(ymin); gy <= ymax; gy++) {
      if (gy === 0) continue;
      ctx.fillText(gy, tx(0) - 6, ty(gy) + 4);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ty(0)); ctx.lineTo(W, ty(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx(0), 0); ctx.lineTo(tx(0), H); ctx.stroke();

    const aw = 5, ah = 9;
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath(); ctx.moveTo(W, ty(0)); ctx.lineTo(W-ah, ty(0)-aw); ctx.lineTo(W-ah, ty(0)+aw); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx(0), 0); ctx.lineTo(tx(0)-aw, ah); ctx.lineTo(tx(0)+aw, ah); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "rgba(220,220,224,0.45)";
    ctx.font = "13px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";  ctx.fillText("x", W-10, ty(0)-8);
    ctx.textAlign = "center"; ctx.fillText("y", tx(0)+13, 13);

    ctx.strokeStyle = "#7aa5a5";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let first = true;
    for (let px = 0; px <= W; px++) {
      const xv = xmin + (px / W) * (xmax - xmin);
      const yv = fn.f(xv);
      if (yv < ymin - 2 || yv > ymax + 2) { first = true; continue; }
      first ? ctx.moveTo(px, ty(yv)) : ctx.lineTo(px, ty(yv));
      first = false;
    }
    ctx.stroke();

    ctx.fillStyle = "#7aa5a5";
    ctx.font = "13px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText("f(x) = x² − 2", tx(2.6), ty(fn.f(2.6)) - 10);

    const colors = ["#E24B4A","#EF9F27","#1D9E75","#7F77DD"];
    let x = x0;
    const points = [];
    for (let i = 0; i < DEMO_NITER; i++) {
      const fx = fn.f(x), dfx = fn.df(x);
      if (Math.abs(dfx) < 1e-10) break;
      const xnext = x - fx / dfx;
      points.push({ x, fx, xnext, col: colors[i % colors.length], idx: i });
      x = xnext;
      if (Math.abs(fn.f(x)) < 1e-8) break;
    }

    points.forEach(({ x, fx, xnext, col }) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(tx(x), ty(0)); ctx.lineTo(tx(x), ty(fx)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx(x), ty(fx)); ctx.lineTo(tx(xnext), ty(0)); ctx.stroke();
    });

    points.forEach(({ x, fx, xnext, col, idx }) => {
      // Dot on curve
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx(x), ty(fx), 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx(x), ty(fx), 5, 0, Math.PI*2); ctx.stroke();

      // Dot on x-axis
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx(x), ty(0), 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx(x), ty(0), 5, 0, Math.PI*2); ctx.stroke();

      ctx.fillStyle = col;
      ctx.font = "bold 12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("x" + idx, tx(x), ty(0) + 22);
    });

    // Last xnext dot on axis
    if (points.length > 0) {
      const last = points[points.length - 1];
      const col = colors[points.length % colors.length];
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(tx(last.xnext), ty(0), 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(tx(last.xnext), ty(0), 5, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = "bold 12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("x" + points.length, tx(last.xnext), ty(0) + 22);
    }

    ctx.fillStyle = "#6aaa84";
    ctx.beginPath(); ctx.arc(tx(root), ty(0), 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(106,170,132,0.35)"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(tx(root), ty(0), 6, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#6aaa84";
    ctx.font = "bold 13px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("α", tx(root), ty(0) - 12);
  }, []);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:460, borderRadius:8, border:"1px solid #000" }} />
  );
}

function HelperModal({ onClose }) {
  const overlayStyle = {
    position:"fixed", inset:0,
    background:"rgba(0,0,0,0.65)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9999,
  };
  const panelStyle = {
    background:"#202022",
    border:"1px solid #000",
    borderRadius:12,
    width:"min(660px, 94vw)",
    maxHeight:"90vh",
    display:"flex", flexDirection:"column",
    overflow:"hidden",
  };

  const tabs = [
    { key:"theory", label:"Teória" },
    { key:"demo",   label:"Vizualizácia" },
  ];
  const [tab, setTab] = useState("theory");

  return createPortal(
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"1px solid #000", flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:600, color:"#dcdce0", fontFamily:"'IBM Plex Sans',sans-serif" }}>
            Ako funguje Newtonova metóda?
          </span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%", background:"#2e2e30", border:"1px solid #000", color:"#dcdce0", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:"flex", gap:6, padding:"12px 18px 0", flexShrink:0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding:"7px 16px", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? "#2e2e30" : "transparent",
              border: tab === t.key ? "1px solid #474747" : "1px solid transparent",
              borderRadius:7, cursor:"pointer",
              color: tab === t.key ? "#dcdce0" : "rgba(220,220,224,0.45)",
              transition:"all .15s",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding:"18px 18px 22px", overflowY:"auto", flex:1 }}>
          {tab === "theory" && (
            <div>
              <p style={{ fontSize:16, color:"rgba(220,220,224,0.7)", lineHeight:1.65, marginBottom:16, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                Newtonova metóda hľadá koreň rovnice f(x) = 0 tak, že v každom bode vedie dotyčnicu ku krivke a vypočíta jej priesečník s osou x.
              </p>
              <div style={{ background:"#16161a", borderLeft:"3px solid #474747", borderRadius:"0 8px 8px 0", padding:"14px 18px", marginBottom:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <LatexFormula latex="x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}" />
              </div>
              {[
                ["1", "Zvolíme počiatočný bod x₀ v blízkosti koreňa"],
                ["2", "Vedieme dotyčnicu ku krivke f(x) v bode (x₀, f(x₀))"],
                ["3", "Nájdeme priesečník dotyčnice s osou x, teda x₁"],
                ["4", "Opakujeme, kým |f(xₙ)| < ε alebo sa nevykoná n iterácií"],
              ].map(([num, text]) => (
                <div key={num} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                  <div style={{ width:24, height:24, minWidth:24, borderRadius:"50%", background:"rgba(71,71,71,0.35)", border:"1px solid #474747", color:"#7aa5a5", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>{num}</div>
                  <span style={{ fontSize:16, color:"#dcdce0", lineHeight:1.6, paddingTop:2, fontFamily:"'IBM Plex Sans',sans-serif" }}>{text}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "demo" && (
            <div>
              <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, padding:"9px 14px", background:"rgba(71,71,71,0.18)", borderRadius:7, border:"1px solid #474747" }}>
                <span style={{ fontSize:16, color:"rgba(220,220,224,0.7)", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  f(x) = <span style={{ color:"#7aa5a5", fontFamily:"'IBM Plex Mono',monospace" }}>x² − 2</span>
                  <span style={{ margin:"0 14px", color:"rgba(220,220,224,0.25)" }}>|</span>
                  x₀ = <span style={{ color:"#E24B4A", fontFamily:"'IBM Plex Mono',monospace" }}>2.5</span>
                  <span style={{ margin:"0 14px", color:"rgba(220,220,224,0.25)" }}>|</span>
                  iterácie = <span style={{ color:"rgba(220,220,224,0.9)", fontFamily:"'IBM Plex Mono',monospace" }}>3</span>
                </span>
              </div>
              <DemoCanvas />
              <div style={{ display:"flex", alignItems:"center", gap:16, marginTop:10, flexWrap:"wrap" }}>
                <span style={{ fontSize:16, color:"rgba(220,220,224,0.7)", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  Koreň α ≈ <span style={{ color:"#6aaa84", fontFamily:"'IBM Plex Mono',monospace" }}>1.4142</span>
                </span>
                <span style={{ fontSize:16, color:"rgba(255,243,243,0.4)", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                  Prerušovaná čiara je zvislica na krivku. Plná čiara je dotyčnica
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ModeSelector({ calculationMode, epsilonValue, iterationsCount, onModeChange, onEpsilonChange, onIterationsChange }) {
  const [showEpsilonHelp, setShowEpsilonHelp] = useState(false);
  const [epsilonWarning, setEpsilonWarning]   = useState(null);
  const [showHelper, setShowHelper]           = useState(false);

  const handleIterationsChange = (val) => {
    const n = parseInt(val);
    if(isNaN(n)) { onIterationsChange(val); return; }
    onIterationsChange(String(Math.min(ITERATIONS_MAX, Math.max(1, n))));
  };

  const iterNum = parseInt(iterationsCount) || 1;
  const iterAtMax = iterNum >= ITERATIONS_MAX;

  return (
    <div className="mode-selection-card" style={{ position:"relative" }}>
      <div className="mode-selection-title">Vyberte režim výpočtu</div>

      <button
        onClick={() => setShowHelper(true)}
        title="Ako funguje Newtonova metóda?"
        style={{
          position:"absolute", top:14, right:14,
          width:30, height:30, borderRadius:"50%",
          background:"rgba(71,71,71,0.25)",
          border:"1px solid #474747",
          color:"#7aa5a5", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:15, lineHeight:1, transition:"transform .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >?</button>

      {showHelper && <HelperModal onClose={() => setShowHelper(false)} />}

      <button
        onClick={() => onModeChange("epsilon")}
        className={`mode-button ${calculationMode === "epsilon" ? "selected" : ""}`}
      >
        <span className="mode-button-title">Presnosť (ε-kritérium)</span>
        <span className="mode-button-subtitle" style={{ color:"rgba(220,220,224,0.7)" }}>
           Výpočet pokračuje, kým f(x<sub>n</sub>-ε)·f(x<sub>n</sub>+ε) &lt; 0
          <span
            onClick={e => { e.stopPropagation(); setShowEpsilonHelp(!showEpsilonHelp); }}
            style={{ marginLeft:8, padding:"2px 8px", fontSize:12, background:"rgba(122,172,204,0.15)", border:"1px solid #7aa5a5", borderRadius:4, cursor:"pointer", color:"#7aa5a5", display:"inline-block" }}>
            Čo to znamená?
          </span>
        </span>
      </button>

      {showEpsilonHelp && (
        <div style={{ margin:"12px 0", padding:14, background:"rgba(122,172,204,0.08)", border:"2px solid #7aa5a5", borderRadius:8, fontSize:14, lineHeight:1.7, fontFamily:"'IBM Plex Sans',sans-serif" }}>
          <div style={{ fontWeight:600, color:"#7aa5a5", marginBottom:8, fontSize:14 }}>Vysvetlenie ε-kritéria</div>
          <div style={{ marginBottom:8, color:"#dcdce0", fontSize:14 }}>
            Kontroluje, či funkcia <strong>mení znamienko</strong> v malej okolí bodu x<sub>n</sub>.
          </div>
          <div style={{ marginBottom:8, color:"#dcdce0", fontSize:14 }}>
            • f(x<sub>n</sub>−ε) = hodnota tesne <strong>vľavo</strong> od x<sub>n</sub><br/>
            • f(x<sub>n</sub>+ε) = hodnota tesne <strong>vpravo</strong> od x<sub>n</sub>
          </div>
          <div style={{ padding:8, background:"rgba(106,170,132,0.1)", borderRadius:4, marginBottom:8, color:"#dcdce0", fontSize:14 }}>
            <strong>Ak súčin &lt; 0:</strong> hodnoty majú rôzne znamienka tak koreň je veľmi blízko.
          </div>
          <div style={{ fontSize:14, fontStyle:"italic", color:"rgba(220,220,224,0.7)" }}>
            Príklad: f(xₙ−ε) = 0.003, f(xₙ+ε) = −0.002. Súčin = −0.000006 &lt; 0 ✓
          </div>
        </div>
      )}

      <button
        onClick={() => onModeChange("iterations")}
        className={`mode-button ${calculationMode === "iterations" ? "selected" : ""}`}
      >
        <span className="mode-button-title">Pevný počet iterácií (n)</span>
        <span className="mode-button-subtitle" style={{ color:"rgba(220,220,224,0.7)" }}>
          Vykoná odhad chyby po n-tom kroku
        </span>
      </button>

      {calculationMode && (
        <div className="mode-config-panel">
          {calculationMode === "epsilon" ? (
            <>
              <label className="mode-config-label">Zadajte presnosť ε:</label>
              <div className="quick-buttons">
                {[["0.01","10⁻²"],["0.001","10⁻³"],["0.0001","10⁻⁴"]].map(([val, label]) => (
                  <button key={val}
                    onClick={() => { onEpsilonChange(val); setEpsilonWarning(null); }}
                    className={`quick-button ${epsilonValue === val ? "selected" : ""}`}
                    style={{ color: epsilonValue === val ? "#7aa5a5" : "rgba(220,220,224,0.75)", fontWeight: epsilonValue === val ? 600 : 500 }}>
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="number" step="0.000001" value={epsilonValue}
                onChange={e => { onEpsilonChange(e.target.value); setEpsilonWarning(null); }}
                onBlur={e => {
                  const raw = e.target.value;
                  if (raw === "") return;
                  if (!isValidEpsilon(raw)) {
                    setEpsilonWarning(`Neplatná hodnota. Automaticky nastavené na ${EPSILON_DEFAULT}.`);
                    onEpsilonChange(EPSILON_DEFAULT);
                  } else {
                    setEpsilonWarning(null);
                  }
                }}
                className="input-field"
                style={epsilonWarning ? { borderColor:"var(--color-danger)" } : undefined}
              />
              {epsilonWarning && (
                <div style={{ marginTop:6, padding:"8px 12px", background:"rgba(176,106,98,0.13)", border:"1px solid var(--color-danger)", borderRadius:6, fontSize:12, color:"var(--color-danger)", lineHeight:1.5 }}>
                  {epsilonWarning}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="mode-config-label">
                Zadajte počet iterácií n:
                <span style={{ marginLeft:6, fontSize:11, color:"rgba(220,220,224,0.45)", fontWeight:400 }}>
                  (max {ITERATIONS_MAX})
                </span>
              </label>
              <div className="quick-buttons">
                {["2","3","5"].map(val => (
                  <button key={val}
                    onClick={() => handleIterationsChange(val)}
                    className={`quick-button ${iterationsCount === val ? "selected" : ""}`}
                    style={{ color: iterationsCount === val ? "#7aa5a5" : "rgba(220,220,224,0.75)", fontWeight: iterationsCount === val ? 600 : 500 }}>
                    n={val}
                  </button>
                ))}
              </div>
              <input
                type="number" step="1" min="1" max={ITERATIONS_MAX}
                value={iterationsCount}
                onChange={e => handleIterationsChange(e.target.value)}
                className="input-field"
                style={iterAtMax ? { borderColor:"var(--color-warning)" } : undefined}
              />
              {iterAtMax && (
                <div style={{ marginTop:6, padding:"6px 10px", background:"rgba(251,191,36,0.08)", border:"1px solid var(--color-warning)", borderRadius:6, fontSize:12, color:"var(--color-warning)", lineHeight:1.5 }}>
                  Maximálny povolený počet iterácií je {ITERATIONS_MAX}.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}