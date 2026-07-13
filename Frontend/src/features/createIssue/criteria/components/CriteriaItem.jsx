import {
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Fragment } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { CriterionWeightField } from "./CriterionWeightField";

export const CriteriaItem = ({
  item,
  level = 0,
  editingCriterion,
  editCriterionValue,
  setEditCriterionValue,
  editCriterionDescription,
  setEditCriterionDescription,
  handleSaveCriterionEdit,
  handleCancelCriterionEdit,
  editCriterionError,
  editCriterionType,
  setEditCriterionType,
  handleEditCriterion,
  handleToggle,
  openItems,
  setSelectedParent,
  handleRemoveCriteria,
  setOpenDialog,
  showCriterionTypes = true,
  creatorWeightMode = null,
  isSingleCriterion = false,
  fuzzyValueCount = null,
  weightsByCriterion = {},
  onManualWeightChange,
  onFuzzyVectorChange,
}) => {
  const hasChildren = Array.isArray(item?.children) && item.children.length > 0;
  const isLeaf = !hasChildren;
  const isFirstLevel = level === 0;
  const isEditing = editingCriterion?.id === item.id;

  const weightFieldMode =
    isLeaf && (creatorWeightMode === "manual" || creatorWeightMode === "fuzzy")
      ? creatorWeightMode
      : null;

  const weightField = weightFieldMode ? (
    <CriterionWeightField
      mode={weightFieldMode}
      isSingleLeaf={isSingleCriterion}
      fuzzyValueCount={fuzzyValueCount}
      manualValue={weightsByCriterion?.[item.id] ?? ""}
      fuzzyVector={weightsByCriterion?.[item.id]}
      onManualChange={(value) => onManualWeightChange?.(item.id, value)}
      onFuzzyChange={(nextVector) => onFuzzyVectorChange?.(item.id, nextVector)}
    />
  ) : null;

  const hierarchyActions = (
    <>
      {hasChildren ? (
        <IconButton onClick={() => handleToggle(item.id)} size="small" aria-label={openItems[item.id] ? "Collapse criterion" : "Expand criterion"}>
          {openItems[item.id] ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      ) : null}
      <IconButton
        edge="end"
        aria-label="add child"
        size="small"
        onClick={() => {
          setSelectedParent(item);
          setOpenDialog(true);
        }}
      >
        <AddCircleIcon color="info" fontSize="small" />
      </IconButton>
      <IconButton edge="end" aria-label="edit" title="Edit" size="small" onClick={() => handleEditCriterion(item)}>
        <EditIcon color="warning" />
      </IconButton>
      <IconButton edge="end" aria-label="delete" title="Delete" size="small" onClick={() => handleRemoveCriteria(item)}>
        <DeleteIcon color="error" />
      </IconButton>
    </>
  );

  return (
    <>
      <ListItem
        sx={{
          px: { xs: 1, sm: 1.2 },
          py: 1,
          pl: { xs: 1, sm: level * 2 + 1.2 },
          alignItems: "flex-start",
          minWidth: 0,
        }}
      >
        <Stack spacing={0.5} sx={{ width: "100%", minWidth: 0 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1}
            sx={{ width: "100%", minWidth: 0 }}
          >
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <TextField
                  variant="outlined"
                  size="small"
                  fullWidth
                  autoFocus
                  color="secondary"
                  value={editCriterionValue}
                  onChange={(event) => setEditCriterionValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSaveCriterionEdit();
                    if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      handleCancelCriterionEdit();
                    }
                  }}
                  error={Boolean(editCriterionError)}
                  helperText={editCriterionError || undefined}
                  inputProps={{ maxLength: 60 }}
                  sx={{ "& .MuiInputBase-input": { fontWeight: 850 } }}
                />
              ) : (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {item.name}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{ xs: "flex-start", md: "flex-end" }}
              spacing={0.65}
              flexWrap="wrap"
              sx={{ flexShrink: 0, minWidth: 0 }}
            >
              {isEditing && isFirstLevel && showCriterionTypes ? (
                <Select
                  variant="outlined"
                  value={editCriterionType}
                  onChange={(event) => setEditCriterionType(event.target.value)}
                  size="small"
                  color="secondary"
                  sx={{ minWidth: 118, flexShrink: 0 }}
                >
                  <MenuItem value="benefit">Benefit</MenuItem>
                  <MenuItem value="cost">Cost</MenuItem>
                </Select>
              ) : !isEditing && isFirstLevel && showCriterionTypes ? (
                <Chip
                  variant="outlined"
                  label={item.type === "cost" ? "Cost" : "Benefit"}
                  color={item.type === "cost" ? "error" : "success"}
                  size="small"
                  sx={{ minWidth: 72, height: 22, fontWeight: 850, flexShrink: 0 }}
                />
              ) : null}

              {weightField}

              {isEditing ? (
                <>
                  <Tooltip title="Save changes">
                    <IconButton aria-label="Save changes" onClick={handleSaveCriterionEdit} size="medium" color="success">
                      <CheckRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel editing">
                    <IconButton aria-label="Cancel editing" onClick={handleCancelCriterionEdit} size="medium" color="warning">
                      <CloseRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                hierarchyActions
              )}
            </Stack>
          </Stack>

          {isEditing ? (
            <TextField
              variant="outlined"
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              color="secondary"
              placeholder="Optional description"
              value={editCriterionDescription}
              onChange={(event) => setEditCriterionDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleCancelCriterionEdit();
                }
              }}
              inputProps={{ maxLength: 500 }}
              helperText={`${editCriterionDescription.length} / 500`}
            />
          ) : item.description ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
                width: "100%",
              }}
            >
              {item.description}
            </Typography>
          ) : null}
        </Stack>
      </ListItem>

      {hasChildren ? (
        <Collapse in={openItems[item.id]} timeout="auto" unmountOnExit>
          <List disablePadding>
            {item.children.map((child) => (
              <Fragment key={child.id}>
                <CriteriaItem
                  item={child}
                  level={level + 1}
                  editingCriterion={editingCriterion}
                  editCriterionValue={editCriterionValue}
                  setEditCriterionValue={setEditCriterionValue}
                  editCriterionDescription={editCriterionDescription}
                  setEditCriterionDescription={setEditCriterionDescription}
                  handleSaveCriterionEdit={handleSaveCriterionEdit}
                  handleCancelCriterionEdit={handleCancelCriterionEdit}
                  editCriterionError={editCriterionError}
                  editCriterionType={editCriterionType}
                  setEditCriterionType={setEditCriterionType}
                  handleEditCriterion={handleEditCriterion}
                  handleToggle={handleToggle}
                  openItems={openItems}
                  setSelectedParent={setSelectedParent}
                  handleRemoveCriteria={handleRemoveCriteria}
                  setOpenDialog={setOpenDialog}
                  showCriterionTypes={showCriterionTypes}
                  creatorWeightMode={creatorWeightMode}
                  isSingleCriterion={isSingleCriterion}
                  fuzzyValueCount={fuzzyValueCount}
                  weightsByCriterion={weightsByCriterion}
                  onManualWeightChange={onManualWeightChange}
                  onFuzzyVectorChange={onFuzzyVectorChange}
                />
              </Fragment>
            ))}
          </List>
        </Collapse>
      ) : null}
    </>
  );
};

export default CriteriaItem;
