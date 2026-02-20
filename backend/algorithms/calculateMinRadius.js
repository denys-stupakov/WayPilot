const fastHaversine = require("./fastHaversine");

function calculateMinRadius(segment) {
  if (segment.length < 3) return Infinity;

  let minRadius = Infinity;

  for (let i = 0; i < segment.length - 2; i++) {
    const [lat1, lon1] = segment[i];
    const [lat2, lon2] = segment[i + 1];
    const [lat3, lon3] = segment[i + 2];

    const a = fastHaversine(lat1, lon1, lat2, lon2);
    const b = fastHaversine(lat2, lon2, lat3, lon3);
    const c = fastHaversine(lat1, lon1, lat3, lon3);

    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));

    if (area === 0) continue;

    const radius = (a * b * c) / (4 * area);
    minRadius = Math.min(minRadius, radius);
  }

  return minRadius;
}

module.exports = calculateMinRadius;