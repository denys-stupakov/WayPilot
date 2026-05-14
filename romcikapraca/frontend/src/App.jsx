import {useState} from "react";
import SidePanel from "./components/SidePanel";
import PlotArea from "./components/PlotArea";

export default function App(){
  const [data, setData] = useState(null);
  const [calculationMode, setCalculationMode] = useState(null);
  const [modeValue, setModeValue] = useState(null);
  const [highlightIntervals, setHighlightIntervals] = useState([]);

  const handleModeChange = (mode, value)=>{
    setCalculationMode(mode);
    setModeValue(value);
  };

  return(
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div style={{ width: "800px", borderRight: "1px solid #333" }}>
        <SidePanel
          data={data}
          onPlot={setData}
          onModeChange={handleModeChange}
          onHighlightChange={setHighlightIntervals}
        />
      </div>
      <div style={{ flex: 1, position: "relative", height: "100vh", overflow: "hidden" }}>
        <PlotArea data={data} highlightIntervals={highlightIntervals} />
      </div>
    </div>
  );
}