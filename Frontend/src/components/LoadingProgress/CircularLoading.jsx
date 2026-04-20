                                     
import { CircularProgress } from "@mui/material";

                             
export const CircularLoading = ({ size, color, height="90vh" }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",                          
        alignItems: "center",                        
        height: height,                                 
      }}
    >
      {                                                                                 }
      <CircularProgress size={size} color={color} />
    </div>
  );
};
