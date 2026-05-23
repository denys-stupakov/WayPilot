import{useState} from "react";
import{formatSmartNumber} from "../../utils";

const INTERVAL_MIN = -50;
const INTERVAL_MAX = 50;

function clampInterval(val){
  const n = parseFloat(val);
  if(isNaN(n)) return val;
  return String(Math.min(INTERVAL_MAX, Math.max(INTERVAL_MIN, n)));
}

export default function Step2Intervals({
  intervals, validationResults, attemptCount, expr,
  onUpdateInterval, onAddInterval, onRemoveInterval,
  onValidate, onValidateManual,
}){
  const [activeMode, setActiveMode] = useState('none');
  const [manualResults, setManualResults] = useState(null);
  const [signsA, setSignsA] = useState({});
  const [signsB, setSignsB] = useState({});
  const [manualPassed, setManualPassed] = useState({});
  const [intervalWarnings, setIntervalWarnings] = useState({});

  const getRealSign = (val)=> val > 0 ? "+" : "-";

  const handleIntervalChange = (index, field, val) => {
    onUpdateInterval(index, field, val);
    const n = parseFloat(val);
    if(!isNaN(n) && (n < INTERVAL_MIN || n > INTERVAL_MAX)){
      setIntervalWarnings(prev => ({ ...prev, [`${index}_${field}`]: true }));
    } else {
      setIntervalWarnings(prev => ({ ...prev, [`${index}_${field}`]: false }));
    }
  };

  const handleIntervalBlur = (index, field, val) => {
    const clamped = clampInterval(val);
    if(clamped !== val){
      onUpdateInterval(index, field, clamped);
    }
    setIntervalWarnings(prev => ({ ...prev, [`${index}_${field}`]: false }));
  };

  const handleAutoClick = ()=>{
    setActiveMode('auto');
    setManualResults(null);
    setSignsA({});
    setSignsB({});
    setManualPassed({});
    onValidate();
  };

  const handleManualClick = async()=>{
    setActiveMode('manual');
    setSignsA({});
    setSignsB({});
    setManualPassed({});
    await onValidateManual(setManualResults);
  };

  const checkManualRow = (i, nextA, nextB, results)=>{
    const result = results[i];
    if(!result) return;
    const chosenA = nextA[i];
    const chosenB = nextB[i];
    if(!chosenA || !chosenB) return;
    const realA = getRealSign(result.f_a);
    const realB = getRealSign(result.f_b);
    if(chosenA !== realA || chosenB !== realB) return;
    setManualPassed(prev =>{
      const next = { ...prev, [i]: true };
      const allPassed = results.every((_, idx) => next[idx]);
      if(allPassed) setTimeout(()=> onValidate(), 900);
      return next;
    });
  };

  const SignBtn = ({sign, current, onSet, disabled})=>{
    const isActive = current === sign;
    const activeStyle = isActive
      ? sign === "+"
        ? {background:"rgba(34,197,94,0.15)", borderColor:"var(--color-success)", color:"var(--color-success)"}
        : {background:"rgba(239,68,68,0.15)", borderColor:"var(--color-danger)", color:"var(--color-danger)"}
      : {};
    return(
      <button
        onClick={()=> !disabled && onSet(sign)}
        className="sign-btn"
        style={{...activeStyle, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer'}}
      >
        {sign === "+" ? "+" : "−"}
      </button>
    );
  };

  const hasWarning = Object.values(intervalWarnings).some(Boolean);

  return(
    <div>
      {attemptCount > 0 && attemptCount < 3 && (
        <div style={{
          padding:'10px', background:'rgba(251,191,36,0.1)',
          border:'1px solid var(--color-warning)', borderRadius:'6px',
          marginBottom:'12px', color:'var(--color-warning)',
          fontWeight:'bold', textAlign:'center'
        }}>
          Pokus {attemptCount}/3
        </div>
      )}

      <div className="explanation-box">
        <div className="explanation-title">Čo robíme?</div>
        <div className="explanation-content" style={{color:'#ffffff'}}>
          Hľadáme interval, v ktorých funkcia mení znamienko. Bolzanova veta f(a) · f(b) &lt; 0.<br/>
          Pozrite sa na graf a zadajte interval okolo priesečníka g(x) a h(x).
        </div>
      </div>

      <div className="mb-12" style={{marginTop:'12px'}}>
        <div className="intervals-header">
          <label className="input-label">
            Zadajte interval separácie pre požadovaný koreň:
            <span style={{ marginLeft:6, fontSize:'13px', color:'rgb(255,255,255)', fontWeight:400 }}>
              ({INTERVAL_MIN} až {INTERVAL_MAX})
            </span>
          </label>
        </div>

        {intervals.map((interval, index)=>{
          const warnL1 = intervalWarnings[`${index}_l1`];
          const warnL2 = intervalWarnings[`${index}_l2`];
          return(
            <div key={index}>
              <div className="interval-row">
                <span className="color-axis">α ∈ &lt;</span>
                <input
                  type="number" step="0.1"
                  min={INTERVAL_MIN} max={INTERVAL_MAX}
                  value={interval.l1}
                  onChange={(e)=> handleIntervalChange(index, "l1", e.target.value)}
                  onBlur={(e)=> handleIntervalBlur(index, "l1", e.target.value)}
                  placeholder="a" className="interval-input"
                  style={warnL1 ? { borderColor:'var(--color-warning)' } : undefined}
                />
                <span className="color-axis">;</span>
                <input
                  type="number" step="0.1"
                  min={INTERVAL_MIN} max={INTERVAL_MAX}
                  value={interval.l2}
                  onChange={(e)=> handleIntervalChange(index, "l2", e.target.value)}
                  onBlur={(e)=> handleIntervalBlur(index, "l2", e.target.value)}
                  placeholder="b" className="interval-input"
                  style={warnL2 ? { borderColor:'var(--color-warning)' } : undefined}
                />
                <span className="color-axis">&gt;</span>
              </div>
              {(warnL1 || warnL2) && (
                <div style={{
                  fontSize:'15px', color:'var(--color-warning)',
                  marginTop:'3px', marginLeft:'4px',
                }}>
                  Hodnota bude obmedzená na rozsah {INTERVAL_MIN} až {INTERVAL_MAX}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mode buttons */}
      <div style={{display:'flex', gap:'10px', marginTop:'14px'}}>
        <button
          onClick={handleAutoClick}
          className="btn-primary"
          style={{
            flex:1,
            background: activeMode === 'auto' ? 'var(--color-success)' : 'var(--color-elevated)',
            border: activeMode === 'auto' ? 'none' : '1px solid var(--color-border)',
            color: activeMode === 'auto' ? '#1c1c1e' : 'var(--color-text)',
          }}
        >Overiť automaticky</button>
        <button
          onClick={handleManualClick}
          className="btn-primary"
          style={{
            flex:1,
            background: activeMode === 'manual' ? 'var(--color-warning)' : 'var(--color-elevated)',
            border: activeMode === 'manual' ? 'none' : '1px solid var(--color-border)',
            color: activeMode === 'manual' ? '#1c1c1e' : 'var(--color-text)',
          }}
        >Overiť manuálne</button>
      </div>

      {/* Auto mode results */}
      {activeMode === 'auto' && validationResults && (
        <div className="validation-results-box" style={{marginTop:'12px'}}>
          <div className="validation-title">Overenie intervalov:</div>
          {validationResults.validIntervals.map((result, i)=>(
            <div key={i} className={`validation-item ${result.valid ? 'valid' : 'invalid'}`}>
              {result.domain_error ? (
                <div style={{display:'flex', gap:'10px', alignItems:'flex-start', padding:'4px 0'}}>
                  <div>
                    <div style={{fontWeight:700, fontSize:'16px', color:'var(--color-danger)', marginBottom:'4px'}}>
                      Nedovolená hodnota intervalu
                    </div>
                    <div style={{fontSize:'16px', color:'rgba(220,220,224,0.9)', lineHeight:1.6}}>
                      {result.domain_error}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{marginTop:'12px'}}>
                  <div style={{marginBottom:'10px', fontSize: '17px'}}>
                    <strong>Bolzanova veta:</strong> f(a) · f(b) &lt; 0
                  </div>
                  <div style={{
                    textAlign:'center', fontSize:'20px',
                    color: result.valid ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {formatSmartNumber(result.f_a, 4)} · {formatSmartNumber(result.f_b, 4)}{' '}
                    = {formatSmartNumber(result.f_a * result.f_b, 6)}
                    {result.valid ? ' < 0 ✓' : ' ≥ 0 ✗'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual mode */}
      {activeMode === 'manual' && manualResults && (
        <div style={{marginTop:'16px'}}>
          {manualResults.validIntervals.map((result, i)=>{
            if(result.domain_error){
              return(
                <div key={i} style={{
                  border:'1px solid var(--color-danger)',
                  borderRadius:'6px', padding:'14px',
                  background:'rgba(239,68,68,0.06)',
                  marginBottom:'10px',
                }}>
                  <div style={{display:'flex', gap:'10px', alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700, fontSize:'16px', color:'var(--color-danger)', marginBottom:'4px'}}>
                        Nedovolená hodnota intervalu
                      </div>
                      <div style={{fontSize:'16px', color:'rgba(220,220,224,0.9)', lineHeight:1.6}}>
                        {result.domain_error}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const chosenA   = signsA[i] ?? null;
            const chosenB   = signsB[i] ?? null;
            const realSignA = getRealSign(result.f_a);
            const realSignB = getRealSign(result.f_b);
            const aCorrect  = chosenA != null ? chosenA === realSignA : null;
            const bCorrect  = chosenB != null ? chosenB === realSignB : null;
            const passed    = !!manualPassed[i];

            return(
              <div key={i} style={{
                border:`1px solid ${passed ? 'var(--color-success)' : 'var(--color-border)'}`,
                borderRadius:'6px', padding:'14px',
                background: passed ? 'rgba(90,184,122,0.06)' : 'rgba(255,255,255,0.04)',
                marginBottom:'10px', transition:'all 0.3s',
              }}>
                <div style={{fontSize:'16px', fontWeight:'bold', color:'var(--color-text-secondary)', marginBottom:'12px'}}>
                  Interval ⟨{formatSmartNumber(result.interval[0],1)}; {formatSmartNumber(result.interval[1],1)}⟩. Zvoľte znamienko f(a) a f(b):
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px'}}>
                  <span style={{width:'40px', fontSize:'18px', color:'var(--color-text-secondary)'}}>f(a)</span>
                  <div style={{display:'flex', gap:'6px'}}>
                    <SignBtn sign="+" current={chosenA} disabled={passed} onSet={(s)=>{
                      const nextA = {...signsA, [i]: s};
                      setSignsA(nextA);
                      checkManualRow(i, nextA, signsB, manualResults.validIntervals);
                    }}/>
                    <SignBtn sign="-" current={chosenA} disabled={passed} onSet={(s)=>{
                      const nextA = {...signsA, [i]: s};
                      setSignsA(nextA);
                      checkManualRow(i, nextA, signsB, manualResults.validIntervals);
                    }}/>
                  </div>
                  {chosenA != null && (
                    <span style={{
                      fontSize:'13px', padding:'2px 8px', borderRadius:'4px',
                      background: aCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: aCorrect ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {aCorrect ? "✓" : `Nie — f(a) ${realSignA === "+" ? "> 0" : "< 0"}`}
                    </span>
                  )}
                </div>

                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px'}}>
                  <span style={{width:'40px', fontSize:'18px', color:'var(--color-text-secondary)'}}>f(b)</span>
                  <div style={{display:'flex', gap:'6px'}}>
                    <SignBtn sign="+" current={chosenB} disabled={passed} onSet={(s)=>{
                      const nextB = {...signsB, [i]: s};
                      setSignsB(nextB);
                      checkManualRow(i, signsA, nextB, manualResults.validIntervals);
                    }}/>
                    <SignBtn sign="-" current={chosenB} disabled={passed} onSet={(s)=>{
                      const nextB = {...signsB, [i]: s};
                      setSignsB(nextB);
                      checkManualRow(i, signsA, nextB, manualResults.validIntervals);
                    }}/>
                  </div>
                  {chosenB != null && (
                    <span style={{
                      fontSize:'15px', padding:'2px 8px', borderRadius:'4px',
                      background: bCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: bCorrect ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {bCorrect ? "✓" : `Nie — f(b) ${realSignB === "+" ? "> 0" : "< 0"}`}
                    </span>
                  )}
                </div>

                {passed && (
                  <div style={{paddingTop:'10px', borderTop:'1px solid var(--color-border)'}}>
                    <div style={{marginBottom:'8px'}}><strong>Bolzanova veta:</strong> f(a) · f(b) &lt; 0</div>
                    <div style={{
                      textAlign:'center', fontSize:'18px',
                      color: result.valid ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {formatSmartNumber(result.f_a, 4)} · {formatSmartNumber(result.f_b, 4)}{' '}
                      = {formatSmartNumber(result.f_a * result.f_b, 6)}
                      {result.valid ? ' < 0 ✓' : ' ≥ 0 ✗'}
                    </div>
                  </div>
                )}

                {!passed && chosenA != null && chosenB != null && !(aCorrect && bCorrect) && (
                  <div style={{
                    textAlign:'center', fontSize:'13px', padding:'8px',
                    background:'rgba(239,68,68,0.08)', borderRadius:'4px',
                    color:'var(--color-danger)'
                  }}>
                    Opravte znamienko — výsledok sa zobrazí po správnom výbere.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}