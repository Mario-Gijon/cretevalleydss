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
import { useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/en-gb";

import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { CriterionAccordion } from "../components/CriterionAccordion";
import { ModelParameters } from "../components/ModelParameters";
import { useCreateIssueContext } from "../context/createIssue.context";

import {
  getRemainingTime,
  setDefaults,
} from "../utils/createIssue.utils";
import { buildDefaultCriteriaWeightingConfig } from "../utils/criteriaWeighting.model";
import { groupDomainData } from "../../../utils/domainAssignments.utils";
import { getLeafCriteria } from "../../../utils/criteria.utils";
import ActiveIssuesPill from "../../activeIssues/components/shared/ActiveIssuesPill";
import {
  getCreateIssueSummaryAccordionSx,
  getCreateIssueSummaryAlternativeItemSx,
  getCreateIssueSummaryDomainHeaderCellSx,
  getCreateIssueSummaryDomainTableContainerSx,
  getCreateIssueSummaryExpertChipSx,
  getCreateIssueSummaryUnlimitedToggleSx,
} from "../styles/createIssueStep.styles";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

const KVRow = ({ k, v }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", fontWeight: 950, minWidth: 150 }}
    >
      {k}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 850, wordBreak: "break-word" }}>
      {v ?? "—"}
    </Typography>
  </Stack>
);

