function RoutesSidebar({
  routes1,
  routes2,
  visibleRoutes,
  toggleRouteVisibility
}) {
  if (routes1.length === 0 && routes2.length === 0) return null;

  function formatTime(seconds) {
    const totalHours = seconds / 3600;

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    return `${hours} h ${minutes} min`;
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-4 p-4 w-80 rounded-2xl"
      style={{
        height: "40vh",
        maxHeight: "40vh",
        overflowY: "auto",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.4), rgba(255,255,255,0.25))",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.45)",
        boxShadow:
          "inset 0 0 1px rgba(255,255,255,0.5), 0 8px 30px rgba(0,0,0,0.2)"
      }}
    >
      <h2 className="text-lg font-semibold mb-2">Trasy</h2>

      <div className="space-y-2">
        {/* Prvá trasa */}
        <div>
          <h3 className="text-sm font-medium text-blue-600 mb-1">
            Prvá trasa (modrá)
          </h3>

          {routes1.map((route, idx) => {
            if (!route.key) return null;

            return (
              <div
                key={route.key}
                className={`flex justify-between items-center p-2 rounded-lg cursor-pointer ${visibleRoutes[route.key] ? "bg-blue-100" : "bg-transparent"
                  }`}
                onClick={() => toggleRouteVisibility(route.key)}
              >
                <div className="text-sm">
                  {idx + 1} → {idx + 2} |{" "}
                  {(route.distance / 1000).toFixed(2)} km |{" "}
                  {formatTime(route.time)}
                </div>

                <div className="text-sm font-medium text-blue-700">
                  {visibleRoutes[route.key] ? "Skryť" : "Zobraziť"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Druhá trasa */}
        <div>
          <h3 className="text-sm font-medium text-red-600 mb-1">
            Druhá trasa (červená)
          </h3>

          {routes2.map((route, idx) => {
            if (!route.key) return null;

            return (
              <div
                key={route.key}
                className={`flex justify-between items-center p-2 rounded-lg cursor-pointer ${visibleRoutes[route.key] ? "bg-red-100" : "bg-transparent"
                  }`}
                onClick={() => toggleRouteVisibility(route.key)}
              >
                <div className="text-sm">
                  {idx + 1} → {idx + 2} |{" "}
                  {(route.distance / 1000).toFixed(2)} km |{" "}
                  {formatTime(route.time)}
                </div>

                <div className="text-sm font-medium text-red-700">
                  {visibleRoutes[route.key] ? "Skryť" : "Zobraziť"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoutesSidebar;