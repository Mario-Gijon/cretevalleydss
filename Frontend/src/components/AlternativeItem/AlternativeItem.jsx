import { ListItem, ListItemText, IconButton, TextField, Stack } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

export const AlternativeItem = ({
  item,
  editingAlternative,
  editValue,
  setEditValue,
  setEditError,
  editError,
  handleSaveEdit,
  handleEditAlternative,
  handleRemoveAlternative,
}) => {
  return (
    <ListItem
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          {editingAlternative !== item && (
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
      {editingAlternative === item ? (
        <TextField
          variant="outlined"
          size="small"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setEditError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
          error={!!editError}
          helperText={editError}
          color="secondary"
          InputProps={{
            endAdornment: (
              <IconButton onClick={handleSaveEdit} color="secondary" size="small">
                <EditIcon color="warning" />
              </IconButton>
            ),
          }}
          autoFocus
          sx={{ width: "97%" }}
        />
      ) : (
        <ListItemText
          primary={item}
          sx={{
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "normal",
            maxWidth: "calc(100% - 96px)", // Ajustar ancho para los botones
          }}
        />
      )}
    </ListItem>
  );
};