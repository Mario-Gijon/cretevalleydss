import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { createOrderedCategory, normalizeOrderedCategoriesValue } from "./orderedCategoriesValues.js";

const CategoryRow = ({ category, index, total, disabled, onLabelChange, onMove, onRemove, isFirst, isLast, showError }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.categoryId,
    disabled,
  });

  return (
    <Stack
      ref={setNodeRef}
      direction={{ xs: "column", sm: "row" }}
      spacing={0.75}
      alignItems={{ sm: "center" }}
      sx={{
        p: 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        bgcolor: isDragging ? "action.hover" : "background.paper",
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      role="listitem"
      data-testid={`ordered-category-${index + 1}`}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
        {!disabled ? (
          <Tooltip title={`Drag ${category.label || `category ${index + 1}`} to reorder`}>
            <IconButton
              ref={setActivatorNodeRef}
              size="small"
              aria-label={`Drag category ${index + 1} to reorder`}
              {...attributes}
              {...listeners}
              sx={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
            >
              <DragIndicatorRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Typography
          aria-label={`Preference order ${index + 1}`}
          sx={{
            flexShrink: 0,
            width: 30,
            textAlign: "center",
            fontWeight: "fontWeightBold",
            color: "secondary.main",
          }}
        >
          {index + 1}
        </Typography>
        <TextField
          size="small"
          fullWidth
          label={`Category ${index + 1}`}
          value={category.label}
          onChange={(event) => onLabelChange(category.categoryId, event.target.value)}
          disabled={disabled}
          color="secondary"
          error={showError && !category.label.trim()}
          helperText={showError && !category.label.trim() ? "Enter a category name." : undefined}
          inputProps={{ "aria-label": `Category ${index + 1}` }}
        />
      </Stack>
      {isFirst ? <Chip size="small" color="secondary" variant="outlined" label="Least preferred" /> : null}
      {isLast ? <Chip size="small" color="secondary" variant="outlined" label="Most preferred" /> : null}
      {!disabled ? (
        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
          <Tooltip title="Move category up">
            <span>
              <IconButton
                size="small"
                aria-label={`Move category ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
              >
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move category down">
            <span>
              <IconButton
                size="small"
                aria-label={`Move category ${index + 1} down`}
                disabled={index === total - 1}
                onClick={() => onMove(index, index + 1)}
              >
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Remove category">
            <IconButton
              size="small"
              aria-label={`Remove category ${index + 1}`}
              onClick={() => onRemove(category.categoryId)}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </Stack>
  );
};

export const OrderedCategoriesParameterField = ({ parameter, value, onChange, error = "", disabled = false, inspectDependencyChange, showValidation = false }) => {
  const label = "Ordered categories";
  const [hasInteracted, setHasInteracted] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const categories = useMemo(
    () => normalizeOrderedCategoriesValue(parameter, value),
    [parameter, value]
  );
  const displayErrors = hasInteracted || showValidation;
  useEffect(() => {
    if (JSON.stringify(value ?? []) !== JSON.stringify(categories)) onChange(categories);
  }, [categories, onChange, value]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commit = (nextCategories) => {
    setHasInteracted(true);
    onChange(nextCategories.map((category, order) => ({ ...category, order })));
  };

  const requestCommit = (nextCategories) => {
    const normalized = nextCategories.map((category, order) => ({ ...category, order }));
    const warnings = typeof inspectDependencyChange === "function"
      ? inspectDependencyChange(normalized)
      : [];
    if (warnings.length) {
      setPendingChange({ nextCategories: normalized, warnings });
      return;
    }
    commit(normalized);
  };
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((category) => category.categoryId === active.id);
    const newIndex = categories.findIndex((category) => category.categoryId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    requestCommit(arrayMove(categories, oldIndex, newIndex));
  };

  return (
    <Stack spacing={1}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Define the categories from least to most preferred.
        </Typography>
      </Box>
      {categories.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((category) => category.categoryId)} strategy={verticalListSortingStrategy}>
            <Stack role="list" aria-label={`${label} ordered from least to most preferred`} spacing={0.75}>
              {categories.map((category, index) => (
                <CategoryRow
                  key={category.categoryId}
                  category={category}
                  index={index}
                  total={categories.length}
                  isFirst={index === 0}
                  isLast={index === categories.length - 1}
                  showError={displayErrors}
                  disabled={disabled}
                  onLabelChange={(categoryId, nextLabel) => {
                    setHasInteracted(true);
                    onChange(categories.map((item, order) => item.categoryId === categoryId
                      ? { ...item, label: nextLabel, order }
                      : { ...item, order }));
                  }}
                  onMove={(from, to) => requestCommit(arrayMove(categories, from, to))}
                  onRemove={(categoryId) => requestCommit(categories.filter((item) => item.categoryId !== categoryId))}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      ) : (
        <Typography variant="body2" color="text.secondary">Add at least two categories, from least to most preferred.</Typography>
      )}
      {!disabled ? (
        <Button
          startIcon={<AddRoundedIcon />}
          variant="outlined"
          color="secondary"
          size="small"
          sx={{ alignSelf: "flex-start" }}
          onClick={() => requestCommit([...categories, createOrderedCategory({ label: `Category ${categories.length + 1}`, order: categories.length })])}
        >
          Add category
        </Button>
      ) : null}
      {displayErrors && error ? <Typography variant="caption" color="error" role="alert">{error}</Typography> : null}
      <Dialog open={Boolean(pendingChange)} onClose={() => setPendingChange(null)} aria-labelledby="category-change-title">
        <DialogTitle id="category-change-title">Review this category change</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Some saved boundary values no longer match the neighboring categories. They will be reset if you continue.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cancel to review the current values before applying this change.
          </Typography>
          <List dense disablePadding sx={{ mt: 0.75 }}>
            {pendingChange?.warnings.map((warning) => (
              <ListItem key={warning} sx={{ display: "list-item", py: 0.2, ml: 2 }}>{warning}</ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setPendingChange(null)}>Cancel</Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => {
              const nextCategories = pendingChange?.nextCategories;
              setPendingChange(null);
              if (nextCategories) commit(nextCategories);
            }}
          >
            Apply change
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default OrderedCategoriesParameterField;
