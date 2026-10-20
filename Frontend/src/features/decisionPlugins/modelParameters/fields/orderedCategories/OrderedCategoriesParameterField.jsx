import { useEffect, useMemo } from "react";
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
  Alert,
  Box,
  Button,
  IconButton,
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

const CategoryRow = ({ category, index, total, disabled, onLabelChange, onMove, onRemove }) => {
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
      data-testid={`ordered-category-${category.categoryId}`}
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
          aria-label={`Preference order ${index}`}
          sx={{
            flexShrink: 0,
            width: 30,
            textAlign: "center",
            fontWeight: "fontWeightBold",
            color: "secondary.main",
          }}
        >
          {index}
        </Typography>
        <TextField
          size="small"
          fullWidth
          label={`Category ${index + 1} label`}
          value={category.label}
          onChange={(event) => onLabelChange(category.categoryId, event.target.value)}
          disabled={disabled}
          inputProps={{ "aria-label": `Category ${index + 1} label` }}
        />
      </Stack>
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

export const OrderedCategoriesParameterField = ({ parameter, value, onChange, error = "", disabled = false }) => {
  const label = parameter?.label || "Ordered categories";
  const categories = useMemo(
    () => normalizeOrderedCategoriesValue(parameter, value),
    [parameter, value]
  );
  useEffect(() => {
    if (JSON.stringify(value ?? []) !== JSON.stringify(categories)) onChange(categories);
  }, [categories, onChange, value]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commit = (nextCategories) =>
    onChange(nextCategories.map((category, order) => ({ ...category, order })));
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((category) => category.categoryId === active.id);
    const newIndex = categories.findIndex((category) => category.categoryId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(categories, oldIndex, newIndex));
  };

  return (
    <Stack spacing={1}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Order starts at 0: least preferred first, most preferred last.
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
                  disabled={disabled}
                  onLabelChange={(categoryId, nextLabel) =>
                    commit(categories.map((item) => item.categoryId === categoryId ? { ...item, label: nextLabel } : item))
                  }
                  onMove={(from, to) => commit(arrayMove(categories, from, to))}
                  onRemove={(categoryId) => commit(categories.filter((item) => item.categoryId !== categoryId))}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      ) : (
        <Typography variant="body2" color="text.secondary">No categories added.</Typography>
      )}
      {!disabled ? (
        <Button
          startIcon={<AddRoundedIcon />}
          variant="outlined"
          color="secondary"
          size="small"
          sx={{ alignSelf: "flex-start" }}
          onClick={() => commit([...categories, createOrderedCategory({ label: `Category ${categories.length + 1}`, order: categories.length })])}
        >
          Add category
        </Button>
      ) : null}
      {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
    </Stack>
  );
};

export default OrderedCategoriesParameterField;
