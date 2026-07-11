import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Divider,
  Chip,
  Box,
  InputAdornment,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { GlassPaper } from "../../../../components/StyledComponents/GlassPaper";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../../styles/createIssueStep.styles";
import {
  getExpressionDomainDisplayMeta,
  getExpressionDomainTypeKey,
} from "../../../../utils/expressionDomains";
import { ExpressionDomainPreview } from "./ExpressionDomainPreview";
import {
  filterManagedExpressionDomains,
  getManageExpressionDomainFamily,
  getResetSubtypeFilter,
  MANAGE_DOMAIN_FAMILY_FILTERS,
  MANAGE_DOMAIN_SUBTYPE_FILTERS,
} from "./manageExpressionDomains.helpers.js";

export const ViewExpressionsDomainDialog = ({
  open,
  onClose,
  handleOpenEdit,
  handleDelete,
}) => {
  const theme = useTheme();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState(MANAGE_DOMAIN_FAMILY_FILTERS.all);
  const [subtypeFilter, setSubtypeFilter] = useState("");

  const allManagedDomains = useMemo(
    () => [
      ...(Array.isArray(globalDomains)
        ? globalDomains.map((domain) => ({ ...domain, __domainScope: "global" }))
        : []),
      ...(Array.isArray(expressionDomains)
        ? expressionDomains.map((domain) => ({ ...domain, __domainScope: "user" }))
        : []),
    ],
    [expressionDomains, globalDomains]
  );

  useEffect(() => {
    if (open && allManagedDomains.length === 0) {
      onClose();
    }
  }, [allManagedDomains.length, open, onClose]);

  const visibleDomains = useMemo(
    () =>
      filterManagedExpressionDomains({
        domains: allManagedDomains,
        searchQuery,
        familyFilter,
        subtypeFilter,
      }),
    [allManagedDomains, familyFilter, searchQuery, subtypeFilter]
  );

  const visibleDomainCount = visibleDomains.length;
  const dialogMaxWidth = visibleDomainCount <= 1 ? "md" : "xl";
  const numericDomains = useMemo(
    () =>
      visibleDomains.filter(
        (domain) =>
          getManageExpressionDomainFamily(domain) === MANAGE_DOMAIN_FAMILY_FILTERS.numeric
      ),
    [visibleDomains]
  );
  const linguisticDomains = useMemo(
    () =>
      visibleDomains.filter(
        (domain) =>
          getManageExpressionDomainFamily(domain) === MANAGE_DOMAIN_FAMILY_FILTERS.linguistic
      ),
    [visibleDomains]
  );
  const hasNumericDomains = numericDomains.length > 0;
  const hasLinguisticDomains = linguisticDomains.length > 0;
  const showTwoFamilyLayout = hasNumericDomains && hasLinguisticDomains;

  const handleFamilyFilterChange = (nextFamilyFilter) => {
    setFamilyFilter(nextFamilyFilter);
    setSubtypeFilter(getResetSubtypeFilter(nextFamilyFilter));
  };

  const isSubtypeFilterVisible =
    familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.numeric ||
    familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.linguistic;

  if (allManagedDomains.length === 0) {
    return null;
  }

  const handleAskDelete = (domain) => {
    setSelectedDomain(domain);
    setOpenDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    if (removeLoading) return;
    setOpenDeleteDialog(false);
    setSelectedDomain(null);
  };

  const handleConfirmDelete = async () => {
    const selectedDomainId = selectedDomain?._id || selectedDomain?.id;

    if (!selectedDomainId || removeLoading) return;

    setRemoveLoading(true);
    await handleDelete(selectedDomainId);
    setRemoveLoading(false);
    setOpenDeleteDialog(false);
    setSelectedDomain(null);
  };

  const renderDomainCard = (domain) => {
    const displayMeta = getExpressionDomainDisplayMeta(domain);
    const isGlobalDomain =
      domain.__domainScope === "global" || domain.isGlobal === true;
    const domainId = domain._id || domain.id || displayMeta.name;
    const typeKey = getExpressionDomainTypeKey(domain);

    return (
      <GlassPaper
        key={domainId}
        data-testid={typeKey === "linguisticFuzzy" ? "expression-domain-card-fuzzy" : "expression-domain-card"}
        sx={{
          p: 1.2,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
          bgcolor: alpha(theme.palette.common.white, 0.012),
          minWidth: 0,
        }}
      >
        <Stack spacing={1.05} width="100%" sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
            width="100%"
          >
            <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 900, lineHeight: 1.1, overflowWrap: "anywhere" }}
                >
                  {displayMeta.name}
                </Typography>
                {isGlobalDomain ? (
                  <Chip size="small" label="Global" color="default" variant="outlined" />
                ) : null}
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 850, overflowWrap: "anywhere" }}
              >
                {displayMeta.descriptor}
              </Typography>
            </Stack>

            {!isGlobalDomain ? (
              <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                <Tooltip title="Edit domain" arrow>
                  <IconButton
                    size="small"
                    color="warning"
                    aria-label="Edit domain"
                    onClick={() => handleOpenEdit(domain)}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete domain" arrow>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label="Delete domain"
                    onClick={() => handleAskDelete(domain)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : null}
          </Stack>

          <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

          <Box sx={{ width: "100%", minWidth: 0 }}>
            <ExpressionDomainPreview domain={domain} />
          </Box>
        </Stack>
      </GlassPaper>
    );
  };

  return (
    <>
      <GlassDialog
        open={open}
        onClose={onClose}
        maxWidth={dialogMaxWidth}
        fullWidth
      >
        <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
          Manage domain expressions
        </DialogTitle>

        <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>

          <Stack spacing={1.25} sx={{ mt: 3 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              sx={{pb:1}}
            >
              <TextField
                color="info"
                size="small"
                placeholder="Search domains by name"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                inputProps={{ "data-testid": "expression-domain-search-input" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: { md: 240 }, flex: { md: 1 } }}
              />

              <TextField
                select
                color="info"
                size="small"
                label="Family"
                value={familyFilter}
                onChange={(event) => handleFamilyFilterChange(event.target.value)}
                sx={{ minWidth: { xs: "100%", md: 170 } }}
              >
                <MenuItem value={MANAGE_DOMAIN_FAMILY_FILTERS.all}>All</MenuItem>
                <MenuItem value={MANAGE_DOMAIN_FAMILY_FILTERS.numeric}>Numeric</MenuItem>
                <MenuItem value={MANAGE_DOMAIN_FAMILY_FILTERS.linguistic}>Linguistic</MenuItem>
              </TextField>

              {isSubtypeFilterVisible ? (
                <TextField
                  select
                  color="info"
                  size="small"
                  label="Subtype"
                  value={subtypeFilter}
                  onChange={(event) => setSubtypeFilter(event.target.value)}
                  sx={{ minWidth: { xs: "100%", md: 170 } }}
                >
                  {familyFilter === MANAGE_DOMAIN_FAMILY_FILTERS.numeric ? (
                    [
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.allNumeric}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.allNumeric}
                      >
                        All numeric
                      </MenuItem>,
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.continuous}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.continuous}
                      >
                        Continuous
                      </MenuItem>,
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.discrete}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.discrete}
                      >
                        Discrete
                      </MenuItem>,
                    ]
                  ) : (
                    [
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.allLinguistic}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.allLinguistic}
                      >
                        All linguistic
                      </MenuItem>,
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.ordinal}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.ordinal}
                      >
                        Ordinal
                      </MenuItem>,
                      <MenuItem
                        key={MANAGE_DOMAIN_SUBTYPE_FILTERS.fuzzy}
                        value={MANAGE_DOMAIN_SUBTYPE_FILTERS.fuzzy}
                      >
                        Fuzzy
                      </MenuItem>,
                    ]
                  )}
                </TextField>
              ) : null}
            </Stack>

            {visibleDomains.length === 0 ? (
              <Box sx={{ py: 3 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  No expression domains match the current filters.
                </Typography>
              </Box>
            ) : null}

            {showTwoFamilyLayout ? (
              <Box
                data-testid="expression-domain-family-layout"
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(250px, 1fr) minmax(0, 2fr)",
                  },
                  alignItems: "start",
                  gap: 1.5,
                }}
              >
                <Stack
                  data-testid="expression-domain-numeric-column"
                  spacing={1}
                  alignItems="stretch"
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                    Numeric domains
                  </Typography>
                  {numericDomains.map(renderDomainCard)}
                </Stack>

                <Stack
                  data-testid="expression-domain-linguistic-column"
                  spacing={1}
                  alignItems="stretch"
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
                    Linguistic domains
                  </Typography>
                  {linguisticDomains.map(renderDomainCard)}
                </Stack>
              </Box>
            ) : null}

            {!showTwoFamilyLayout && hasNumericDomains ? (
              <Box
                data-testid="expression-domain-numeric-only-layout"
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))",
                  },
                  alignItems: "start",
                  gap: 1.5,
                }}
              >
                {numericDomains.map(renderDomainCard)}
              </Box>
            ) : null}

            {!showTwoFamilyLayout && hasLinguisticDomains ? (
              <Stack
                data-testid="expression-domain-linguistic-only-layout"
                spacing={1}
                alignItems="stretch"
              >
                {linguisticDomains.map(renderDomainCard)}
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
          <Button onClick={onClose} color="secondary" variant="outlined">
            Close
          </Button>
        </DialogActions>
      </GlassDialog>

      <ConfirmationDialog
        open={openDeleteDialog}
        onClose={handleCancelDelete}
        tone="error"
        title="Delete expression domain?"
        subtitle={
          selectedDomain?.name
            ? `Are you sure you want to delete "${selectedDomain.name}"?`
            : "Are you sure you want to delete this expression domain?"
        }
        actions={[
          {
            id: "cancel-delete-expression-domain",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelDelete,
          },
          {
            id: "confirm-delete-expression-domain",
            label: "Delete",
            color: "error",
            icon: <DeleteOutlineIcon />,
            loading: removeLoading,
            autoFocus: true,
            onClick: handleConfirmDelete,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
};
