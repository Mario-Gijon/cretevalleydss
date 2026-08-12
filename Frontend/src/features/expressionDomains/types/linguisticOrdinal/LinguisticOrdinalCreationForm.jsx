import OrderedLinguisticCreationForm from "../shared/OrderedLinguisticCreationForm";

export const LinguisticOrdinalCreationForm = (props) => (
  <OrderedLinguisticCreationForm
    {...props}
    typeKey="linguisticOrdinal"
    minimumLabelCount={2}
  />
);

export default LinguisticOrdinalCreationForm;
