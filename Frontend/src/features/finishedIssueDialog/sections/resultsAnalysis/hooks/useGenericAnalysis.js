import { useEffect, useState } from "react";

import { getFinishedIssueGlobalAnalysis } from "../../../../../services/issue.service.js";

const unwrap = (response) => response && typeof response === "object" && "data" in response ? response.data : response;

export const useGenericAnalysis = (issueId) => {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  useEffect(() => {
    if (!issueId) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }
    let active = true;
    setState({ loading: true, data: null, error: null });
    getFinishedIssueGlobalAnalysis(issueId)
      .then((response) => active && setState({ loading: false, data: unwrap(response), error: null }))
      .catch((error) => active && setState({ loading: false, data: null, error }));
    return () => { active = false; };
  }, [issueId]);
  return state;
};
