import { useMemo, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  Grid2 as Grid,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/en-gb";

import { useIssuesDataContext } from "../../../../../context/issues/issues.context";
import { CriterionAccordion } from "../../../../../components/CriterionAccordion/CriterionAccordion";
import { ModelParameters } from "../../../../../components/ModelParameters/ModelParameters";

import { getRemainingTime, groupDomainData, setDefaults } from "../../../../../utils/createIssueUtils";

// ✅ solo reusamos Pill; el “glass/aurora” ya lo pone CreateIssuePage (evitamos doble capa)
import { Pill } from "../../../../../components/ActiveIssuesHeader/ActiveIssuesHeader";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

const KVRow = ({ k, v }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 950, minWidth: 150 }}>
      {k}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 850, wordBreak: "break-word" }}>
      {v ?? "—"}
    </Typography>
  </Stack>
);

export const SummaryStep = ({
  allData,
  issueName,
  issueDescription,
  issueNameError,
  issueDescriptionError,
  handleValidateIssueName,
  handleValidateIssueDescription,
  closureDate,
  setClosureDate,
  closureDateError,
  handleClosureDateError,
  consensusMaxPhases,
  setConsensusMaxPhases,
  consensusThreshold,
  setConsensusThreshold,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  bwmData,
  setBwmData,
  weightingMode,
  setWeightingMode,
}) => {
  const theme = useTheme();
  const { globalDomains, expressionDomains } = useIssuesDataContext();

  const [unlimited, setUnlimited] = useState(consensusMaxPhases === null);
  const [openCalendar, setOpenCalendar] = useState(false);

  const { selectedModel, withConsensus, alternatives, criteria, addedExperts, domainAssignments } = allData;

  const domainNameMap = useMemo(
    () => Object.fromEntries([...globalDomains, ...expressionDomains].map((d) => [d._id, d.name])),
    [globalDomains, expressionDomains]
  );

  const groupedData = useMemo(() => groupDomainData(domainAssignments), [domainAssignments]);

  const handleDefaultChange = () => {
    if (!defaultModelParams) {
      setParamValues(setDefaults(allData));
      setDefaultModelParams(true);
    } else {
      setDefaultModelParams(false);
    }
  };

  if (
    !selectedModel ||
    addedExperts.length === 0 ||
    alternatives.length === 0 ||
    criteria.length === 0 ||
    !domainAssignments?.experts ||
    Object.keys(domainAssignments.experts).length === 0
  ) {
    return (
      <Typography pt={8} variant="h5">
        You must finish previous steps
      </Typography>
    );
  }

  const accordionSx = {
    borderRadius: 4,
    overflow: "hidden",
    bgcolor: alpha(theme.palette.common.white, 0.0),
    border: `1px solid ${alpha(theme.palette.common.white, 0.00)}`,
    boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
    "&:before": { display: "none" },
  };

  const inputSx = {
    /* "& .MuiOutlinedInput-root": {
      borderRadius: 3,
      bgcolor: alpha(theme.palette.common.white, 0.03),
      border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
      "& fieldset": { border: "none" }, // evitamos doble borde
    }, */
  };

  const sectionHeader = (title, right) => (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
        {title}
      </Typography>
      {right}
    </Stack>
  );

  return (
    <Box>
      <Stack spacing={1.25} sx={{ position: "relative", zIndex: 1 }}>
        {/* ✅ BASIC INFO */}
        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Basic info", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={1.4}>
              <Grid item size={{ xs: 12, md: 5 }}>
                <TextField
                  label="Issue name"
                  variant="outlined"
                  size="small"
                  color="secondary"
                  fullWidth
                  autoComplete="off"
                  value={issueName}
                  onChange={(e) => handleValidateIssueName(e.target.value)}
                  error={Boolean(issueNameError)}
                  helperText={issueNameError || " "}
                  onKeyDown={(e) => e.key === "Enter" && handleValidateIssueName(e.target.value)}
                  sx={inputSx}
                />
              </Grid>

              <Grid item size={{ xs: 12, md: 7 }}>
                <TextField
                  label="Description"
                  variant="outlined"
                  size="small"
                  color="secondary"
                  fullWidth
                  autoComplete="off"
                  value={issueDescription}
                  onChange={(e) => handleValidateIssueDescription(e.target.value)}
                  error={Boolean(issueDescriptionError)}
                  helperText={issueDescriptionError ? "Invalid description" : " "}
                  onKeyDown={(e) => e.key === "Enter" && handleValidateIssueDescription(e.target.value)}
                  sx={inputSx}
                />
              </Grid>

              <Grid item size={{ xs: 12, md: 12 }}>
                <Stack spacing={1}>
                  <KVRow k="Model" v={selectedModel?.name} />
                  <KVRow k="Consensus" v={withConsensus ? "With consensus" : "Without consensus"} />
                  <KVRow k="Experts" v={addedExperts.length} />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider/>

        {/* ✅ STRUCTURE: Alternatives */}
        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Alternatives", <Pill tone="info">{alternatives.length}</Pill>)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.8}>
              {alternatives.map((a, idx) => (
                <Box
                  key={`${a}_${idx}`}
                  sx={{
                    borderRadius: 3,
                    px: 1.25,
                    py: 0.9,
                    bgcolor: alpha(theme.palette.common.white, 0.02),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 950 }}>
                    {a}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider/>

        {/* ✅ STRUCTURE: Criteria */}
        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Criteria", <Pill tone="info">{criteria.length}</Pill>)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.8}>
              {criteria.map((criterion, index) => (
                <CriterionAccordion key={index} criterion={criterion} />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider/>

        {/* ✅ EXPERTS */}
        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Experts", <Pill tone="warning">{addedExperts.length}</Pill>)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {addedExperts.map((expert, idx) => (
                <Chip
                  key={idx}
                  variant="outlined"
                  label={expert}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.02),
                    borderColor: alpha(theme.palette.common.white, 0.10),
                    fontWeight: 850,
                  }}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Divider/>

        {/* ✅ MODEL PARAMETERS */}
        {selectedModel?.parameters?.length ? (
          <Accordion disableGutters elevation={0} sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              {sectionHeader("Model parameters", null)}
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <ModelParameters
                selectedModel={selectedModel}
                allData={allData}
                paramValues={paramValues}
                bwmData={bwmData}
                setBwmData={setBwmData}
                setParamValues={setParamValues}
                defaultModelParams={defaultModelParams}
                setDefaultModelParams={setDefaultModelParams}
                handleDefaultChange={handleDefaultChange}
                weightingMode={weightingMode}
                setWeightingMode={setWeightingMode}
              />
            </AccordionDetails>
          </Accordion>
        ) : null}

        <Divider/>

        {/* ✅ SCHEDULING + CONSENSUS SETTINGS */}
        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Scheduling", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={1.4} alignItems="center">
              <Grid item size={withConsensus ? { xs: 12, md: 6 } : { xs: 12 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems="flex-start">
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
                    <DatePicker
                      label="Closure date"
                      value={closureDate}
                      minDate={dayjs().add(2, "day")}
                      onChange={(newValue) => {
                        setClosureDate(newValue);
                        handleClosureDateError(newValue);
                      }}
                      openTo="day"
                      open={openCalendar}
                      onOpen={() => setOpenCalendar(true)}
                      onClose={() => setOpenCalendar(false)}
                      slotProps={{
                        textField: {
                          size: "small",
                          color: "secondary",
                          error: closureDateError,
                          onClick: () => setOpenCalendar(true),
                          sx: inputSx,
                        },
                      }}
                    />
                  </LocalizationProvider>

                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", fontWeight: 900, mt: { xs: 0.25, sm: 1 } }}
                  >
                    {getRemainingTime(closureDate)}
                  </Typography>
                </Stack>
              </Grid>

              {withConsensus && (
                <>
                  <Grid item size={{ xs: 12, md: 6 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.2}
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 950, minWidth: 190 }}>
                        NºMax consensus rounds
                      </Typography>

                      {!unlimited && (
                        <TextField
                          variant="outlined"
                          type="number"
                          size="small"
                          color="secondary"
                          value={unlimited ? "" : consensusMaxPhases}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, "");
                            value = value ? Math.max(1, parseInt(value, 10)) : "";
                            setConsensusMaxPhases(value);
                          }}
                          disabled={unlimited}
                          inputProps={{ min: 1 }}
                          sx={{ width: 120, ...inputSx }}
                        />
                      )}

                      <ToggleButton
                        value="unlimited"
                        selected={unlimited}
                        onChange={() => {
                          setUnlimited(!unlimited);
                          setConsensusMaxPhases(!unlimited ? null : 3);
                        }}
                        color="secondary"
                        size="small"
                        sx={{
                          borderRadius: 999,
                          px: 1.6,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                          bgcolor: unlimited ? alpha(theme.palette.secondary.main, 0.12) : "transparent",
                        }}
                      >
                        Unlimited
                      </ToggleButton>
                    </Stack>
                  </Grid>

                  <Grid item size={{ xs: 12, md: 6 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.2}
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 950, minWidth: 190 }}>
                        Consensus threshold
                      </Typography>

                      <TextField
                        variant="outlined"
                        type="number"
                        size="small"
                        color="secondary"
                        value={consensusThreshold}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value === "") {
                            setConsensusThreshold("");
                            return;
                          }
                          value = value.replace(/[^0-9.]/g, "");
                          if (value.split(".").length > 2) return;
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) setConsensusThreshold(value);
                        }}
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                        sx={{ width: 180, ...inputSx }}
                      />
                    </Stack>
                  </Grid>
                </>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider/>

        {/* ✅ EXPRESSION DOMAINS */}
        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Expression domain", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <TableContainer
              sx={{
                maxHeight: "45vh",
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: alpha(theme.palette.common.white, 0.02),
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {["Expert", "Alternative", "Criterion", "Domain"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontWeight: 950,
                          color: "text.secondary",
                          bgcolor: alpha(theme.palette.background.paper, 0.22),
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {Object.entries(groupedData).map(([expert, alternativesObj]) => {
                    const expertRowSpan = Object.values(alternativesObj).reduce((sum, arr) => sum + arr.length, 0);

                    return Object.entries(alternativesObj).map(([alternative, critArr], altIndex) => {
                      const alternativeRowSpan = critArr.length;

                      return critArr.map(({ criterion, dataType }, critIndex) => (
                        <TableRow key={`${expert}-${alternative}-${criterion}`} hover>
                          {altIndex === 0 && critIndex === 0 && (
                            <TableCell rowSpan={expertRowSpan} sx={{ fontWeight: 850 }}>
                              {expert}
                            </TableCell>
                          )}
                          {critIndex === 0 && (
                            <TableCell rowSpan={alternativeRowSpan} sx={{ fontWeight: 850 }}>
                              {alternative}
                            </TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 850 }}>{criterion}</TableCell>
                          <TableCell sx={{ fontWeight: 850 }}>{domainNameMap[dataType] || "undefined"}</TableCell>
                        </TableRow>
                      ));
                    });
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
};
