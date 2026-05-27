import { useState, useEffect } from "react";

// Lineárna interpolácia y v bode x z (zostupne/vzostupne usporiadaného) poľa xs.
function interpAt(xs, ys, x) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length < 2 || x == null) return null;
  const n = xs.length;
  const first = xs[0], last = xs[n - 1];

  // zostupné pole — lineárne prejdeme
  if (last < first) {
    if (x >= first) return ys[0];
    if (x <= last)  return ys[n - 1];
    for (let i = 0; i < n - 1; i++) {
      const xa = xs[i], xb = xs[i + 1];
      if (x <= Math.max(xa, xb) && x >= Math.min(xa, xb)) {
        const span = xb - xa;
        return Math.abs(span) < 1e-15 ? ys[i] : ys[i] + ((x - xa) / span) * (ys[i + 1] - ys[i]);
      }
    }
    return null;
  }

  // vzostupné pole — binárne vyhľadávanie
  if (x <= first) return ys[0];
  if (x >= last)  return ys[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid; else hi = mid;
  }
  const span = xs[hi] - xs[lo];
  if (Math.abs(span) < 1e-15) return ys[lo];
  const t = (x - xs[lo]) / span;
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

export default function Step4StartPoint({
  x0Input, onX0Change, onCalculate,
  convergenceResults, condition3Result, mX, derivativesData
}) {
  const [verified, setVerified]             = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);
  const [guideOpen, setGuideOpen]           = useState(false);
  const [inputError, setInputError]         = useState(null);

  useEffect(() => {
    setVerified(false);
    setVerifiedStatus(null);
    setInputError(null);
  }, [convergenceResults]);

  const convergingInterval = convergenceResults?.intervals?.find(r => r.converges);
  const interval  = convergingInterval?.interval;
  const a         = interval?.[0] ?? null;
  const b         = interval?.[1] ?? null;

  // f(x)·f''(x) v ľubovoľnom bode (interpolácia z načítaných kriviek)
  const productAt = (x) => {
    if (x == null || !derivativesData) return null;
    const f  = interpAt(derivativesData.x0, derivativesData.y0, x);
    const f2 = interpAt(derivativesData.x2, derivativesData.y2, x);
    if (f == null || f2 == null) return null;
    return f * f2;
  };

  const prodA = productAt(a);
  const prodB = productAt(b);

  // --- Odporúčaný štartovací bod: krajný bod kde f(x)·f''(x) > 0 (podmienka štartu) ---
  let recommendedLabel = null;
  let oppositeLabel    = null;

  if (a != null && b != null) {
    if (prodA != null && prodB != null && (prodA > 0 || prodB > 0)) {
      // splnená podmienka len v jednom krajnom bode → ten odporúčame.
      // ak by (zriedkavo) platila v oboch, vyberieme bod s väčšou rezervou.
      const aWins = prodA > 0 && (prodB <= 0 || prodA >= prodB);
      recommendedLabel = aWins ? "a" : "b";
      oppositeLabel    = aWins ? "b" : "a";
    } else if (mX != null) {
      // záloha (ak nie sú dáta derivácií): krajný bod ďalej od m
      const mIsA = Math.abs(mX - a) < 1e-9;
      recommendedLabel = mIsA ? "b" : "a";
      oppositeLabel    = mIsA ? "a" : "b";
    } else {
      recommendedLabel = "b";
      oppositeLabel    = "a";
    }
  }

  const recommendedVal = recommendedLabel === "a" ? a : b;

  const fmt = n => {
    if (n == null) return "?";
    return Number.isInteger(n) ? String(n) : parseFloat(n.toPrecision(8)).toString();
  };

  const getInputValidationError = (val) => {
    if (val === "" || val == null) return null;
    if (val.includes(","))
      return "Použite bodku ako desatinnú čiarku, nie čiarku";
    if ((val.match(/\./g) || []).length > 1)
      return "Neplatný formát čísla: viac ako jedna desatinná bodka.";
    if (/[^0-9.\-eE+]/.test(val))
      return "Číslo môže obsahovať iba cifry, bodku a znamienko mínus.";
    return null;
  };

  const x0val        = parseFloat(x0Input);
  const x0Valid      = !isNaN(x0val) && inputError === null && x0Input !== "";
  const x0InInterval = x0Valid && a != null && b != null && x0val >= a && x0val <= b;

  // Podmienka 3 pre konkrétny zadaný x₀ — počítame lokálne z kriviek,
  // s návratom na prop condition3Result, ak dáta derivácií nie sú dostupné.
  let localCond3 = null;
  if (derivativesData && x0Valid) {
    const p = productAt(x0val);
    if (p != null) localCond3 = p > 1e-12;
  }
  const effectiveCond3 = localCond3 !== null ? localCond3 : condition3Result;

  const handleX0Change = val => {
    setInputError(getInputValidationError(val));
    onX0Change(val);
    setVerified(false);
    setVerifiedStatus(null);
  };

  const handleVerify = () => {
    if (inputError || !x0Valid) { setVerifiedStatus("invalid"); setVerified(true); return; }
    if (!x0InInterval)          { setVerifiedStatus("outside"); setVerified(true); return; }
    setVerifiedStatus("good");
    setVerified(true);
  };

  const applyRecommended = () => {
    if (recommendedVal == null) return;
    onX0Change(String(recommendedVal));
    setInputError(null);
    setVerifiedStatus("good");
    setVerified(true);
  };

  const showCond3Result = verified && verifiedStatus === "good" && effectiveCond3 !== null;

