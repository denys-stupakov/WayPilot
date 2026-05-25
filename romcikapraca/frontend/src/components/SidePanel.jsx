import{useRef, useState, useEffect} from "react";
import{apiCall} from "../utils";

import ModeSelector from "./ModeSelector";
import Step1Input from "./steps/Input";
import Step2Intervals from "./steps/Intervals";
import Step3Convergence from "./steps/Convergence";
import Step4StartPoint from "./steps/StartPoint";
import Step5Results from "./steps/EndPoint";

export default function SidePanel({data, onPlot, onModeChange, onHighlightChange, onNewtonReveal}){
  const fieldRef= useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [x0Input, setX0Input] = useState("");
  const [intervals, setIntervals] = useState([{l1: "", l2: ""}]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [attemptCountStep3, setAttemptCountStep3] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const [convergenceResults, setConvergenceResults] = useState(null);

  const [step1Completed, setStep1Completed] = useState(false);
  const [step2Completed, setStep2Completed] = useState(false);
  const [step3Completed, setStep3Completed] = useState(false);
  const [step4Completed, setStep4Completed] = useState(false);

  const [calculationMode, setCalculationMode] = useState(null);
  const [epsilonValue, setEpsilonValue] = useState("0.000001");
  const [iterationsCount, setIterationsCount]= useState("10");
  const [derivativePlotMode, setDerivativePlotMode] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [savedIntersections, setSavedIntersections] = useState([]);
  const [derivativesData, setDerivativesData]= useState(null);
  const [condition3Result, setCondition3Result] = useState(null);
  const [newtonRevealIndex, setNewtonRevealIndex] = useState(-1);
  const handleRevealIndex = (idx) => {
    setNewtonRevealIndex(idx);
    if(onNewtonReveal) onNewtonReveal(idx);
  };

  useEffect(()=>{
    const script= document.createElement('script');
    script.src = 'https://unpkg.com/mathlive';
    script.type = 'module';
    document.head.appendChild(script);
    script.onload = ()=>{
      const field= fieldRef.current;
      if(field){
        if(window.MathfieldElement)
          window.MathfieldElement.locale = "sk";
        field.mathVirtualKeyboardPolicy = "manual";
      }
    };
    return ()=>{
      if(script.parentNode)
        script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(()=>{
    if(calculationMode && onModeChange){
      const value= calculationMode === 'epsilon' ? epsilonValue : iterationsCount;
      onModeChange(calculationMode, value);
    }
  },[calculationMode, epsilonValue, iterationsCount, onModeChange]);

  useEffect(()=>{
    if(!step1Completed || !onHighlightChange)
      return;
    const parsed= intervals
      .filter(int => int.l1 !== "" && int.l2 !== "")
      .map(int => {
        const a= parseFloat(int.l1);
        const b= parseFloat(int.l2);
        return isNaN(a) || isNaN(b) ? null : [a, b];
      })
      .filter(Boolean)
      .filter(([a, b]) => a < b);
    onHighlightChange(parsed);
  },[intervals, step1Completed]);

  const getExpr = ()=>{
    let expr = fieldRef.current.getValue("latex") || fieldRef.current.value;
    if(!expr.includes("="))
      expr += "=0";
    return expr;
  };

  const getValidIntervals = ()=>
    intervals
      .filter(int=> int.l1 !== "" && int.l2 !== "")
      .map(int => [parseFloat(int.l1), parseFloat(int.l2)]);

  const getStepClass = (step)=>{
    let cls = "step-card";
    if(currentStep >= step) cls += "active";
    if(currentStep === step) cls += "current";
    return cls;
  };

  const insertLatex = (latex)=>{fieldRef.current.insert(latex); fieldRef.current.focus();};
  const insertFrac = ()=>{ fieldRef.current.insert("\\frac{\\placeholder{}}{\\placeholder{}}"); fieldRef.current.focus(); };

  const handleX0Change = (val) => {
    setX0Input(val);
    setCondition3Result(null);
  };

  const handleStep4CheckCondition3 = () => {
    const x0val = parseFloat(x0Input);
    const relevantInterval = convergenceResults?.intervals?.find(r =>
      r.converges && x0val >= r.interval[0] && x0val <= r.interval[1]
    );
    const cond3 = relevantInterval?.product_positive ?? false;
    setCondition3Result(cond3);
  };

  const handleStep1 = async ()=>{
    let expr = fieldRef.current.getValue("latex") || fieldRef.current.value;
    if(!expr.includes("=")){
      expr += "=0"; fieldRef.current.setValue(expr);
    }
    await apiCall("/plot", {expr, step: "split"},(responseData)=>{
      onPlot(responseData);
      setSavedIntersections(responseData.intersections || []);
      setStep1Completed(true);
      setCurrentStep(2);
    },"Chyba pri rozdeľovaní rovnice");
  };

  const handleStep2ValidateManual = async (setManualResults)=>{
    const validIntervals = getValidIntervals();
    if(validIntervals.length === 0){
      alert("Prosím, zadajte interval.");
      return;
    }
    await apiCall("/validate_intervals",{expr: getExpr(), intervals: validIntervals},(responseData)=>{
      setManualResults(responseData);
    }, "Chyba pri validácii intervala");
  };

  const handleStep2Validate = async ()=>{
    const validIntervals = getValidIntervals();
    if(validIntervals.length === 0){
      alert("Prosím, zadajte interval.");
      return;
    }
    await apiCall("/validate_intervals",{expr: getExpr(), intervals: validIntervals},(responseData)=>{
      setValidationResults(responseData);
      const hasValid = responseData.validIntervals?.some(r => r.valid);
      if(hasValid){
        setStep2Completed(true);
        setCurrentStep(3);
        setAttemptCount(0);
      }else{
        const next = attemptCount + 1;
        setAttemptCount(next);
        if(next >= 3){
          const n= intervals.filter(i=> i.l1 !== "" || i.l2 !== "").length || 1;
          alert(`Vyčerpali ste 3 pokusy. Automaticky sa načíta správny interval ${n}.`);
          autoFillCorrectIntervals();
        }else{
          alert(`Pokus ${next}/3: Interval nie je platný. Skúste iný interval.`);
        }
      }
    }, "Chyba pri validácii intervala");
  };

  const autoFillCorrectIntervals = async ()=>{
    setAttemptCount(0);
    const n= intervals.filter(i => i.l1 !== "" || i.l2 !== "").length || 1;
    try{
      const res = await fetch("/suggest_intervals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expr: getExpr(), intersections: savedIntersections, num_intervals: n }),
      });
      const rd = await res.json();
      if(rd.suggested_intervals?.length > 0)
        setIntervals(rd.suggested_intervals.map(iv => ({ l1: iv[0].toString(), l2: iv[1].toString() })));
      else
        setIntervals([{ l1: "-2", l2: "2" }]);
    }catch{
      setIntervals([{ l1: "-2", l2: "2" }]);
    }
    setTimeout(()=>{ setStep2Completed(true); setCurrentStep(3); setValidationResults(null); }, 800);
  };

  const getYatX = (xs, ys, targetX)=>{
    let leftIdx= -1, rightIdx= -1;
    for(let i= 0; i < xs.length; i++){
      const xi = xs[i];
      if(xi == null || !isFinite(xi)) continue;
      if(xi <= targetX){
        if(leftIdx === -1 || xi > xs[leftIdx]) leftIdx = i;
      }
      if(xi >= targetX){
        if(rightIdx === -1 || xi < xs[rightIdx]) rightIdx = i;
      }
    }
    if(leftIdx !== -1 && Math.abs(xs[leftIdx] - targetX) < 1e-10)
      return {x: targetX, y: ys[leftIdx]};
    if(rightIdx !== -1 && Math.abs(xs[rightIdx] - targetX) < 1e-10)
      return {x: targetX, y: ys[rightIdx]};
    if(leftIdx !== -1 && rightIdx !== -1){
      const x0 = xs[leftIdx], y0 = ys[leftIdx];
      const x1 = xs[rightIdx], y1 = ys[rightIdx];
      if(!isFinite(y0) || !isFinite(y1)) return null;
      const t= (targetX - x0) / (x1 - x0);
      return {x: targetX, y: y0 + t * (y1 - y0)};
    }
    if(leftIdx !== -1 && isFinite(ys[leftIdx])) return {x: targetX, y: ys[leftIdx]};
    if(rightIdx !== -1 && isFinite(ys[rightIdx])) return {x: targetX, y: ys[rightIdx]};
    return null;
  };

  const runConvergenceCheck = async (intervalsToCheck) => {
    const expr = getExpr();
    let responseData;
    try{
      const res = await fetch("/check_convergence",{
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({expr, intervals: intervalsToCheck}),
      });
      responseData = await res.json();
    }catch{
      alert("Chyba pri overovaní konvergencie");
      return null;
    }
    return responseData;
  };

  const applyConvergenceResult = async (responseData) => {
    setConvergenceResults(responseData);
    setDerivativePlotMode(null);
    const hasConverging = responseData.intervals?.some(r => r.converges);
    if(hasConverging){
      if(data && !originalData) setOriginalData(data);
      const f1 = responseData.first_derivative;
      const f2 = responseData.second_derivative;
      const expr = getExpr();

      const convergingInterval = responseData.intervals?.find(r => r.converges);
      const interval = convergingInterval?.interval;
      const xmin = interval ? interval[0] : null;
      const xmax = interval ? interval[1] : null;

      if(f1 && f2){
        try{
          const [rd0, rd1, rd2] = await Promise.all([
            fetch("/plot_single",{method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({expr, label:"f(x)"})}).then(r=>r.json()),
            fetch("/plot_single",{method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({expr:f1+"=0", label:"f′(x)"})}).then(r=>r.json()),
            fetch("/plot_single",{method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({expr:f2+"=0", label:"f′′(x)"})}).then(r=>r.json()),
          ]);

          let mX=null, mY=null, mValue=null;
          if(interval && rd1){
            const ptA = getYatX(rd1.x1, rd1.y1, interval[0]);
            const ptB = getYatX(rd1.x1, rd1.y1, interval[1]);
            if(ptA && ptB){
              if(Math.abs(ptA.y) <= Math.abs(ptB.y)){
                mX=interval[0]; mY=ptA.y; mValue=Math.abs(ptA.y);
              }else{
                mX=interval[1]; mY=ptB.y; mValue=Math.abs(ptB.y);
              }
            }
          }

          const plotData={
            x1:rd1.x1, y1:rd1.y1, x2:rd2.x1, y2:rd2.y1, x0:rd0.x1, y0:rd0.y1,
            intersections:[], label0:"f(x)", label1:"f′(x)", label2:"f′′(x)",
            single_mode:false, derivatives_mode:true,
            display_range: rd1.display_range,
            m_value:mValue, m_x:mX, m_y:mY,
          };
          setDerivativesData(plotData);
          onPlot(plotData);
        }catch{
          apiCall("/plot_single",{expr, label:"f(x)"},(rd)=>onPlot(rd),"Chyba pri zobrazení f(x)");
        }
      }else{
        apiCall("/plot_single",{expr, label:"f(x)"},(rd)=>onPlot(rd),"Chyba pri zobrazení f(x)");
      }
      setStep3Completed(true);
      setCurrentStep(4);
      setAttemptCountStep3(0);
      return true;
    }
    return false;
  };

  const handleStep3Check = async ()=>{
    const responseData = await runConvergenceCheck(getValidIntervals());
    if(!responseData) return;
    const converged = await applyConvergenceResult(responseData);
    if(!converged){
      const next = attemptCountStep3 + 1;
      setAttemptCountStep3(next);
      if(next >= 3){
        alert("Vyčerpali ste 3 pokusy. Automaticky sa načíta vhodný interval.");
        autoFillConvergingIntervals();
      }else{
        alert("Pokus " + next + "/3: Metóda nemusí konvergovať. Skúste iné intervaly.");
      }
    }
  };

  const autoFillConvergingIntervals = async ()=>{
    setAttemptCountStep3(0);
    const n = intervals.filter(i => i.l1 !== "" || i.l2 !== "").length || 1;
    let suggestedIntervals = [{l1:"-1", l2:"1"}];
    try{
      const res = await fetch("/suggest_intervals",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({expr:getExpr(), intersections:savedIntersections, num_intervals:n}),
      });
      const rd = await res.json();
      if(rd.suggested_intervals?.length > 0)
        suggestedIntervals = rd.suggested_intervals.map(iv=>({l1:iv[0].toString(), l2:iv[1].toString()}));
    }catch{}

    setIntervals(suggestedIntervals);

    const intervalsToCheck = suggestedIntervals.map(iv=>[parseFloat(iv.l1), parseFloat(iv.l2)]);
    const responseData = await runConvergenceCheck(intervalsToCheck);
    if(responseData){
      await applyConvergenceResult(responseData);
      const hasConverging = responseData.intervals?.some(r => r.converges);
      if(!hasConverging){
        setStep3Completed(true);
        setCurrentStep(3);
      }
    } else {
      setStep3Completed(true);
      setCurrentStep(3);
    }
  };

  const handleStep4Calculate = async ()=>{
    const x0val= parseFloat(x0Input);
    const validIntervals = getValidIntervals();

    const intervalBounds = validIntervals.length > 0 ? validIntervals[0] : null;
    const xmin = intervalBounds ? intervalBounds[0] : null;
    const xmax = intervalBounds ? intervalBounds[1] : null;

    const body={
      expr: getExpr(), step: "newton", single_mode: true,
      x0: x0val, intervals: validIntervals, mode: calculationMode,
      ...(xmin != null && { xmin, xmax }),
    };
    if(calculationMode === 'epsilon')
      body.epsilon = parseFloat(epsilonValue);
    else if(calculationMode === 'iterations')
      body.max_iterations = parseInt(iterationsCount);

    await apiCall("/plot", body, async (newtonData)=>{
      if(calculationMode === 'epsilon'){
        try{
          const rd0 = await fetch("/plot_single",{
            method: "POST", headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ expr: getExpr(), label: "f(x)" }),
          }).then(r=> r.json());
          onPlot({
            x1: rd0.x1, y1: rd0.y1, x2: [], y2: [],
            intersections: [], label1: "f(x)",
            single_mode: true, newton: newtonData.newton,
          });
        }catch{ onPlot(newtonData); }
      }else{
        const f1 = convergenceResults?.first_derivative;
        try{
          const [rd0, rd1]= await Promise.all([
            fetch("/plot_single",{
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ expr: getExpr(), label: "f(x)" }),
            }).then(r=>r.json()),
            f1 ? fetch("/plot_single",{
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ expr: f1+"=0", label: "f′(x)" }),
            }).then(r=>r.json()) : Promise.resolve(null),
          ]);
          onPlot({
            x1:rd0.x1, y1:rd0.y1,
            x2:rd1?rd1.x1:[], y2:rd1?rd1.y1:[],
            intersections:[], label1:"f(x)", label2:"f′(x)",
            single_mode:false, derivatives_mode:false,
            newton:newtonData.newton,
            m_value:derivativesData?.m_value??null,
            m_x:derivativesData?.m_x??null,
            m_y:derivativesData?.m_y??null,
          });
        }catch{ onPlot(newtonData); }
      }
      setStep4Completed(true);
      setCurrentStep(5);
    },"Chyba pri výpočte");
  };

  const clearAll = ()=>{
    fieldRef.current.value = "";
    onPlot(null);
    setCurrentStep(1); setX0Input("");
    setIntervals([{ l1: "", l2: "" }]);
    setAttemptCount(0); setAttemptCountStep3(0);
    setCalculationMode(null); setEpsilonValue("0.000001"); setIterationsCount("10");
    setValidationResults(null); setConvergenceResults(null);
    setStep1Completed(false); setStep2Completed(false);
    setStep3Completed(false); setStep4Completed(false);
    setDerivativesData(null); setCondition3Result(null);
    if(onHighlightChange) onHighlightChange([]);
    setDerivativePlotMode(null);
    setOriginalData(null);
    setSavedIntersections([]);
  };

  return(
    <div className="side-panel">
      {currentStep === 1 && (
        <ModeSelector
          calculationMode={calculationMode}
          epsilonValue={epsilonValue}
          iterationsCount={iterationsCount}
          onModeChange={setCalculationMode}
          onEpsilonChange={setEpsilonValue}
          onIterationsChange={setIterationsCount}
        />
      )}

      <div className={getStepClass(1)}>
        <div className="step-title step-1">Zadajte rovnicu f(x) = 0</div>
        <Step1Input
          fieldRef={fieldRef}
          calculationMode={calculationMode}
          data={originalData || data}
          onSubmit={handleStep1}
          onInsertLatex={insertLatex}
          onInsertFrac={insertFrac}
        />
      </div>

      {step1Completed && data?.expr && (
        <div className={getStepClass(2)}>
          <div className="step-title step-2">Separačný interval</div>
          <Step2Intervals
            intervals={intervals}
            validationResults={validationResults}
            attemptCount={attemptCount}
            expr={data?.expr || ""}
            onAddInterval={()=> setIntervals([...intervals, { l1: "", l2: "" }])}
            onUpdateInterval={(idx, field, val)=>{
              const next= [...intervals];
              next[idx][field] = val;
              setIntervals(next);
            }}
            onRemoveInterval={(idx)=> setIntervals(intervals.filter((_, i) => i !== idx))}
            onValidate={handleStep2Validate}
            onValidateManual={handleStep2ValidateManual}
          />
        </div>
      )}

      {step2Completed && (
        <div className={getStepClass(3)}>
          <div className="step-title step-3">Overenie konvergencie</div>
          <Step3Convergence
            convergenceResults={convergenceResults}
            attemptCountStep3={attemptCountStep3}
            onCheck={handleStep3Check}
          />
        </div>
      )}

      {step3Completed && (
        <div className={getStepClass(4)}>
          <div className="step-title step-4">Štartovací bod</div>
          <Step4StartPoint
            x0Input={x0Input}
            onX0Change={handleX0Change}
            onCalculate={handleStep4Calculate}
            onCheckCondition3={handleStep4CheckCondition3}
            convergenceResults={convergenceResults}
            condition3Result={condition3Result}
            mX={derivativesData?.m_x ?? null}
          />
        </div>
      )}

      {step4Completed && data?.newton && (
        <div className={getStepClass(5)}>
          <div className="step-title step-5">Výsledky</div>
          <Step5Results
            data={data}
            calculationMode={calculationMode}
            epsilonValue={epsilonValue}
            onRevealIndexChange={handleRevealIndex}
          />
        </div>
      )}

      <button onClick={clearAll} className="btn-primary btn-danger mt-16">
        Začať odznova
      </button>
    </div>
  );
}