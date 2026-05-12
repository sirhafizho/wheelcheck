export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatWheelchairDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '';
  }

  if (meters < 100) {
    return '< 1 min roll';
  }

  if (meters <= 2000) {
    const minutes = Math.max(1, Math.round(meters / 1.11 / 60));
    return `~${minutes} min roll`;
  }

  return `~${(meters / 1000).toFixed(1)} km`;
}
