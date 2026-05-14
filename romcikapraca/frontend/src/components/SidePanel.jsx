import{useRef, useState, useEffect} from "react";
import{apiCall} from "../utils";
import ModeSelector from "./ModeSelector";
import Step1Input from "./steps/Input";
import Step2Intervals from "./steps/Intervals";
import Step3Convergence from "./steps/Convergence";
import Step4StartPoint from "./steps/StartPoint";
import Step5Results from "./steps/EndPoint";

export default function SidePanel({data, onPlot, onModeChange, onHighlightChange}){
  const fieldRef= useRef(null);

  //states
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
  const [iterationsCount, setIterationsCount] = useState("10");
  const [derivativePlotMode, setDerivativePlotMode] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [savedIntersections, setSavedIntersections] = useState([]);

//mathlive**
  useEffect(() =>{
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
        script.parentNode.removeChild(script);};
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
      .filter(int=> int.l1 !== "" && int.l2 !== "")
      .map(int=> {
        const a= parseFloat(int.l1);
        const b= parseFloat(int.l2);
        return isNaN(a) || isNaN(b) ? null : [a, b];
      })

      .filter(Boolean)
      .filter(([a, b])=> a < b);
    onHighlightChange(parsed);
  },[intervals, step1Completed]);

  const handleStep2ValidateManual = async(setManualResults)=>{
  const validIntervals= getValidIntervals();

  if(validIntervals.length === 0){
    alert("Prosím, zadajte aspoň jeden interval.");
    return;
  }

  await apiCall("/validate_intervals",{ expr: getExpr(), intervals: validIntervals },(responseData)=>{
    setManualResults(responseData);
  }, "Chyba pri validácii intervalov");
  };

  //helper
  const getExpr = ()=>{
    let expr= fieldRef.current.getValue("latex") || fieldRef.current.value;

    if(!expr.includes("="))
      expr += "=0";

    return expr;
  };

  const getValidIntervals = ()=>
    intervals
      .filter(int=> int.l1 !== "" && int.l2 !== "")
      .map(int=> [parseFloat(int.l1), parseFloat(int.l2)]);

  const getStepClass = (step)=>{
    let cls= "step-card";

    if(currentStep >= step)
      cls += "active";

    if(currentStep === step)
      cls += "current";
    return cls;
  };

  const insertLatex = (latex)=>{
    fieldRef.current.insert(latex); fieldRef.current.focus();
  };

  const insertFrac = ()=>{
    fieldRef.current.insert("\\frac{\\placeholder{}}{\\placeholder{}}"); fieldRef.current.focus();
  };

  const handleStep1 = async ()=>{
    let expr= fieldRef.current.getValue("latex") || fieldRef.current.value;

    if(!expr.includes("=")){
      expr += "=0"; fieldRef.current.setValue(expr);
    }

    await apiCall("/plot",{ expr, step: "split"},(responseData)=>{
      onPlot(responseData);
      setSavedIntersections(responseData.intersections || []);
      setStep1Completed(true);
      setCurrentStep(2);
    }, "Chyba pri rozdeľovaní rovnice");
  };

  const handleStep2Validate = async ()=>{
    const validIntervals= getValidIntervals();

    if(validIntervals.length === 0){
      alert("Prosím, zadajte aspoň jeden interval.");
      return;
    }

    await apiCall("/validate_intervals",{ expr: getExpr(), intervals: validIntervals },(responseData)=>{
      setValidationResults(responseData);
      const hasValid = responseData.validIntervals?.some(r => r.valid);

      if(hasValid){
        setStep2Completed(true);
        setCurrentStep(3);
        setAttemptCount(0);
      }else{
        const next= attemptCount + 1;
        setAttemptCount(next);

        if(next >= 3){
          const n= intervals.filter(i=> i.l1 !== "" || i.l2 !== "").length || 1;
          alert(`Vyčerpali ste 3 pokusy. Automaticky sa načíta ${n} správny interval.`);
          autoFillCorrectIntervals();
        } else{
          alert(`Pokus ${next}/3: Žiadny interval nie je platný. Skúste iné intervaly.`);
        }
      }
    }, "Chyba pri validácii intervalov");
  };

  const autoFillCorrectIntervals = async ()=>{
    setAttemptCount(0);
    const n = intervals.filter(i=> i.l1 !== "" || i.l2 !== "").length || 1;

    try{
      const res= await fetch("http://147.232.204.240:8000/suggest_intervals",{
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expr: getExpr(), intersections: savedIntersections, num_intervals: n }),
      });
      const rd = await res.json();

      if(rd.suggested_intervals?.length > 0) {
        setIntervals(rd.suggested_intervals.map(iv => ({ l1: iv[0].toString(), l2: iv[1].toString() })));
      }else{
        setIntervals([{ l1: "-2", l2: "2" }]);
      }

    }catch{
      setIntervals([{ l1: "-2", l2: "2" }]);
    }

    setTimeout(()=> { setStep2Completed(true); setCurrentStep(3); setValidationResults(null); },800);
  };

  const handleStep3Check = async ()=>{
    await apiCall("/check_convergence",{ expr: getExpr(), intervals: getValidIntervals() },(responseData)=>{
      setConvergenceResults(responseData);
      setDerivativePlotMode(null);

      const hasConverging = responseData.intervals?.some(r => r.converges);

      if(hasConverging){
        if(data && !originalData)
          setOriginalData(data);

        apiCall("/plot_single",{ expr: getExpr(), label: "f(x)" }, (rd) => onPlot(rd),"Chyba pri zobrazení f(x)");

        setStep3Completed(true);
        setCurrentStep(4);
        setAttemptCountStep3(0);
      }else{
        const next= attemptCountStep3 + 1;
        setAttemptCountStep3(next);

        if(next >= 3){
          alert("Vyčerpali ste 3 pokusy. Automaticky sa načíta vhodný interval.");
          autoFillConvergingIntervals();
        }else{
          alert(`Pokus ${next}/3: Metóda nemusí konvergovať. Skúste iné intervaly.`);
        }
      }
    },"Chyba pri overovaní konvergencie");
  };

  const autoFillConvergingIntervals = async ()=>{

    setAttemptCountStep3(0);
    const n= intervals.filter(i=> i.l1 !== "" || i.l2 !== "").length || 1;

    try{
      const res= await fetch("http://147.232.204.240:8000/suggest_intervals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expr: getExpr(), intersections: savedIntersections, num_intervals: n }),
      });

      const rd = await res.json();

      if(rd.suggested_intervals?.length > 0){
        setIntervals(rd.suggested_intervals.map(iv => ({ l1: iv[0].toString(), l2: iv[1].toString() })));
      }else{
        setIntervals([{ l1: "-1", l2: "1" }]);
      }
    } catch{ setIntervals([{ l1: "-1", l2: "1" }]); }
    setTimeout(()=> { setStep3Completed(true); setCurrentStep(4);setConvergenceResults(null); },800);
  };

  const handleStep4Calculate = async()=>{
    const body={
      expr: getExpr(), step: "newton", single_mode: true,
      x0: parseFloat(x0Input), intervals: getValidIntervals(), mode: calculationMode,
    };

    if(calculationMode === 'epsilon')
      body.epsilon = parseFloat(epsilonValue);

    else if(calculationMode === 'iterations')
      body.max_iterations = parseInt(iterationsCount);

    await apiCall("/plot", body,(responseData)=>{
      onPlot(responseData);
      setStep4Completed(true);
      setCurrentStep(5);
    },"Chyba pri výpočte");
  };

  const handleShowDerivative = async(derivExpr, mode)=>{
    if(!convergenceResults) return;

    if(!originalData)
      setOriginalData(data);

    setDerivativePlotMode(mode);

    const labelMap= { f0: "f(x)", f1: "f'(x)", f2: "f''(x)" };
    await apiCall("/plot_single", { expr: `${derivExpr}=0`,label: labelMap[mode] || derivExpr },
      (rd) => onPlot(rd),"Chyba pri zobrazení derivácie");
  };

  const handleRestoreMain = ()=>{
    if (originalData){ onPlot(originalData); setOriginalData(null); }
    setDerivativePlotMode(null);
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

    if(onHighlightChange)
      onHighlightChange([]);

    setDerivativePlotMode(null);
    setOriginalData(null);
    setSavedIntersections([]);
  };


