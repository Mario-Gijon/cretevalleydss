import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";
import { useAdminIssueActions } from "./useAdminIssueActions";
import { useAdminIssueDetail } from "./useAdminIssueDetail";
import { useAdminIssuesList } from "./useAdminIssuesList";

/**
 * Gestiona estado, acciones y datos derivados de la seccion Admin Issues.
 *
 * @returns {object}
 */
export const useAdminIssuesSection = () => {
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const list = useAdminIssuesList({ showSnackbarAlert });
  const detail = useAdminIssueDetail({ showSnackbarAlert });
  const actions = useAdminIssueActions({
    showSnackbarAlert,
    issueDetail: detail.issueDetail,
    expertEvaluations: detail.expertEvaluations,
    expertWeights: detail.expertWeights,
    selectedIssueRow: detail.selectedIssueRow,
    issueExpertsProgress: detail.issueExpertsProgress,
    fetchIssuesData: list.fetchIssuesData,
    loadIssueDetail: detail.loadIssueDetail,
    closeDetail: detail.closeDetail,
  });

  const openDetail = async (issueRow) => {
    actions.resetIssueActionState();
    await detail.openDetail(issueRow);
  };

  const closeDetail = () => {
    detail.closeDetail();
    actions.resetIssueActionState();
  };

  return {
    list,
    detail: {
      ...detail,
      openDetail,
      closeDetail,
    },
    actions,
  };
};
