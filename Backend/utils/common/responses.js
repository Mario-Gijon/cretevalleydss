export const buildApiResponse = ({
  success,
  message,
  data = null,
  error = null,
}) => {
  if (success) {
    return {
      success: true,
      message,
      data: data ?? null,
    };
  }

  return {
    success: false,
    message,
    data: null,
    error: error ?? null,
  };
};

export const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res
    .status(statusCode)
    .json(
      buildApiResponse({
        success: true,
        message,
        data,
      })
    );
};