//render**
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
        <div className="step-title step-1">Krok 1: Zadajte rovnicu f(x) = 0</div>
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
          <div className="step-title step-2">Krok 2: Separačné intervaly</div>
          <Step2Intervals
            intervals={intervals}
            validationResults={validationResults}
            attemptCount={attemptCount}
            onAddInterval={()=> setIntervals([...intervals, { l1: "", l2: "" }])}
            onUpdateInterval={(idx, field, val) => {
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
          <div className="step-title step-3">Krok 3: Overenie konvergencie</div>
          <Step3Convergence
            convergenceResults={convergenceResults}
            attemptCountStep3={attemptCountStep3}
            onCheck={handleStep3Check}
          />
        </div>
      )}

      {step3Completed && (
        <div className={getStepClass(4)}>
          <div className="step-title step-4">Krok 4: Startovací bod x₀</div>
          <Step4StartPoint
            x0Input={x0Input}
            onX0Change={setX0Input}
            onCalculate={handleStep4Calculate}
            convergenceResults={convergenceResults}
          />
        </div>
      )}

      {step4Completed && data?.newton && (
        <div className={getStepClass(5)}>
          <div className="step-title step-5">Krok 5: Výsledky</div>
          <Step5Results data={data} calculationMode={calculationMode} />
        </div>
      )}

      <button onClick={clearAll} className="btn-primary btn-danger mt-16">
        Začať odznova
      </button>
    </div>
  );
}