import { Box } from "@mui/material";

import { Row } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { summaryGeneralGridSx } from "../summary.styles";

const GeneralInformation = ({ general }) => (
  <Box sx={summaryGeneralGridSx}>
    <Row label="Name" value={general.name} />
    <Row label="Owner" value={general.owner} />
    <Row label="Model" value={general.model} />
    <Row label="Creation date" value={general.creationDate} />
    {general.closureDate ? <Row label="Closure date" value={general.closureDate} /> : null}
  </Box>
);

export default GeneralInformation;
