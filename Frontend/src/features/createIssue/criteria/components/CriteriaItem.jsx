import {
  Box,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
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
  editBlur,
  handleSaveCriterionEdit,
  handleCancelCriterionEdit,
  editCriterionError,
  editCriterionType,
  setEditCriterionType,
  setEditBlur,
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

  return (
    <>
      <ListItem
        key={item.id || item.name}
        sx={{
          px: { xs: 1, sm: 1.2 },
          py: 1,
          pl: { xs: 1, sm: level * 2 + 1.2 },
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="column"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1.15}
            sx={{ width: "100%" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems="center"
              spacing={1}
              sx={{ flex: 1, minWidth: 0 }}
            >
              {isEditing ? (
                <Stack spacing={0.75} sx={{ flex: 1 }}>
                  <TextField
                    variant="outlined" size="small" value={editCriterionValue}
                    onChange={(event) => setEditCriterionValue(event.target.value)}
                  onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveCriterionEdit();
                      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); handleCancelCriterionEdit(); }
                    }}
                    autoFocus fullWidth color="secondary" error={Boolean(editCriterionError)}
                    helperText={editCriterionError} inputProps={{ maxLength: 60 }}
                    sx={{ maxWidth: { md: 420 }, "& .MuiInputBase-input": { fontWeight: 850 } }}
                  />
                  <TextField
                    variant="outlined" size="small" multiline minRows={2} maxRows={5}
                    placeholder="Optional description" value={editCriterionDescription} fullWidth
                    onChange={(event) => setEditCriterionDescription(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); handleCancelCriterionEdit(); } }}
                    color="secondary" inputProps={{ maxLength: 500 }}
                    helperText={`${editCriterionDescription.length} / 500`}
                  />
                </Stack>
              ) : (
                <>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </Typography>
                    {isFirstLevel && showCriterionTypes ? (
                      <Chip variant="outlined" label={item.type === "cost" ? "Cost" : "Benefit"} color={item.type === "cost" ? "error" : "success"} size="small" sx={{ height: 22, fontWeight: 850, flexShrink: 0 }} />
                    ) : null}
                  </Stack>
                  {item.description ? (
                    <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden", width: "100%" }}>
                      {item.description}
                    </Typography>
                  ) : null}
                </>
              )}
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              sx={{ flexShrink: 0 }}
            >
              {isEditing && isFirstLevel && showCriterionTypes ? (
                <Select
                  variant="outlined"
                  value={editCriterionType}
                  onChange={(event) => setEditCriterionType(event.target.value)}
                  size="small"
                  color="secondary"
                  fullWidth
                  sx={{ minWidth: 118 }}
                >
                  <MenuItem value="benefit">Benefit</MenuItem>
                  <MenuItem value="cost">Cost</MenuItem>
                </Select>
              ) : null}

              {weightField}
              {isEditing ? (
                <>
                  <Tooltip title="Save changes"><IconButton aria-label="Save changes" onClick={handleSaveCriterionEdit} size="medium" color="success"><CheckRoundedIcon /></IconButton></Tooltip>
                  <Tooltip title="Cancel editing"><IconButton aria-label="Cancel editing" onClick={handleCancelCriterionEdit} size="medium" color="warning"><CloseRoundedIcon /></IconButton></Tooltip>
                </>
              ) : null}
            </Stack>
          </Stack>
        </Box>

        {hasChildren ? (
          <IconButton onClick={() => handleToggle(item.id)} size="small">
            {openItems[item.id] ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        ) : null}

        <Stack direction="row" spacing={0.35} sx={{ flexShrink: 0 }}>
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

          <IconButton
            edge="end"
            aria-label="edit"
            title="Edit"
            size="small"
            onClick={() => handleEditCriterion(item)}
          >
            <EditIcon color="warning" fontSize="small" />
          </IconButton>

          <IconButton
            edge="end"
            aria-label="delete"
            title="Delete"
            size="small"
            onClick={() => handleRemoveCriteria(item)}
          >
            <DeleteIcon color="error" fontSize="small" />
          </IconButton>
        </Stack>
      </ListItem>

      {hasChildren ? (
        <Collapse in={openItems[item.id]} timeout="auto" unmountOnExit>
          <List disablePadding>
            {item.children.map((child, index) => (
              <Fragment key={child.id || index}>
                <CriteriaItem
                  item={child}
                  level={level + 1}
                  editingCriterion={editingCriterion}
                  editCriterionValue={editCriterionValue}
                  setEditCriterionValue={setEditCriterionValue}
                  editCriterionDescription={editCriterionDescription}
                  setEditCriterionDescription={setEditCriterionDescription}
                  editBlur={editBlur}
                  handleSaveCriterionEdit={handleSaveCriterionEdit}
                  handleCancelCriterionEdit={handleCancelCriterionEdit}
                  editCriterionError={editCriterionError}
                  editCriterionType={editCriterionType}
                  setEditCriterionType={setEditCriterionType}
                  setEditBlur={setEditBlur}
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
