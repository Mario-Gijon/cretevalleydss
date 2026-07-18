export const PERFORMANCE_BAR_TOKENS = {
  winnerFill: "rgba(72, 190, 130, 0.82)",
  winnerBorder: "rgba(92, 216, 151, 1)",
  standardFill: "rgba(52, 139, 218, 0.78)",
  standardBorder: "rgba(84, 168, 235, 1)",
  radius: 4,
};

export const performanceBarBorderFor = (fill) =>
  fill === PERFORMANCE_BAR_TOKENS.winnerFill
    ? PERFORMANCE_BAR_TOKENS.winnerBorder
    : PERFORMANCE_BAR_TOKENS.standardBorder;
