import LatexDisplay from "../LatexDisplay";

// Colors match PlotArea derivatives_mode traces exactly
const CURVE_COLORS = {
  f:   '#2196f3',  // blue  — f(x)   (label0)
  f1:  '#00c875',  // green — f′(x)  (label1)
  f2:  '#ffeb3b',  // yellow — f′′(x) (label2)
};

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
        <div style={{fontSize: '16px', lineHeight: '1.8', marginTop: '8px'}}>
          <strong>1)</strong> f'(x) zachováva znamienko na separačnom intervale<br/>
          <strong>2)</strong> f''(x) zachováva znamienko na separačnom intervale<br/>
          <strong>3)</strong> f(x₀)·f''(x₀) {">"} 0
        </div>
      </div>

      {/* Панель деривации — рисуется всегда как только есть convergenceResults */}
      {convergenceResults && (
        <>
          <DerivativesPanel convergenceResults={convergenceResults} />
          <div style={{marginTop: '16px'}}>
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
      border: '1px solid var(--color-border)'
    }}>
      <div style={{
        fontSize: '16px', fontWeight: 'bold',
        color: 'var(--color-text)', marginBottom: '12px', textAlign: 'center'
      }}>
        Derivácie funkcie
      </div>

      <DerivRow
        color={CURVE_COLORS.f}
        label="Pôvodná funkcia:"
        exprLabel="f(x)"
        latex={convergenceResults.function_latex}
        expr={convergenceResults.function}
      />
      <DerivRow
        color={CURVE_COLORS.f1}
        label="Prvá derivácia:"
        exprLabel="f′(x)"
        latex={convergenceResults.first_derivative_latex}
        expr={convergenceResults.first_derivative}
      />
      <DerivRow
        color={CURVE_COLORS.f2}
        label="Druhá derivácia:"
        exprLabel="f′′(x)"
        latex={convergenceResults.second_derivative_latex}
        expr={convergenceResults.second_derivative}
      />
    </div>
  );
}

function DerivRow({color, label, exprLabel, latex, expr}){
  return(
    <div style={{
      padding: '12px 16px',
      background: 'var(--color-bg)',
      borderRadius: '6px',
      marginBottom: '10px',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{
        fontSize: '11px', color: 'var(--color-axis)', marginBottom: '8px',
        textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <span style={{
          fontFamily: '"Georgia", "Times New Roman", serif',
          fontSize: '22px', color, whiteSpace: 'nowrap',
          flexShrink: 0, fontStyle: 'italic', lineHeight: 1
        }}>
          {exprLabel} =
        </span>
        <div style={{ overflow: 'hidden', minWidth: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
          <LatexDisplay
            latex={latex || expr}
            style={{ color: '#ffffff', fontSize: '22px', fontFamily: '"Cambria Math", "STIX Two Math", serif' }}
          />
        </div>
      </div>
    </div>
  );
}

function ConvergenceResult({result, index}) {
  // Визуализация рисуется всегда — независимо от того, выполнены условия или нет.
  // ok определяет только цвет и итоговый текст.
  const df_ok  = result.df_keeps_sign;
  const d2f_ok = result.d2f_keeps_sign;
  const ok = df_ok && d2f_ok;

  // Если данные о знаках есть — показываем их, даже если условие не выполнено
  const hasDfInfo  = result.df_sign_value !== undefined || result.df_keeps_sign !== undefined;
  const hasD2fInfo = result.d2f_sign_value !== undefined || result.d2f_keeps_sign !== undefined;

  return (
    <div style={{
      marginBottom: '12px', padding: '14px',
      background: ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
      border: `2px solid ${ok ? 'var(--color-success)' : 'var(--color-danger)'}`,
      borderRadius: '8px'
    }}>
      <div style={{ fontSize: '17px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
        Interval α ∈ ⟨{result.interval[0]}; {result.interval[1]}⟩
      </div>

      <div style={{ padding: '10px', background: 'var(--color-bg)', borderRadius: '6px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Kontrola podmienok:</div>

        {/* Podmienka 1 — f'(x) zachováva znamienko */}
        <CheckRow
          pass={df_ok}
          label="1)  f'(x) zachováva znamienko na separačnom intervale"
        />
        {/* Doplnková info: aké znamienko má f'(x) ak je k dispozícii */}
        {!df_ok && result.df_sign_info && (
          <div style={{
            marginLeft: '24px', marginBottom: '6px', fontSize: '12px',
            color: 'var(--color-warning)', fontStyle: 'italic'
          }}>
            {result.df_sign_info}
          </div>
        )}

        {/* Podmienka 2 — f''(x) zachováva znamienko */}
        <CheckRow
          pass={d2f_ok}
          label="2) f''(x) zachováva znamienko na separačnom intervale"
        />
        {!d2f_ok && result.d2f_sign_info && (
          <div style={{
            marginLeft: '24px', marginBottom: '6px', fontSize: '12px',
            color: 'var(--color-warning)', fontStyle: 'italic'
          }}>
            {result.d2f_sign_info}
          </div>
        )}
      </div>

      {/* Výsledok — vždy zobrazený */}
      <div style={{
        marginTop: '10px', padding: '10px',
        background: ok ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
        borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px',
        color: ok ? 'var(--color-success)' : 'var(--color-danger)'
      }}>
        {ok
          ? 'Podmienky 1 a 2 splnené'
          : !df_ok && !d2f_ok
            ? 'Podmienky 1 aj 2 nesplnené'
            : !df_ok
              ? 'Podmienka 1 nesplnená — f\'(x) mení znamienko'
              : 'Podmienka 2 nesplnená — f\'\'(x) mení znamienko'
        }
      </div>
    </div>
  );
}

function CheckRow({pass, label}){
  const color = pass ? 'var(--color-success)' : 'var(--color-danger)';
  return(
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
      <span style={{ fontSize: '16px', fontWeight: 'bold', color }}>
        {pass ? '✓' : '✗'}
      </span>
      <div>{label}</div>
    </div>
  );
}