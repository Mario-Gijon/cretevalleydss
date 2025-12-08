import { Typography, Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack, Divider, } from "@mui/material";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { useIssuesDataContext } from "../../context/issues/issues.context";
import { getLeafCriteria, getMixedOrValue } from "../../utils/createIssueUtils";

export const DomainAssignments = ({ allData, expressionDomains, domainAssignments, setDomainAssignments, }) => {
  const { addedExperts, alternatives, criteria, selectedModel } = allData;

  const { globalDomains } = useIssuesDataContext();

  const leafCriteria = getLeafCriteria(criteria);
  const supportsNumeric = !!selectedModel?.supportedDomains?.numeric?.enabled;
  const supportsLinguistic = !!selectedModel?.supportedDomains?.linguistic?.enabled;

  // Opciones del select según soporte del modelo
  const domainOptions = [];
  if (supportsNumeric) {
    globalDomains.filter((d) => d.type === "numeric").forEach((d) =>
      domainOptions.push({ value: d._id, label: d.name })
    );
  }
  if (supportsLinguistic) {
    [...globalDomains.filter((d) => d.type === "linguistic"), ...expressionDomains].forEach((d) =>
      domainOptions.push({ value: d._id, label: d.name })
    );
  }

  // 📌 Propagaciones (global / por alternativa / por criterio / individual)
  const assignValue = (path, value) => {
    setDomainAssignments((prev) => {
      const updated = structuredClone(prev || { experts: {} });

      if (path[0] === "experts") {
        const exp = path[1];
        const alt = path[3];
        const crit = path[5];
        updated.experts[exp].alternatives[alt].criteria[crit] = value;
      }

      if (path[0] === "criteria") {
        const crit = path[1];
        Object.keys(updated.experts).forEach((exp) => {
          Object.keys(updated.experts[exp].alternatives).forEach((alt) => {
            updated.experts[exp].alternatives[alt].criteria[crit] = value;
          });
        });
      }

      if (path[0] === "alternatives") {
        const alt = path[1];
        Object.keys(updated.experts).forEach((exp) => {
          leafCriteria.forEach((crit) => {
            updated.experts[exp].alternatives[alt].criteria[crit.name] = value;
          });
        });
      }

      if (path[0] === "global") {
        Object.keys(updated.experts).forEach((exp) => {
          Object.keys(updated.experts[exp].alternatives).forEach((alt) => {
            leafCriteria.forEach((crit) => {
              updated.experts[exp].alternatives[alt].criteria[crit.name] = value;
            });
          });
        });
      }

      return updated;
    });
  };

  // 🎛️ Select con fallback visible y robusto
  const renderSelect = (path, values, isSingle = false) => {
    let currentValue = getMixedOrValue(values);

    // Nunca debe ser "mixed" para celdas individuales
    if (isSingle && currentValue === "mixed" && values.length === 1) {
      currentValue = values[0];
    }

    // Fallback según soporte del modelo
    const fallback =
      supportsNumeric
        ? globalDomains.find((d) => d.type === "numeric" && d.numericRange?.min === 0 && d.numericRange?.max === 1)?._id
        : supportsLinguistic
          ? ([...globalDomains.filter((d) => d.type === "linguistic"), ...expressionDomains][0]?._id)
          : "undefined";

    let effectiveValue = currentValue ?? fallback; // usa nullish coalescing por claridad

    const validValues = domainOptions.map((o) => o.value);

    // ⛳️ IMPORTANTE: si es "mixed", NO tocarlo (queremos mostrarlo)
    if (effectiveValue !== "mixed" && !validValues.includes(effectiveValue)) {
      effectiveValue = validValues[0] || "undefined";
    }

    return (
      <Select
        size="small"
        value={effectiveValue}
        onChange={(e) => assignValue(path, e.target.value)}
        sx={{
          fontStyle: effectiveValue === "mixed" ? "italic" : "normal",
          color:
            effectiveValue === "mixed"
              ? "info.main"
              : effectiveValue === "undefined"
                ? "text.disabled"
                : "text.primary",
          background:
            effectiveValue === "mixed"
              ? "rgba(54, 244, 225, 0.08)"
              : "rgba(131, 211, 245, 0.05)",
          borderRadius: 1,
        }}
      >
        {/* Mantén una opción de solo lectura para "mixed" */}
        <MenuItem value="mixed" disabled>Mixed</MenuItem>

        {/* Placeholder opcional si estás en "undefined" sin opciones */}
        {!validValues.includes(effectiveValue) && effectiveValue !== "mixed" && (
          <MenuItem value={effectiveValue} disabled>—</MenuItem>
        )}

        {domainOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    );
  };

  if (supportsLinguistic && !supportsNumeric && domainOptions.length === 0) {
    return (
      <GlassPaper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: "bold", color: "error.main" }}>
          ⚠️ This model only supports linguistic domains.
        </Typography>
        <Typography variant="body2">
          No linguistic domains are available. Please create one to continue.
        </Typography>
      </GlassPaper>
    );
  }

  return (
    <Stack spacing={2}>
      {/* 🌍 Globales fuera de la tabla */}
      <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
          Global Settings
        </Typography>
        <Stack spacing={1}>
          {/* 🌍 Global */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography>🌍 Global</Typography>
            {renderSelect(
              ["global"],
              addedExperts.flatMap((exp) =>
                alternatives.flatMap((alt) =>
                  leafCriteria.map(
                    (crit) =>
                      domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[
                      crit.name
                      ]
                  )
                )
              )
            )}
          </Stack>

          <Divider sx={{ my: 1 }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            {/* 📌 Alternativas */}
            <Stack spacing={1}>
              {alternatives.map((alt) => (
                <Stack key={alt} direction="row" spacing={2} alignItems="center">
                  <Typography>📌 {alt}</Typography>
                  {renderSelect(
                    ["alternatives", alt],
                    addedExperts.flatMap((exp) =>
                      leafCriteria.map(
                        (crit) =>
                          domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[
                          crit.name
                          ]
                      )
                    )
                  )}
                </Stack>
              ))}
            </Stack>

            <Divider flexItem orientation="vertical" />

            {/* ⚙️ Criterios (solo hojas) */}
            <Stack spacing={1}>
              {leafCriteria.map((crit) => (
                <Stack key={crit.name} direction="row" spacing={2} alignItems="center">
                  <Typography>⚙️ {crit.name}</Typography>
                  {renderSelect(
                    ["criteria", crit.name],
                    addedExperts.flatMap((exp) =>
                      alternatives.map(
                        (alt) =>
                          domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[
                          crit.name
                          ]
                      )
                    )
                  )}
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </GlassPaper>

      {/* Tabla detallada */}
      <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
          Domain Assignments (Detailed)
        </Typography>
        <TableContainer
          sx={{
            maxHeight: "60vh",
            borderRadius: 2,
            overflowX: "auto",
            width: "100%",
          }}
        >
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ background: "rgba(131, 211, 245, 0.1)" }}>
                <TableCell sx={{ fontWeight: "bold" }}>Expert</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Alternative</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Criterion</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Domain</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addedExperts.map((exp) => {
                const expRowSpan = alternatives.length * leafCriteria.length;
                return alternatives.map((alt, altIndex) => {
                  const altRowSpan = leafCriteria.length;
                  return leafCriteria.map((crit, critIndex) => (
                    <TableRow
                      key={`${exp}-${alt}-${crit.name}`}
                      sx={{
                        background:
                          critIndex % 2 === 0
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(131, 211, 245, 0.04)",
                      }}
                    >
                      {altIndex === 0 && critIndex === 0 && (
                        <TableCell rowSpan={expRowSpan} sx={{ fontWeight: "bold" }}>
                          👤 {exp}
                        </TableCell>
                      )}
                      {critIndex === 0 && (
                        <TableCell rowSpan={altRowSpan} sx={{ fontStyle: "italic" }}>
                          📌 {alt}
                        </TableCell>
                      )}
                      <TableCell>{crit.name}</TableCell>
                      <TableCell>
                        {renderSelect(
                          ["experts", exp, "alternatives", alt, "criteria", crit.name],
                          [
                            domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[
                            crit.name
                            ],
                          ],
                          true
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassPaper>
    </Stack>
  );
};
