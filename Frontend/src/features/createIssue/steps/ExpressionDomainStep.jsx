import { Fragment, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { CreateLinguisticExpressionDialog } from "../components/CreateLinguisticExpressionDialog";
import { ViewExpressionsDomainDialog } from "../components/ViewExpressionsDomainDialog";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { removeExpressionDomain } from "../../../services/issue.service";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueExpressionActionBtnSx,
  getCreateIssueExpressionHeaderIconSx,
} from "../styles/createIssueStep.styles";
import {
  getExpressionDomainAssignmentsByCriterion,
  resolveExpressionDomainOptions,
} from "../../../utils/domainAssignments.utils";
import { getLeafCriteria } from "../../../utils/criteria.utils";

const normalizeDomainId = (value) => String(value || "").trim();

const resolveNumericDomainKind = (domain) =>
  domain?.numericRange?.step === 1 ? "discrete" : "continuous";

const buildDomainLabel = (domain) => {
  const name = domain?.name || "Unnamed";

  if (domain?.type === "numeric") {
    return `${name} ${resolveNumericDomainKind(domain)}`;
  }

  if (domain?.type === "linguistic") {
    const labelCount = domain?.linguisticLabels?.length || domain?.valueCount || null;
    return labelCount
      ? `${name} linguistic ${labelCount} labels`
      : `${name} linguistic`;
  }

  return `${name} ${domain?.type || "unknown"}`;
};

const AssignmentModeCard = ({ selected, title, description, onClick }) => {
  const theme = useTheme();

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        p: 1.15,
        borderRadius: 2,
        border: "1px solid",
        borderColor: selected
          ? alpha(theme.palette.info.main, 0.75)
          : alpha(theme.palette.common.white, 0.12),
        background: selected
          ? `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.13)}, ${alpha(
            theme.palette.info.main,
            0.035
          )})`
          : alpha(theme.palette.common.white, 0.018),
        cursor: "pointer",
        transition: "border-color 140ms ease, background 140ms ease",
        "&:hover": {
          borderColor: selected
            ? alpha(theme.palette.info.main, 0.9)
            : alpha(theme.palette.info.main, 0.38),
          background: selected
            ? `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.16)}, ${alpha(
              theme.palette.info.main,
              0.05
            )})`
            : alpha(theme.palette.info.main, 0.04),
        },
      }}
    >
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>
          {description}
        </Typography>
      </Stack>
    </Box>
  );
};

const DomainSelect = ({ label, value, allDomains, onChange, sx = {} }) => (
  <TextField
    select
    size="small"
    color="info"
    label={label}
    value={normalizeDomainId(value)}
    onChange={(event) => onChange(event.target.value)}
    sx={{
      width: { xs: "100%", sm: 360, md: 400 },
      ...sx,
    }}
  >
    {allDomains.map((domain) => {
      const domainId = normalizeDomainId(domain?._id || domain?.id);

      return (
        <MenuItem key={domainId} value={domainId}>
          {buildDomainLabel(domain)}
        </MenuItem>
      );
    })}
  </TextField>
);

