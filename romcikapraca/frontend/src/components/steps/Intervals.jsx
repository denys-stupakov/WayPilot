import{useState} from "react";
import{formatSmartNumber} from "../../utils";

export default function Step2Intervals({
  intervals, validationResults, attemptCount,
  onUpdateInterval, onValidate, onValidateManual,
}){
  const [showManual, setShowManual] = useState(false);
  const [manualResults, setManualResults] = useState(null);
  const [signsA, setSignsA] = useState({});
  const [signsB, setSignsB] = useState({});

  const getRealSign = (val)=> val > 0 ? "+" : "-";

  const handleManualOpen = async()=>{
    setShowManual(v=> !v);

    if(!manualResults)
      await onValidateManual(setManualResults);
  };

  const SignBtn = ({sign, current, onSet})=>{
    const isActive= current === sign;
    const activeStyle= isActive
      ? sign === "+"
        ? {background:"rgba(34,197,94,0.15)", borderColor:"var(--color-success)", color:"var(--color-success)"}
        : {background:"rgba(239,68,68,0.15)", borderColor:"var(--color-danger)", color:"var(--color-danger)"}
      : {};
    return(
      <button onClick={()=> onSet(sign)} className="sign-btn" style={activeStyle}>
        {sign === "+" ? "+" : "−"}
      </button>
    );
  };

  return(
    <div>
      {attemptCount > 0 && attemptCount < 3 &&(
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
          Hľadáme intervaly, v ktorých funkcia mení znamienko (Bolzanova veta).<br/>
          <strong>Tip:</strong> Pozrite sa na graf - zadajte interval okolo priesečníka g(x) a h(x).
        </div>
      </div>

      <div className="mb-12" style={{marginTop:'12px'}}>
        <div className="intervals-header">
          <label className="input-label">Zadajte intervaly separácie pre požadovaný koreň:</label>
        </div>

        {intervals.map((interval, index)=>(
          <div key={index} className="interval-row">
            <span className="color-axis">α ∈ &lt;</span>
            <input
              type="number" step="0.1" value={interval.l1}
              onChange={(e)=> onUpdateInterval(index, "l1", e.target.value)}
              placeholder="a" className="interval-input"
            />
            <span className="color-axis">;</span>
            <input
              type="number" step="0.1" value={interval.l2}
              onChange={(e)=> onUpdateInterval(index, "l2", e.target.value)}
              placeholder="b" className="interval-input"
            />
            <span className="color-axis">&gt;</span>
          </div>
        ))}
      </div>

      <div style={{display:'flex', gap:'10px', marginTop:'14px'}}>
        <button onClick={onValidate} className="btn-primary btn-success" style={{flex:1}}>
          Overiť automaticky →
        </button>
        <button onClick={handleManualOpen} className="btn-primary btn-info" style={{flex:1}}>
          Overiť manuálne →
        </button>
      </div>

      {validationResults &&(
        <div className="validation-results-box">
          <div className="validation-title">Overenie intervalov:</div>
          {validationResults.validIntervals.map((result, i)=>(
            <div key={i} className={`validation-item ${result.valid ? 'valid' : 'invalid'}`}>
              <div style={{marginTop:'12px'}}>
                <div style={{marginBottom:'10px'}}>
                  <strong>Bolzanova veta:</strong> f(a) · f(b) &lt; 0
                </div>
                <div style={{
                  textAlign:'center', fontSize:'18px',
                  color: result.valid ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {formatSmartNumber(result.f_a, 4)} · {formatSmartNumber(result.f_b, 4)}{' '}
                  = {formatSmartNumber(result.f_a * result.f_b, 6)}
                  {result.valid ? ' < 0 ✓' : ' ≥ 0 ✗'}
                </div>
              </div>
              <b>Interval α ∈ ⟨{formatSmartNumber(result.interval[0], 1)}; {formatSmartNumber(result.interval[1], 1)}⟩</b>
            </div>
          ))}
        </div>
      )}

      {showManual && manualResults &&(
        <div style={{marginTop:'16px'}}>
          {manualResults.validIntervals.map((result, i)=>{
            const chosenA= signsA[i] || null;
            const chosenB= signsB[i] || null;
            const realSignA= getRealSign(result.f_a);
            const realSignB= getRealSign(result.f_b);

            const aCorrect= chosenA ? chosenA === realSignA : null;
            const bCorrect= chosenB ? chosenB === realSignB : null;
            const bothCorrect= aCorrect && bCorrect;

            return(
              <div key={i} style={{
                border:'1px solid var(--color-border)', borderRadius:'6px',
                padding:'14px', background:'rgba(255,255,255,0.04)', marginBottom:'10px'
              }}>
                <div style={{fontSize:'13px', fontWeight:'bold', color:'var(--color-text-secondary)', marginBottom:'12px'}}>
                  Interval ⟨{formatSmartNumber(result.interval[0],1)}; {formatSmartNumber(result.interval[1],1)}⟩ — zvoľte znamienko:
                </div>

                {/*f(a)*/}
                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px'}}>
                  <span style={{width:'40px', fontSize:'14px', color:'var(--color-text-secondary)'}}>f(a)</span>
                  <div style={{display:'flex', gap:'6px'}}>
                    <SignBtn sign="+" current={chosenA} onSet={(s)=> setSignsA(prev=> ({...prev,[i]:s}))}/>
                    <SignBtn sign="-" current={chosenA} onSet={(s)=> setSignsA(prev=> ({...prev,[i]:s}))}/>
                  </div>
                  {chosenA &&(
                    <span style={{
                      fontSize:'13px', padding:'2px 8px', borderRadius:'4px',
                      background: aCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: aCorrect ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {aCorrect ? "✓" : `Nie, f(a) ${realSignA === "+" ? "> 0" : "< 0"} ✗`}
                    </span>
                  )}
                </div>

                {/*f(b)*/}
                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px'}}>
                  <span style={{width:'40px', fontSize:'14px', color:'var(--color-text-secondary)'}}>f(b)</span>
                  <div style={{display:'flex', gap:'6px'}}>
                    <SignBtn sign="+" current={chosenB} onSet={(s)=> setSignsB(prev=> ({...prev,[i]:s}))}/>
                    <SignBtn sign="-" current={chosenB} onSet={(s)=> setSignsB(prev=> ({...prev,[i]:s}))}/>
                  </div>
                  {chosenB &&(
                    <span style={{
                      fontSize:'13px', padding:'2px 8px', borderRadius:'4px',
                      background: bCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: bCorrect ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {bCorrect ? "✓" : `Nie, f(b) ${realSignB === "+" ? "> 0" : "< 0"} ✗`}
                    </span>
                  )}
                </div>


                {chosenA && chosenB &&(
                  <div style={{
                    paddingTop:'12px', borderTop:'1px solid var(--color-border)'
                  }}>
                    {bothCorrect ?(
                      <div style={{marginTop:'4px'}}>
                        <div style={{marginBottom:'10px'}}>
                          <strong>Bolzanova veta:</strong> f(a) · f(b) &lt; 0
                        </div>
                        <div style={{
                          textAlign:'center', fontSize:'18px',
                          color: result.valid ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {formatSmartNumber(result.f_a, 4)} · {formatSmartNumber(result.f_b, 4)}{' '}
                          = {formatSmartNumber(result.f_a * result.f_b, 6)}
                          {result.valid ? ' < 0 ✓' : ' ≥ 0 ✗'}
                        </div>
                        <div style={{marginTop:'8px'}}>
                          <b>Interval α ∈ ⟨{formatSmartNumber(result.interval[0], 1)}; {formatSmartNumber(result.interval[1], 1)}⟩</b>
                        </div>
                      </div>
                    ):(
                      <div style={{
                        textAlign:'center', fontSize:'13px', padding:'8px',
                        background:'rgba(239,68,68,0.08)', borderRadius:'4px',
                        color:'var(--color-danger)'
                      }}>
                        Opravte znamienko - výsledok sa zobrazí po správnom výbere.
                      </div>
                    )}
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