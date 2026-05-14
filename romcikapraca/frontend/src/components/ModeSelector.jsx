import { useState } from "react";

const EPSILON_DEFAULT= "0.000001";
const EPSILON_MIN= 1e-12;
const EPSILON_MAX= 0.5;

function isValidEpsilon(val){
  const n= parseFloat(val);
  return !isNaN(n) && n > EPSILON_MIN && n < EPSILON_MAX;
}

export default function ModeSelector({ calculationMode, epsilonValue, iterationsCount, onModeChange, onEpsilonChange, onIterationsChange }) {
  const [showEpsilonHelp, setShowEpsilonHelp] = useState(false);
  const [epsilonWarning, setEpsilonWarning] = useState(null);

  return(
    <div className="mode-selection-card">
      <div className="mode-selection-title">Vyberte režim výpočtu</div>

      <button
        onClick={() => onModeChange('epsilon')}
        className={`mode-button ${calculationMode === 'epsilon' ? 'selected' : ''}`}
      >
        <span className="mode-button-title">Presnosť (ε-kritérium)</span>
        <span className="mode-button-subtitle">
          Výpočet pokračuje, kým f(x<sub>n</sub>-ε)·f(x<sub>n</sub>+ε) &lt; 0
          <button
            onClick={(e)=> { e.stopPropagation(); setShowEpsilonHelp(!showEpsilonHelp); }}
            style={{
              marginLeft: '8px', padding: '2px 8px', fontSize: '12px',
              background: 'rgba(33,150,243,0.2)', border: '1px solid #2196f3',
              borderRadius: '4px', cursor: 'pointer', color: '#2196f3'
            }}
          >
            Čo to znamená?
          </button>
        </span>
      </button>

      {showEpsilonHelp && (
        <div style={{
          margin: '12px 0', padding: '14px',
          background: 'rgba(33,150,243,0.1)', border: '2px solid #2196f3',
          borderRadius: '8px', fontSize: '13px', lineHeight: '1.7'
        }}>
          <div style={{ fontWeight: 'bold', color: '#2196f3', marginBottom: '8px' }}>
            Vysvetlenie: f(x<sub>n</sub>-ε)·f(x<sub>n</sub>+ε) &lt; 0
          </div>
          <div style={{ marginBottom: '8px' }}>
            Tento vzorec kontroluje, či rovnica <strong>mení znamienko</strong> v malej okolí bodu x<sub>n</sub>.
          </div>
          <div style={{ marginBottom: '8px' }}>
            • f(x<sub>n</sub>-ε) = hodnota rovnice <strong>tesne vľavo</strong> od x<sub>n</sub><br/>
            • f(x<sub>n</sub>+ε) = hodnota rovnice <strong>tesne vpravo</strong> od x<sub>n</sub>
          </div>
          <div style={{ padding: '8px', background: 'rgba(0,230,118,0.15)', borderRadius: '4px', marginBottom: '8px' }}>
            <strong>Ak súčin &lt; 0:</strong> Znamená že hodnoty majú rôzne znamienka (+ a -),<br/>
            čiže rovnica <strong>prechádza cez os X</strong> → koreň je veľmi blízko!
          </div>
          <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-axis)' }}>
            Príklad: f(xₙ-ε)=+0.003, f(xₙ+ε)=-0.002 → Súčin=-0.000006 &lt; 0 ✓ Koreň nájdený!
          </div>
        </div>
      )}

      <button
        onClick={() => onModeChange('iterations')}
        className={`mode-button ${calculationMode === 'iterations' ? 'selected' : ''}`}
      >
        <span className="mode-button-title">Pevný počet iterácií (n)</span>
        <span className="mode-button-subtitle">Vykoná odhad chyby po n-tom kroku</span>
      </button>

      {calculationMode &&(
        <div className="mode-config-panel">
          {calculationMode === 'epsilon' ? (
            <>
              <label className="mode-config-label">Zadajte presnosť ε:</label>
              <div className="quick-buttons">
                {['0.01', '0.001', '0.000001'].map(val=> (
                  <button key={val} onClick={()=> { onEpsilonChange(val); setEpsilonWarning(null); }}
                    className={`quick-button ${epsilonValue === val ? 'selected' : ''}`}>
                    {val === '0.01' ? '10⁻²' : val === '0.001' ? '10⁻³' : '10⁻⁶'}
                  </button>
                ))}
              </div>
              <input
                type="number" step="0.000001" value={epsilonValue}
                onChange={(e)=>{
                  const raw = e.target.value;
                  onEpsilonChange(raw);
                  setEpsilonWarning(null);
                }}
                onBlur={(e)=>{
                  const raw= e.target.value;

                  if(raw === "")
                      return;

                  if(!isValidEpsilon(raw)){
                    setEpsilonWarning(`Zadaná hodnota „${raw}" je neplatná (musí byť medzi 10⁻¹² a 0.5). Automaticky nastavené na ${EPSILON_DEFAULT}.`);
                    onEpsilonChange(EPSILON_DEFAULT);
                  }else{
                    setEpsilonWarning(null);
                  }
                }}

                className="input-field"
                style={epsilonWarning ? { borderColor: 'var(--color-danger)' } : undefined}
              />
              {epsilonWarning && (
                <div style={{
                  marginTop: '6px', padding: '8px 12px',
                  background: 'rgba(192,99,90,0.13)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: '6px', fontSize: '12px',
                  color: 'var(--color-danger)', lineHeight: '1.5',
                }}>
                  {epsilonWarning}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="mode-config-label">Zadajte počet iterácií n:</label>
              <div className="quick-buttons">
                {['5', '10', '20'].map(val=> (
                  <button key={val} onClick={() => onIterationsChange(val)}
                    className={`quick-button ${iterationsCount === val ? 'selected' : ''}`}>
                    n={val}
                  </button>
                ))}
              </div>
              <input type="number" step="1" min="1" value={iterationsCount}
                onChange={(e) => onIterationsChange(e.target.value)} className="input-field" />
            </>
          )}
        </div>
      )}
    </div>
  );
}