import { IssueModelParametersView } from "../../../modelParameters";

export const ModelParamsView = ({ parameters, values, context }) => {
  return <IssueModelParametersView parameters={parameters} values={values} context={context} />;
};

export default ModelParamsView;
