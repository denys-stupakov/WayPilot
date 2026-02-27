function CompareRoutes({
    mode1, 
    setMode1,
    mode2,
    setMode2,
    vehicleWeight: vehicleWeight,
    setvehicleWeight,
    startStreamingRoutes,
    resetAll
}) {
    return (
        <div
            className="fixed top-6 right-6 w-[360px] z-[1000] text-gray-900 rounded-2xl p-5"
            style={{
                background:
                "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.2))",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.4)",
                boxShadow:
                "inset 0 0 1px rgba(255,255,255,0.4), 0 8px 30px rgba(0,0,0,0.25)",
            }}
            >
            <h3 className="font-semibold mb-4 text-lg tracking-wide">
                Porovnanie dvoch trás
            </h3>

            <label className="block mb-1 text-sm text-gray-700">Prvá trasa</label>
            <select
                value={mode1}
                onChange={(e) => setMode1(e.target.value)}
                className="w-full mb-3 bg-white/40 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
            >
                <option value="shortest">Najkratšia trasa</option>
            </select>

            <label className="block mb-1 text-sm text-gray-700">Druhá trasa</label>
            <select
                value={mode2}
                onChange={(e) => setMode2(e.target.value)}
                className="w-full mb-5 bg-white/40 rounded-lg p-2 focus:ring-2 focus:ring-red-400"
            >
                <option value="shortest">Najkratšia trasa</option>
                <option value="traffic-lights">Vyhnúť sa semaforom</option>
                <option value="height">Obmedzenie výšky</option>
                <option value="weight">Obmedzenie hmotnosti</option>
                <option value="speed">Najrýchlejšia trasa</option>
                <option value="smoothness">smoothness</option>
                <option value="hgv">hgv</option>
            </select>

            {mode2 === "weight" && (
                <div>
                <label className="block text-sm text-gray-700 mb-1">
                    Hmotnosť vozidla (t)
                </label>
                <input
                    type="number"
                    min={0}
                    max={40}
                    value={vehicleWeight}
                    onChange={(e) => setvehicleWeight(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-white/40 focus:ring-2 focus:ring-red-400"
                />
                </div>
            )}

            <button
                onClick={startStreamingRoutes}
                className="w-full mb-3 py-2 rounded-xl bg-gradient-to-r from-blue-400 to-blue-600 text-white"
            >
                Porovnať trasy
            </button>

            <button
                onClick={resetAll}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-red-400 to-red-600 text-white"
            >
                Resetovať
            </button>
        </div>
    );
}

export default CompareRoutes;