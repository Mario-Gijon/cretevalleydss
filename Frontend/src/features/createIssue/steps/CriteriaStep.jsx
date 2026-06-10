import { useMemo, useState } from "react";
import {
  Button,
  TextField,
  List,
  Collapse,
  Stack,
  Divider,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  ToggleButton,
  Box,
} from "@mui/material";
import { TransitionGroup } from "react-transition-group";
import AddIcon from "@mui/icons-material/Add";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";

import {
  countLeafCriteria,
  getLeafCriteria,
  removeCriteriaItemRecursively,
  validateCriterion,
} from "../../../utils/criteria.utils";
import { CriteriaItem } from "../components/CriteriaItem";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { ConfirmationDialog } from "../../../components/StyledComponents/ConfirmationDialog";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueSoftTopAuroraDialogPaperSx,
  getCreateIssueRowDividerSx,
  getCreateIssueStepEmptyStateSx,
  getCreateIssueStepInputSx,
  getCreateIssueStepScrollableSx,
} from "../styles/createIssueStep.styles";
import {
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
  resolveFuzzyCriteriaWeightValueCount,
} from "../logic/createIssueCriteriaWeighting";
import {
  CRITERIA_WEIGHTING_MODES,
  normalizeMode,
  resolveAssignedDomainIds,
} from "../utils/criteriaWeighting.helpers";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { CriteriaWeightingPanel } from "../components/criteriaWeighting/CriteriaWeightingPanel";

const WEIGHT_DECIMALS = 3;
const WEIGHT_SUM_TOLERANCE = 0.01;

const roundCriterionWeight = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Number(parsed.toFixed(WEIGHT_DECIMALS))
    : "";
};

const buildRoundedEqualWeights = (criterionNames) => {
  const names = Array.isArray(criterionNames) ? criterionNames.filter(Boolean) : [];
  if (names.length === 0) return {};

  const equalWeight = roundCriterionWeight(1 / names.length);

  return names.reduce((acc, criterionName) => {
    acc[criterionName] = equalWeight;
    return acc;
  }, {});
};

const applyTypeToBranch = (criterion, type) => ({
  ...criterion,
  type,
  children: Array.isArray(criterion?.children)
    ? criterion.children.map((child) => applyTypeToBranch(child, type))
    : [],
});

const updateCriterionWithInheritance = ({
  items,
  editingCriterion,
  nextName,
  nextType,
  showCriterionTypes,
  isRootCriterion,
}) => {
  const visit = (nodes) =>
    nodes.map((node) => {
      if (node?.name === editingCriterion?.name) {
        if (showCriterionTypes && isRootCriterion) {
          const typedBranch = applyTypeToBranch(node, nextType);
          return {
            ...typedBranch,
            name: nextName,
          };
        }

        return {
          ...node,
          name: nextName,
        };
      }

      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length > 0) {
        return {
          ...node,
          children: visit(children),
        };
      }

      return node;
    });

  return visit(Array.isArray(items) ? items : []);
};