export const ExpressionDomainStep = () => {
  const theme = useTheme();
  const { allData, expressionDomainConfig, setExpressionDomainConfig } =
    useCreateIssueContext();
  const { selectedModel, criteria } = allData;

  const { expressionDomains, setExpressionDomains, globalDomains } =
    useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [openCreateDomainExpressionDialog, setOpenCreateDomainExpressionDialog] =
    useState(false);
  const [openViewDomainExpressions, setOpenViewDomainExpressions] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);

  const leafCriteria = useMemo(() => getLeafCriteria(criteria), [criteria]);

  const leafCriterionNames = useMemo(
    () => leafCriteria.map((criterion) => criterion?.name).filter(Boolean),
    [leafCriteria]
  );

  const { allDomains, defaultDomainId } = useMemo(
    () => resolveExpressionDomainOptions(selectedModel, globalDomains, expressionDomains),
    [selectedModel, globalDomains, expressionDomains]
  );

  const mode = expressionDomainConfig?.mode === "byCriterion" ? "byCriterion" : "global";

  const assignmentsByCriterion = useMemo(
    () =>
      getExpressionDomainAssignmentsByCriterion({
        expressionDomainConfig,
        leafCriteria,
      }),
    [expressionDomainConfig, leafCriteria]
  );

  const handleOpenEditDomain = (domain = null) => {
    setEditingDomain(domain || null);
    setOpenCreateDomainExpressionDialog(true);
  };

  const handleDelete = async (id) => {
    const result = await removeExpressionDomain(id);

    if (result && result.success) {
      setExpressionDomains((previous) => previous.filter((domain) => domain._id !== id));
      showSnackbarAlert(result?.message || "Domain deleted", "success");
    } else {
      showSnackbarAlert(result?.message || "Error deleting domain", "error");
    }
  };

  const handleModeChange = (nextMode) => {
    if (!nextMode) return;

    if (nextMode === "global") {
      const currentGlobal = normalizeDomainId(expressionDomainConfig?.globalDomainId);
      const fallback = currentGlobal || normalizeDomainId(defaultDomainId);

      setExpressionDomainConfig({
        mode: "global",
        globalDomainId: fallback,
      });
      return;
    }

    const currentAssignments = getExpressionDomainAssignmentsByCriterion({
      expressionDomainConfig,
      leafCriteria,
    });
    const fallback = normalizeDomainId(defaultDomainId);

    const domainsByCriterion = leafCriterionNames.reduce((accumulator, criterionName) => {
      accumulator[criterionName] =
        normalizeDomainId(currentAssignments[criterionName]) || fallback;
      return accumulator;
    }, {});

    setExpressionDomainConfig({
      mode: "byCriterion",
      domainsByCriterion,
    });
  };

  const updateGlobalDomainId = (globalDomainId) => {
    setExpressionDomainConfig({
      mode: "global",
      globalDomainId,
    });
  };

  const updateCriterionDomainId = (criterionName, domainId) => {
    setExpressionDomainConfig((previous) => ({
      mode: "byCriterion",
      domainsByCriterion: {
        ...((previous?.domainsByCriterion && typeof previous.domainsByCriterion === "object")
          ? previous.domainsByCriterion
          : {}),
        [criterionName]: domainId,
      },
    }));
  };

  const hasCompatibleDomains = allDomains.length > 0;

  return (
    <>
      <Stack spacing={1.75} sx={createIssueStepContainerSx}>
        <Stack spacing={1.35}>
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar sx={getCreateIssueExpressionHeaderIconSx(theme)}>
              <TuneIcon />
            </Avatar>

            <Stack spacing={0.15} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                Expression domains
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Choose one common scale or assign a scale to each leaf criterion.
              </Typography>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenEditDomain()}
              color="info"
              sx={getCreateIssueExpressionActionBtnSx(theme)}
            >
              Create linguistic expression
            </Button>

            <Button
              variant="outlined"
              startIcon={<Inventory2OutlinedIcon />}
              onClick={() => setOpenViewDomainExpressions(true)}
              color="info"
              disabled={!expressionDomains || expressionDomains.length === 0}
              sx={getCreateIssueExpressionActionBtnSx(theme)}
            >
              Manage domains
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

        {!hasCompatibleDomains ? (
          <Alert severity="warning">
            No compatible expression domains were found for the selected model. Create a compatible
            linguistic domain or adjust the model selection.
          </Alert>
        ) : (
          <Stack spacing={1.45}>
            <Stack spacing={0.75}>
              <Typography variant="body2" sx={{ fontWeight: 950 }}>
                Assignment mode
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8}>
                <AssignmentModeCard
                  selected={mode === "global"}
                  title="Global domain"
                  description="Use the same domain for every leaf criterion"
                  onClick={() => handleModeChange("global")}
                />

                <AssignmentModeCard
                  selected={mode === "byCriterion"}
                  title="By criterion"
                  description="Choose a domain for each leaf criterion"
                  onClick={() => handleModeChange("byCriterion")}
                />
              </Stack>
            </Stack>

            {mode === "global" ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "max-content 360px",
                    md: "max-content 400px",
                  },
                  columnGap: 1.4,
                  alignItems: "center",
                  width: "fit-content",
                  maxWidth: "100%",
                  p: 1,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                  background: alpha(theme.palette.common.white, 0.012),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 950 }}>
                  Common domain
                </Typography>

                <DomainSelect
                  label="Domain"
                  value={expressionDomainConfig?.globalDomainId}
                  allDomains={allDomains}
                  onChange={updateGlobalDomainId}
                />
              </Box>
            ) : (
              <Stack
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "max-content 360px",
                    md: "max-content 400px",
                  },
                  columnGap: 1.4,
                  rowGap: 0.85,
                  alignItems: "center",
                  width: "fit-content",
                  maxWidth: "100%",
                }}
              >
                {leafCriterionNames.map((criterionName) => (
                  <Fragment key={criterionName}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 950,
                        color: "text.primary",
                        minWidth: 0,
                        pr: { sm: 0.5 },
                      }}
                    >
                      {criterionName}
                    </Typography>

                    <DomainSelect
                      label="Domain"
                      value={assignmentsByCriterion[criterionName]}
                      allDomains={allDomains}
                      onChange={(domainId) => updateCriterionDomainId(criterionName, domainId)}
                    />
                  </Fragment>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      <CreateLinguisticExpressionDialog
        open={openCreateDomainExpressionDialog}
        editingDomain={editingDomain}
        onClose={() => setOpenCreateDomainExpressionDialog(false)}
        showSnackbarAlert={showSnackbarAlert}
      />

      <ViewExpressionsDomainDialog
        open={openViewDomainExpressions}
        onClose={() => setOpenViewDomainExpressions(false)}
        handleOpenEdit={handleOpenEditDomain}
        handleDelete={handleDelete}
      />
    </>
  );
};

export default ExpressionDomainStep;