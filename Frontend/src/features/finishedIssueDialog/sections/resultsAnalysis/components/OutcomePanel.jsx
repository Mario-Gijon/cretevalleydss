import { Stack } from "@mui/material";

import ComparisonOutcome from "./ComparisonOutcome.jsx";
import SingleExecutionOutcome from "./SingleExecutionOutcome.jsx";

const OutcomePanel = ({ data }) => <Stack spacing={1.4}>{data.mode === "comparison" ? <ComparisonOutcome data={data} /> : <SingleExecutionOutcome data={data} />}</Stack>;

export default OutcomePanel;
