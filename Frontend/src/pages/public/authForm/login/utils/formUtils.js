// Valores iniciales del formulario.
export const initialFormValues = {
  email: '',
  password: '',
};

// Errores iniciales del formulario.
export const initialErrors = {
  email: '',
  password: '',
};

// Maneja los cambios en los campos del formulario.
export const handleFormChange = (e, setFormValues, formValues) => {
  // Extrae el nombre y el valor del campo que cambió.
  const { name, value } = e.target;
  // Actualiza los valores del formulario.
  setFormValues({
    ...formValues,
    [name]: value,
  });
};

