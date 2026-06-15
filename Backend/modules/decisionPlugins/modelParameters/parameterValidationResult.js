export const toInvalid = (message, value) => ({
  ok: false,
  message,
  value,
});

export const toValid = (value) => ({ ok: true, value });
