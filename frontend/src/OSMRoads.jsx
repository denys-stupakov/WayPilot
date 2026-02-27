import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import "leaflet/dist/leaflet.css";
import { Info } from "lucide-react";
import { v4 as uuidv4 } from "uuid"

import { arrayMove } from '@dnd-kit/sortable';

import CompareRoutes from "./components/CompareRoutes";
import LocationMarker from "./components/LocationMarker";
import StopsReorderBar from "./components/StopsReorderBar";
import RoutesSidebar from "./components/RoutesSidebar";

// ---------- Portal for drag items ----------
const portal = document.createElement("div");
if (typeof document !== "undefined") document.body.appendChild(portal);

export default function OSMRoads() {
  const [routes1, setRoutes1] = useState([]);
  const [routes2, setRoutes2] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [visibleRoutes, setVisibleRoutes] = useState({});
  const [mode1, setMode1] = useState("normal");
  const [mode2, setMode2] = useState("trafficLights");
  const [stops, setStops] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [addStopId, setAddStopId] = useState(false);
  const [vehicleWeight, setvehicleWeight] = useState(0);

  const sourceRef = useRef(null);

  // ---------------- Route update helper ----------------
  function handleRouteUpdate(routeData, isRoute1) {
    const { index, route1, route2, start, end } = routeData;
    const route = isRoute1 ? route1 : route2;
    const color = isRoute1 ? "#00bfff" : "#ff4d4d";

    if (!route?.smoothPathCoords || !Array.isArray(route.smoothPathCoords)) {
      console.warn(`Route missing smoothPathCoords at segment ${index}`);
      return;
    }

    const key = uuidv4();

    setStops(prev => {
      const newStops = [...prev];
      if (newStops[index] && start?.snapped) {
        newStops[index] = { ...newStops[index], lat: start.snapped.lat, lng: start.snapped.lng };
      }
      if (newStops[index + 1] && end?.snapped) {
        newStops[index + 1] = { ...newStops[index + 1], lat: end.snapped.lat, lng: end.snapped.lng };
      }
      return newStops;
    });

    if (isRoute1) setRoutes1(prev => [...prev, { ...route, key }]);
    else setRoutes2(prev => [...prev, { ...route, key }]);

    setRoutes(prev => [...prev, { key, polyline: route.smoothPathCoords, color, visible: true }]);
    setVisibleRoutes(prev => ({ ...prev, [key]: true }));
  }

  // ---------------- Reset all state ----------------
  function resetAll() {
    setStops([]);
    setRoutes([]);
    setRoutes1([]);
    setRoutes2([]);
    setVisibleRoutes({});
    setvehicleWeight(0);
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }

  // ---------------- Start streaming routes ----------------
  function startStreamingRoutes() {
    if (stops.length < 2) return alert("Add at least 2 stops");

    // Close previous stream if exists
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }

    const stopsParam = encodeURIComponent(JSON.stringify(stops));
    const url = `${import.meta.env.VITE_API_URL}/route-stream?stops=${stopsParam}&mode1=${mode1}&mode2=${mode2}&vehicleWeight=${vehicleWeight}`;

    const source = new EventSource(url);
    sourceRef.current = source;

    setRoutes1([]);
    setRoutes2([]);
    setRoutes([]);
    setVisibleRoutes({});

    source.addEventListener("error", e => {
      try {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case "invalid_stop":
            alert(`Stop at index ${data.index} is too far from known roads.`);
            break;
          case "route_computation_failed":
            console.warn(`Route computation failed at segment ${data.index}: ${data.message}`);
            break;
          default:
            console.error("Unknown server error:", data);
        }
      } catch (err) {
        console.error("Failed to parse error event:", err);
      }
    });

    source.addEventListener("route1", e => handleRouteUpdate(JSON.parse(e.data), true));
    source.addEventListener("route2", e => handleRouteUpdate(JSON.parse(e.data), false));
    source.addEventListener("end", () => source.close());
  }

  // ---------------- Toggle route visibility ----------------
  const toggleRouteVisibility = (key) => {
    setVisibleRoutes(prev => ({ ...prev, [key]: !prev[key] }));
    setRoutes(prev => prev.map(r => r.key === key ? { ...r, visible: !r.visible } : r));
  };

  // ---------------- Handle drag reorder ----------------
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setStops(prev => {
      const oldIndex = prev.findIndex(s => s.id === active.id);
      const newIndex = prev.findIndex(s => s.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // ---------------- Delete stop ----------------
  function deleteStop(id) {
    setStops(prev => prev.filter(s => s.id !== id));
    setRoutes([]);
  }

  // ---------------- Cleanup on unmount ----------------
  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  // ---------------- Render ----------------
  return (
    <>
      <MapContainer
        center={[48.716535, 21.260863]}
        zoom={14}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <LocationMarker
          stops={stops}
          setStops={setStops}
          setRoutes={setRoutes}
          addStopId={addStopId}
          setAddStopId={setAddStopId}
        />
        {routes.map(r => r.visible && (
          <Polyline key={r.key} positions={r.polyline} color={r.color} weight={4} />
        ))}
      </MapContainer>

      <CompareRoutes
        mode1={mode1}
        setMode1={setMode1}
        mode2={mode2}
        setMode2={setMode2}
        vehicleWeight={vehicleWeight}
        setvehicleWeight={setvehicleWeight}
        startStreamingRoutes={startStreamingRoutes}
        resetAll={resetAll}
      />

      <RoutesSidebar
        routes1={routes1}
        routes2={routes2}
        visibleRoutes={visibleRoutes}
        toggleRouteVisibility={toggleRouteVisibility}
      />

      <StopsReorderBar
        stops={stops}
        setStops={setStops}
        deleteStop={deleteStop}
        setAddStopId={setAddStopId}
        handleDragEnd={handleDragEnd}
      />

      {/* ---------------- Bottom Toolbar ---------------- */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-6 px-8 py-4 rounded-[28px] text-gray-900 font-medium"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.4), rgba(255,255,255,0.25))",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow: "inset 0 0 1px rgba(255,255,255,0.5), 0 8px 30px rgba(0,0,0,0.2)",
        }}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale:0.95 }}
          onClick={() => setShowHelp(true)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400/90 to-blue-600/90 shadow-[0_4px_12px_rgba(0,150,255,0.5)] hover:shadow-[0_6px_14px_rgba(0,150,255,0.6)] text-white"
        >
          <Info size={24} />
        </motion.button>
        <span className="text-gray-800 text-sm opacity-80 select-none">zorochevv</span>
      </div>

      {/* ---------------- Floating Help ---------------- */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale:0.95 }}
            animate={{ opacity: 1, y: 0, scale:1 }}
            exit={{ opacity:0, y:100, scale:0.95 }}
            transition={{ duration:0.2, ease:"easeOut" }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[360px] max-h-[70vh] z-[1200] rounded-2xl text-gray-900 p-6 overflow-y-auto"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.25))",
              backdropFilter: "blur(22px) saturate(180%)",
              WebkitBackdropFilter: "blur(22px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.45)",
              boxShadow: "inset 0 0 1px rgba(255,255,255,0.4), 0 10px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Instructions</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-600 hover:text-gray-900 transition text-sm">✕</button>
            </div>
            <ul className="space-y-2 text-sm text-gray-800">
              <li>🟢 Tap on the map to add stops (minimum 2 required).</li>
              <li>🔵 Drag stops above to reorder them before comparing.</li>
              <li>⚙️ Press <b>Compare Routes</b> to stream and visualize paths.</li>
              <li>🧹 Press <b>Reset</b> to clear all markers and paths.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}