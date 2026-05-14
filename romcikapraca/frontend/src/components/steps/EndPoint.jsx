import {useState, useEffect} from "react";
import {Frac} from "../Fracs";
import {formatSmartNumber} from "../../utils";

export default function Step5Results({data, calculationMode}){
  const [userGuesses, setUserGuesses] = useState({});
  const [rowFeedback, setRowFeedback] = useState({});
  const [allRevealed, setAllRevealed] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(()=>{
    setUserGuesses({});
    setRowFeedback({});
    setAllRevealed(false);
    setSuccessMsg(false);
    setActiveIndex(0);
  },[data]);

  if(!data?.newton)
    return null;

  const getCorrectValue = (step) =>
    calculationMode === 'epsilon' ? step.epsilon_product : step.xn_next;

  const handleGuessCheck = (iterIndex)=>{
    const step = data.newton.steps[iterIndex];
    const userGuess = parseFloat(userGuesses[iterIndex] || "");

    if(isNaN(userGuess))
      return;

    const correctValue = getCorrectValue(step);
    const tolerance= calculationMode === 'epsilon' ? Math.abs(correctValue) * 0.05 + 1e-9 : 0.01;
    const isCorrect= Math.abs(userGuess - correctValue) <= tolerance;

    if(isCorrect){
      setRowFeedback(prev => ({ ...prev, [iterIndex]: 'correct' }));
      setAllRevealed(true);
      setSuccessMsg(true);
    }else{
      //errorss n autofills
      setRowFeedback(prev=> ({ ...prev, [iterIndex]: 'wrong' }));
      setUserGuesses(prev=> ({ ...prev, [iterIndex]: String(correctValue) }));
      const nextIndex = iterIndex + 1;

      if(nextIndex < data.newton.steps.length){
        setTimeout(()=> setActiveIndex(nextIndex),800);
      }else{
        setTimeout(()=> setAllRevealed(true),800);
      }
    }
  };

  return(
    <div>
      <FormulaBox calculationMode={calculationMode} />

      {successMsg && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(90,184,122,0.14)',
          border: '1px solid var(--color-success)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-success)', fontWeight: 'bold', fontSize: '14px'
        }}>
          Výborne! Správna odpoveď!
        </div>
      )}

      {data.newton.steps?.length > 0 && (
        <>
          <div className="newton-table-title">Priebeh iterácií</div>
          <div className="newton-table-container">
            <table className="newton-table">
              <thead>
                <tr>
                  <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', letterSpacing: 0, fontSize: '14px', fontStyle: 'italic' }}>n</th>
                  <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', letterSpacing: 0, fontSize: '14px', fontStyle: 'italic' }}>x<sub style={{ fontSize: '10px' }}>n</sub></th>
                  <th style={{
                    fontFamily: '"Lora", Georgia, serif',
                    textTransform: 'none',
                    fontStyle: 'italic',
                    fontSize: '13px',
                    letterSpacing: '0',
                    whiteSpace: 'nowrap',
                  }}>
                    {calculationMode === 'epsilon'
                      ? <>f(x<sub style={{ fontSize: '9px' }}>n</sub>&minus;ε)&thinsp;&middot;&thinsp;f(x<sub style={{ fontSize: '9px' }}>n</sub>+ε)</>
                      : <>x<sub style={{ fontSize: '10px' }}>n+1</sub></>}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.newton.steps.map((s, idx) =>{
                  const isActive= !allRevealed && idx === activeIndex;
                  const isCompleted= allRevealed || idx < activeIndex;
                  const isFilled= rowFeedback[idx] === 'wrong' || rowFeedback[idx] === 'correct';
                  const correctVal = getCorrectValue(s);

                  return(
                    <tr key={s.iter}>
                      <td>{s.iter}</td>
                      <td>{formatSmartNumber(s.xn)}</td>
                      <td>
                        {isActive ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                              <input
                                type="number" step="0.000001"
                                value={userGuesses[idx] || ''}
                                onChange={(e)=> {
                                  setUserGuesses({ ...userGuesses, [idx]: e.target.value });
                                  if (rowFeedback[idx] === 'wrong') {
                                    setRowFeedback(prev => ({ ...prev, [idx]: null }));
                                  }
                                }}

                                onKeyDown={(e) => e.key === 'Enter' && handleGuessCheck(idx)}
                                placeholder="?"
                                autoFocus
                                style={{
                                  width: '90px', padding: '4px', textAlign: 'center',
                                  background: 'var(--color-bg)',
                                  border: `1px solid ${rowFeedback[idx] === 'wrong' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                                  borderRadius: '4px', color: 'var(--color-text)', fontSize: '11px'
                                }}

                              />
                              <button onClick={() => handleGuessCheck(idx)} style={{
                                padding: '4px 8px', background: 'var(--color-button)',
                                border: 'none', borderRadius: '4px', color: 'white',
                                fontSize: '11px', cursor: 'pointer'
                              }}>✓</button>

                            </div>
                            {rowFeedback[idx] === 'wrong' && (
                              <span style={{ fontSize: '10px', color: 'var(--color-danger)', fontWeight: 'bold' }}>
                                Nesprávna odpoveď! Správna hodnota: {formatSmartNumber(correctVal)}
                              </span>
                            )}
                          </div>
                        ) : isCompleted || isFilled ? (
                          <span style={{
                            color: rowFeedback[idx] === 'wrong' ? 'var(--color-warning)' : 'var(--color-text)'
                          }}>
                            {calculationMode === 'epsilon'
                              ? formatSmartNumber(s.epsilon_product)
                              : formatSmartNumber(s.xn_next)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-axis)', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {calculationMode === 'iterations' && (
            <ErrorEstimate steps={data.newton.steps} />
          )}

          <div className="newton-result-box" style={{ marginTop: '16px' }}>
            <div>
              <div className="newton-result-root">Nájdený koreň:</div>
              <div className="newton-result-value">α ≈ {formatSmartNumber(data.newton.root,8)}</div>
            </div>
            <div className="text-center">
              <div className="newton-result-iterations-label">Počet iterácií:</div>
              <div className="newton-result-iterations-value">{data.newton.iterations}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const MATH_FONT= '"Lora", Georgia, serif';

function FormulaBox({calculationMode}){
  return(
    <div style={{
      margin: '14px 0', padding: '14px 16px',
      background: 'rgba(33,150,243,0.06)',
      border: '1px solid rgba(33,150,243,0.28)', borderRadius: '10px'
    }}>
      <div style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '12px', fontWeight: 600, textTransform: 'none', letterSpacing: '0.07em' }}>
        Použité vzorce
      </div>


      <div style={{
        fontFamily: MATH_FONT, fontSize: '20px', textAlign: 'center',
        color: '#e8e8f0', padding: '10px 14px', background: 'rgba(33,150,243,0.08)',
        borderRadius: '7px', marginBottom: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
      }}>
        <span style={{ fontStyle: 'italic' }}>x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n+1</sub></span>
        <span style={{ fontStyle: 'normal', fontSize: '18px' }}>=</span>
        <span style={{ fontStyle: 'italic' }}>x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub></span>
        <span style={{ fontStyle: 'normal', fontSize: '18px' }}>&minus;</span>
        <Frac top={<span style={{ fontStyle: 'italic' }}>f(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)</span>}
              bot={<span style={{ fontStyle: 'italic' }}>f&prime;(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)</span>}
              color="#e8e8f0" size="15px" />
      </div>

      {calculationMode === 'epsilon' && (
        <div style={{
          fontFamily: MATH_FONT, fontSize: '17px', textAlign: 'center',
          color: '#c8f0d8', padding: '8px 14px',
          background: 'rgba(0,200,100,0.07)', borderRadius: '7px', marginBottom: '8px',
          fontStyle: 'italic'
        }}>
          f(x<sub style={{ fontStyle: 'normal', fontSize: '10px' }}>n</sub>&thinsp;&minus;&thinsp;ε)&thinsp;&middot;&thinsp;f(x<sub style={{ fontStyle: 'normal', fontSize: '10px' }}>n</sub>&thinsp;+&thinsp;ε)&thinsp;&lt;&thinsp;0
        </div>
      )}

      <div style={{
        fontFamily: MATH_FONT, fontSize: '18px', textAlign: 'center',
        color: '#e8c8f8', padding: '10px 14px', background: 'rgba(156,39,176,0.07)',
        borderRadius: '7px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '6px'
      }}>
        <span style={{ fontStyle: 'italic' }}>|&alpha;&thinsp;&minus;&thinsp;x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>|</span>
        <span style={{ fontStyle: 'normal', fontSize: '16px' }}>&le;</span>
        <Frac top={<span style={{ fontStyle: 'italic' }}>|f(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)|</span>}
              bot={<span style={{ fontStyle: 'italic' }}>m</span>}
              color="#e8c8f8" size="14px" />
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '7px', lineHeight: '1.5', textAlign: 'center' }}>
        kde&nbsp; <span style={{ fontFamily: MATH_FONT, fontStyle: 'italic' }}>m  = min|f&prime;(x)|</span> &nbsp;na intervale
      </div>
    </div>
  );
}

function ErrorEstimate({steps}){
  const [showHelp, setShowHelp] = useState(false);

  const lastStep = steps[steps.length - 1];

  if(lastStep.odhad_chyby == null)
    return null;

  const formatVal = (n)=>{

    if(n == null || isNaN(n))
      return '—';

    const a= Math.abs(n);

    if(a === 0)
      return '0';

    if(a < 1e-4)
      return n.toExponential(4);

    return n.toFixed(8);
  };

  const m= lastStep.m1 != null ? lastStep.m1 : null;
  const fx= lastStep.fx_for_estimate != null ? lastStep.fx_for_estimate : (lastStep.fx != null ? Math.abs(lastStep.fx) : null);
  const fxN = lastStep.iter_for_estimate != null ? lastStep.iter_for_estimate : lastStep.iter;
  const finalN = lastStep.iter + 1;

  const mstr= formatVal(m);
  const fxStr= formatVal(fx);
  const resStr= formatVal(Math.abs(lastStep.odhad_chyby));

  return(
    <div style={{
      marginTop: '16px', padding: '16px',
      background: 'var(--color-panel)',
      border: '1px solid var(--color-border)', borderRadius: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ color: '#ce93d8', fontWeight: 'bold', fontSize: '15px' }}>
          Odhad chyby výsledku
        </div>
        <button
          onClick={()=> setShowHelp(v=> !v)}
          title="Pomocník"
          style={{
            padding: '3px 10px', fontSize: '12px', fontWeight: 'bold',
            background: showHelp ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.12)',
            border: '1px solid var(--color-border)',
            borderRadius: '5px', color: '#ffffff', cursor: 'pointer'
          }}>

          {showHelp ? '✕ Zavrieť' : 'Pomocník'}
        </button>
      </div>

      {showHelp && (
        <div style={{
          marginBottom: '14px', padding: '13px 15px',
          background: 'rgba(156,39,176,0.06)',
          border: '1px solid rgba(156,39,176,0.3)',
          borderRadius: '8px', fontSize: '13px', lineHeight: '1.75',
          color: '#ffffff'
        }}>
          <div style={{ color: '#ce93d8', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
            Ako nájsť m?
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#00e676', fontWeight: 'bold' }}>Krok 1:</span>{' '}
            Vypočítať <strong>f′(x)</strong> na separačnom intervale ⟨a; b⟩.
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#00e676', fontWeight: 'bold' }}>Krok 2:</span>{' '}
            Nájsť minimum absolútnej hodnoty f′(x):
            <div style={{
              fontFamily: 'serif', textAlign: 'center', padding: '6px',
              margin: '6px 0', fontSize: '15px', color: '#00e676',
              background: 'rgba(0,230,118,0.07)', borderRadius: '5px'
            }}>
              m = min<sub>x∈⟨a,b⟩</sub> |f′(x)|
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#ffeb3b', fontWeight: 'bold' }}>Krok 3:</span>{' '}
            Dosadiť do vzorca: <strong>|α − x<sub>n</sub>| ≤ |f(x<sub>n</sub>)| / m</strong>.
          </div>

          <div style={{ background: 'rgba(33,150,243,0.08)', borderRadius: '6px', padding: '10px' }}>
            <div style={{ color: '#2196f3', fontWeight: 'bold', marginBottom: '5px' }}>Poznámka:</div>
            <ul style={{ paddingLeft: '16px', color: '#ffffff' }}>
              <li>Ak <strong>f′(x) &gt; 0</strong> na celom intervale → m = min f′(x)</li>
              <li>Ak <strong>f′(x) &lt; 0</strong> na celom intervale → m = min |f′(x)|</li>
              <li>Ak f′ <strong>mení znamienko</strong> → m môže byť 0 → metóda nekonverguje</li>
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: <>m = min|f′|</>, value: mstr, color: '#00e676' },
          { label: <>|f(x<sub>{fxN}</sub>)|</>, value: fxStr, color: '#2196f3' },
        ].map(({ label, value, color }, i) => (
          <div key={i} style={{ padding: '8px 10px', background: 'var(--color-bg)', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-axis)', marginBottom: '5px', fontSize: '13px' }}>{label}</div>
            <div style={{ color, fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: '8px',
        background: 'rgba(156,39,176,0.12)', textAlign: 'center'
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: '18px', color: '#ce93d8', fontWeight: 'bold'
        }}>
          |&alpha; &minus; x<sub style={{ fontFamily: 'sans-serif', fontSize: '11px' }}>{finalN}</sub>| &le; {resStr}
        </div>
      </div>
    </div>
  );
}