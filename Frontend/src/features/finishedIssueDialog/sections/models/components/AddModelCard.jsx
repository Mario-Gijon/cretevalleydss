import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Box, Typography } from "@mui/material";

import { addModelCardSx } from "../models.styles.js";

const AddModelCard = ({ onAdd }) => (
  <Box component="button" type="button" aria-label="Add model" onClick={onAdd} sx={addModelCardSx()}>
    <AddRoundedIcon sx={{ fontSize: { xs: 42, md: 52 } }} />
    <Typography sx={{ fontSize: { xs: 16, md: 18 }, fontWeight: 850 }}>Add model</Typography>
  </Box>
);

export default AddModelCard;
