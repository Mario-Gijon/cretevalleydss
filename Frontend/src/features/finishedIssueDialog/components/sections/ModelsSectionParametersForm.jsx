import { Box, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { Pill } from "../shared/FinishedIssueDialogPrimitives";
import {
  clamp,
  ensureArrayLen,
  filterOutWeightsParams,
  toNumberOrEmpty,
} from "../../utils/finishedIssueDialog.utils";

/**
 * Formulario dinamico de parametros para crear un model run.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
const ModelsSectionParametersForm = ({ model, values, setValues, leafNames }) => {
  const theme = useTheme();
  const leafCount = leafNames?.length || 0;

  if (!model) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Select a model to configure its parameters.
      </Typography>
    );
  }

  const params = filterOutWeightsParams(model.parameters);
  if (!Array.isArray(params) || params.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        This model has no parameters.
      </Typography>
    );
  }

  const onChangeNumber = (name, raw, restrictions = {}) => {
    if (raw === "") {
      setValues((prev) => ({ ...prev, [name]: "" }));
      return;
    }

    const number = toNumberOrEmpty(raw);
    if (number === "") {
      setValues((prev) => ({ ...prev, [name]: "" }));
      return;
    }

    setValues((prev) => ({
      ...prev,
      [name]: clamp(number, restrictions.min ?? null, restrictions.max ?? null),
    }));
  };

  const onChangeArrayItem = (name, index, raw, restrictions = {}) => {
    setValues((prev) => {
      const current = Array.isArray(prev?.[name]) ? [...prev[name]] : [];
      const next = ensureArrayLen(current, index + 1, "");

      if (raw === "") next[index] = "";
      else {
        const number = toNumberOrEmpty(raw);
        next[index] =
          number === ""
            ? ""
            : clamp(number, restrictions.min ?? null, restrictions.max ?? null);
      }

      return { ...prev, [name]: next };
    });
  };

  const onChangeFuzzy = (name, index, position, raw, restrictions = {}) => {
    setValues((prev) => {
      const current = Array.isArray(prev?.[name])
        ? prev[name].map((triple) =>
            Array.isArray(triple) ? [...triple] : ["", "", ""]
          )
        : [];

      const next = ensureArrayLen(current, index + 1, ["", "", ""]);
      const triple = Array.isArray(next[index]) ? [...next[index]] : ["", "", ""];

      if (raw === "") triple[position] = "";
      else {
        const number = toNumberOrEmpty(raw);
        triple[position] =
          number === ""
            ? ""
            : clamp(number, restrictions.min ?? null, restrictions.max ?? null);
      }

      next[index] = triple;
      return { ...prev, [name]: next };
    });
  };

  const sumFor = (name) => {
    const arr = values?.[name];
    if (!Array.isArray(arr)) return null;

    const numbers = arr.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    if (numbers.length !== arr.length) return null;

    return numbers.reduce((acc, item) => acc + item, 0);
  };

  return (
    <Stack spacing={2}>
      {params.map((param) => {
        const { name, type, restrictions = {}, default: defaultValue } = param;

        if (
          type === "number" &&
          Array.isArray(restrictions.allowed) &&
          restrictions.allowed.length
        ) {
          const current = values?.[name] ?? defaultValue ?? "";

          return (
            <Stack
              key={param._id || name}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}
              >
                {name}
              </Typography>

              <TextField
                select
                size="small"
                color="info"
                value={current}
                onChange={(event) =>
                  onChangeNumber(name, event.target.value, restrictions)
                }
                sx={{ minWidth: 160 }}
              >
                {restrictions.allowed.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>

              <Tooltip title={`Allowed: ${restrictions.allowed.join(", ")}`} arrow>
                <InfoOutlinedIcon sx={{ fontSize: 18, opacity: 0.8 }} />
              </Tooltip>
            </Stack>
          );
        }

        if (type === "number") {
          const current = values?.[name] ?? defaultValue ?? "";

          return (
            <Stack
              key={param._id || name}
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}
              >
                {name}
              </Typography>

              <TextField
                type="number"
                size="small"
                color="info"
                value={current}
                onChange={(event) =>
                  onChangeNumber(name, event.target.value, restrictions)
                }
                inputProps={{
                  min: restrictions.min ?? undefined,
                  max: restrictions.max ?? undefined,
                  step: restrictions.step ?? 0.1,
                }}
                sx={{ width: 160 }}
              />

              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                {restrictions.min != null || restrictions.max != null
                  ? `range: ${restrictions.min ?? "—"} .. ${restrictions.max ?? "—"}`
                  : ""}
              </Typography>
            </Stack>
          );
        }

        if (type === "array") {
          const length =
            restrictions.length === "matchCriteria"
              ? leafCount
              : typeof restrictions.length === "number"
                ? restrictions.length
                : Array.isArray(defaultValue)
                  ? defaultValue.length
                  : 2;

          const currentValues = ensureArrayLen(
            Array.isArray(values?.[name])
              ? values[name]
              : Array.isArray(defaultValue)
                ? defaultValue
                : [],
            Number(length) || 2,
            ""
          );

          const isInterval =
            Number(length) === 2 &&
            restrictions.length !== "matchCriteria" &&
            !restrictions.sum &&
            restrictions.min != null &&
            restrictions.max != null;

          const sum = restrictions.sum != null ? sumFor(name) : null;

          return (
            <Box key={param._id || name}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.75 }}
                flexWrap="wrap"
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}
                >
                  {name}
                </Typography>

                {restrictions.sum != null ? (
                  <Pill
                    tone={
                      sum != null && Math.abs(sum - restrictions.sum) < 1e-6
                        ? "success"
                        : "warning"
                    }
                  >
                    {sum == null
                      ? `sum: ${restrictions.sum}`
                      : `sum: ${sum.toFixed(4)} / ${restrictions.sum}`}
                  </Pill>
                ) : null}

                {isInterval ? (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    interval [{restrictions.min}..{restrictions.max}]
                  </Typography>
                ) : null}
              </Stack>

              {restrictions.length === "matchCriteria" && leafNames?.length ? (
                <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ pl: 0.25 }}>
                  {leafNames.map((criterionName, index) => (
                    <Stack
                      key={`${name}-${criterionName}-${index}`}
                      spacing={0.5}
                      alignItems="flex-start"
                      sx={{ minWidth: 180 }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                        {criterionName}
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        color="info"
                        value={currentValues[index] ?? ""}
                        onChange={(event) =>
                          onChangeArrayItem(name, index, event.target.value, restrictions)
                        }
                        inputProps={{
                          min: restrictions.min ?? undefined,
                          max: restrictions.max ?? undefined,
                          step: restrictions.step ?? 0.1,
                        }}
                        sx={{ width: 180 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ pl: 0.25 }}
                >
                  <Typography variant="h6" sx={{ m: 0, opacity: 0.85 }}>
                    [
                  </Typography>
                  {currentValues.map((val, index) => (
                    <TextField
                      key={`${name}-${index}`}
                      type="number"
                      size="small"
                      color="info"
                      value={val ?? ""}
                      onChange={(event) =>
                        onChangeArrayItem(name, index, event.target.value, restrictions)
                      }
                      inputProps={{
                        min: restrictions.min ?? undefined,
                        max: restrictions.max ?? undefined,
                        step: restrictions.step ?? 0.1,
                      }}
                      sx={{ width: 120 }}
                    />
                  ))}
                  <Typography variant="h6" sx={{ m: 0, opacity: 0.85 }}>
                    ]
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        }

        if (type === "fuzzyArray") {
          const length =
            restrictions.length === "matchCriteria"
              ? leafCount
              : typeof restrictions.length === "number"
                ? restrictions.length
                : Array.isArray(defaultValue)
                  ? defaultValue.length
                  : 1;

          const count = Number(length) || 1;

          const currentValues =
            Array.isArray(values?.[name]) && values[name].length === count
              ? values[name]
              : Array.from({ length: count }, () => ["", "", ""]);

          return (
            <Box key={param._id || name}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 950,
                  color: "text.secondary",
                  mb: 0.75,
                  minWidth: 130,
                }}
              >
                {name}
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={2} sx={{ pl: 0.25 }}>
                {currentValues.map((triple, index) => (
                  <Box
                    key={`${name}-${index}`}
                    sx={{
                      p: 1.2,
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.10)",
                      bgcolor: alpha(theme.palette.background.paper, 0.06),
                      minWidth: 260,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                      {restrictions.length === "matchCriteria"
                        ? leafNames?.[index] ?? `C${index + 1}`
                        : `#${index + 1}`}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 0.8 }}>
                      {["l", "m", "u"].map((label, position) => (
                        <TextField
                          key={`${name}-${index}-${label}`}
                          type="number"
                          size="small"
                          color="info"
                          label={label}
                          value={Array.isArray(triple) ? triple[position] ?? "" : ""}
                          onChange={(event) =>
                            onChangeFuzzy(
                              name,
                              index,
                              position,
                              event.target.value,
                              restrictions
                            )
                          }
                          inputProps={{
                            min: restrictions.min ?? undefined,
                            max: restrictions.max ?? undefined,
                            step: restrictions.step ?? 0.1,
                          }}
                          sx={{ width: 80 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        }

        return null;
      })}
    </Stack>
  );
};

export default ModelsSectionParametersForm;
