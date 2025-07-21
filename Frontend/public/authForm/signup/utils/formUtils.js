// Valores iniciales del formulario
export const initialFormValues = {
  name: '',
  university: '',
  email: '',
  password: '',
  repeatPassword: '',
};

// Errores iniciales del formulario
export const initialErrors = {
  name: '',
  university: '',
  email: '',
  password: '',
  repeatPassword: '',
};

// Maneja los cambios en los campos del formulario
export const handleFormChange = (e, setFormValues, formValues) => {
  // Obtiene el nombre y el valor del campo que cambió
  const { name, value } = e.target;
  // Actualiza los valores del formulario
  setFormValues({
    ...formValues,
    [name]: value,
  });
};
