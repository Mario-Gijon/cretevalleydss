import { Box, Pagination } from "@mui/material";

const paginationItemSx = {
  minWidth: { xs: 32, sm: 36, md: 38 },
  height: { xs: 32, sm: 36, md: 38 },
  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
};

/**
 * Shared pagination presentation for issue listings.
 *
 * Page-specific components keep ownership of their labels and positioning,
 * while this component keeps the controls visually consistent.
 */
const IssuePagination = ({
  page,
  pageCount,
  onChange,
  ariaLabel,
  sx,
}) => {
  if (pageCount <= 1) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mt: 1.25,
        ...sx,
      }}
    >
      <Pagination
        page={page}
        count={pageCount}
        size="small"
        color="secondary"
        shape="rounded"
        aria-label={ariaLabel}
        onChange={(_, nextPage) => onChange(nextPage)}
        sx={{
          "& .MuiPaginationItem-root": paginationItemSx,
          "& .MuiPaginationItem-root.Mui-focusVisible": {
            outline: "2px solid",
            outlineColor: "secondary.main",
            outlineOffset: 2,
          },
          "& .MuiPaginationItem-icon": {
            fontSize: { xs: "1.25rem", sm: "1.4rem" },
          },
        }}
      />
    </Box>
  );
};

export default IssuePagination;
