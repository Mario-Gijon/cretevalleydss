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
import { alpha } from "@mui/material/styles";
import { createOrderedCategory, normalizeOrderedCategoriesValue } from "./orderedCategoriesValues.js";
import ParameterInfoTooltip from "../../components/ParameterInfoTooltip.jsx";

const CategoryRow = ({ category, index, total, disabled, onLabelChange, onMove, onRemove, showError }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.categoryId,
    disabled,
  });

  return (
    <Stack
      ref={setNodeRef}
      direction="row"
      spacing={0.45}
      alignItems="center"
      sx={(theme) => ({
        minWidth: 0,
        minHeight: 42,
        px: 0.15,
        py: 0.2,
        borderBottom: 1,
        borderColor: alpha(theme.palette.divider, 0.4),
        bgcolor: isDragging ? alpha(theme.palette.secondary.main, 0.12) : "transparent",
        transform: CSS.Transform.toString(transform),
        transition,
        "&:hover": { bgcolor: isDragging ? alpha(theme.palette.secondary.main, 0.12) : alpha(theme.palette.common.white, 0.018) },
      })}
      role="listitem"
      data-testid={`ordered-category-${index + 1}`}
    >
      <Tooltip title={`Drag ${category.label || `category ${index + 1}`} to reorder`}>
        <IconButton
          ref={setActivatorNodeRef}
          size="small"
          aria-label={`Drag category ${index + 1} to reorder`}
          {...attributes}
          {...listeners}
          sx={{
            width: 26,
            height: 28,
            p: 0.35,
            flexShrink: 0,
            color: "text.secondary",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          <DragIndicatorRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Typography
        aria-label={`Preference order ${index + 1}`}
        variant="caption"
        sx={{ flexShrink: 0, width: 20, textAlign: "center", color: "text.secondary", fontWeight: 700 }}
      >
        {index + 1}
      </Typography>
      <TextField
        size="small"
        fullWidth
        sx={{ flex: 1, minWidth: 0, "& .MuiInputBase-root": { minHeight: 34 }, "& .MuiInputBase-input": { py: 0.5 } }}
        placeholder={`Category ${index + 1}`}
        value={category.label}
        onChange={(event) => onLabelChange(category.categoryId, event.target.value)}
        disabled={disabled}
        color="secondary"
        error={showError && !category.label.trim()}
        helperText={showError && !category.label.trim() ? "Enter a category name." : undefined}
        inputProps={{ "aria-label": `Category ${index + 1}` }}
      />
      {!disabled ? (
        <Stack direction="row" spacing={0.05} alignItems="center" sx={{ flexShrink: 0 }}>
          <Tooltip title={`Move category ${index + 1} up`}>
            <span>
              <IconButton
                size="small"
                aria-label={`Move category ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                sx={{ width: 26, height: 28, p: 0.35, color: "text.secondary", opacity: 0.78 }}
              >
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Move category ${index + 1} down`}>
            <span>
              <IconButton
                size="small"
                aria-label={`Move category ${index + 1} down`}
                disabled={index === total - 1}
                onClick={() => onMove(index, index + 1)}
                sx={{ width: 26, height: 28, p: 0.35, color: "text.secondary", opacity: 0.78 }}
              >
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Remove category ${index + 1}`}>
            <IconButton
              size="small"
              aria-label={`Remove category ${index + 1}`}
              onClick={() => onRemove(category.categoryId)}
              sx={(theme) => ({
                width: 26,
                height: 28,
                p: 0.35,
                color: theme.palette.error.main,
                "&:hover": {
                  color: theme.palette.error.light,
                  bgcolor: alpha(theme.palette.error.main, 0.12),
                },
              })}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </Stack>
  );
};

export const OrderedCategoriesParameterField = ({ parameter, value, onChange, error = "", disabled = false, inspectDependencyChange, showValidation = false, infoTooltip = "" }) => {
  const label = "Categories";
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
    <Stack spacing={0.65} sx={{ minWidth: 0 }}>
      <Box>
        <Stack direction="row" spacing={0.2} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
          {infoTooltip ? <ParameterInfoTooltip label={label} text={infoTooltip} /> : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>Less preferred → More preferred</Typography>
      </Box>
      {categories.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((category) => category.categoryId)} strategy={verticalListSortingStrategy}>
            <Stack role="list" aria-label={`${label} from less to more preferred`} spacing={0}>
              {categories.map((category, index) => (
                <CategoryRow
                  key={category.categoryId}
                  category={category}
                  index={index}
                  total={categories.length}
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
        <Typography variant="caption" color="text.secondary">Add at least two categories.</Typography>
      )}
      {!disabled ? (
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          size="small"
          aria-label="Add category"
          data-testid="ordered-categories-add"
          sx={(theme) => ({
            alignSelf: "stretch",
            width: "100%",
            minHeight: 58,
            px: 1.5,
            py: 0.75,
            mt: 0.25,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: alpha(theme.palette.secondary.main, 0.42),
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.background.paper, 0.38),
            color: "text.secondary",
            display: "flex",
            flexDirection: "column",
            gap: 0.15,
            textTransform: "none",
            "&:hover": {
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: "secondary.main",
              bgcolor: alpha(theme.palette.secondary.main, 0.08),
              color: "secondary.light",
            },
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "secondary.main",
              outlineOffset: 3,
            },
          })}
          onClick={() => requestCommit([...categories, createOrderedCategory({ label: `Category ${categories.length + 1}`, order: categories.length })])}
        >
          <AddRoundedIcon aria-hidden="true" sx={{ fontSize: 20 }} />
          <Typography component="span" variant="caption" sx={{ lineHeight: 1.2 }}>
            Add category
          </Typography>
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
