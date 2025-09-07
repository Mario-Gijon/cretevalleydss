// Helper para formatear números: solo permite 0-1 y 2 decimales
export const handleNumberInput = (value) => {
  if (value === "" || value === null || value === undefined) return "";

  // Siempre lo tratamos como string
  let strValue = value.toString();

  // Limitar a números con hasta 2 decimales
  strValue = strValue.replace(/[^0-9.]/g, ""); // Solo dígitos y punto
  const parts = strValue.split(".");
  if (parts.length > 2) {
    strValue = parts[0] + "." + parts.slice(1).join("");
  }
  if (parts[1]?.length > 2) {
    strValue = parts[0] + "." + parts[1].slice(0, 2);
  }

  return strValue;
};
