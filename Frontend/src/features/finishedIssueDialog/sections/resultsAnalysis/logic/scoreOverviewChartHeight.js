export const getScoreOverviewChartHeight = ({ isMobile, isDesktop }) => {
  if (isMobile) return 320;
  if (isDesktop) return 380;
  return 340;
};
