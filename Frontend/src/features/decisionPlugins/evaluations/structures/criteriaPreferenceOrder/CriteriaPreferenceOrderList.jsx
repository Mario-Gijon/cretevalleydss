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
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const getCriterionName = (criterion) => criterion.name || criterion.id;

const CriteriaPreferenceOrderRow = ({
  criterion,
  index,
  total,
  editable,
  onMove,
  onRemove,
}) => {
  const theme = useTheme();
  const criterionName = getCriterionName(criterion);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: criterion.id,
    disabled: !editable,
  });

  return (
    <Box
      ref={setNodeRef}
      role="listitem"
      data-testid={`criteria-preference-row-${criterion.id}`}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 0.85,
        minWidth: 0,
        px: 0.75,
        py: 0.65,
        borderBottom: index < total - 1 ? 1 : 0,
        borderColor: "divider",
        bgcolor: isDragging
          ? alpha(theme.palette.secondary.main, 0.16)
          : "transparent",
        boxShadow: isDragging
          ? `0 8px 20px ${alpha(theme.palette.common.black, 0.24)}`
          : "none",
        opacity: isDragging ? 0.72 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : "auto",
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
        },
      }}
    >
      {editable ? (
        <Tooltip title={`Drag ${criterionName} to reorder`}>
          <IconButton
            ref={setActivatorNodeRef}
            size="small"
            aria-label={`Drag ${criterionName} to reorder`}
            {...attributes}
            {...listeners}
            sx={{
              flexShrink: 0,
              cursor: isDragging ? "grabbing" : "grab",
              color: isDragging ? "secondary.main" : "text.secondary",
              touchAction: "none",
              "&:hover": { color: "secondary.main" },
            }}
          >
            <DragIndicatorRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      <Box
        aria-label={`Rank ${index + 1}`}
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: 1,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          color: "secondary.main",
          fontWeight: "fontWeightBold",
          fontSize: "0.8125rem",
        }}
      >
        {index + 1}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere", fontWeight: "fontWeightMedium" }}>
          {criterionName}
        </Typography>
        {isFirst ? <Typography variant="caption" color="secondary.main">Most important</Typography> : null}
        {isLast && total > 1 ? <Typography variant="caption" color="text.secondary">Least important</Typography> : null}
      </Box>

      {editable ? (
        <Stack direction="row" spacing={0.1} flexShrink={0}>
          <Tooltip title={`Move ${criterionName} up`}>
            <span>
              <IconButton size="small" disabled={isFirst} aria-label={`Move ${criterionName} up`} onClick={() => onMove(index, -1)}>
                <KeyboardArrowUpRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Move ${criterionName} down`}>
            <span>
              <IconButton size="small" disabled={isLast} aria-label={`Move ${criterionName} down`} onClick={() => onMove(index, 1)}>
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Remove ${criterionName} from ranking`}>
            <IconButton size="small" aria-label={`Remove ${criterionName} from ranking`} onClick={() => onRemove(criterion.id)}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
    </Box>
  );
};

const CriteriaPreferenceOrderList = ({ criteria, onChange, onMove, onRemove, readOnly = false }) => {
  const theme = useTheme();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const editable = readOnly !== true;

  const handleDragEnd = ({ active, over }) => {
    if (!editable || !over || active.id === over.id) return;

    const previousIndex = criteria.findIndex((criterion) => criterion.id === active.id);
    const nextIndex = criteria.findIndex((criterion) => criterion.id === over.id);

    if (previousIndex < 0 || nextIndex < 0) return;

    onChange(arrayMove(criteria, previousIndex, nextIndex));
  };

  const rows = criteria.map((criterion, index) => (
    <CriteriaPreferenceOrderRow
      key={criterion.id}
      criterion={criterion}
      index={index}
      total={criteria.length}
      editable={editable}
      onMove={onMove}
      onRemove={onRemove}
    />
  ));

  const list = (
    <Box role="list" aria-label="Ranked criteria" sx={{ overflow: "hidden", border: 1, borderColor: "divider", borderRadius: 1.5, bgcolor: alpha(theme.palette.background.paper, 0.32) }}>
      {rows}
    </Box>
  );

  if (!editable) return list;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={criteria.map((criterion) => criterion.id)} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
};

export default CriteriaPreferenceOrderList;
