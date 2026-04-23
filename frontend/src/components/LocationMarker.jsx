import {useMapEvents, Tooltip, Marker } from "react-leaflet";

function LocationMarker({
    stops,
    setStops,
    setRoutes,
    addStopId,
    setAddStopId,
}) {
    const genId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    useMapEvents({
        click(e) {
        if (stops.length < 2 || addStopId) {
            const newStop = { id: genId(), lat: e.latlng.lat, lng: e.latlng.lng, name: `Zastávka ${stops.length + 1}` };
            setStops((prev) => [...prev, newStop]);
            setAddStopId(false);
            setRoutes([]);
        }
        },
    });

    

    return stops.map((stop) => (
        <Marker key={stop.id} position={[stop.lat, stop.lng]}>
            <Tooltip
                permanent
                direction="top"
                offset={[0, -20]}
                opacity={1}
                className="coordinate-tooltip"
            >
                {stops.findIndex(s => s.id === stop.id) + 1}. {stop.name || "Zastávka"}
            </Tooltip>
        </Marker>
    ));
}

export default LocationMarker;