const steps = [
  {
    n: "1",
    title: "Pozri sa na graf f(x) a f″(x)",
    text: "Na separačnom intervale ⟨a; b⟩ má f″(x) stále rovnaké znamienko. Žltá krivka leží celá nad osou x alebo celá pod ňou. Koreň α leží vo vnútri intervalu, takže f(a) a f(b) majú opačné znamienka.",
  },
  {
    n: "2",
    title: "Vyber ten krajný bod, kde f a f″ majú rovnaké znamienko",
    text: "V jednom z krajných bodov separačného intervalu platí f(x₀) · f″(x₀) > 0. Každá iterácia sa pohybuje jedným smerom k riešeniu bez preskokov. Vyber práve ten bod, v ktorom sú obe hodnoty rovnakého znamienka.",
  },
];

  return (
    <div>
      {/* Podmienka box — sivý */}
      <div style={{
        padding: '10px 14px', marginBottom: '12px',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
      }}>
        <div style={{
          fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-faint)',
          letterSpacing: '0.06em', marginBottom: '6px',
        }}>
          Podmienka štartovacieho bodu
        </div>
        <div style={{ textAlign: 'center', fontSize: '19px', color: 'var(--color-text)', marginBottom: '5px' }}>
          f(x₀) · f″(x₀) &gt; 0
        </div>
        <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
          Druhá derivácia a funkčná hodnota musia mať rovnaké znamienko.
        </div>
      </div>

      {/* Collapsible guide */}
      <div style={{
        marginBottom: '14px',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setGuideOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: 'transparent',
            border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 'bold', textAlign: 'left',
          }}
        >
          <span style={{ color: 'var(--color-text)', fontSize: '16px'}}>Ako vybrať správny štartovací bod?</span>
          <span style={{
            fontSize: '15px', color: 'rgba(220,220,224,0.7)',
            padding: '2px 8px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid var(--color-border)',
          }}>
            {guideOpen ? "skryť" : "zobraziť"}
          </span>
        </button>

        {guideOpen && (
          <div style={{
            padding: '0 14px 14px',
            borderTop: '1px solid var(--color-border)',
            fontSize: '15px', color: 'var(--color-text)', lineHeight: '1.7',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {steps.map(({ n, title, text }) => (
                <div key={n} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 'bold', marginTop: '1px',
                  }}>{n}</div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>{title}: </span>
                    <span style={{ color: 'var(--color-text)' }}>{text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input field */}
      <div className="mb-12">
        <label className="input-label">Štartovací bod x{"\u2080"}:</label>
        <input
          type="text"
          inputMode="decimal"
          value={x0Input}
          onChange={e => handleX0Change(e.target.value)}
          className="input-field"
          style={{
            borderColor: inputError
              ? 'var(--color-danger)'
              : !verified ? undefined
              : verifiedStatus === "good"    ? 'var(--color-success)'
              : verifiedStatus === "outside" ? 'var(--color-danger)'
              : undefined
          }}
        />

        {/* ERRORS*/}
        {inputError && (
          <div style={{
            marginTop: '6px', padding: '7px 12px',
            background: 'rgba(255,82,82,0.07)',
            border: '1px solid var(--color-danger)',
            borderRadius: '6px', fontSize: '15px',
            color: 'var(--color-danger)', lineHeight: '1.5',
          }}>
            {"\u2717"} {inputError}
          </div>
        )}
      </div>

      {/*CHECK INTERVALS */}
      {x0Valid && !verified && a != null && b != null && !inputError && (
        <div style={{
          marginBottom: '10px', padding: '7px 12px',
          background: x0InInterval ? 'rgba(0,230,118,0.07)' : 'rgba(255,82,82,0.07)',
          border: `1px solid ${x0InInterval ? 'var(--color-success)' : 'var(--color-danger)'}`,
          borderRadius: '6px', fontSize: '15px', textAlign: 'center',
          color: x0InInterval ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
          {x0InInterval
            ? `\u2713 x\u2080 = ${x0val} \u2208 \u27e8${fmt(a)}; ${fmt(b)}\u27e9`
            : `\u2717 x\u2080 = ${x0val} \u2209 \u27e8${fmt(a)}; ${fmt(b)}\u27e9`}
        </div>
      )}

      {/* Overiť button */}
      {!verified && (
        <button
          onClick={handleVerify}
          className="btn-primary btn-warning"
          disabled={x0Input === "" || !!inputError || !x0Valid}
        >
          Overiť
        </button>
      )}

      {/* Result: invalid number */}
      {verified && verifiedStatus === "invalid" && (
        <>
          <div style={msgStyle("danger")}>{"\u2717"} Zadajte platné číslo pre x{"\u2080"}.</div>
          <button
            onClick={() => { setVerified(false); setVerifiedStatus(null); }}
            className="btn-primary btn-warning"
            style={{ width: '100%' }}
          >
            Zmeniť
          </button>
        </>
      )}

      {/* Result: outside interval */}
      {verified && verifiedStatus === "outside" && (
        <>
          <div style={{
            padding: '12px 14px', marginBottom: '10px',
            background: 'rgba(192,99,90,0.12)', border: '1px solid var(--color-danger)',
            borderRadius: '8px', textAlign: 'center',
            color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '16px',
          }}>
            {"\u2717"} x{"\u2080"} = {x0val} leží mimo intervalu {"\u27e8"}{fmt(a)}; {fmt(b)}{"\u27e9"}
            <div style={{ fontSize: '16px', marginTop: '6px', fontWeight: 'normal', color: 'rgba(220,220,224,0.7)' }}>
              Správny rozsah: od {fmt(a)} do {fmt(b)}.
              {recommendedVal != null && (
                <> Odporúčame: x₀ = <strong style={{ color: 'var(--color-warning)' }}>{fmt(recommendedVal)}</strong></>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {recommendedVal != null && (
              <button
                onClick={applyRecommended}
                className="btn-primary btn-warning"
                style={{ flex: 1 }}
              >
                Použiť x₀ = {fmt(recommendedVal)}
              </button>
            )}
            <button
              onClick={() => { setVerified(false); setVerifiedStatus(null); }}
              style={{
                padding: '8px 14px', background: 'rgba(100,100,100,0.2)',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                color: 'var(--color-text)', cursor: 'pointer', fontSize: '14px',
                flexShrink: 0,
              }}
            >
              Zadať iný
            </button>
          </div>
        </>
      )}

      {/* Result: good — waiting for condition3 */}
      {verified && verifiedStatus === "good" && !showCond3Result && (
        <>
          <div style={msgStyle("success")}>
            {"\u2713"} x{"\u2080"} = {parseFloat(x0Input)} {"\u2208"} {"\u27e8"}{fmt(a)}; {fmt(b)}{"\u27e9"}
          </div>
          {recommendedVal != null && Math.abs(parseFloat(x0Input) - recommendedVal) > 1e-9 && (
            <div style={{
              padding: '10px 14px', marginBottom: '8px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '6px', fontSize: '13px',
              color: 'var(--color-warning)', lineHeight: '1.5',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '15px'}}>
                Odporúčame použiť {recommendedLabel} = {fmt(recommendedVal)}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--color-axis)', marginBottom: '8px' }}>
                V tomto krajnom bode platí f(x₀) · f″(x₀) &gt; 0, zaručená monotónna konvergencia.
              </div>
              <button
                onClick={applyRecommended}
                className="btn-primary btn-warning"
                style={{ width: '100%', fontSize: '15px', padding: '6px 12px' }}
              >
                Použiť x₀ = {fmt(recommendedVal)} namiesto {fmt(parseFloat(x0Input))}
              </button>
            </div>
          )}
        </>
      )}

      {/* Condition 3 result */}
      {showCond3Result && (
        <div style={msgStyle(effectiveCond3 ? "success" : "warning")}>
          {effectiveCond3
            ? "\u2713 f(x\u2080) \u00b7 f\u2033(x\u2080) > 0 \u2014 podmienka 3 splnen\u00e1."
            : "\u26a0 f(x\u2080) \u00b7 f\u2033(x\u2080) \u2264 0 \u2014 sk\u00faste opa\u010dn\u00fd krajn\u00fd bod."}
        </div>
      )}

      {/* Good: action buttons */}
      {verified && verifiedStatus === "good" && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            onClick={() => { setVerified(false); setVerifiedStatus(null); }}
            style={{
              padding: '8px 14px', background: 'rgba(100,100,100,0.2)',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              color: 'var(--color-text)', cursor: 'pointer', fontSize: '15px',
            }}
          >
            Zmeniť
          </button>
          <button onClick={onCalculate} className="btn-primary btn-success" style={{ flex: 1 }}>
            Vypočítať
          </button>
        </div>
      )}
    </div>
  );
}

function msgStyle(type) {
  const map = {
    success: { bg: 'rgba(0,230,118,0.12)',  border: 'var(--color-success)', color: 'var(--color-success)' },
    warning: { bg: 'rgba(212,168,85,0.12)', border: 'var(--color-warning)', color: 'var(--color-warning)' },
    danger:  { bg: 'rgba(192,99,90,0.12)',  border: 'var(--color-danger)',  color: 'var(--color-danger)'  },
  };
  const t = map[type] || map.danger;
  return {
    padding: '10px 14px', marginBottom: '10px',
    background: t.bg, border: `1px solid ${t.border}`,
    borderRadius: '8px', textAlign: 'center',
    color: t.color, fontWeight: 'bold', fontSize: '14px',
  };
}