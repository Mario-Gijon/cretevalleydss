import IssuePagination from "../../../components/IssuePagination/IssuePagination";

const FinishedIssuesPagination = ({ page, pageCount, onChange }) => {
  return (
    <IssuePagination
      page={page}
      pageCount={pageCount}
      onChange={onChange}
      ariaLabel="Finished issues pages"
    />
  );
};

export default FinishedIssuesPagination;
