import {useState, useEffect, useRef} from "react";
import {Frac} from "../Fracs";
import {formatSmartNumber} from "../../utils";

function getDecimalPlaces(epsilon, mode){
  if(mode !== 'epsilon') return 8;
  if(epsilon >= 0.01)     return 4;
  if(epsilon >= 0.001)    return 6;
  if(epsilon >= 0.000001) return 8;
  return 10;
}

function formatCriterion(val, mode, decimalPlaces){
  if(val == null || isNaN(val)) return '—';
  return val.toFixed(decimalPlaces);
}

function formatXn(val, decimalPlaces){
  if(val == null || isNaN(val)) return '—';
  return val.toFixed(decimalPlaces);
}

export default function Step5Results({data, calculationMode, epsilonValue, onRevealIndexChange}){
  const [userGuesses, setUserGuesses]  = useState({});
  const [rowFeedback, setRowFeedback]  = useState({});
  const [allRevealed, setAllRevealed]  = useState(false);
  const [successMsg,  setSuccessMsg]   = useState(false);
  const [activeIndex, setActiveIndex]  = useState(0);
  const [wrongFlash,  setWrongFlash]   = useState(null);
  const consecutiveCorrect = useRef(0);
  const wrongTimer   = useRef(null);
  const successTimer = useRef(null);

  const isIterMode = calculationMode === 'iterations';

  useEffect(()=>{
    setUserGuesses({});
    setRowFeedback({});
    setAllRevealed(false);
    setSuccessMsg(false);
    // в режиме iterations строка n=0 (x0) дана сразу — активной становится строка n=1
    setActiveIndex(isIterMode ? 1 : 0);
    setWrongFlash(null);
    consecutiveCorrect.current = 0;
    clearTimeout(wrongTimer.current);
    clearTimeout(successTimer.current);
    if(onRevealIndexChange) onRevealIndexChange(0);
  },[data, calculationMode]);

  useEffect(()=>{
    if(onRevealIndexChange){
      const steps = data?.newton?.steps ?? [];
      if(isIterMode){
        // индекс шага = activeIndex - 1 (строка n соответствует steps[n-1].xn_next)
        onRevealIndexChange(allRevealed ? steps.length : Math.max(0, activeIndex - 1));
      } else {
        onRevealIndexChange(allRevealed ? steps.length : activeIndex);
      }
    }
  }, [activeIndex, allRevealed]);

  if(!data?.newton) return null;

  const steps = data.newton.steps || [];
  const epsilonNum    = parseFloat(epsilonValue) || 0.000001;
  const decimalPlaces = getDecimalPlaces(epsilonNum, calculationMode);

  // ---- iterations: последовательность x0..xN ----
  // строка n=0 -> steps[0].xn (x0, дано)
  // строка n=k (k>=1) -> steps[k-1].xn_next (xk, угадывается)
  const totalIterRows = steps.length + 1; // x0..xN
  const criterionDecimalPlaces = decimalPlaces + 1;
  const getIterValue = (n) =>
    n === 0 ? steps[0].xn : steps[n - 1].xn_next;

  // ---- epsilon ----
  const getCorrectValue = (step) =>
    calculationMode === 'epsilon' ? step.epsilon_product : step.xn_next;

  const autoFillAll = () => {
    setAllRevealed(true);
    if(onRevealIndexChange) onRevealIndexChange(steps.length);
  };

  // ===== EPSILON режим — старая логика =====
  const handleGuessCheckEpsilon = (iterIndex) => {
    if(wrongFlash === iterIndex) return;
    const step      = steps[iterIndex];
    const userGuess = parseFloat(userGuesses[iterIndex] || "");
    if(isNaN(userGuess)) return;
    const correctValue = getCorrectValue(step);
    const tolerance    = Math.abs(correctValue) * 0.05 + 1e-9;
    const isCorrect = Math.abs(userGuess - correctValue) <= tolerance;
    const next   = iterIndex + 1;
    const isLast = next >= steps.length;

    if(isCorrect){
      consecutiveCorrect.current += 1;
      setRowFeedback(prev => ({ ...prev, [iterIndex]: 'correct' }));
      setSuccessMsg(true);

      if(consecutiveCorrect.current >= 2 && !isLast){
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(()=>{
          setSuccessMsg(false);
          autoFillAll();
        }, 700);
        return;
      }

      if(isLast){
        autoFillAll();
      } else {
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(()=>{
          setActiveIndex(next);
          setSuccessMsg(false);
          if(onRevealIndexChange) onRevealIndexChange(next);
        }, 650);
      }
    } else {
      consecutiveCorrect.current = 0;
      setRowFeedback(prev => ({ ...prev, [iterIndex]: 'wrong' }));
      setWrongFlash(iterIndex);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(()=>{
        setWrongFlash(null);
        setUserGuesses(prev => ({ ...prev, [iterIndex]: String(correctValue) }));
        if(isLast){
          setTimeout(()=> autoFillAll(), 300);
        } else {
          setTimeout(()=>{
            setActiveIndex(next);
            if(onRevealIndexChange) onRevealIndexChange(next);
          }, 300);
        }
      }, 2000);
    }
  };

  // ===== ITERATIONS режим — угадываем x_n (n>=1) =====
  const handleGuessCheckIter = (n) => {
    if(wrongFlash === n) return;
    const userGuess = parseFloat(userGuesses[n] || "");
    if(isNaN(userGuess)) return;
    const correctValue = getIterValue(n);
    const tolerance    = Math.pow(10, -(decimalPlaces - 1));
    const isCorrect = Math.abs(userGuess - correctValue) <= tolerance;
    const next   = n + 1;
    const isLast = next >= totalIterRows; // следующей строки нет

    if(isCorrect){
      consecutiveCorrect.current += 1;
      setRowFeedback(prev => ({ ...prev, [n]: 'correct' }));
      setSuccessMsg(true);

      if(consecutiveCorrect.current >= 2 && !isLast){
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(()=>{
          setSuccessMsg(false);
          autoFillAll();
        }, 700);
        return;
      }

      if(isLast){
        autoFillAll();
      } else {
        clearTimeout(successTimer.current);
        successTimer.current = setTimeout(()=>{
          setActiveIndex(next);
          setSuccessMsg(false);
          if(onRevealIndexChange) onRevealIndexChange(next - 1);
        }, 650);
      }
    } else {
      consecutiveCorrect.current = 0;
      setRowFeedback(prev => ({ ...prev, [n]: 'wrong' }));
      setWrongFlash(n);
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(()=>{
        setWrongFlash(null);
        setUserGuesses(prev => ({ ...prev, [n]: String(correctValue) }));
        if(isLast){
          setTimeout(()=> autoFillAll(), 300);
        } else {
          setTimeout(()=>{
            setActiveIndex(next);
            if(onRevealIndexChange) onRevealIndexChange(next - 1);
          }, 300);
        }
      }, 2000);
    }
  };

  const handleGuessCheck = isIterMode ? handleGuessCheckIter : handleGuessCheckEpsilon;

  return(
    <div>
      <FormulaBox calculationMode={calculationMode} />

      {successMsg && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(90,184,122,0.14)',
          border: '1px solid var(--color-success)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-success)', fontWeight: 'bold', fontSize: '14px',
        }}>
          {consecutiveCorrect.current >= 2
            ? 'Výborne! Automaticky dopĺňam zvyšok!'
            : 'Výborne! Správna odpoveď!'}
        </div>
      )}

      {steps.length > 0 && (
        <>
          <div className="newton-table-title">Priebeh iterácií</div>

          <div className="newton-table-container" style={{ maxHeight: 'none', overflowY: 'visible' }}>
            <table className="newton-table">
              <thead>
                <tr>
                  <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', letterSpacing: 0, fontSize: '15px', fontStyle: 'italic' }}>n</th>
                  {isIterMode ? (
                    <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', letterSpacing: 0, fontSize: '15px', fontStyle: 'italic' }}>x<sub style={{ fontSize: '10px' }}>n+1</sub></th>
                  ) : (
                    <>
                      <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', letterSpacing: 0, fontSize: '15px', fontStyle: 'italic' }}>x<sub style={{ fontSize: '10px' }}>n</sub></th>
                      <th style={{ fontFamily: '"Lora", Georgia, serif', textTransform: 'none', fontStyle: 'italic', fontSize: '15px', letterSpacing: 0, whiteSpace: 'nowrap' }}>
                        f(x<sub style={{ fontSize: '11px' }}>n</sub>&minus;ε)&thinsp;&middot;&thinsp;f(x<sub style={{ fontSize: '9px' }}>n</sub>+ε)
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {isIterMode ? (
                  /* ============ ITERATIONS: одна колонка x_n, n=0..N ============ */
                  (allRevealed
                    ? Array.from({ length: totalIterRows }, (_, n) => n)
                    : Array.from({ length: activeIndex + 1 }, (_, n) => n)
                  ).map((n)=>{
                    const isGiven    = n === 0; // x0 дан сразу
                    const isActive   = !allRevealed && n === activeIndex && !rowFeedback[n] && !isGiven;
                    const isDone     = allRevealed || isGiven || n < activeIndex || !!rowFeedback[n];
                    const isFlashing = wrongFlash === n;
                    const correctVal = getIterValue(n);
                    const isFinal    = (allRevealed && n === totalIterRows - 1);

                    return(
                      <tr
                        key={`iter-${n}`}
                        className={isFinal ? 'final-row' : ''}
                        style={{
                          transition: 'background 0.25s',
                          background: isFlashing
                            ? 'rgba(220,50,50,0.20)'
                            : rowFeedback[n] === 'correct'
                              ? 'rgba(90,184,122,0.07)'
                              : 'transparent',
                        }}
                      >
                        <td style={{ color: 'var(--color-text)' }}>{n}</td>
                        <td style={{ color: 'var(--color-text)' }}>
                          {isActive ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={userGuesses[n] || ''}
                                  onChange={(e)=>{
                                    if(isFlashing) return;
                                    setUserGuesses(prev => ({ ...prev, [n]: e.target.value }));
                                    if(rowFeedback[n] === 'wrong')
                                      setRowFeedback(prev => ({ ...prev, [n]: null }));
                                  }}
                                  onKeyDown={(e)=> e.key === 'Enter' && handleGuessCheck(n)}
                                  placeholder="?"
                                  autoFocus
                                  disabled={isFlashing}
                                  style={{
                                    width: '110px', padding: '4px', textAlign: 'center',
                                    background: isFlashing ? 'rgba(220,50,50,0.08)' : 'var(--color-bg)',
                                    border: `1px solid ${isFlashing ? '#ff5252' : 'var(--color-border)'}`,
                                    borderRadius: '4px', color: 'var(--color-text)', fontSize: '13px',
                                    transition: 'border-color 0.25s',
                                    opacity: isFlashing ? 0.7 : 1,
                                  }}
                                />
                                <button
                                  onClick={()=> handleGuessCheck(n)}
                                  disabled={isFlashing}
                                  style={{
                                    padding: '4px 8px',
                                    background: isFlashing ? 'rgba(220,50,50,0.25)' : 'var(--color-button)',
                                    border: 'none', borderRadius: '4px', color: 'white',
                                    fontSize: '11px', cursor: isFlashing ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.25s',
                                  }}
                                >✓</button>
                              </div>

                              {isFlashing && (
                                <div style={{
                                  fontSize: '11px', color: '#ff5252', fontWeight: 'bold',
                                  padding: '5px 10px',
                                  background: 'rgba(220,50,50,0.12)',
                                  border: '1px solid rgba(255,82,82,0.4)',
                                  borderRadius: '5px',
                                  textAlign: 'center',
                                }}>
                                  ✗ Nesprávna! Správna: {formatXn(correctVal, decimalPlaces)}
                                </div>
                              )}
                            </div>
                          ) : isDone ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 400,
                              color: rowFeedback[n] === 'wrong' ? 'var(--color-warning)' : 'var(--color-text)',
                            }}>
                              {formatXn(correctVal, decimalPlaces)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-axis)', fontSize: '13px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  /* ============ EPSILON: две колонки x_n + критерий ============ */
                  (
                    allRevealed
                      ? Array.from({ length: steps.length + 1 }, (_, i) => i)
                      : Array.from({ length: activeIndex + 2 }, (_, i) => i)
                  ).map((rowIndex) => {

                    // x0 строка
                    if(rowIndex === 0){
                      const x0 = steps[0]?.xn;

                      return (
                        <tr key="x0-row">
                          <td style={{ color: 'var(--color-text)' }}>0</td>

                          <td style={{
                            color: 'var(--color-text)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px'
                          }}>
                            {formatXn(x0, decimalPlaces)}
                          </td>

                          <td>
                            <span style={{
                              color: 'var(--color-axis)',
                              fontSize: '13px'
                            }}>
                              —
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    // обычные шаги
                    const idx = rowIndex - 1;
                    const s = steps[idx];

                    const isDone =
                      allRevealed ||
                      idx < activeIndex ||
                      !!rowFeedback[idx];

                    const isActive =
                      !allRevealed &&
                      idx === activeIndex &&
                      !rowFeedback[idx];

                    const isFlashing = wrongFlash === idx;

                    const correctVal = getCorrectValue(s);

                    return(
                      <tr
                        key={s.iter}
                        className={
                          allRevealed && idx === steps.length - 1
                            ? 'final-row'
                            : ''
                        }
                        style={{
                          transition: 'background 0.25s',
                          background: isFlashing
                            ? 'rgba(220,50,50,0.20)'
                            : rowFeedback[idx] === 'correct'
                              ? 'rgba(90,184,122,0.07)'
                              : 'transparent',
                        }}
                      >
                        <td style={{ color: 'var(--color-text)' }}>
                          {rowIndex}
                        </td>

                        <td style={{
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px'
                        }}>
                          {formatXn(s.xn_next, decimalPlaces)}
                        </td>

                        <td style={{ color: 'var(--color-text)' }}>
                          {isActive ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                display: 'flex',
                                gap: '4px',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <input
                                  type="number"
                                  step="any"
                                  value={userGuesses[idx] || ''}
                                  onChange={(e)=>{
                                    if(isFlashing) return;

                                    setUserGuesses(prev => ({
                                      ...prev,
                                      [idx]: e.target.value
                                    }));

                                    if(rowFeedback[idx] === 'wrong'){
                                      setRowFeedback(prev => ({
                                        ...prev,
                                        [idx]: null
                                      }));
                                    }
                                  }}
                                  onKeyDown={(e)=>
                                    e.key === 'Enter' &&
                                    handleGuessCheck(idx)
                                  }
                                  placeholder="?"
                                  autoFocus
                                  disabled={isFlashing}
                                  style={{
                                    width: '110px',
                                    padding: '4px',
                                    textAlign: 'center',
                                    background: isFlashing
                                      ? 'rgba(220,50,50,0.08)'
                                      : 'var(--color-bg)',
                                    border: `1px solid ${
                                      isFlashing
                                        ? '#ff5252'
                                        : 'var(--color-border)'
                                    }`,
                                    borderRadius: '4px',
                                    color: 'var(--color-text)',
                                    fontSize: '13px',
                                    transition: 'border-color 0.25s',
                                    opacity: isFlashing ? 0.7 : 1,
                                  }}
                                />

                                <button
                                  onClick={()=> handleGuessCheck(idx)}
                                  disabled={isFlashing}
                                  style={{
                                    padding: '4px 8px',
                                    background: isFlashing
                                      ? 'rgba(220,50,50,0.25)'
                                      : 'var(--color-button)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '11px',
                                    cursor: isFlashing
                                      ? 'not-allowed'
                                      : 'pointer',
                                    transition: 'background 0.25s',
                                  }}
                                >
                                  ✓
                                </button>
                              </div>

                              {isFlashing && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#ff5252',
                                  fontWeight: 'bold',
                                  padding: '5px 10px',
                                  background: 'rgba(220,50,50,0.12)',
                                  border: '1px solid rgba(255,82,82,0.4)',
                                  borderRadius: '5px',
                                  textAlign: 'center',
                                }}>
                                  Nesprávna! Správna: {
                                    formatCriterion(
                                      correctVal,
                                      calculationMode,
                                      decimalPlaces
                                    )
                                  }
                                </div>
                              )}
                            </div>
                          ) : isDone ? (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '13px',
                              fontWeight: 400,
                              color:
                                rowFeedback[idx] === 'wrong'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-text)',
                            }}>
                              {formatCriterion( correctVal,
                                  calculationMode,
                                  criterionDecimalPlaces
                              )}
                            </span>
                          ) : (
                            <span style={{
                              color: 'var(--color-axis)',
                              fontSize: '13px'
                            }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {allRevealed && (
            <>
              {calculationMode === 'iterations' && (
                <ErrorEstimate steps={steps} decimalPlaces={decimalPlaces} />
              )}
              <div className="newton-result-box" style={{ marginTop: '16px' }}>
                <div>
                  <div className="newton-result-root">Nájdený koreň:</div>
                  <div className="newton-result-value">α ≈ {formatXn(data.newton.root, decimalPlaces)}</div>
                  {calculationMode === 'epsilon' && (
                    <div style={{ fontSize: '14px', color: 'var(--color-text)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      presnosť ε = {epsilonValue}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="newton-result-iterations-label">Počet iterácií:</div>
                  <div className="newton-result-iterations-value">{data.newton.iterations}</div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const MATH_FONT = '"Lora", Georgia, serif';

function FormulaBox({calculationMode}){
  return(
    <div style={{
      margin: '14px 0', padding: '14px 16px',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)', borderRadius: '10px'
    }}>
      <div style={{ fonSize: '16px', color: 'var(--color-text-faint)', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.07em' }}>
        Použité vzorce
      </div>
      <div style={{
        fontFamily: MATH_FONT, fontSize: '20px', textAlign: 'center',
        color: ' var(--color-text-faint)', padding: '10px 14px', background: 'rgba(0,0,0,0)',
        borderRadius: '7px', marginBottom: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
      }}>
        <span style={{ fontStyle: 'italic' }}>x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n+1</sub></span>
        <span style={{ fontStyle: 'normal', fontSize: '18px' }}>=</span>
        <span style={{ fontStyle: 'italic' }}>x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub></span>
        <span style={{ fontStyle: 'normal', fontSize: '18px' }}>&minus;</span>
        <Frac
          top={<span style={{ fontStyle: 'italic' }}>f(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)</span>}
          bot={<span style={{ fontStyle: 'italic' }}>f&prime;(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)</span>}
          color="var(--color-text-faint)" size="15px"
        />
      </div>
      {calculationMode === 'iterations' && (
        <>
          <div style={{
            fontFamily: MATH_FONT, fontSize: '18px', textAlign: 'center',
            color: 'var(--color-text-faint)', padding: '10px 14px', background: 'rgba(0,0,0,0)',
            borderRadius: '7px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px', marginBottom: '8px',
          }}>
            <span style={{ fontStyle: 'italic' }}>|&alpha;&thinsp;&minus;&thinsp;x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>|</span>
            <span style={{ fontStyle: 'normal', fontSize: '16px' }}>&le;</span>
            <Frac
              top={<span style={{ fontStyle: 'italic' }}>|f(x<sub style={{ fontStyle: 'normal', fontSize: '11px' }}>n</sub>)|</span>}
              bot={<span style={{ fontStyle: 'italic' }}>m</span>}
              color="var(--color-text-faint)" size="14px"
            />
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-faint)', marginTop: '4px', lineHeight: '1.5', textAlign: 'center' }}>
            kde&nbsp;<span style={{ fontFamily: MATH_FONT, fontStyle: 'italic' }}>m = min|f&prime;(x)|</span>&nbsp;na separačnom intervale
          </div>
        </>
      )}
      {calculationMode === 'epsilon' && (
        <div style={{
          fontFamily: MATH_FONT, fontSize: '17px', textAlign: 'center',
          color: ' var(--color-text-faint)', padding: '8px 14px',
          background: 'rgba(0,0,0,0)', borderRadius: '7px', fontStyle: 'italic'
        }}>
          f(x<sub style={{ fontStyle: 'normal', fontSize: '10px' }}>n</sub>&thinsp;&minus;&thinsp;ε)&thinsp;&middot;&thinsp;f(x<sub style={{ fontStyle: 'normal', fontSize: '10px' }}>n</sub>&thinsp;+&thinsp;ε)&thinsp;&lt;&thinsp;0
        </div>
      )}
    </div>
  );
}

function ErrorEstimate({steps, decimalPlaces}){
  const [showHelp, setShowHelp] = useState(false);
  const lastStep = steps[steps.length - 1];
  if(lastStep.odhad_chyby == null) return null;
  const fmt = (n)=>{
    if(n == null || isNaN(n)) return '—';
    if(n === 0) return '0';
    return Math.abs(n).toFixed(decimalPlaces);
  };
  const m   = lastStep.m1 ?? null;
  const fx  = lastStep.fx_for_estimate ?? (lastStep.fx != null ? Math.abs(lastStep.fx) : null);
  const fxN = lastStep.iter_for_estimate ?? lastStep.iter;
  const finalN = lastStep.iter + 1;
  const MF = MATH_FONT;

  return(
    <div style={{
      marginTop: '16px', padding: '16px',
      background: 'var(--color-panel)',
      border: '1px solid var(--color-border)', borderRadius: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ color: 'var(--color-text-faint)', fontWeight: 'bold', fontSize: '17px' }}>Odhad chyby výsledku</div>
        <button
          onClick={()=> setShowHelp(v => !v)}
          style={{
            padding: '3px 10px', fontSize: '13px', fontWeight: 'bold',
            background: showHelp ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.07)',
            border: '1px solid var(--color-border)',
            borderRadius: '5px', color: '#ffffff', cursor: 'pointer',
          }}
        >{showHelp ? 'Zavrieť' : 'Pomocník'}</button>
      </div>

      {showHelp && (
        <div style={{
          marginBottom: '14px', padding: '13px 15px',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px', fontSize: '13px', lineHeight: '1.75', color: '#ffffff'
        }}>
          <div style={{ color: 'var(--color-text-faint)', fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>
            Ako nájsť m?
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: 'var(--color-text-faint)', fontWeight: 'bold', fontSize: '16px' }}>Krok 1:</span>{' '}
            <div style={{fontSize: '15px'}}>
            Vypočítať <strong>f′(x)</strong> na separačnom intervale ⟨a; b⟩.
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: 'var(--color-text-faint)', fontWeight: 'bold' , fontSize: '16px'}}>Krok 2:</span>{' '}
            <div style={{fontSize: '15px'}}>
          Nájsť minimum absolútnej hodnoty f′(x):
          </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              margin: '8px 0',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '6px',
              fontFamily: MF,
              fontSize: '18px',
              color: '#00e676'
            }}>
              <span style={{fontStyle: 'italic', color: 'var(--color-axis)'}}>m</span>
              <span style={{fontSize: '16px', color: 'var(--color-axis)'}}>=</span>
              <span style={{display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1}}>
                <span style={{fontSize: '16px', color: 'var(--color-axis)'}}>min</span>
                  <span style={{fontFamily: 'sans-serif', fontSize: '14px', color: 'var(--color-axis)'}}>x∈⟨a,b⟩</span>
                </span>
              <span style={{fontStyle: 'italic', color: 'var(--color-axis)'}}>|f′(x)|</span>
            </div>
          </div>
          <div style={{background: 'rgba(0,0,0,0)', borderRadius: '6px', padding: '10px'}}>
            <div style={{color: '#f32121', fontWeight: 'bold', fontSize: '15px'}}>Poznámka:</div>
            <ul style={{paddingLeft: '16px', color: '#ffffff', fontSize:'15px' }}>
              <li>Ak <strong>f′(x) &gt; 0</strong> na celom intervale tak m = min f′(x)</li>
              <li>Ak <strong>f′(x) &lt; 0</strong> na celom intervale tak m = min|f′(x)|</li>
            </ul>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
        {[
          { label:'m = min|f′|', sub:null, value:fmt(m),  color:'#ffeb3b', dot:'#ffeb3b' },
          { label:'|f(x',        sub:fxN,  value:fmt(fx), color:'#2196f3', dot:'#2196f3' },
        ].map(({ label, sub, value, color, dot }, i) => (
          <div key={i} style={{ padding:'8px 10px', background:'var(--color-bg)', borderRadius:'6px', textAlign:'center', borderLeft:`3px solid ${color}` }}>
            <div style={{ color:'var(--color-axis)', marginBottom:'5px', fontSize:'15px', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:dot, display:'inline-block', flexShrink:0 }}/>
              <span>{label}{sub != null ? <sub>{sub}</sub> : null}{sub != null ? ')|' : ''}</span>
            </div>
            <div style={{ color, fontFamily:'monospace', fontWeight:'bold', fontSize:'16px' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'12px 14px', borderRadius:'8px', background:'rgba(255,255,255,0.04)', textAlign:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:MF, fontSize:'20px', color:'var(--color-axis)', fontWeight:'bold' }}>
          <span style={{ fontStyle:'italic' }}>|α − x<sub style={{ fontStyle:'normal', fontFamily:'sans-serif', fontSize:'12px' }}>{finalN}</sub>|</span>
          <span style={{ fontSize:'18px' }}>≤</span>
          <span style={{ fontFamily:'monospace', fontSize:'18px' }}>{fmt(lastStep.odhad_chyby)}</span>
        </div>
      </div>
    </div>
  );
}