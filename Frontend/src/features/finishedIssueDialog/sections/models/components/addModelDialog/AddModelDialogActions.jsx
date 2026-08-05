import { Button, DialogActions } from "@mui/material";

import { addModelDialogActionsSx } from "../../addModelDialog.styles.js";

const AddModelDialogActions = ({ submitDisabled, onClose, onSubmit }) => (
  <DialogActions sx={addModelDialogActionsSx}>
    <Button variant="outlined" color="warning" onClick={onClose}>
      Cancel
    </Button>
    <Button
      variant="outlined"
      color="secondary"
      onClick={onSubmit}
      disabled={submitDisabled}
    >
      Add model
    </Button>
  </DialogActions>
);

export default AddModelDialogActions;