export const SummaryStep = () => {
  const theme = useTheme();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const {
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
    hasAttemptedCreateIssue,
    setHasAttemptedCreateIssue,
    setCriteriaWeightingConfig,
  } = useCreateIssueContext();

  const [unlimited, setUnlimited] = useState(consensusMaxPhases === null);
  const [openCalendar, setOpenCalendar] = useState(false);

  const {
    selectedModel,
    isConsensus,
    alternatives,
    criteria,
    addedExperts,
    domainAssignments,
  } = allData;

  const domainNameMap = useMemo(
    () =>
      Object.fromEntries(
        [...globalDomains, ...expressionDomains].map((domain) => [domain._id, domain.name])
      ),
    [globalDomains, expressionDomains]
  );

  const groupedData = useMemo(
    () => groupDomainData(domainAssignments),
    [domainAssignments]
  );

  const handleDefaultChange = () => {
    const leafCriteria = getLeafCriteria(criteria);
    setParamValues(
      setDefaults({
        selectedModel,
        criteria: leafCriteria,
      })
    );
    setCriteriaWeightingConfig(
      buildDefaultCriteriaWeightingConfig(selectedModel, leafCriteria)
    );
    setDefaultModelParams(true);
    setHasAttemptedCreateIssue(false);
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

  const accordionSx = getCreateIssueSummaryAccordionSx(theme);
  const domainHeaderCellSx = getCreateIssueSummaryDomainHeaderCellSx(theme);

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
                  onChange={(event) => handleValidateIssueName(event.target.value)}
                  error={Boolean(issueNameError)}
                  helperText={issueNameError || " "}
                  onKeyDown={(event) =>
                    event.key === "Enter" && handleValidateIssueName(event.target.value)
                  }
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
                  onChange={(event) => handleValidateIssueDescription(event.target.value)}
                  error={Boolean(issueDescriptionError)}
                  helperText={issueDescriptionError ? "Invalid description" : " "}
                  onKeyDown={(event) =>
                    event.key === "Enter" &&
                    handleValidateIssueDescription(event.target.value)
                  }
                />
              </Grid>

              <Grid item size={{ xs: 12, md: 12 }}>
                <Stack spacing={1}>
                  <KVRow k="Model" v={selectedModel?.name} />
                  <KVRow
                    k="Consensus"
                    v={isConsensus ? "Enabled" : "Disabled"}
                  />
                </Stack>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader(
              "Alternatives",
              <ActiveIssuesPill tone="info">{alternatives.length}</ActiveIssuesPill>
            )}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.8}>
              {alternatives.map((alternative, index) => (
                <Box
                  key={`${alternative}_${index}`}
                  sx={getCreateIssueSummaryAlternativeItemSx(theme)}
                >
                  <Typography variant="body2" sx={{ fontWeight: 950 }}>
                    {alternative}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader(
              "Criteria",
              <ActiveIssuesPill tone="info">{criteria.length}</ActiveIssuesPill>
            )}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.8}>
              {criteria.map((criterion, index) => (
                <CriterionAccordion key={index} criterion={criterion} />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader(
              "Experts",
              <ActiveIssuesPill tone="warning">{addedExperts.length}</ActiveIssuesPill>
            )}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {addedExperts.map((expert, index) => (
                <Chip
                  key={index}
                  variant="outlined"
                  label={expert}
                  size="small"
                  sx={getCreateIssueSummaryExpertChipSx(theme)}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Model parameters", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <ModelParameters
              selectedModel={selectedModel}
              allData={allData}
              paramValues={paramValues}
              setParamValues={setParamValues}
              defaultModelParams={defaultModelParams}
              setDefaultModelParams={setDefaultModelParams}
              handleDefaultChange={handleDefaultChange}
              showValidationErrors={hasAttemptedCreateIssue}
            />
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} defaultExpanded sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Scheduling", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <Grid container spacing={1.4} alignItems="center">
              <Grid item size={isConsensus ? { xs: 12, md: 6 } : { xs: 12 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.2}
                  alignItems="flex-start"
                >
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

              {isConsensus && (
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
                          onChange={(event) => {
                            let value = event.target.value.replace(/\D/g, "");
                            value = value ? Math.max(1, parseInt(value, 10)) : "";
                            setConsensusMaxPhases(value);
                          }}
                          disabled={unlimited}
                          inputProps={{ min: 1 }}
                          sx={{ width: 120 }}
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
                        sx={getCreateIssueSummaryUnlimitedToggleSx(theme, unlimited)}
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
                        onChange={(event) => {
                          let value = event.target.value;
                          if (value === "") {
                            setConsensusThreshold("");
                            return;
                          }

                          value = value.replace(/[^0-9.]/g, "");
                          if (value.split(".").length > 2) return;

                          const numberValue = parseFloat(value);
                          if (!isNaN(numberValue) && numberValue >= 0 && numberValue <= 1) {
                            setConsensusThreshold(value);
                          }
                        }}
                        inputProps={{ min: 0, max: 1, step: 0.1 }}
                        sx={{ width: 180 }}
                      />
                    </Stack>
                  </Grid>
                </>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Divider />

        <Accordion disableGutters elevation={0} sx={accordionSx}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {sectionHeader("Expression domain", null)}
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            <TableContainer sx={getCreateIssueSummaryDomainTableContainerSx(theme)}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {["Expert", "Alternative", "Criterion", "Domain"].map((header) => (
                      <TableCell key={header} sx={domainHeaderCellSx}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {Object.entries(groupedData).map(([expert, alternativesObject]) => {
                    const expertRowSpan = Object.values(alternativesObject).reduce(
                      (sum, rows) => sum + rows.length,
                      0
                    );

                    return Object.entries(alternativesObject).map(
                      ([alternative, criteriaArray], alternativeIndex) => {
                        const alternativeRowSpan = criteriaArray.length;

                        return criteriaArray.map(({ criterion, dataType }, criterionIndex) => (
                          <TableRow key={`${expert}-${alternative}-${criterion}`} hover>
                            {alternativeIndex === 0 && criterionIndex === 0 && (
                              <TableCell rowSpan={expertRowSpan} sx={{ fontWeight: 850 }}>
                                {expert}
                              </TableCell>
                            )}
                            {criterionIndex === 0 && (
                              <TableCell rowSpan={alternativeRowSpan} sx={{ fontWeight: 850 }}>
                                {alternative}
                              </TableCell>
                            )}
                            <TableCell sx={{ fontWeight: 850 }}>{criterion}</TableCell>
                            <TableCell sx={{ fontWeight: 850 }}>
                              {domainNameMap[dataType] || "undefined"}
                            </TableCell>
                          </TableRow>
                        ));
                      }
                    );
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
