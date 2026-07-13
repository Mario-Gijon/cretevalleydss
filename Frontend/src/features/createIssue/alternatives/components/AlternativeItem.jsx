import { ListItem, ListItemText, IconButton, TextField, Stack, Tooltip } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, CheckRounded as CheckRoundedIcon, CloseRounded as CloseRoundedIcon } from "@mui/icons-material";

export const AlternativeItem = ({
  item,
  editingAlternative,
  editValue,
  setEditValue,
  editDescription,
  setEditDescription,
  setEditError,
  editError,
  handleSaveEdit,
  handleCancelEdit,
  handleEditAlternative,
  handleRemoveAlternative,
}) => {
  return (
    <ListItem
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          {editingAlternative?.id !== item.id && (
            <IconButton
              aria-label="edit"
              title="Edit"
              onClick={() => handleEditAlternative(item)}
            >
              <EditIcon color="warning" />
            </IconButton>
          )}
          <IconButton
            aria-label="delete"
            title="Delete"
            onClick={() => handleRemoveAlternative(item)}
          >
            <DeleteIcon color="error" />
          </IconButton>
        </Stack>
      }
    >
      {editingAlternative?.id === item.id ? (
        <Stack spacing={1} sx={{ width: "100%", pr: { xs: 0, sm: 8 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} alignItems="stretch">
          <TextField variant="outlined" size="small" value={editValue} fullWidth
            onChange={(e) => { setEditValue(e.target.value); setEditError(null); }}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); handleCancelEdit(); } }}
            error={!!editError} helperText={editError} color="info" inputProps={{ maxLength: 60 }} autoFocus />
          <Stack direction="row" spacing={0.25} sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}>
            <Tooltip title="Save changes"><IconButton aria-label="Save changes" onClick={handleSaveEdit} size="medium" color="success"><CheckRoundedIcon /></IconButton></Tooltip>
            <Tooltip title="Cancel editing"><IconButton aria-label="Cancel editing" onClick={handleCancelEdit} size="medium" color="warning"><CloseRoundedIcon /></IconButton></Tooltip>
          </Stack>
          </Stack>
          <TextField variant="outlined" size="small" multiline minRows={2} maxRows={5}
            value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); handleCancelEdit(); } }}
            color="info" inputProps={{ maxLength: 500 }} helperText={`${editDescription.length} / 500`} fullWidth />
        </Stack>
      ) : (
        <ListItemText
          primary={item.name}
          secondary={item.description || null}
          sx={{
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "normal",
            maxWidth: "calc(100% - 96px)",
          }}
          secondaryTypographyProps={{
            sx: { whiteSpace: "pre-wrap", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden" },
          }}
        />
      )}
    </ListItem>
  );
};
