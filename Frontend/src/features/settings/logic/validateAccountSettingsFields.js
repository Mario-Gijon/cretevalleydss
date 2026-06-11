export const validateUniversity = (university) => {
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(university)) {
    return "Only letters and spaces, min 2, max 25.";
  }
  return "";
};

export const validateName = (name) => {
  if (!/^[a-zA-ZÀ-ÿ ]{2,25}$/.test(name)) {
    return "Only letters and spaces, min 2, max 25.";
  }
  return "";
};

export const validateEmail = (email) => {
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return "Invalid email.";
  }
  return "";
};

export const validatePassword = (password) => {
  const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/;
  if (!passwordPattern.test(password)) {
    return "1 number, 1 letter, min 6.";
  }
  return "";
};
