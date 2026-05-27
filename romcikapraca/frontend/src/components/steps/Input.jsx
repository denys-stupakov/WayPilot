import LatexDisplay from "../LatexDisplay";
import { useEffect } from "react";

export default function Step1Input({
    fieldRef,
    calculationMode,
    data,
    onSubmit,
    onInsertLatex,
    onInsertFrac,
    showSplitInfo = false
}){

    return(
        <div>
            <div className="math-field-container">
                <math-field ref={fieldRef} placeholder="x^3+x-3=0" />
            </div>

            <div className="math-buttons-grid">
                {["x", "+", "−", "(", ")"].map((s, i) =>(
                    <button key={i} onClick={() => onInsertLatex(s)} className="math-button">{s}</button>
                ))}
                <button onClick={() => onInsertLatex("^{\\placeholder{}}")} className="math-button">^</button>
                <button onClick={onInsertFrac} className="math-button">a⁄b</button>
                <button onClick={() => onInsertLatex("\\sqrt{}")} className="math-button">√</button>
                <button onClick={() => onInsertLatex("\\sin")} className="math-button">sin</button>
                <button onClick={() => onInsertLatex("\\cos")} className="math-button">cos</button>
                <button onClick={() => onInsertLatex("\\log")} className="math-button">log</button>
                <button onClick={() => onInsertLatex("\\ln")} className="math-button">ln</button>
                <button onClick={() => onInsertLatex("e^{x}")} className="math-button">eˣ</button>
                <button onClick={() => onInsertLatex("\\tan")} className="math-button">tan</button>
                <button onClick={() => onInsertLatex("\\pi")} className="math-button">π</button>
            </div>

            <button onClick={onSubmit} disabled={!calculationMode} className="btn-primary">
                {calculationMode ? "Rozdeliť rovnicu" : "Najprv vyberte režim"}
            </button>

            {/* Блок g(x) = h(x) */}
            {showSplitInfo && data?.g_expr && data?.h_expr && (
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--color-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                }}>
                    <div style={{
                        fontSize: '15px',
                        color: 'var(--color-axis)',
                        marginBottom: '10px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        Rozdelenie rovnice: g(x) = h(x)
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(33,150,243,0.12)',
                            border: '2px solid var(--color-func1)',
                            borderRadius: '6px',
                            fontFamily: 'serif',
                            fontSize: '18px',
                            color: 'var(--color-func1)'
                        }}>
                            g(x) <LatexDisplay latex={data.g_latex || data.g_expr} style={{ color: 'var(--color-func1)', fontSize: '18px' }} />
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '20px', color: 'var(--color-axis)', margin: '4px 0' }}>‖</div>

                    <div>
                        <div style={{
                            padding: '8px 12px',
                            background: 'rgba(255,152,0,0.12)',
                            border: '2px solid var(--color-func2)',
                            borderRadius: '6px',
                            fontFamily: 'serif',
                            fontSize: '18px',
                            color: 'var(--color-func2)'
                        }}>
                            h(x) <LatexDisplay latex={data.h_latex || data.h_expr} style={{ color: 'var(--color-func2)', fontSize: '18px' }} />
                        </div>
                    </div>

                    <div style={{
                        marginTop: '10px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0)',
                        borderRadius: '6px',
                        fontSize: '15px',
                        color: 'var(--color-axis)',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        Na grafe vidíte obe krivky. Koreň je tam, kde sa{' '}
                        <strong style={{ color: 'var(--color-func1)' }}>g(x)</strong> a{' '}
                        <strong style={{ color: 'var(--color-func2)' }}>h(x)</strong> pretínajú
                    </div>
                </div>
            )}
        </div>
    );
}