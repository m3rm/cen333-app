

const R = 6371; // Earth's mean radius, km.

// Convert degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Distance in kilometres between two lat/lng points.
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lng2 - lng1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(dLambda / 2) * Math.sin(dLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
