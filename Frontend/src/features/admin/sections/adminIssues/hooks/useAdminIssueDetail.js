import { useEffect, useMemo, useState } from "react";

import {
  getIssueByIdAdmin,
  getIssueExpertEvaluations,
  getIssueExpertsProgress,
  getIssueExpertWeights,
} from "../../../../../services/admin.service";
import { pickInitialAdminIssueExpertId } from "../logic/buildAdminIssueDetailView";

export const useAdminIssueDetail = ({ showSnackbarAlert }) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedIssueRow, setSelectedIssueRow] = useState(null);
  const [issueDetail, setIssueDetail] = useState(null);
  const [issueExpertsProgress, setIssueExpertsProgress] = useState([]);

  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [expertEvalLoading, setExpertEvalLoading] = useState(false);
  const [expertEvaluations, setExpertEvaluations] = useState(null);
  const [expertWeights, setExpertWeights] = useState(null);
  const [showExpertCollective, setShowExpertCollective] = useState(false);

  const loadIssueDetail = async (issueId, issueRow = null) => {
    if (!issueId) return;

    setDetailLoading(true);
    setExpertEvaluations(null);
    setExpertWeights(null);

    try {
      const [detailRes, progressRes] = await Promise.all([
        getIssueByIdAdmin(issueId),
        getIssueExpertsProgress(issueId),
      ]);

      if (!detailRes?.success) {
        showSnackbarAlert(detailRes?.message || "Error fetching issue detail", "error");
        return;
      }

      if (!progressRes?.success) {
        showSnackbarAlert(progressRes?.message || "Error fetching issue progress", "error");
        return;
      }

      setSelectedIssueRow(issueRow || null);
      setIssueDetail(detailRes?.data?.issue || null);

      const progressRows = Array.isArray(progressRes?.data?.experts)
        ? progressRes.data.experts
        : [];
      setIssueExpertsProgress(progressRows);

      const initialExpertId = pickInitialAdminIssueExpertId(progressRows);
      setSelectedExpertId((prev) => {
        if (prev && progressRows.some((row) => row?.expert?.id === prev)) {
          return prev;
        }
        return initialExpertId;
      });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching issue detail", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (issueRow) => {
    setDetailOpen(true);
    setDetailTab(0);
    await loadIssueDetail(issueRow?.id, issueRow);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailTab(0);
    setSelectedIssueRow(null);
    setIssueDetail(null);
    setIssueExpertsProgress([]);
    setSelectedExpertId("");
    setExpertEvaluations(null);
    setExpertWeights(null);
    setShowExpertCollective(false);
  };

  useEffect(() => {
    const run = async () => {
      if (!detailOpen || !issueDetail?.id || !selectedExpertId) {
        setExpertEvaluations(null);
        setExpertWeights(null);
        return;
      }

      setExpertEvalLoading(true);

      try {
        const [evalRes, weightsRes] = await Promise.all([
          getIssueExpertEvaluations(issueDetail.id, selectedExpertId),
          getIssueExpertWeights(issueDetail.id, selectedExpertId),
        ]);

        if (!evalRes?.success) {
          showSnackbarAlert(evalRes?.message || "Error fetching expert evaluations", "error");
          setExpertEvaluations(null);
        } else {
          setExpertEvaluations(evalRes?.data || null);
        }

        if (!weightsRes?.success) {
          showSnackbarAlert(weightsRes?.message || "Error fetching expert weights", "error");
          setExpertWeights(null);
        } else {
          setExpertWeights(weightsRes?.data || null);
        }
      } catch (err) {
        console.error(err);
        showSnackbarAlert("Unexpected error fetching expert review", "error");
        setExpertEvaluations(null);
        setExpertWeights(null);
      } finally {
        setExpertEvalLoading(false);
      }
    };

    run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, issueDetail?.id, selectedExpertId]);

  const selectedExpertProgress = useMemo(() => {
    return (
      issueExpertsProgress.find((row) => row?.expert?.id === selectedExpertId) ||
      null
    );
  }, [issueExpertsProgress, selectedExpertId]);

  useEffect(() => {
    setShowExpertCollective(false);
  }, [selectedExpertId, expertEvaluations?.issue?.id]);

  return {
    detailOpen,
    detailTab,
    detailLoading,
    selectedIssueRow,
    issueDetail,
    issueExpertsProgress,
    selectedExpertId,
    expertEvalLoading,
    expertEvaluations,
    expertWeights,
    showExpertCollective,
    selectedExpertProgress,
    loadIssueDetail,
    openDetail,
    closeDetail,
    setDetailTab,
    setSelectedExpertId,
    setShowExpertCollective,
  };
};
