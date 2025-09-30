import {
  Typography,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider,
} from "@mui/material";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { useEffect } from "react";
import { buildInitialAssignments, getLeafCriteria, getMixedOrValue } from "../../utils/DomainAssigments";
import { useIssuesDataContext } from "../../context/issues/issues.context";

export const DomainAssignments = ({
  allData,
  expressionDomains,
  domainAssignments,
  setDomainAssignments,
}) => {
  const { addedExperts, alternatives, criteria, selectedModel } = allData;

  const { globalDomains } = useIssuesDataContext();

  const leafCriteria = getLeafCriteria(criteria);
  const supportsNumeric = !!selectedModel?.supportedDomains?.numeric?.enabled;
  const supportsLinguistic = !!selectedModel?.supportedDomains?.linguistic?.enabled;

  // 🔧 valor por defecto según soporte/dominios
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computeDefaultValue = () => {
    if (supportsNumeric) {
      const numericGlobal = globalDomains.find(
        (d) => d.type === "numeric" && d.numericRange?.min === 0 && d.numericRange?.max === 1
      );
      return numericGlobal ? numericGlobal._id : "undefined";
    }
    if (supportsLinguistic) {
      const firstDomain = [...globalDomains, ...expressionDomains].find(
        (d) => d.type === "linguistic"
      );
      return firstDomain ? firstDomain._id : "undefined";
    }
    return "undefined";
  };


  // 🟢 Inicialización
  useEffect(() => {
    if (!domainAssignments || Object.keys(domainAssignments).length === 0) {
      const initial = buildInitialAssignments(
        addedExperts,
        alternatives,
        leafCriteria,
        computeDefaultValue()
      );
      setDomainAssignments(initial);
    }
  }, [domainAssignments, setDomainAssignments, addedExperts, alternatives, leafCriteria, supportsNumeric, supportsLinguistic, expressionDomains, globalDomains, computeDefaultValue]);

  // 🟡 Reconciliación completa: crea claves que falten para TODAS las hojas (incluye raíces sin hijos),
  // elimina criterios que ya no son hoja, y corrige valores inválidos (p.ej. dominio borrado)
  useEffect(() => {
    if (!domainAssignments?.experts) return;
    const defaultValue = computeDefaultValue();

    const validOptionValues = [
      ...(supportsNumeric ? globalDomains.filter((d) => d.type === "numeric").map((d) => d._id) : []),
      ...(supportsLinguistic
        ? [...globalDomains.filter((d) => d.type === "linguistic"), ...expressionDomains].map((d) => d._id)
        : []),
    ];

    setDomainAssignments((prev) => {
      if (!prev?.experts) return prev;
      const updated = structuredClone(prev);
      let changed = false;

      // 1) asegurar estructura y valores para cada hoja
      addedExperts.forEach((exp) => {
        if (!updated.experts[exp]) {
          updated.experts[exp] = { alternatives: {} };
          changed = true;
        }
        alternatives.forEach((alt) => {
          if (!updated.experts[exp].alternatives[alt]) {
            updated.experts[exp].alternatives[alt] = { criteria: {} };
            changed = true;
          }

          const critMap = updated.experts[exp].alternatives[alt].criteria;

          // a) eliminar claves de criterios que ya no son hoja
          Object.keys(critMap).forEach((critName) => {
            const stillLeaf = leafCriteria.some((c) => c.name === critName);
            if (!stillLeaf) {
              delete critMap[critName];
              changed = true;
            }
          });

          // b) crear claves que falten y corregir valores inválidos
          leafCriteria.forEach((crit) => {
            const curr = critMap[crit.name];

            // crear si falta
            if (curr === undefined || curr === null) {
              critMap[crit.name] = defaultValue;
              changed = true;
              return;
            }

            // si el valor actual no es válido para el modelo (p.ej. dominio borrado), forzar fallback
            if (!validOptionValues.includes(curr)) {
              critMap[crit.name] = defaultValue;
              changed = true;
            }
          });
        });
      });

      return changed ? updated : prev;
    });
  }, [addedExperts, alternatives, leafCriteria, supportsNumeric, supportsLinguistic, expressionDomains, domainAssignments?.experts, setDomainAssignments, computeDefaultValue, globalDomains]);

  // 🔄 Si el modelo es SOLO lingüístico y aparecen dominios, sustituir "undefined" por el primero
  useEffect(() => {
    if (supportsLinguistic && !supportsNumeric && expressionDomains.length > 0) {
      setDomainAssignments((prev) => {
        if (!prev?.experts) return prev;
        const updated = structuredClone(prev);
        let changed = false;

        Object.keys(updated.experts).forEach((exp) => {
          Object.keys(updated.experts[exp].alternatives).forEach((alt) => {
            leafCriteria.forEach((crit) => {
              const curr = updated.experts[exp].alternatives[alt].criteria[crit.name];
              if (curr === "undefined" || curr == null) {
                updated.experts[exp].alternatives[alt].criteria[crit.name] =
                  expressionDomains[0].name;
                changed = true;
              }
            });
          });
        });

        return changed ? updated : prev;
      });
    }
  }, [supportsLinguistic, supportsNumeric, expressionDomains, leafCriteria, setDomainAssignments]);



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

  // ⚠️ Solo lingüístico y sin dominios → aviso
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

  console.log(domainAssignments)


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
