import { useMemo } from "react";
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
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { useIssuesDataContext } from "../../context/issues/issues.context";
import { getLeafCriteria, getMixedOrValue } from "../../utils/createIssueUtils";

const subtleDividerSx = (theme) => ({
  borderColor: alpha(theme.palette.common.white, 0.08),
});

const rowSx = {
  width: "100%",
  alignItems: { xs: "stretch", sm: "center" },
  flexDirection: { xs: "column", sm: "row" },
  gap: { xs: 0.8, sm: 1.4 },
};

const labelSx = {
  fontWeight: 950,
  minWidth: { sm: 190 },
  color: "text.secondary",
};

const selectSx = (theme, effectiveValue) => ({
  minWidth: 220,
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    bgcolor: "transparent", // ✅ sin fondos
    border: `1px solid ${
      effectiveValue === "mixed"
        ? alpha(theme.palette.info.main, 0.35)
        : alpha(theme.palette.common.white, 0.12)
    }`,
    "& fieldset": { border: "none" },
    "&:hover": {
      borderColor:
        effectiveValue === "mixed"
          ? alpha(theme.palette.info.main, 0.50)
          : alpha(theme.palette.common.white, 0.18),
    },
  },
  "& .MuiSelect-select": {
    fontStyle: effectiveValue === "mixed" ? "italic" : "normal",
    fontWeight: 850,
    color:
      effectiveValue === "mixed"
        ? theme.palette.info.main
        : effectiveValue === "undefined"
          ? theme.palette.text.disabled
          : theme.palette.text.primary,
    py: 1.05,
  },
});

const scrollSx = (theme) => ({
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
  "&::-webkit-scrollbar": { width: 8, height: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: `2px solid transparent`,
    backgroundClip: "content-box",
  },
  "&::-webkit-scrollbar-thumb:hover": { backgroundColor: alpha(theme.palette.common.white, 0.24) },
});

