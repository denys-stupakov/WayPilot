import {useState} from "react";

export default function Step4StartPoint({x0Input, onX0Change, onCalculate, convergenceResults}){

  const [verified, setVerified] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState(null);

  const getX0Status = (val)=>{
    const x0 = parseFloat(val);

    if(!convergenceResults?.intervals || isNaN(x0))
      return null;

    for(const iv of convergenceResults.intervals){
      const [a, b] = iv.interval;

      if(x0 >= a && x0 <= b){
        return iv.converges ? 'good' : 'ok';
      }
    }

    return 'outside';
  };

  const handleVerify = ()=>{
    const status = getX0Status(x0Input);
    setVerifiedStatus(status);
    setVerified(true);
  };

  const handleX0Change = (val)=>{
    onX0Change(val);
    //reset verification when user changes value
    setVerified(false);
    setVerifiedStatus(null);
  };

  const canCalculate = verifiedStatus === 'good' || verifiedStatus === 'ok';

  return (
    <div>
      <div className="mb-12">
        <label className="input-label">Počiatočný bod x₀:</label>
        <input
          type="number"
          step="0.1"
          value={x0Input}
          onChange={(e)=> handleX0Change(e.target.value)}
          className="input-field"
          placeholder="Zadajte x₀..."
          style={
            verified && verifiedStatus === 'good'
              ? { borderColor: 'var(--color-success)' }
              : verified && verifiedStatus === 'outside'
              ? { borderColor: 'var(--color-danger)' }
              : undefined
          }
        />
      </div>

      {!verified && (
        <button
          onClick={handleVerify}
          className="btn-primary btn-warning"
          disabled={x0Input === "" || isNaN(parseFloat(x0Input))}
        >
          Overiť x₀ →
        </button>
      )}

      {verified && verifiedStatus === 'good' && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(90,184,122,0.12)',
          border: '1px solid var(--color-success)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-success)', fontWeight: 'bold', fontSize: '14px'
        }}>
          Výborne! x₀ je vo vnútri intervalu!
        </div>
      )}

      {verified && verifiedStatus === 'ok' && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(212,168,85,0.10)',
          border: '1px solid var(--color-warning)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-warning)', fontWeight: 'bold', fontSize: '14px'
        }}>
          x₀ leží v intervale, ale konvergencia nie je zaručená.
        </div>
      )}

      {verified && verifiedStatus === 'outside' && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(192,99,90,0.10)',
          border: '1px solid var(--color-danger)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '14px'
        }}>
          x₀ leží mimo separačného intervalu — odporúčame zvoliť x₀ vnútri intervalu.
        </div>
      )}

      {verified && verifiedStatus === null && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px',
          background: 'rgba(192,99,90,0.10)',
          border: '1px solid var(--color-danger)',
          borderRadius: '8px', textAlign: 'center',
          color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '14px'
        }}>
          Zadajte platné číslo pre x₀.
        </div>
      )}

      {verified && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={()=>{ setVerified(false); setVerifiedStatus(null); }}
            style={{
              padding: '8px 14px', background: 'rgba(100,100,100,0.2)',
              border: '1px solid var(--color-border)', borderRadius: '6px',
              color: 'var(--color-text)', cursor: 'pointer', fontSize: '13px'
            }}>
            Zmeniť
          </button>
          {canCalculate && (
            <button onClick={onCalculate} className="btn-primary btn-success" style={{ flex: 1 }}>
              Vypočítať
            </button>
          )}
        </div>
      )}
    </div>
  );
}