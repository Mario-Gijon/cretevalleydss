import { useMemo } from "react";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

// ---- helpers (self-contained) ----
const WEIGHTS_KEY = "weights";
const filterOutWeightsParam = (p) => Boolean(p) && p?.name !== WEIGHTS_KEY;
const filterOutWeightsParams = (params) => (Array.isArray(params) ? params.filter(filterOutWeightsParam) : []);

const safeJsonStringify = (v) => {
  try {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.stringify(JSON.parse(trimmed), null, 2);
      return v;
    }
    return JSON.stringify(v, null, 2);
  } catch {
    return typeof v === "string" ? v : String(v);
  }
};

const InlineArray = ({ arr, max = 14 }) => {
  const items = Array.isArray(arr) ? arr : [];

  const clipped = items.length > max;
  const shown = clipped ? items.slice(0, max) : items;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.8 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 950, opacity: 0.75, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        [
      </Typography>

      {shown.map((x, i) => (
        <Stack key={i} direction="row" spacing={0.75} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
            {x == null ? "—" : String(x)}
          </Typography>
          {i !== shown.length - 1 ? (
            <Typography
              variant="body2"
              sx={{ fontWeight: 950, opacity: 0.55, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              ,
            </Typography>
          ) : null}
        </Stack>
      ))}

      {clipped ? (
        <Typography variant="body2" sx={{ fontWeight: 900, opacity: 0.65 }}>
          …(+{items.length - max})
        </Typography>
      ) : null}

      <Typography
        variant="body2"
        sx={{ fontWeight: 950, opacity: 0.75, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        ]
      </Typography>
    </Stack>
  );
};

const ParamRow = ({ name, children }) => {
  return (
    <Box sx={{ py: 0.85, }}>
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
          {name}
        </Typography>

        <Box
          sx={{
            px: 1.1,
            py: 0.9,
            borderRadius: 3,
            bgcolor: alpha("#0B1118", 0.35),
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
};

export const ModelParamsView = ({ parameters, values, leafNames }) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const params = useMemo(() => filterOutWeightsParams(parameters), [parameters]);
  const has = Array.isArray(params) && params.length;

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      {!has ? (
        <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
          No parameters.
        </Typography>
      ) : (
        <Box>
          {params.map((p) => {
            const v = values?.[p.name];
            const type = p.type;

            // ---------- number ----------
            if (type === "number") {
              const shown = v ?? p.default ?? "—";
              return (
                <ParamRow key={p._id || p.name} name={p.name}>
                  <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
                    {String(shown)}
                  </Typography>
                </ParamRow>
              );
            }

            // ---------- array ----------
            if (type === "array") {
              const isMatch = p?.restrictions?.length === "matchCriteria";
              const arr = Array.isArray(v) ? v : Array.isArray(p.default) ? p.default : null;
              if (!arr) {
                return (
                  <ParamRow key={p._id || p.name} name={p.name}>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary" }}>
                      —
                    </Typography>
                  </ParamRow>
                );
              }

              // matchCriteria → lista compacta (grid)
              if (isMatch && Array.isArray(leafNames) && leafNames.length === arr.length) {
                return (
                  <ParamRow key={p._id || p.name} name={p.name}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
                      }}
                    >
                      {arr.map((x, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            p: 0.75,
                            borderRadius: 2.5,
                            bgcolor: alpha(theme.palette.background.paper, 0.04),
                            border: "1px solid rgba(255,255,255,0.08)",
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 950,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={leafNames[i]}
                          >
                            {leafNames[i]}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
                            {x == null ? "—" : String(x)}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                  </ParamRow>
                );
              }

              // normal array → INLINE [a, b, c]
              return (
                <ParamRow key={p._id || p.name} name={p.name}>
                  <InlineArray arr={arr} />
                </ParamRow>
              );
            }

            // ---------- fuzzyArray ----------
            if (type === "fuzzyArray") {
              const triples = Array.isArray(v) ? v : Array.isArray(p.default) ? p.default : null;
              if (!triples) {
                return (
                  <ParamRow key={p._id || p.name} name={p.name}>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary" }}>
                      —
                    </Typography>
                  </ParamRow>
                );
              }

              const isMatch = p?.restrictions?.length === "matchCriteria";

              // matchCriteria → grid criterio → [l,m,u]
              if (isMatch && Array.isArray(leafNames) && leafNames.length === triples.length) {
                return (
                  <ParamRow key={p._id || p.name} name={p.name}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
                      }}
                    >
                      {triples.map((t, i) => (
                        <Stack
                          key={i}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            p: 0.75,
                            borderRadius: 2.5,
                            bgcolor: alpha(theme.palette.background.paper, 0.04),
                            border: "1px solid rgba(255,255,255,0.08)",
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 950,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={leafNames[i]}
                          >
                            {leafNames[i]}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
                            {Array.isArray(t) ? `[${t.join(", ")}]` : String(t)}
                          </Typography>
                        </Stack>
                      ))}
                    </Box>
                  </ParamRow>
                );
              }

              // no-match → lista horizontal con chips “[#i [l,m,u]]”
              return (
                <ParamRow key={p._id || p.name} name={p.name}>
                  <Stack direction="row" flexWrap="wrap" gap={1} sx={{ rowGap: 1 }}>
                    {triples.map((t, i) => (
                      <Typography key={i} variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
                        {`#${i + 1} ${Array.isArray(t) ? `[${t.join(", ")}]` : String(t)}`}
                      </Typography>
                    ))}
                  </Stack>
                </ParamRow>
              );
            }

            // ---------- fallback (json prettified) ----------
            const pretty = safeJsonStringify(v ?? p.default ?? "");
            return (
              <ParamRow key={p._id || p.name} name={p.name}>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: 12,
                    fontWeight: 800,
                    color: alpha("#fff", 0.9),
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {pretty || "—"}
                </Box>
              </ParamRow>
            );
          })}
        </Box>
      )}
    </Stack>
  );
};

export default ModelParamsView;