import {useEffect, useRef, useState} from "react";
import Plotly from "plotly.js-dist-min";
import {HARD_MIN, HARD_MAX, INTERVAL_COLORS} from "../constants";

function clamp(val, min, max){
  return Math.min(Math.max(val, min), max);
}

function stepColor(iterIndex, totalSteps, alpha=1){
  const t = totalSteps > 1 ? iterIndex / (totalSteps - 1) : 0;
  const r = Math.round(255 * (1-t) + 30  * t);
  const g = Math.round(160 * (1-t) + 220 * t);
  const b = Math.round(20  * (1-t) + 100 * t);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildNewtonStep(step, iterIndex, totalSteps){
  const { xn, fx, dfx } = step;
  if(xn == null || fx == null) return [];

  const fy = fx;

  const isFirst = iterIndex === 0;
  const color = isFirst ? '#00bcd4' : stepColor(iterIndex, totalSteps, 1);
  const size  = isFirst ? 15 : 13;

  const traces = [];

  if(dfx != null && isFinite(dfx) && Math.abs(dfx) > 1e-10){
    const xnext = xn - fy / dfx;

    // Вертикальная пунктирная: от y=0 до точки (xn, fx)
    traces.push({
      x: [xn, xn],
      y: [0, fy],
      mode: 'lines',
      line: { color, width: 1, dash: 'dot' },
      showlegend: false,
      hoverinfo: 'skip',
      legendgroup: `newton_step_${iterIndex}`,
    });

    // Касательная: точно от (xn, fx) до (xnext, 0)
    traces.push({
      x: [xn, xnext],
      y: [fy, 0],
      mode: 'lines',
      line: { color, width: 1.5, dash: 'solid' },
      showlegend: false,
      hoverinfo: 'skip',
      legendgroup: `newton_step_${iterIndex}`,
    });
  }

  // Точка на кривой f(x)
  traces.push({
    x: [xn], y: [fy],
    mode: 'markers+text',
    marker: { color, size, symbol: 'circle', line: { color: '#111', width: 2 } },
    text: [`x<sub>${step.iter}</sub>`],
    textposition: 'top right',
    textfont: { color, size: 12, family: 'Arial Black, Arial' },
    showlegend: false,
    hovertemplate: `<b>x<sub>${step.iter}</sub> = ${xn.toFixed(6)}</b><br>f(x<sub>${step.iter}</sub>) = ${fy.toFixed(6)}<extra></extra>`,
    legendgroup: `newton_step_${iterIndex}`,
  });

  // Точка на оси x под xn
  traces.push({
    x: [xn], y: [0],
    mode: 'markers+text',
    marker: { color, size: size - 2, symbol: 'circle', line: { color: '#111', width: 1.5 } },
    text: [`x<sub>${step.iter}</sub>`],
    textposition: 'bottom center',
    textfont: { color, size: 11, family: 'Arial Black, Arial' },
    showlegend: false,
    hoverinfo: 'skip',
    legendgroup: `newton_step_${iterIndex}`,
  });

  return traces;
}

export default function PlotArea({data, highlightIntervals, newtonRevealIndex}){
  const ref = useRef();
  const [zoomedToInterval, setZoomedToInterval] = useState(false);
  const userRangesRef = useRef(null);
  const rangeRef = useRef({xMin: -10, xMax: 10, yMin: -10, yMax: 10});

  useEffect(()=>{
    setZoomedToInterval(false);

    if(!data){
      Plotly.purge(ref.current);
      userRangesRef.current = null;
      return;
    }

    const styles= getComputedStyle(document.documentElement);
    const colorBg= styles.getPropertyValue('--color-plot-bg').trim();
    const colorGrid= styles.getPropertyValue('--color-grid').trim();
    const colorZeroline= styles.getPropertyValue('--color-zeroline').trim();
    const colorFunc1= styles.getPropertyValue('--color-func1').trim();
    const colorFunc2= styles.getPropertyValue('--color-func2').trim();
    const colorButton= styles.getPropertyValue('--color-button').trim();
    const colorText= styles.getPropertyValue('--color-text').trim();

    const { x1, y1, x2, y2, intersections, newton, display_range } = data;

    let xMin, xMax, yMin, yMax;

    if(display_range){
      const allY= [...(y1||[]), ...(y2||[])].filter(v => v !== null && isFinite(v));
      if(allY.length > 0){
        const sorted = [...allY].sort((a,b) => a-b);
        const p3  = sorted[Math.max(0, Math.floor(sorted.length * 0.03))];
        const p97 = sorted[Math.min(sorted.length-1, Math.floor(sorted.length * 0.97))];
        const ySpread= Math.max(Math.abs(p97 - p3), 1);
        const yCenter2= (p3 + p97) / 2;
        yMin = clamp(yCenter2 - ySpread * 0.65, HARD_MIN, HARD_MAX);
        yMax = clamp(yCenter2 + ySpread * 0.65, HARD_MIN, HARD_MAX);
      }else{ yMin = -10; yMax = 10; }
      const validX= [...(x1||[]), ...(x2||[])].filter(v => isFinite(v));
      const dataXMin= validX.length ? Math.min(...validX) : display_range.xmin;
      const dataXMax= validX.length ? Math.max(...validX) : display_range.xmax;
      const xPad= Math.max((dataXMax - dataXMin) * 0.05, 0.5);
      xMin = clamp(dataXMin - xPad, HARD_MIN, HARD_MAX);
      xMax = clamp(dataXMax + xPad, HARD_MIN, HARD_MAX);
    }else if(!data.single_mode && intersections && intersections.length > 0){
      const ixs= intersections.map(pt => pt[0]);
      const iys= intersections.map(pt => pt[1]);
      const xCenter= (Math.min(...ixs) + Math.max(...ixs)) / 2;
      const yCenter= (Math.min(...iys) + Math.max(...iys)) / 2;
      const xSpread= Math.max(Math.max(...ixs) - Math.min(...ixs), 0.5);
      const allY2= [...(y1||[]), ...(y2||[])].filter(v => v !== null && isFinite(v));
      let ySpread= 3;
      if(allY2.length > 0){
        const sorted2= [...allY2].sort((a,b) => a-b);
        const p5 = sorted2[Math.max(0, Math.floor(sorted2.length * 0.05))];
        const p95 = sorted2[Math.min(sorted2.length-1, Math.floor(sorted2.length * 0.95))];
        ySpread = Math.max(Math.abs(p95 - p5) / 2, 1);
      }
      xMin = clamp(xCenter - xSpread * 3, HARD_MIN, HARD_MAX);
      xMax = clamp(xCenter + xSpread * 3, HARD_MIN, HARD_MAX);
      yMin = clamp(yCenter - ySpread * 1.4, HARD_MIN, HARD_MAX);
      yMax = clamp(yCenter + ySpread * 1.4, HARD_MIN, HARD_MAX);
      if(xMax - xMin < 2){ xMin = xCenter - 1; xMax = xCenter + 1; }
      if(yMax - yMin < 2){ yMin = yCenter - 1; yMax = yCenter + 1; }
    }else{
      const allX= [...(x1||[]), ...(x2||[])].filter(v => isFinite(v));
      xMin = clamp(allX.length ? Math.min(...allX) : -10, HARD_MIN, HARD_MAX);
      xMax = clamp(allX.length ? Math.max(...allX) : 10,  HARD_MIN, HARD_MAX);
      const yInRange= [];
      for(let i= 0; i < (x1||[]).length; i++){
        if(y1[i] !== null && isFinite(y1[i])) yInRange.push(y1[i]);
      }
      for(let i= 0; i < (x2||[]).length; i++){
        if(y2[i] !== null && isFinite(y2[i])) yInRange.push(y2[i]);
      }
      if(yInRange.length > 0){
        const sortedY= [...yInRange].sort((a,b) => a-b);
        const p2 = sortedY[Math.floor(sortedY.length * 0.02)];
        const p98 = sortedY[Math.floor(sortedY.length * 0.98)];
        const spread= Math.max(Math.abs(p98 - p2), 1);
        yMin = clamp(p2 - spread * 0.15, HARD_MIN, HARD_MAX);
        yMax = clamp(p98 + spread * 0.15, HARD_MIN, HARD_MAX);
      }else{ yMin = -10; yMax = 10; }
    }

    if(xMax - xMin < 1){ xMin = -10; xMax = 10; }
    if(yMax - yMin < 1){ yMin = -10; yMax = 10; }

    const savedRanges= userRangesRef.current;
    if(savedRanges){
      xMin = savedRanges.x[0]; xMax = savedRanges.x[1];
      yMin = savedRanges.y[0]; yMax = savedRanges.y[1];
    }
    rangeRef.current = { xMin, xMax, yMin, yMax };

    const filterY = (yArr) =>
      (yArr || []).map(v =>
        v === null || v === undefined || !isFinite(v) ? null
          : (v < HARD_MIN || v > HARD_MAX ? null : v)
      );

    const y1Filtered = filterY(y1);
    const y2Filtered = filterY(y2 || []);
    const y0Filtered= data.y0 ? filterY(data.y0) : null;

    const traces= [];

    if(data.single_mode){
      traces.push({
        x: x1, y: y1Filtered, mode: "lines",
        line: {color: colorFunc1, width: 3, shape: 'linear'},
        name: data.label1 || data.label || "f(x)",
        showlegend: true, connectgaps: false,
      });
      traces.push({
        x: [xMin, xMax], y: [0, 0], mode: "lines",
        line: {color: colorZeroline, width: 1, dash: "dot"},
        name: "y = 0", showlegend: false,
      });
    }else{
      if(y0Filtered && data.x0){
        traces.push({
          x: data.x0, y: y0Filtered, mode: "lines",
          line: {color: '#2196f3', width: 2.5, shape: 'linear'},
          name: data.label0 || "f(x)",
          showlegend: true, connectgaps: false,
        });
      }
      const color1 = data.derivatives_mode ? '#00c875' : colorFunc1;
      const color2 = data.derivatives_mode ? '#ffeb3b' : colorFunc2;
      traces.push({
        x: x1, y: y1Filtered, mode: "lines",
        line: {color: color1, width: 3, shape: 'linear'},
        name: data.label1 || "g(x)",
        showlegend: true, connectgaps: false,
      });
      if((y2 || []).length > 0){
        traces.push({
          x: x2, y: y2Filtered, mode: "lines",
          line: {color: color2, width: 3, shape: 'linear'},
          name: data.label2 || "h(x)",
          showlegend: true, connectgaps: false,
        });
      }
      const isHZero= (y2 || []).every(y =>
        y === null || y === undefined || (isFinite(y) && Math.abs(y) < 0.01)
      );
      if(isHZero && !data.derivatives_mode && data.m_value == null){
        traces.push({
          x: [xMin, xMax], y: [0, 0], mode: "lines",
          line: {color: colorFunc2, width: 2, dash: "dash"},
          name: "h(x) = 0", showlegend: false, connectgaps: false,
        });
      }
    }

    if(newton?.root !== undefined && !data.derivatives_mode){
      const rootX2 = newton.root;
      traces.push({
        x: [rootX2], y: [0],
        mode: "markers",
        marker: {color: colorButton, size: 10, symbol: "circle", line: {width: 2, color: colorText}},
        name: "Nájdený koreň",
        showlegend: true,
        hovertemplate: `<b>Koreň α</b><br>x = %{x:.8f}<extra></extra>`,
      });
    }

    if(data.m_value != null && data.m_x != null && data.m_y != null){
      traces.push({
        x: [data.m_x], y: [data.m_y],
        mode: "markers+text",
        marker:{ color: '#ffeb3b', size: 12, symbol: "circle", line: {width: 2, color: '#1a1a1a'} },
        text: "m", textposition: 'top right',
        textfont: {color: '#ffeb3b', size: 12, family: 'Arial Black, Arial'},
        name: "min|f′(x)|", showlegend: true,
        hovertemplate: `<b>m = min|f′(x)|</b><br><br>f′(x) = %{y:.6f}<extra></extra>`,
      });
    }

    const layout={
      paper_bgcolor: colorBg, plot_bgcolor: colorBg,
      font: {color: colorText, size: 12},
      margin: {t: 20, l: 70, r: 30, b: 60},
      showlegend: true,
      legend:{
        x: 0.02, y: 0.98,
        bgcolor: "rgba(30, 30, 30, 0.85)",
        bordercolor: colorGrid, borderwidth: 1,
        font: {size: 11, color: colorText},
      },
      xaxis:{
        zeroline: true, zerolinecolor: colorZeroline, zerolinewidth: 2,
        gridcolor: colorGrid, gridwidth: 1,
        title: {text: "x", font: {size: 16, color: colorText}},
        color: colorText, range: [xMin, xMax], autorange: false,
        fixedrange: false, minallowed: HARD_MIN, maxallowed: HARD_MAX,
      },
      yaxis:{
        zeroline: true, zerolinecolor: colorZeroline, zerolinewidth: 2,
        gridcolor: colorGrid, gridwidth: 1,
        title: {text: "y", font: { size: 16, color: colorText}},
        color: colorText, range: [yMin, yMax], autorange: false,
        fixedrange: false, minallowed: HARD_MIN, maxallowed: HARD_MAX,
      },
      dragmode: "pan", hovermode: "closest", title: {text: ""},
    };

    Plotly.newPlot(ref.current, traces, layout, {
      responsive: true, scrollZoom: true,
      displaylogo: false, displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
      toImageButtonOptions: {format: 'png', filename: 'newton_method_graph', height: 1000, width: 1400, scale: 2},
    });

    const el = ref.current;
    const handleRelayout = (eventData)=>{
      const xr0 = eventData["xaxis.range[0]"];
      const xr1 = eventData["xaxis.range[1]"];
      const yr0 = eventData["yaxis.range[0]"];
      const yr1 = eventData["yaxis.range[1]"];
      let needUpdate = false;
      const update = {};
      if(xr0 !== undefined || xr1 !== undefined){
        const newX0= clamp(xr0 !== undefined ? xr0 : xMin, HARD_MIN, HARD_MAX);
        const newX1= clamp(xr1 !== undefined ? xr1 : xMax, HARD_MIN, HARD_MAX);
        if(newX0 !== xr0 || newX1 !== xr1){ update["xaxis.range"] = [newX0, newX1]; needUpdate = true; }
      }
      if(yr0 !== undefined || yr1 !== undefined){
        const newY0= clamp(yr0 !== undefined ? yr0 : yMin, HARD_MIN, HARD_MAX);
        const newY1= clamp(yr1 !== undefined ? yr1 : yMax, HARD_MIN, HARD_MAX);
        if(newY0 !== yr0 || newY1 !== yr1){ update["yaxis.range"] = [newY0, newY1]; needUpdate = true; }
      }
      if(needUpdate) Plotly.relayout(el, update);
      if(xr0 !== undefined || xr1 !== undefined || yr0 !== undefined || yr1 !== undefined){
        const layout = el.layout;
        if(layout?.xaxis?.range && layout?.yaxis?.range){
          userRangesRef.current ={ x: [...layout.xaxis.range], y: [...layout.yaxis.range] };
          rangeRef.current = { xMin: layout.xaxis.range[0], xMax: layout.xaxis.range[1], yMin: layout.yaxis.range[0], yMax: layout.yaxis.range[1] };
        }
      }
      if(eventData["xaxis.autorange"] || eventData["yaxis.autorange"])
        userRangesRef.current = null;
    };
    el.on("plotly_relayout", handleRelayout);
    return ()=>{ if(el && el.removeListener) el.removeListener("plotly_relayout", handleRelayout); };
  }, [data]);

  // Highlight intervals
  useEffect(()=>{
    const el = ref.current;
    if(!el || !el.data) return;
    const baseTraces = el.data.filter(t =>
      !(t.name && t.name.startsWith('Interval')) &&
      !(t.legendgroup && t.legendgroup.startsWith('interval'))
    );
    const hasExistingIntervals = el.data.some(
      t => (t.name && t.name.startsWith('Interval')) || (t.legendgroup && t.legendgroup.startsWith('interval'))
    );
    if(!hasExistingIntervals && (!highlightIntervals || highlightIntervals.length === 0)) return;
    const intervalTraces= [];
    if(highlightIntervals && highlightIntervals.length > 0){
      const hexToRgba = (hex, alpha)=>{
        const r= parseInt(hex.slice(1,3),16);
        const g= parseInt(hex.slice(3,5),16);
        const b= parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${alpha})`;
      };
      const interval = highlightIntervals[0];
      if(interval && interval.length === 2){
        const [a, b] = interval;
        const color= INTERVAL_COLORS[0];
        const yDense= Array.from({length: 81}, (_, i) => HARD_MIN + (HARD_MAX - HARD_MIN) * i / 80);
        intervalTraces.push({ x: Array(yDense.length).fill(a), y: yDense, mode: 'lines', line: {color, width: 3, dash: 'solid'}, name: 'Interval α', showlegend: false, hoverinfo: 'skip', legendgroup: 'interval0' });
        intervalTraces.push({ x: Array(yDense.length).fill(b), y: yDense, mode: 'lines', line: {color, width: 3, dash: 'solid'}, name: 'Interval α', showlegend: false, hoverinfo: 'skip', legendgroup: 'interval0' });
        intervalTraces.push({ x: [a, a, b, b, a], y: [HARD_MIN, HARD_MAX, HARD_MAX, HARD_MIN, HARD_MIN], fill: 'toself', fillcolor: hexToRgba(color, 0.07), line: {width: 0}, mode: 'lines', showlegend: false, hoverinfo: 'skip', legendgroup: 'interval0' });
        intervalTraces.push({ x: [a, b], y: [0, 0], mode: 'markers+text', marker: {color, size: 8, symbol: 'circle'}, text: ['a', 'b'], textposition: ['top right', 'top left'], textfont: {color, size: 13, family: 'Arial Black, Arial, sans-serif'}, showlegend: false, hoverinfo: 'skip', legendgroup: 'interval0' });
      }
    }
    const mTrace = baseTraces.find(t => t.name === 'min|f′(x)|');
    const baseSansMark = baseTraces.filter(t => t.name !== 'min|f′(x)|');
    Plotly.react(el, [...baseSansMark, ...intervalTraces, ...(mTrace ? [mTrace] : [])], el.layout, {
      responsive: true, scrollZoom: true, displaylogo: false, displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"]
    });
  },[highlightIntervals, data]);

  // Newton points + tangents
  useEffect(()=>{
    const el = ref.current;
    if(!el || !el.data || !data?.newton?.steps) return;
    const steps = data.newton.steps;
    if(!steps || steps.length === 0) return;
    if(newtonRevealIndex == null || newtonRevealIndex < 0) return;

    const baseTraces = el.data.filter(t =>
      !(t.legendgroup && t.legendgroup.startsWith('newton_step_'))
    );

    const newTraces = [...baseTraces];

    // Рисуем все шаги до newtonRevealIndex включительно
    const stepsToShow = Math.min(newtonRevealIndex, steps.length);

    for(let i = 0; i < stepsToShow; i++){
      const stepTraces = buildNewtonStep(steps[i], i, steps.length - 1);
      stepTraces.forEach(t => newTraces.push(t));
    }

    Plotly.react(el, newTraces, el.layout, {
      responsive: true, scrollZoom: true,
      displaylogo: false, displayModeBar: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    });
  }, [newtonRevealIndex, data, highlightIntervals]);

  const hasIntervals= highlightIntervals && highlightIntervals.length > 0;

  const handleZoomToInterval = ()=>{
    if(!ref.current || !hasIntervals) return;
    const allA = highlightIntervals.map(([a]) => a);
    const allB = highlightIntervals.map(([,b]) => b);
    const xLo= Math.min(...allA);
    const xHi= Math.max(...allB);
    const xSpan= Math.max(xHi - xLo, 0.1);
    const pad= Math.max(xSpan * 0.3, 0.05);
    const zXMin= xLo - pad, zXMax= xHi + pad;
    const traces= ref.current.data || [];
    const ysInRange= [];
    for(const trace of traces){
      if(!trace.x || !trace.y || trace.hoverinfo === 'skip') continue;
      for(let i= 0; i < trace.x.length; i++){
        const tx = trace.x[i], ty = trace.y[i];
        if(tx >= zXMin && tx <= zXMax && ty !== null && isFinite(ty)) ysInRange.push(ty);
      }
    }
    let zYMin, zYMax;
    if(ysInRange.length > 2){
      const sorted= [...ysInRange].sort((a,b) => a-b);
      const p2 = sorted[Math.max(0, Math.floor(sorted.length * 0.02))];
      const p98 = sorted[Math.min(sorted.length-1, Math.floor(sorted.length * 0.98))];
      const ySpan= Math.max(Math.abs(p98 - p2), 0.5);
      const yCenter= (p2 + p98) / 2;
      zYMin = yCenter - ySpan * 0.8; zYMax = yCenter + ySpan * 0.8;
    }else{ zYMin = -2; zYMax = 2; }
    Plotly.relayout(ref.current, {
      "xaxis.range": [zXMin, zXMax], "xaxis.autorange": false,
      "yaxis.range": [zYMin, zYMax], "yaxis.autorange": false,
    });
    setZoomedToInterval(true);
  };

  const handleZoomOut = ()=>{
    if(!ref.current) return;
    userRangesRef.current = null;
    Plotly.relayout(ref.current, {
      "xaxis.range": [HARD_MIN, HARD_MAX], "xaxis.autorange": false,
      "yaxis.range": [HARD_MIN, HARD_MAX], "yaxis.autorange": false,
    });
    setZoomedToInterval(false);
  };

  return(
    <div className="plot-area" style={{ position: "relative" }}>
      <div ref={ref} className="plot-container"></div>
      {hasIntervals && (
        <button
          onClick={zoomedToInterval ? handleZoomOut : handleZoomToInterval}
          title={zoomedToInterval ? "Zobraziť celý graf" : "Priblížiť na interval [a,b]"}
          style={{
            position: "absolute", bottom: "52px", right: "14px",
            padding: "5px 10px", fontSize: "12px", fontWeight: "bold",
            background: zoomedToInterval ? "rgba(0,230,118,0.18)" : "rgba(33,150,243,0.18)",
            border: `1px solid ${zoomedToInterval ? "#00e676" : "#2196f3"}`,
            borderRadius: "6px", cursor: "pointer",
            color: zoomedToInterval ? "#00e676" : "#2196f3",
            backdropFilter: "blur(4px)", zIndex: 10, transition: "all 0.2s",
          }}>
          {zoomedToInterval ? "↩ Celý pohľad" : "Zoom [a,b]"}
        </button>
      )}
    </div>
  );
}