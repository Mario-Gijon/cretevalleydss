import { useMemo } from "react";
import {
  Stack, Typography, ToggleButton, TextField, MenuItem,
  ButtonGroup, Button
} from "@mui/material";
import { handleNumberInput } from "../../utils/handleTwoDecimals";
import { getLeafCriteria } from "../../utils/createIssueUtils";

export const ModelParameters = ({ selectedModel, allData, paramValues, setParamValues, defaultModelParams, setDefaultModelParams, handleDefaultChange, weightingMode, setWeightingMode, bwmData, setBwmData }) => {

  // Criterios HOJA para pesos y fuzzy arrays
  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);


  // util: asegurar longitud para arrays basados en criterios
  const ensureLength = (arr, len, filler = "") => {
    const a = Array.isArray(arr) ? [...arr] : [];
    if (a.length < len) return [...a, ...Array(len - a.length).fill(filler)];
    if (a.length > len) return a.slice(0, len);
    return a;
  };

  // fuzzy helper (mismo comportamiento que tenías)
  const handleFuzzyInput = (value, min = 0, max = 1) => {
    if (value === "") return "";
    if (value === "0." || value === ".") return value;
    let num = parseFloat(value);
    if (isNaN(num)) return "";
    if (num < min) num = min;
    if (num > max) num = max;
    return num;
  };

  const renderBWMSelection = () => {
    const criteria = leafCriteria;

    return (
      <Stack spacing={2}>

        {/* Paso 1: Mejor criterio */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">Best (most important):</Typography>
          <TextField
            select
            size="small"
            color="info"
            value={bwmData.best}
            onChange={(e) =>
              setBwmData((prev) => ({ ...prev, best: e.target.value }))
            }
          >
            {criteria.map((c, i) => (
              <MenuItem key={i} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Paso 2: Peor criterio */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">Worst (least important):</Typography>
          <TextField
            select
            size="small"
            color="info"
            value={bwmData.worst}
            onChange={(e) =>
              setBwmData((prev) => ({ ...prev, worst: e.target.value }))
            }
          >
            {criteria.map((c, i) => (
              <MenuItem key={i} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Paso 3: Comparar el Best con los demás */}
        {bwmData.best && (
          <Stack spacing={1}>
            <Typography variant="body2">
              Compare the <b>Best ({bwmData.best})</b> with others (1–9)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {criteria
                .filter((c) => c.name !== bwmData.best)
                .map((c) => (
                  <Stack key={c.name} spacing={0.5} alignItems="center">
                    <Typography variant="caption">{`B/${c.name}`}</Typography>
                    <TextField
                      color="info"
                      type="number"
                      size="small"
                      value={bwmData.bestToOthers[c.name] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setBwmData((prev) => ({
                          ...prev,
                          bestToOthers: { ...prev.bestToOthers, [c.name]: val },
                        }));
                      }}
                      inputProps={{ min: 1, max: 9 }}
                      sx={{ width: 60 }}
                    />
                  </Stack>
                ))}
            </Stack>
          </Stack>
        )}

        {/* Paso 4: Comparar los demás con el Worst */}
        {bwmData.worst && (
          <Stack spacing={1}>
            <Typography variant="body2">
              Compare others with the <b>Worst ({bwmData.worst})</b> (1–9)
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {criteria
                .filter((c) => c.name !== bwmData.worst)
                .map((c) => (
                  <Stack key={c.name} spacing={0.5} alignItems="center">
                    <Typography variant="caption">{`${c.name}/W`}</Typography>
                    <TextField
                      type="number"
                      size="small"
                      color="info"
                      value={bwmData.othersToWorst[c.name] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setBwmData((prev) => ({
                          ...prev,
                          othersToWorst: { ...prev.othersToWorst, [c.name]: val },
                        }));
                      }}
                      inputProps={{ min: 1, max: 9 }}
                      sx={{ width: 60 }}
                    />
                  </Stack>
                ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    );
  };


  return (
    <Stack spacing={2}>
      {/* Header con Default */}
      <Stack direction={"row"} spacing={2} sx={{ mb: 2 }} alignItems={"center"}>
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Model parameters:
        </Typography>

        <ToggleButton
          value="default"
          selected={defaultModelParams}
          onChange={handleDefaultChange}
          color="secondary"
          size="small"
        >
          Default
        </ToggleButton>
      </Stack>

      {/* Render de parámetros */}
      <Stack gap={3} direction={{ xs: "column", md: "row" }} flexWrap={"wrap"}>
        {selectedModel.parameters.map((param) => {
          const { name, type, restrictions, default: defaultValue } = param;

          // === NUMBER con allowed ===
          if (type === "number" && restrictions?.allowed) {
            return (
              <Stack key={param._id} direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">{name}:</Typography>
                <TextField
                  select
                  size="small"
                  value={paramValues[name] ?? defaultValue ?? ""}
                  onChange={(e) => {
                    setParamValues((prev) => ({
                      ...prev,
                      [name]: handleNumberInput(e.target.value),
                    }));
                    if (defaultModelParams) setDefaultModelParams(false);
                  }}
                  inputProps={{ min: 0, max: 1, step: 0.1 }}
                  sx={{ minWidth: 80 }}
                >
                  {restrictions.allowed.map((val) => (
                    <MenuItem key={val} value={val}>
                      {val}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            );
          }

          // === NUMBER libre ===
          if (type === "number") {
            return (
              <Stack key={param._id} direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">{name}:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={paramValues[name] ?? defaultValue ?? ""}
                  onChange={(e) => {
                    setParamValues((prev) => ({
                      ...prev,
                      [name]: handleNumberInput(e.target.value),
                    }));
                    if (defaultModelParams) setDefaultModelParams(false);
                  }}
                  inputProps={{
                    min: restrictions?.min ?? 0,
                    max: restrictions?.max ?? 1,
                    step: 0.1,
                  }}
                  sx={{ maxWidth: 80 }}
                />
              </Stack>
            );
          }

          // === ARRAY (intervalos o pesos) ===
          if (type === "array") {
            const length =
              restrictions?.length === "matchCriteria"
                ? leafCriteria.length // <-- ahora sí: criterios HOJA
                : restrictions?.length || 2;

            const currentValues = ensureLength(
              paramValues[name] ?? defaultValue ?? [],
              length,
              ""
            );

            const isInterval =
              restrictions?.min !== null &&
              restrictions?.max !== null &&
              !restrictions?.sum &&
              restrictions?.length !== "matchCriteria";

            // Intervalo [a, b, ...]
            if (isInterval) {
              return (
                <Stack key={param._id} spacing={1} direction={"row"} alignItems={"center"}>
                  <Typography variant="body1">{name}:</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h5">[</Typography>
                    {currentValues.map((val, i) => (
                      <TextField
                        color="info"
                        key={i}
                        type="number"
                        size="small"
                        value={val}
                        onChange={(e) => {
                          const newValues = [...currentValues];
                          newValues[i] = handleNumberInput(e.target.value);
                          setParamValues((prev) => ({
                            ...prev,
                            [name]: newValues,
                          }));
                          if (defaultModelParams) setDefaultModelParams(false);
                        }}
                        inputProps={{
                          min: restrictions?.min ?? 0,
                          max: restrictions?.max ?? 1,
                          step: 0.1,
                        }}
                        sx={{ width: 80 }}
                      />
                    ))}
                    <Typography variant="h5">]</Typography>
                  </Stack>
                </Stack>
              );
            }

            // Pesos (por criterio hoja). Mantiene tu botón group.
            return (
              <Stack key={param._id} spacing={1} alignItems={"flex-start"}>
                <Stack pb={1} direction={"row"} spacing={2} alignItems={"center"}>
                  <Typography variant="body1">{name}:</Typography>

                  {name === "weights" && (
                    leafCriteria.length >= 2 && (
                      <ButtonGroup color="secondary" size="small">
                        <Button
                          key="manual"
                          variant={weightingMode === "manual" ? "contained" : "outlined"}
                          onClick={() => setWeightingMode?.("manual")}
                        >
                          Manual
                        </Button>
                        <Button
                          key="consensus"
                          variant={weightingMode === "consensus" ? "contained" : "outlined"}
                          onClick={() => setWeightingMode?.("consensus")}
                        >
                          Consensus
                        </Button>
                        <Button
                          key="bwm"
                          variant={weightingMode === "bwm" ? "contained" : "outlined"}
                          onClick={() => setWeightingMode?.("bwm")}
                        >
                          BWM
                        </Button>
                        <Button
                          key="consensusBwm"
                          variant={weightingMode === "consensusBwm" ? "contained" : "outlined"}
                          onClick={() => setWeightingMode?.("consensusBwm")}
                        >
                          Consensus BWM
                        </Button>
                        <Button
                          key="simulatedConsensusBwm"
                          variant={weightingMode === "simulatedConsensusBwm" ? "contained" : "outlined"}
                          onClick={() => setWeightingMode?.("simulatedConsensusBwm")}
                        >
                          Simulated consensus BWM
                        </Button>
                      </ButtonGroup>
                    )
                  )}

                </Stack>

                {leafCriteria.length === 1 ? (
                  // Caso especial: solo un criterio
                  <Stack spacing={1} alignItems="flex-start">
                    <Typography variant="body2">
                      Since there is only one criterion, its weight is fixed to <b>1</b>.
                    </Typography>
                  </Stack>
                ) : weightingMode === "manual" ? (
                  // Modo manual: permite editar los pesos
                  <Stack direction="row" flexWrap="wrap" gap={2}>
                    {leafCriteria.map((crit, i) => (
                      <Stack key={i} spacing={0.5} alignItems="center">
                        <Typography variant="caption">{crit?.name ?? `C${i + 1}`}</Typography>
                        <TextField
                          type="number"
                          color="info"
                          size="small"
                          value={currentValues[i] ?? ""}
                          onChange={(e) => {
                            const newValues = [...currentValues];
                            newValues[i] = handleNumberInput(e.target.value);
                            setParamValues((prev) => ({ ...prev, [name]: newValues }));
                            if (defaultModelParams) setDefaultModelParams(false);
                          }}
                          inputProps={{ min: 0, max: 1, step: 0.1 }}
                          sx={{ width: 80 }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                ) : weightingMode === "bwm" ? (
                  renderBWMSelection()
                ) : weightingMode === "consensusBwm" ? (
                  <Typography variant="body2" fontStyle="italic" color="text.secondary">
                    The weight selection process will not be configured now.
                    Experts will participate in one or more consensus rounds to determine the final weights.
                  </Typography>
                ) : weightingMode === "simulatedConsensusBwm" ? (
                  <Typography variant="body2" fontStyle="italic" color="text.secondary">
                    All experts will provide their preferences for the criteria using the BWM method. The system will then simulate consensus rounds, aggregating these preferences step by step until stable final weights are reached.
                  </Typography>

                ) : weightingMode === "consensus" ? (
                  <Typography variant="body2" fontStyle="italic" color="text.secondary">
                    All experts will assign weights to the criteria. Simulated consensus rounds will be performed until final weights is reached.
                  </Typography>
                ) : null}
              </Stack>
            );
          }

          // === FUZZY ARRAY (usa criterios HOJA) ===
          if (type === "fuzzyArray") {
            const length =
              restrictions?.length === "matchCriteria"
                ? leafCriteria.length
                : restrictions?.length || 1;

            const currentValues =
              (paramValues[name] &&
                Array.isArray(paramValues[name]) &&
                paramValues[name].length === length
                ? paramValues[name]
                : Array.from({ length }, () => ["", "", ""]));

            return (
              <Stack key={param._id} spacing={1}>
                <Typography variant="body1">{name}:</Typography>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                  {currentValues.map((triple, i) => (
                    <Stack key={i} spacing={0.5} alignItems="center">
                      <Typography variant="caption">
                        {leafCriteria[i]?.name ?? `C${i + 1}`}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {["l", "m", "u"].map((label, j) => (
                          <TextField
                            key={j}
                            type="number"
                            size="small"
                            label={label}
                            value={triple[j]}
                            onChange={(e) => {
                              const newTriples = currentValues.map((t) => [...t]);
                              newTriples[i][j] = handleFuzzyInput(
                                e.target.value,
                                restrictions?.min ?? 0,
                                restrictions?.max ?? 1
                              );
                              setParamValues((prev) => ({
                                ...prev,
                                [name]: newTriples,
                              }));
                              if (defaultModelParams) setDefaultModelParams(false);
                            }}
                            inputProps={{
                              min: restrictions?.min ?? 0,
                              max: restrictions?.max ?? 1,
                              step: 0.1,
                            }}
                            sx={{ width: 80 }}
                          />
                        ))}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            );
          }

          return null;
        })}
      </Stack>
    </Stack>
  );
};