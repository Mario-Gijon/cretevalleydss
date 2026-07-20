const clampPercent = (value) => Math.min(100, Math.max(0, value));

export const buildScoreBarGeometry = ({ score, domainMin, domainMax }) => {
  const finiteScore = typeof score === "number" && Number.isFinite(score);
  const finiteDomain = Number.isFinite(domainMin) && Number.isFinite(domainMax);
  const domainRange = domainMax - domainMin;
  const zeroPercent = finiteDomain && domainRange > 0
    ? clampPercent(((0 - domainMin) / domainRange) * 100)
    : 0;

  if (!finiteScore || !finiteDomain || domainRange <= 0) {
    return {
      leftPercent: 0,
      widthPercent: 0,
      zeroPercent,
      showZeroMarker: false,
    };
  }

  const scorePercent = clampPercent(((score - domainMin) / domainRange) * 100);
  const leftPercent = Math.min(zeroPercent, scorePercent);

  return {
    leftPercent,
    widthPercent: Math.abs(scorePercent - zeroPercent),
    zeroPercent,
    showZeroMarker: domainMin < 0 && domainMax > 0,
  };
};

