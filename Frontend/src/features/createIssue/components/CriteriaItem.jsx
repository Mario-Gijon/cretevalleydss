import { Chip, Collapse, IconButton, List, ListItem, ListItemText, MenuItem, Select, Stack, TextField } from "@mui/material";
import { Fragment } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EditIcon from "@mui/icons-material/Edit";

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
}) => {

  const hasChildren = item.children && item.children.length > 0;
  const isFirstLevel = level === 0;

  return (
    <>
      <ListItem key={item.name} sx={{ pl: { xs: 0, sm: level * 2 + 2 } }}>
        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {editingCriterion?.name === item.name ? (
                <>
                  <TextField
                    variant="standard"
                    value={editCriterionValue}
                    onChange={(e) => setEditCriterionValue(e.target.value)}
                    onBlur={!editBlur && handleSaveCriterionEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCriterionEdit();
                    }}
                    autoFocus
                    fullWidth
                    color="secondary"
                    error={!!editCriterionError}
                    helperText={editCriterionError}
                    InputProps={{
                      endAdornment: (
                        <IconButton onClick={handleSaveCriterionEdit} color="secondary" size="small">
                          <EditIcon color="warning" />
                        </IconButton>
                      ),
                    }}
                  />
                  {isFirstLevel && showCriterionTypes ? (
                    <Select
                      value={editCriterionType}
                      onChange={(e) => setEditCriterionType(e.target.value)}
                      onBlur={handleSaveCriterionEdit}
                      onClick={() => setEditBlur(false)}
                      size="small"
                      sx={{ minWidth: 100 }}
                    >
                      <MenuItem value="cost">Cost</MenuItem>
                      <MenuItem value="benefit">Benefit</MenuItem>
                    </Select>
                  ) : null}
                </>
              ) : (
                <>
                  <span>{item.name}</span>
                  {isFirstLevel && showCriterionTypes ? (
                    <Chip
                      variant="outlined"
                      label={item.type === "cost" ? "Cost" : "Benefit"}
                      color={item.type === "cost" ? "error" : "success"}
                      size="small"
                    />
                  ) : null}
                </>
              )}
            </Stack>
          }
        />
        {hasChildren && (
          <IconButton onClick={() => handleToggle(item.name)}>
            {openItems[item.name] ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
        <Stack direction={"row"} spacing={0.5}>
          <IconButton edge="end" aria-label="add child" onClick={() => { setSelectedParent(item); setOpenDialog(true); }}>
            <AddCircleIcon color="info" />
          </IconButton>
          <IconButton edge="end" aria-label="edit" onClick={() => handleEditCriterion(item)} title="Edit">
            <EditIcon color="warning" />
          </IconButton>
          <IconButton edge="end" aria-label="delete" title="Delete" onClick={() => handleRemoveCriteria(item)}>
            <DeleteIcon color="error" />
          </IconButton>
        </Stack>
      </ListItem>

      {hasChildren && (
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
                />
              </Fragment>
            ))}
          </List>
        </Collapse >
      )}
    </>
  );
};
