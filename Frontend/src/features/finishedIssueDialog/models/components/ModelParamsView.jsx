import { IssueModelParametersView } from "../../../modelParameters";

export const ModelParamsView = ({ parameters, values, parameterContext }) => {
  return (
    <IssueModelParametersView
      parameters={parameters}
      values={values}
      parameterContext={parameterContext}
    />
  );
};

export default ModelParamsView;
