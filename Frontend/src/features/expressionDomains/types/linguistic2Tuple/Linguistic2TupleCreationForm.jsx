import OrderedLinguisticCreationForm from "../shared/OrderedLinguisticCreationForm";

export const Linguistic2TupleCreationForm = (props) => (
  <OrderedLinguisticCreationForm
    {...props}
    typeKey="linguistic2Tuple"
    minimumLabelCount={3}
    guidance="A linguistic 2-tuple term set must contain an odd number of ordered labels: 3, 5, 7, …"
  />
);

export default Linguistic2TupleCreationForm;
