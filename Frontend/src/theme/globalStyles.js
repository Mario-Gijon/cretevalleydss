export const appGlobalStyles = {
  "html, body, #root": {
    height: "100%",
    width: "100%",
    margin: 0,
  },
  body: {
    background:
      "radial-gradient(circle at 25% 25%, rgba(35, 45, 60, 0.4) 0%, rgba(10, 15, 25, 0.8) 70%)," +
      "radial-gradient(circle at 75% 75%, rgba(115, 186, 233, 0.3) 0%, rgba(36, 48, 68, 0.7) 80%)," +
      "linear-gradient(180deg, rgba(15, 15, 20, 0.7) 0%, rgba(30, 35, 45, 0.9) 100%)",
    backgroundBlendMode: "soft-light",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",

    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "linear-gradient(95deg, #45C5C5 0%, #70D9B5 60%, #9AECA4 100%)",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "linear-gradient(95deg, #3d909e 0%, #5a9e8a 60%, #7a9e4a 100%)",
    },
  },
  "#root": {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    background: "transparent",
  },
  ".MuiTableContainer-root, .MuiStack-root": {
    "&::-webkit-scrollbar": {
      width: "8px",
      height: "4px",
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#26495b5a",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#366c87ff",
      borderRadius: "4px",
    },
  },
};