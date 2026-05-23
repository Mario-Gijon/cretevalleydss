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
} from "@mui/material";
import { Fragment } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";

import { CriterionWeightField } from "./criteria/CriterionWeightField";

export const CriteriaItem = ({
  item,
  level = 0,
  editingCriterion,
  editCriterionValue,
  setEditCriterionValue,
  editBlur,
  handleSaveCriterionEdit,
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
  const isEditing = editingCriterion?.name === item.name;

  const weightFieldMode =
    isLeaf && (creatorWeightMode === "manual" || creatorWeightMode === "fuzzy")
      ? creatorWeightMode
      : null;

  const weightField = weightFieldMode ? (
    <CriterionWeightField
      mode={weightFieldMode}
      isSingleLeaf={isSingleCriterion}
      fuzzyValueCount={fuzzyValueCount}
      manualValue={weightsByCriterion?.[item.name] ?? ""}
      fuzzyVector={weightsByCriterion?.[item.name]}
      onManualChange={(value) => onManualWeightChange?.(item.name, value)}
      onFuzzyChange={(nextVector) => onFuzzyVectorChange?.(item.name, nextVector)}
    />
  ) : null;

  return (
    <>
      <ListItem
        key={item.name}
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
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={1.15}
            sx={{ width: "100%" }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flex: 1, minWidth: 0 }}
            >
              {isEditing ? (
                <TextField
                  variant="outlined"
                  size="small"
                  value={editCriterionValue}
                  onChange={(event) => setEditCriterionValue(event.target.value)}
                  onBlur={!editBlur ? handleSaveCriterionEdit : undefined}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSaveCriterionEdit();
                  }}
                  autoFocus
                  fullWidth
                  color="info"
                  error={Boolean(editCriterionError)}
                  helperText={editCriterionError}
                  sx={{
                    maxWidth: { md: 420 },
                    "& .MuiInputBase-input": {
                      fontWeight: 850,
                    },
                  }}
                />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}
                  </Typography>

                  {isFirstLevel && showCriterionTypes ? (
                    <Chip
                      variant="outlined"
                      label={item.type === "cost" ? "Cost" : "Benefit"}
                      color={item.type === "cost" ? "error" : "success"}
                      size="small"
                      sx={{ height: 22, fontWeight: 850 }}
                    />
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
                  value={editCriterionType}
                  onChange={(event) => setEditCriterionType(event.target.value)}
                  onBlur={handleSaveCriterionEdit}
                  onClick={() => setEditBlur(false)}
                  size="small"
                  color="info"
                  sx={{ minWidth: 118 }}
                >
                  <MenuItem value="benefit">Benefit</MenuItem>
                  <MenuItem value="cost">Cost</MenuItem>
                </Select>
              ) : null}

              {weightField}
            </Stack>
          </Stack>
        </Box>

        {hasChildren ? (
          <IconButton onClick={() => handleToggle(item.name)} size="small">
            {openItems[item.name] ? <ExpandLess /> : <ExpandMore />}
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
        <Collapse in={openItems[item.name]} timeout="auto" unmountOnExit>
          <List disablePadding>
            {item.children.map((child, index) => (
              <Fragment key={index}>
                <CriteriaItem
                  item={child}
                  level={level + 1}
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