import { Box, Pagination } from "@mui/material";

const FinishedIssuesPagination = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null;

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 1.25 }}>
      <Pagination
        page={page}
        count={pageCount}
        size="small"
        color="secondary"
        shape="rounded"
        aria-label="Finished issues pages"
        onChange={(_event, nextPage) => onChange(nextPage)}
      />
    </Box>
  );
};

export default FinishedIssuesPagination;