export const CriteriaStep = () => {
  const theme = useTheme();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const {
    criteria,
    setCriteria,
    selectedModel,
    criteriaWeightingConfig,
    setCriteriaWeightingConfig,
    setDefaultModelParams,
    expressionDomainConfig,
  } = useCreateIssueContext();

  const isMultiCriteria = selectedModel?.isMultiCriteria;
  const showCriterionTypes = selectedModel?.usesCriterionTypes === true;
  const showCriteriaWeighting = modelUsesCriteriaWeights(selectedModel);
  const isFuzzyModel = isFuzzyCriteriaWeightModel(selectedModel);

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  const [childInputValue, setChildInputValue] = useState("");
  const [childInputError, setChildInputError] = useState(false);

  const [openItems, setOpenItems] = useState({});
  const [selectedType, setSelectedType] = useState("benefit");

  const [editingCriterion, setEditingCriterion] = useState(null);
  const [editCriterionValue, setEditCriterionValue] = useState("");
  const [editCriterionType, setEditCriterionType] = useState("benefit");
  const [editBlur, setEditBlur] = useState(true);
  const [editCriterionError, setEditCriterionError] = useState("");
  const [openRemoveCriterionDialog, setOpenRemoveCriterionDialog] = useState(false);
  const [criterionToRemove, setCriterionToRemove] = useState(null);

  const reversed = useMemo(() => criteria.slice().reverse(), [criteria]);
  const leafCount = useMemo(() => countLeafCriteria(criteria), [criteria]);
  const leafCriteria = useMemo(() => getLeafCriteria(criteria), [criteria]);
  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const isSingleCriterion = criterionNames.length === 1;

  const assignedDomainIds = useMemo(
    () =>
      resolveAssignedDomainIds({
        expressionDomainConfig,
        leafCriteria,
      }),
    [expressionDomainConfig, leafCriteria]
  );
  const assignedDomains = useMemo(() => {
    const domainById = new Map(
      [...(Array.isArray(globalDomains) ? globalDomains : []), ...(Array.isArray(expressionDomains) ? expressionDomains : [])]
        .map((domain) => [String(domain?.id || domain?._id || "").trim(), domain])
        .filter(([id]) => id.length > 0)
    );

    return assignedDomainIds
      .map((domainId) => domainById.get(domainId))
      .filter(Boolean);
  }, [assignedDomainIds, expressionDomains, globalDomains]);
  const fuzzyValueCount = isFuzzyModel
    ? resolveFuzzyCriteriaWeightValueCount(assignedDomains)
    : null;

  const mode = normalizeMode(criteriaWeightingConfig?.mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weightsByCriterion = criteriaWeightingConfig?.payload?.weightsByCriterion || {};

  const creatorWeightMode =
    showCriteriaWeighting && mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL
      ? "manual"
      : showCriteriaWeighting && isFuzzyModel && mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY
        ? "fuzzy"
        : null;

  const manualWeightStatus = useMemo(() => {
    if (creatorWeightMode !== "manual") return null;

    const values = criterionNames.map((criterionName) =>
      Number(weightsByCriterion?.[criterionName])
    );

    const allNumeric = values.every((value) => Number.isFinite(value));
    if (!allNumeric) {
      return {
        valid: false,
        total: null,
        label: "Weights sum: incomplete · must be 1",
      };
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    const valid = Math.abs(total - 1) <= WEIGHT_SUM_TOLERANCE;

    return {
      valid,
      total,
      label: valid
        ? `Weights sum: ${total.toFixed(4)}`
        : `Weights sum: ${total.toFixed(4)} · must be 1`,
    };
  }, [creatorWeightMode, criterionNames, weightsByCriterion]);

  const equalWeightsActive = useMemo(() => {
    if (creatorWeightMode !== "manual") return false;
    if (criterionNames.length === 0) return false;

    const equalWeights = buildRoundedEqualWeights(criterionNames);

    return criterionNames.every((criterionName) => {
      const current = Number(weightsByCriterion?.[criterionName]);
      const expected = Number(equalWeights?.[criterionName]);

      return (
        Number.isFinite(current) &&
        Number.isFinite(expected) &&
        Math.abs(current - expected) <= 0.0005
      );
    });
  }, [creatorWeightMode, criterionNames, weightsByCriterion]);

  const updateWeightsConfigFromUser = (nextConfig) => {
    if (typeof setDefaultModelParams === "function") {
      setDefaultModelParams(false);
    }
    setCriteriaWeightingConfig?.(nextConfig);
  };

  const handleManualWeightChange = (criterionName, value) => {
    updateWeightsConfigFromUser({
      ...(criteriaWeightingConfig || {}),
      payload: {
        ...(criteriaWeightingConfig?.payload || {}),
        weightsByCriterion: {
          ...(criteriaWeightingConfig?.payload?.weightsByCriterion || {}),
          [criterionName]: value === "" ? "" : roundCriterionWeight(value),
        },
      },
    });
  };

  const handleSetEqualWeights = () => {
    updateWeightsConfigFromUser({
      ...(criteriaWeightingConfig || {}),
      payload: {
        ...(criteriaWeightingConfig?.payload || {}),
        weightsByCriterion: buildRoundedEqualWeights(criterionNames),
      },
    });
  };

  const handleFuzzyWeightChange = (criterionName, nextVector) => {
    updateWeightsConfigFromUser({
      ...(criteriaWeightingConfig || {}),
      payload: {
        ...(criteriaWeightingConfig?.payload || {}),
        weightsByCriterion: {
          ...(criteriaWeightingConfig?.payload?.weightsByCriterion || {}),
          [criterionName]: nextVector,
        },
      },
    });
  };

  const handleEditCriterion = (item) => {
    setEditingCriterion(item);
    setEditCriterionValue(item.name);
    setEditCriterionType(item.type || "benefit");
  };

  const handleSaveCriterionEdit = () => {
    const error = validateCriterion(editCriterionValue, criteria, editingCriterion);
    if (error) {
      setEditCriterionError(error);
      return;
    }

    const trimmedName = editCriterionValue.trim();
    const isRootCriterion = (criteria || []).some(
      (criterion) => criterion?.name === editingCriterion?.name
    );

    setCriteria((previous) =>
      updateCriterionWithInheritance({
        items: previous,
        editingCriterion,
        nextName: trimmedName,
        nextType: editCriterionType || "benefit",
        showCriterionTypes,
        isRootCriterion,
      })
    );

    setEditingCriterion(null);
    setEditCriterionError("");
    setEditBlur(true);
  };

  const handleAddCriteria = () => {
    if (!inputValue.trim()) return;

    if (!isMultiCriteria) {
      const leaves = countLeafCriteria(criteria);
      if (leaves >= 1) {
        showSnackbarAlert("This model only allows one leaf criterion", "warning");
        return;
      }
    }

    const error = validateCriterion(inputValue, criteria);
    if (error) {
      setInputError(error);
      return;
    }

    setCriteria((previous) => [
      ...previous,
      { name: inputValue.trim(), type: showCriterionTypes ? selectedType : "benefit", children: [] },
    ]);
    setInputValue("");
    setInputError(false);
  };

  const handleAskRemoveCriteria = (item) => {
    setCriterionToRemove(item);
    setOpenRemoveCriterionDialog(true);
  };

  const handleCancelRemoveCriteria = () => {
    setOpenRemoveCriterionDialog(false);
    setCriterionToRemove(null);
  };

  const handleConfirmRemoveCriteria = () => {
    if (!criterionToRemove) return;

    setCriteria((previous) => removeCriteriaItemRecursively(previous, criterionToRemove));
    handleCancelRemoveCriteria();
  };

  const handleToggle = (itemName) => {
    setOpenItems((previous) => ({ ...previous, [itemName]: !previous[itemName] }));
  };

  const handleAddChild = () => {
    if (!childInputValue.trim()) return;

    if (!isMultiCriteria) {
      const tempCriteria = JSON.parse(JSON.stringify(criteria));

      const addChildSim = (items) =>
        items.map((item) => {
          if (item.name === selectedParent.name) {
            return {
              ...item,
              children: [
                ...item.children,
                {
                  name: childInputValue.trim(),
                  type: selectedParent?.type || "benefit",
                  children: [],
                },
              ],
            };
          }

          if (item.children?.length) {
            return { ...item, children: addChildSim(item.children) };
          }

          return item;
        });

      const simulated = addChildSim(tempCriteria);
      const leavesAfter = countLeafCriteria(simulated);
      if (leavesAfter > 1) {
        showSnackbarAlert("This model only allows one leaf criterion", "warning");
        return;
      }
    }

    const error = validateCriterion(childInputValue, criteria);
    if (error) {
      setChildInputError(error);
      return;
    }

    const addChild = (items) =>
      items.map((item) => {
        if (item.name === selectedParent.name) {
          return {
            ...item,
            children: [
              ...item.children,
              {
                name: childInputValue.trim(),
                type: selectedParent?.type || "benefit",
                children: [],
              },
            ],
          };
        }

        if (item.children?.length) {
          return { ...item, children: addChild(item.children) };
        }

        return item;
      });

    setCriteria((previous) => addChild(previous));
    setChildInputValue("");
    setChildInputError(false);
    setOpenDialog(false);
  };

  return (
    <Stack spacing={1.5} sx={createIssueStepContainerSx}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Criteria
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {leafCount} leaf criteria • You can nest with child criteria
        </Typography>
      </Stack>

      {showCriteriaWeighting ? (
        <CriteriaWeightingPanel
          selectedModel={selectedModel}
          criteria={criteria}
          criteriaWeightingConfig={criteriaWeightingConfig}
          setCriteriaWeightingConfig={setCriteriaWeightingConfig}
          setDefaultModelParams={setDefaultModelParams}
          expressionDomainConfig={expressionDomainConfig}
        />
      ) : null}

      {creatorWeightMode === "manual" && criterionNames.length > 1 ? (
        <Stack direction="row" justifyContent="flex-end">
          <ToggleButton
            value="equalWeights"
            selected={equalWeightsActive}
            onClick={handleSetEqualWeights}
            size="small"
            color="info"
            sx={{
              px: 1.4,
              py: 0.55,
              borderColor: equalWeightsActive
                ? "rgba(75, 210, 207, 0.72)"
                : "rgba(255,255,255,0.16)",
              color: equalWeightsActive ? "info.main" : "text.secondary",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              "&.Mui-selected": {
                color: "info.main",
                backgroundColor: "rgba(75, 210, 207, 0.10)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "rgba(75, 210, 207, 0.14)",
              },
            }}
          >
            Equal weights
          </ToggleButton>
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
      >
        <TextField
          variant="outlined"
          placeholder="Criterion"
          autoComplete="off"
          size="small"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setInputError(false);
          }}
          onKeyDown={(event) => event.key === "Enter" && handleAddCriteria()}
          error={Boolean(inputError)}
          helperText={inputError}
          color="info"
          sx={{ flex: 1, ...getCreateIssueStepInputSx(theme) }}
        />

        {showCriterionTypes ? (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel color="info">Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              label="Type"
              color="info"
              sx={getCreateIssueStepInputSx(theme)}
            >
              <MenuItem value="benefit">Benefit</MenuItem>
              <MenuItem value="cost">Cost</MenuItem>
            </Select>
          </FormControl>
        ) : null}

        <Button
          startIcon={<AddIcon />}
          color="info"
          variant="outlined"
          onClick={handleAddCriteria}
          disabled={!inputValue.trim()}
        >
          Add
        </Button>
      </Stack>

      {criteria.length === 0 ? (
        <Box sx={getCreateIssueStepEmptyStateSx(theme)}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
            No criteria yet. Add at least 1 leaf criterion.
          </Typography>
        </Box>
      ) : (
        <List
          disablePadding
          sx={{
            ...getCreateIssueStepScrollableSx(theme, "52vh"),
            overflow: "hidden",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <TransitionGroup>
            {reversed.map((item, index) => (
              <Collapse key={item.name}>
                <CriteriaItem
                  item={item}
                  editingCriterion={editingCriterion}
                  editCriterionValue={editCriterionValue}
                  setEditCriterionValue={setEditCriterionValue}
                  editBlur={editBlur}
                  handleSaveCriterionEdit={handleSaveCriterionEdit}
                  editCriterionError={editCriterionError}
                  editCriterionType={editCriterionType}
                  setEditCriterionType={setEditCriterionType}
                  setEditBlur={setEditBlur}
                  handleEditCriterion={handleEditCriterion}
                  handleToggle={handleToggle}
                  openItems={openItems}
                  setSelectedParent={setSelectedParent}
                  handleRemoveCriteria={handleAskRemoveCriteria}
                  setOpenDialog={setOpenDialog}
                  showCriterionTypes={showCriterionTypes}
                  creatorWeightMode={creatorWeightMode}
                  isSingleCriterion={isSingleCriterion}
                  fuzzyValueCount={fuzzyValueCount}
                  weightsByCriterion={weightsByCriterion}
                  onManualWeightChange={handleManualWeightChange}
                  onFuzzyVectorChange={handleFuzzyWeightChange}
                />
                {index !== reversed.length - 1 ? (
                  <Divider sx={getCreateIssueRowDividerSx(theme)} />
                ) : null}
              </Collapse>
            ))}
          </TransitionGroup>
        </List>
      )}

      {manualWeightStatus ? (
        <Typography
          variant="caption"
          sx={{ color: manualWeightStatus.valid ? "text.secondary" : "error.main", fontWeight: 800 }}
        >
          {manualWeightStatus.label}
        </Typography>
      ) : null}

      <GlassDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: getCreateIssueSoftTopAuroraDialogPaperSx(theme) }}
      >
        <DialogContent sx={{ pt: 2, pb: 1.6 }}>
          <Stack spacing={2}>
            <Stack spacing={2.5}>
              <Stack spacing={0.5}>
                <Typography fontWeight={900} fontSize={22}>
                  Add child criterion
                </Typography>
                {selectedParent?.name ? (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Parent: {selectedParent.name}
                  </Typography>
                ) : null}
              </Stack>

              <TextField
                color="info"
                variant="outlined"
                label="Child name"
                value={childInputValue}
                onChange={(event) => {
                  setChildInputValue(event.target.value);
                  setChildInputError(false);
                }}
                onKeyDown={(event) => event.key === "Enter" && handleAddChild()}
                fullWidth
                autoFocus
                error={Boolean(childInputError)}
                helperText={childInputError}
                sx={getCreateIssueStepInputSx(theme)}
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={0.4}>
              <Button variant="text" color="warning" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="text"
                color="info"
                onClick={handleAddChild}
                disabled={!childInputValue.trim()}
              >
                Add
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </GlassDialog>

      <ConfirmationDialog
        open={openRemoveCriterionDialog}
        onClose={handleCancelRemoveCriteria}
        tone="error"
        title="Delete criterion?"
        subtitle={
          criterionToRemove?.name
            ? `Are you sure you want to delete "${criterionToRemove.name}"?`
            : "Are you sure you want to delete this criterion?"
        }
        actions={[
          {
            id: "cancel-delete-criterion",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelRemoveCriteria,
          },
          {
            id: "confirm-delete-criterion",
            label: "Delete",
            color: "error",
            icon: <DeleteOutlineIcon />,
            onClick: handleConfirmRemoveCriteria,
            autoFocus: true,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </Stack>
  );
};

export default CriteriaStep;
