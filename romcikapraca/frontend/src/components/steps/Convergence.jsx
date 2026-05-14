import LatexDisplay from "../LatexDisplay";

export default function Step3Convergence({
  convergenceResults, attemptCountStep3, onCheck,
}) {
  return (
    <div>
      {attemptCountStep3 > 0 && attemptCountStep3 < 3 && (
        <div className="attempt-warning" style={{
          padding: '10px', background: 'rgba(251,191,36,0.1)',
          border: '1px solid var(--color-warning)', borderRadius: '6px',
          marginBottom: '12px', color: 'var(--color-warning)',
          fontWeight: 'bold', textAlign: 'center'
        }}>
          Pokus {attemptCountStep3}/3
        </div>
      )}

      <div className="explanation-box">
        <div className="explanation-title">Podmienky konvergencie:</div>
        <div style={{ fontSize: '14px', lineHeight: '1.8', marginTop: '8px' }}>
          <strong>1)</strong> f'(x) zachováva znamienko<br/>
          <strong>2)</strong> f''(x) zachováva znamienko<br/>
          <strong>3)</strong> f(x₀)·f''(x₀) {">"} 0
        </div>
      </div>

      {convergenceResults && (
        <>
          <DerivativesPanel convergenceResults={convergenceResults} />
          <div style={{ marginTop: '16px' }}>
            {convergenceResults.intervals.map((result, i) => (
              <ConvergenceResult key={i} result={result} index={i} />
            ))}
          </div>
        </>
      )}

      <button onClick={onCheck} className="btn-primary btn-warning">Overiť konvergenciu →</button>
    </div>
  );
}

function DerivativesPanel({convergenceResults}){
  return(
    <div style={{
      marginTop: '16px', padding: '16px',
      background: 'var(--color-panel)', borderRadius: '8px',
      border: '2px solid var(--color-func1)'
    }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-func1)', marginBottom: '12px', textAlign: 'center' }}>
        Derivácie funkcie
      </div>

      <DerivRow color="#00b0ff" label="Pôvodná funkcia:" exprLabel="f(x)" latex={convergenceResults.function_latex} expr={convergenceResults.function} />
      <DerivRow color="#00e676" label="Prvá derivácia:" exprLabel="f′(x)" latex={convergenceResults.first_derivative_latex} expr={convergenceResults.first_derivative} />
      <DerivRow color="#ffeb3b" label="Druhá derivácia:" exprLabel="f′′(x)" latex={convergenceResults.second_derivative_latex} expr={convergenceResults.second_derivative} />
    </div>
  );
}

const FORMULA_COLOR= "#ffffff";
const LABEL_COLOR= "#ffffff";

function DerivRow({color, label, exprLabel, latex, expr, children}){
  return(
    <div style={{ padding: '12px 16px', background: 'var(--color-bg)', borderRadius: '6px', marginBottom: '10px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '11px', color: 'var(--color-axis)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <span style={{ fontFamily: '"Georgia", "Times New Roman", serif', fontSize: '22px', color: LABEL_COLOR, whiteSpace: 'nowrap', flexShrink: 0, fontStyle: 'italic', lineHeight: 1 }}>{exprLabel} =</span>
        <div style={{ overflow: 'hidden', minWidth: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
          <LatexDisplay latex={latex || expr} style={{ color: FORMULA_COLOR, fontSize: '22px', fontFamily: '"Cambria Math", "STIX Two Math", "Latin Modern Math", serif' }} />
        </div>
      </div>
      {children}
    </div>
  );
}

function ConvergenceResult({result, index}){
  const ok = result.converges;

  return(
    <div style={{
      marginBottom: '12px', padding: '14px',
      background: ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
      border: `2px solid ${ok ? 'var(--color-success)' : 'var(--color-danger)'}`,
      borderRadius: '8px'
    }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
        Interval α ∈ ⟨{result.interval[0]}; {result.interval[1]}⟩
      </div>
      <div style={{ padding: '10px', background: 'var(--color-bg)', borderRadius: '6px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Kontrola podmienok:</div>
        <CheckRow pass={result.df_keeps_sign}  label="1) f'(x) zachováva znamienko" />
        <CheckRow pass={result.d2f_keeps_sign} label="2) f''(x) zachováva znamienko" />
        <CheckRow pass={result.product_positive} warn label={`3) f(x₀)·f''(x₀) ${result.product_positive ? '> 0 ✓' : '≤ 0 ⚠'}`} />
      </div>
      <div style={{
        marginTop: '10px', padding: '10px',
        background: ok ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
        borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px',
        color: ok ? 'var(--color-success)' : 'var(--color-danger)'
      }}>
        {ok ? (
          result.converges_with_warning
            ? <div>Podmienky 1 a 2 splnené → Metóda konverguje<br/>Podmienka 3 nesplnená</div>
            : 'Všetky podmienky splnené!'
        ) : 'Podmienky 1 alebo 2 nesplnené'}
      </div>
    </div>
  );
}

function CheckRow({pass, warn, label}){
  const color= warn
    ? (pass ? 'var(--color-success)' : 'var(--color-warning)')
    : (pass ? 'var(--color-success)' : 'var(--color-danger)');

  return(
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
      <span style={{ fontSize: '16px', fontWeight: 'bold', color }}>
        {pass ? '✓' : (warn ? '⚠' : '✗')}
      </span>
      <div>{label}</div>
    </div>
  );
}
