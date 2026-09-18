import IssuePagination from "../../../components/IssuePagination/IssuePagination";

const FinishedIssuesPagination = ({ page, pageCount, onChange, sx }) => {
  return (
    <IssuePagination
      page={page}
      pageCount={pageCount}
      onChange={onChange}
      ariaLabel="Finished issues pages"
      sx={sx}
    />
  );
};

export default FinishedIssuesPagination;
