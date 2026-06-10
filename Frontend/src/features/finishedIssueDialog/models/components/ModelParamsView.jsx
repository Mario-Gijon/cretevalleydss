import { IssueModelParametersView } from "../../../modelParameters";

export const ModelParamsView = ({ parameters, values, leafNames }) => {
  return <IssueModelParametersView parameters={parameters} values={values} leafNames={leafNames} />;
};

export default ModelParamsView;