export const DomainAssignments = ({ allData, expressionDomains, domainAssignments, setDomainAssignments }) => {
  const theme = useTheme();
  const { addedExperts, alternatives, criteria, selectedModel } = allData;
  const { globalDomains } = useIssuesDataContext();

  const leafCriteria = getLeafCriteria(criteria);
  const supportsNumeric = !!selectedModel?.supportedDomains?.numeric?.enabled;
  const supportsLinguistic = !!selectedModel?.supportedDomains?.linguistic?.enabled;

  // Opciones del select según soporte del modelo
  const domainOptions = useMemo(() => {
    const opts = [];
    if (supportsNumeric) {
      globalDomains
        .filter((d) => d.type === "numeric")
        .forEach((d) => opts.push({ value: d._id, label: d.name }));
    }
    if (supportsLinguistic) {
      [...globalDomains.filter((d) => d.type === "linguistic"), ...expressionDomains].forEach((d) =>
        opts.push({ value: d._id, label: d.name })
      );
    }
    return opts;
  }, [supportsNumeric, supportsLinguistic, globalDomains, expressionDomains]);

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
    const fallback = supportsNumeric
      ? globalDomains.find((d) => d.type === "numeric" && d.numericRange?.min === 0 && d.numericRange?.max === 1)?._id
      : supportsLinguistic
        ? [...globalDomains.filter((d) => d.type === "linguistic"), ...expressionDomains][0]?._id
        : "undefined";

    let effectiveValue = currentValue ?? fallback;

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
        sx={selectSx(theme, effectiveValue)}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.92),
              backdropFilter: "blur(10px)",
            },
          },
        }}
      >
        <MenuItem value="mixed" disabled>
          Mixed
        </MenuItem>

        {!validValues.includes(effectiveValue) && effectiveValue !== "mixed" && (
          <MenuItem value={effectiveValue} disabled>
            —
          </MenuItem>
        )}

        {domainOptions.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    );
  };

  // Caso sin dominios lingüísticos disponibles
  if (supportsLinguistic && !supportsNumeric && domainOptions.length === 0) {
    return (
      <Box sx={{ py: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 950, color: "warning.main" }}>
          This model only supports linguistic domains.
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850, mt: 0.5 }}>
          No linguistic domains are available. Please create one to continue.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ width: "100%", minHeight: 0 }}>
      {/* ---------- GLOBAL SETTINGS (sin cajas) ---------- */}
      <Stack spacing={0.35}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Global settings
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          Apply a domain in bulk (global / by alternative / by criterion)
        </Typography>
      </Stack>

      {/* Global */}
      <Stack sx={rowSx}>
        <Typography variant="body2" sx={labelSx}>
          Global
        </Typography>
        {renderSelect(
          ["global"],
          addedExperts.flatMap((exp) =>
            alternatives.flatMap((alt) =>
              leafCriteria.map((crit) => domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[crit.name])
            )
          )
        )}
      </Stack>

      {/* Alternatives + Criteria (sin cards, sólo líneas) */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.2, md: 2.4 }}
        alignItems={{ xs: "stretch", md: "flex-start" }}
      >
        {/* Alternatives */}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
            Alternatives
          </Typography>

          {alternatives.map((alt) => (
            <Box key={alt}>
              <Stack sx={rowSx}>
                <Typography variant="body2" sx={{ ...labelSx, color: "text.primary", fontWeight: 900 }}>
                  {alt}
                </Typography>

                {renderSelect(
                  ["alternatives", alt],
                  addedExperts.flatMap((exp) =>
                    leafCriteria.map((crit) => domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[crit.name])
                  )
                )}
              </Stack>

              {/* {idx !== alternatives.length - 1 ? <Divider sx={{ ...subtleDividerSx(theme), mt: 1.1 }} /> : null} */}
            </Box>
          ))}
        </Stack>

        <Divider
          flexItem
          orientation="vertical"
          sx={{ display: { xs: "none", md: "block" }, borderColor: alpha(theme.palette.common.white, 0.08) }}
        />

        {/* Criteria */}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
            Leaf criteria
          </Typography>

          {leafCriteria.map((crit) => (
            <Box key={crit.name}>
              <Stack sx={rowSx}>
                <Typography variant="body2" sx={{ ...labelSx, color: "text.primary", fontWeight: 900 }}>
                  {crit.name}
                </Typography>

                {renderSelect(
                  ["criteria", crit.name],
                  addedExperts.flatMap((exp) =>
                    alternatives.map((alt) => domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[crit.name])
                  )
                )}
              </Stack>

              {/* {idx !== leafCriteria.length - 1 ? <Divider sx={{ ...subtleDividerSx(theme), mt: 1.1 }} /> : null} */}
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* ---------- DETAILED TABLE (borde fino) ---------- */}
      <Divider sx={{pt: 2}}/>

      <Stack spacing={0.35} sx={{pt:2}}>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
          Detailed assignments
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          Per expert • alternative • criterion
        </Typography>
      </Stack>

      <TableContainer
        sx={{
          maxHeight: "55vh",
          borderRadius: 4,
          overflow: "auto",
          border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`, // ✅ borde fino
          bgcolor: "transparent", // ✅ nada de fondos
          ...scrollSx(theme),
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              {["Expert", "Alternative", "Criterion", "Domain"].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 950,
                    color: "text.secondary",
                    bgcolor: alpha(theme.palette.common.white, 0.02), // ✅ muy suave
                    borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                    py: 1.05,
                  }}
                >
                  {h}
                </TableCell>
              ))}
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
                    hover
                    sx={{
                      "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.06) }, // ✅ hover suave
                    }}
                  >
                    {altIndex === 0 && critIndex === 0 && (
                      <TableCell
                        rowSpan={expRowSpan}
                        sx={{
                          fontWeight: 900,
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        {exp}
                      </TableCell>
                    )}

                    {critIndex === 0 && (
                      <TableCell
                        rowSpan={altRowSpan}
                        sx={{
                          fontWeight: 850,
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        {alt}
                      </TableCell>
                    )}

                    <TableCell
                      sx={{
                        fontWeight: 850,
                        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                      }}
                    >
                      {crit.name}
                    </TableCell>

                    <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                      {renderSelect(
                        ["experts", exp, "alternatives", alt, "criteria", crit.name],
                        [domainAssignments?.experts?.[exp]?.alternatives?.[alt]?.criteria?.[crit.name]],
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
    </Stack>
  );
};
