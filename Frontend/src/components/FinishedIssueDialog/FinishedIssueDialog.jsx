import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Backdrop,
  Button,
  List,
  ListItem,
  ListItemButton,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  Chip,
  Tooltip,
  MobileStepper,
  useMediaQuery,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import ScienceIcon from "@mui/icons-material/Science";
import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";
import LayersIcon from "@mui/icons-material/Layers";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import {
  getFinishedIssueInfo,
  getModelsInfo,
  getIssueScenarios,
  getIssueScenarioById,
  createIssueScenario,
  removeIssueScenario,
} from "../../controllers/issueController";

import { CircularLoading } from "../LoadingProgress/CircularLoading";
import { PairwiseMatrix } from "../PairwiseMatrix/PairwiseMatrix";
import { Matrix } from "../Matrix/Matrix";

import { GlassPaper } from "../StyledComponents/GlassPaper";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { CriterionItem } from "../CriteriaList/CriteriaList";
import { extractLeafCriteria } from "../../utils/evaluationPairwiseMatrixDialogUtils";

import { Scatter } from "react-chartjs-2";
import { Chart } from "chart.js/auto";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip as CTooltip,
  Legend,
  Title,
} from "chart.js";
import ModelParamsView from "../ModelParamsView/ModelParamsView";

ChartJS.register(ScatterController, LinearScale, PointElement, CTooltip, Legend, Title, zoomPlugin);

const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%),
                    radial-gradient(900px 460px at 0% 0%, ${alpha(
    theme.palette.secondary.main,
    intensity
  )}, transparent 58%)`,
});

const crystalBorder = () => ({ border: "1px solid rgba(255,255,255,0.10)" });

const glassSx = (theme) => ({
  backgroundColor: alpha("#050e22", 0.3),
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.14)}`,
  ...crystalBorder(),
});

const Pill = ({ tone = "success", children }) => {
  const theme = useTheme();
  const map = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    secondary: theme.palette.secondary.main,
  };
  const c = map[tone] || theme.palette.info.main;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: alpha(c, 0.12),
        color: c,
        fontSize: 12,
        fontWeight: 950,
        width: "fit-content",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.10)}`,
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: alpha(c, 0.85) }} />
      <span>{children}</span>
    </Box>
  );
};

const SectionCard = ({ title, icon, right, children, sx }) => {
  const theme = useTheme();
  return (
    <GlassPaper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.5, md: 2 },
        ...glassSx(theme),
        ...auroraBg(theme, 0.08),
        position: "relative",
        overflow: "hidden",
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 15%)`,
          opacity: 0.22,
        },
        ...(sx || {}),
      }}
    >
      {(title || right) && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25, position: "relative", zIndex: 1 }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            {icon ? (
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {icon}
              </Avatar>
            ) : null}

            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}>
                {title}
              </Typography>
            ) : null}
          </Stack>

          {right ? <Box sx={{ position: "relative", zIndex: 1 }}>{right}</Box> : null}
        </Stack>
      )}

      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
    </GlassPaper>
  );
};

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
      {label}:
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary", wordBreak: "break-word" }}>
      {value ?? "—"}
    </Typography>
  </Stack>
);

const SummaryAccordionRow = ({ label, open, onToggle, right, children }) => {
  const theme = useTheme();

  return (
    <Box>
      <ListItemButton
        disableGutters
        onClick={onToggle}
        sx={{
          px: 0,
          py: 0.45,
          borderRadius: 1.25,
          bgcolor: "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.04) },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
            {label}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {right ? <Box sx={{ mr: 0.5 }}>{right}</Box> : null}

          <Box sx={{ opacity: 0.85 }}>{open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}</Box>
        </Stack>
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pt: 0.6 }}>
          <Stack direction="row" alignItems="flex-start" pl={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};

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

const getLastPhaseIndex = (issueInfo) => {
  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((k) => parseInt(k, 10))
    .filter((k) => !Number.isNaN(k));
  const last = Math.max(...keys, 0) - 1;
  return Math.max(0, last);
};

const getRoundsCount = (issueInfo) => {
  const fromConsensus = issueInfo?.summary?.consensusInfo?.consensusReachedPhase;
  if (typeof fromConsensus === "number" && fromConsensus > 0) return fromConsensus;

  const keys = Object.keys(issueInfo?.expertsRatings || {})
    .map((k) => parseInt(k, 10))
    .filter((k) => !Number.isNaN(k));
  const derived = Math.max(...keys, 0);
  if (derived > 0) return derived;

  const rankings = issueInfo?.alternativesRankings;
  if (Array.isArray(rankings) && rankings.length) return rankings.length;

  return 0;
};

const WEIGHTS_KEY = "weights";

const stripWeights = (obj) => {
  if (!obj || typeof obj !== "object") return {};
  const { ...rest } = obj;
  return rest;
};

const stripWeightsDeep = (v) => stripWeights(v);

const filterOutWeightsParam = (p) => Boolean(p) && p?.name !== WEIGHTS_KEY;
const filterOutWeightsParams = (params) => (Array.isArray(params) ? params.filter(filterOutWeightsParam) : []);
const omitWeightsFromModel = (m) => {
  if (!m || typeof m !== "object") return m;
  return {
    ...m,
    parameters: filterOutWeightsParams(m.parameters),
    defaultsResolved: stripWeightsDeep(m.defaultsResolved),
  };
};

const buildPseudoParametersFromValues = (values) => {
  const v = values && typeof values === "object" ? values : {};
  return Object.keys(v)
    .filter((k) => k !== WEIGHTS_KEY)
    .sort()
    .map((name) => {
      const val = v[name];

      // detect fuzzy triples array: [[l,m,u], ...]
      const isFuzzyArray =
        Array.isArray(val) &&
        val.length > 0 &&
        val.every(
          (t) =>
            Array.isArray(t) &&
            t.length === 3 &&
            t.every((x) => x === null || x === undefined || Number.isFinite(Number(x)))
        );

      const type = Number.isFinite(Number(val))
        ? "number"
        : isFuzzyArray
          ? "fuzzyArray"
          : Array.isArray(val)
            ? "array"
            : "json"; // caerá al render genérico del viewer

      return { name, type, default: val };
    });
};

const toNumberOrEmpty = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
};

const clamp = (n, min, max) => {
  if (!Number.isFinite(n)) return n;
  if (min != null && Number.isFinite(min) && n < min) return min;
  if (max != null && Number.isFinite(max) && n > max) return max;
  return n;
};

const ensureArrayLen = (arr, len, filler = "") => {
  const a = Array.isArray(arr) ? [...arr] : [];
  if (a.length < len) return [...a, ...Array(len - a.length).fill(filler)];
  if (a.length > len) return a.slice(0, len);
  return a;
};

const getLeafCriteriaNamesFallback = (summaryCriteria) => {
  try {
    const leaf = extractLeafCriteria(summaryCriteria || []);
    return leaf.map((c) => c?.name).filter(Boolean);
  } catch {
    return [];
  }
};

const isModelCompatible = (m) => {
  const p = m?.compatibility?.pairwise;
  const d = m?.compatibility?.domain;
  if (p === false) return false;
  if (d === false) return false;
  return true;
};

const getCompatReason = (m, domainType) => {
  const reasons = [];
  if (m?.compatibility?.pairwise === false) reasons.push("Pairwise mismatch");
  if (m?.compatibility?.domain === false) reasons.push(domainType ? `No ${domainType} support` : "Domain not supported");
  return reasons.join(" · ");
};

const buildParamsResolved = ({ model, leafCount }) => {
  if (model?.defaultsResolved) return stripWeightsDeep(model.defaultsResolved);

  const out = {};
  for (const p of filterOutWeightsParams(model?.parameters || [])) {
    if (p.type === "number") out[p.name] = p.default ?? "";
    if (p.type === "array") {
      const len = p?.restrictions?.length === "matchCriteria" ? leafCount : p?.restrictions?.length ?? 2;
      const base = Array.isArray(p.default) ? p.default : [];
      out[p.name] = ensureArrayLen(base, Number(len) || 2, "");
    }
    if (p.type === "fuzzyArray") {
      const len = p?.restrictions?.length === "matchCriteria" ? leafCount : p?.restrictions?.length ?? 1;
      const L = Number(len) || 1;
      const base = Array.isArray(p.default) ? p.default : [];
      const filled = ensureArrayLen(base, L, ["", "", ""]).map((t) => (Array.isArray(t) && t.length === 3 ? t : ["", "", ""]));
      out[p.name] = filled;
    }
  }
  return out;
};

const cleanParamsForSend = ({ model, values, leafCount }) => {
  const out = {};
  for (const p of filterOutWeightsParams(model?.parameters || [])) {
    const name = p.name;
    const type = p.type;
    const r = p.restrictions || {};
    const def = p.default;

    if (type === "number") {
      const raw = values?.[name];
      const v = raw === "" || raw == null ? def : raw;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;

      if (Array.isArray(r.allowed) && r.allowed.length) {
        if (!r.allowed.includes(n)) continue;
        out[name] = n;
        continue;
      }

      out[name] = clamp(n, r.min ?? null, r.max ?? null);
      continue;
    }

    if (type === "array") {
      const len =
        r.length === "matchCriteria"
          ? leafCount
          : (typeof r.length === "number" ? r.length : null) ?? (Array.isArray(def) ? def.length : 2);

      const arr = ensureArrayLen(values?.[name] ?? def ?? [], Number(len) || 2, "");
      const parsed = arr.map((x) => (x === "" || x == null ? null : Number(x)));
      if (parsed.some((x) => x == null || !Number.isFinite(x))) continue;

      out[name] = parsed.map((n) => clamp(n, r.min ?? null, r.max ?? null));
      continue;
    }

    if (type === "fuzzyArray") {
      const len =
        r.length === "matchCriteria"
          ? leafCount
          : (typeof r.length === "number" ? r.length : null) ?? (Array.isArray(def) ? def.length : 1);

      const triples = ensureArrayLen(values?.[name] ?? def ?? [], Number(len) || 1, ["", "", ""]);

      const parsed = triples.map((t) => {
        const tt = Array.isArray(t) ? t : ["", "", ""];
        const nums = tt.map((x) => (x === "" || x == null ? null : Number(x)));
        return nums;
      });

      if (parsed.some((t) => t.some((x) => x == null || !Number.isFinite(x)))) continue;

      out[name] = parsed.map(([l, m, u]) => [
        clamp(l, r.min ?? null, r.max ?? null),
        clamp(m, r.min ?? null, r.max ?? null),
        clamp(u, r.min ?? null, r.max ?? null),
      ]);
      continue;
    }
  }
  return out;
};

const validateParams = ({ model, values, leafCount }) => {
  for (const p of filterOutWeightsParams(model?.parameters || [])) {
    const name = p.name;
    const type = p.type;
    const r = p.restrictions || {};
    const val = values?.[name];

    if (type === "number") {
      if (val === "" || val == null) continue;
      const n = Number(val);
      if (!Number.isFinite(n)) return { ok: false, msg: `Parameter '${name}' must be a number.` };
      if (Array.isArray(r.allowed) && r.allowed.length && !r.allowed.includes(n)) {
        return { ok: false, msg: `Parameter '${name}' must be one of: ${r.allowed.join(", ")}.` };
      }
      if (r.min != null && n < r.min) return { ok: false, msg: `Parameter '${name}' must be ≥ ${r.min}.` };
      if (r.max != null && n > r.max) return { ok: false, msg: `Parameter '${name}' must be ≤ ${r.max}.` };
      continue;
    }

    if (type === "array") {
      const len =
        r.length === "matchCriteria"
          ? leafCount
          : (typeof r.length === "number" ? r.length : null) ?? (Array.isArray(p.default) ? p.default.length : 2);

      const arr = ensureArrayLen(
        Array.isArray(val) ? val : Array.isArray(p.default) ? p.default : [],
        Number(len) || 2,
        ""
      );

      if (arr.some((x) => x === "" || x == null || !Number.isFinite(Number(x)))) {
        return { ok: false, msg: `Parameter '${name}' must be a complete array of ${len} numbers.` };
      }

      const nums = arr.map((x) => Number(x));
      if (r.sum != null) {
        const s = nums.reduce((a, b) => a + b, 0);
        const eps = 1e-6;
        if (Math.abs(s - r.sum) > eps) return { ok: false, msg: `Parameter '${name}' sum must be ${r.sum}.` };
      }

      if (Number(len) === 2 && !r.sum && r.length !== "matchCriteria") {
        if (nums[0] >= nums[1]) return { ok: false, msg: `Parameter '${name}' must satisfy left < right.` };
      }
      continue;
    }

    if (type === "fuzzyArray") {
      const len =
        r.length === "matchCriteria"
          ? leafCount
          : (typeof r.length === "number" ? r.length : null) ?? (Array.isArray(p.default) ? p.default.length : 1);

      const triples = ensureArrayLen(
        Array.isArray(val) ? val : Array.isArray(p.default) ? p.default : [],
        Number(len) || 1,
        ["", "", ""]
      );

      for (let i = 0; i < triples.length; i++) {
        const t = triples[i];
        if (!Array.isArray(t) || t.length !== 3) return { ok: false, msg: `Parameter '${name}' must be an array of triples.` };
        const nums = t.map((x) => Number(x));
        if (nums.some((x) => !Number.isFinite(x))) return { ok: false, msg: `Parameter '${name}' has invalid fuzzy values.` };
        const [l, m, u] = nums;
        if (l > m || m > u) return { ok: false, msg: `Parameter '${name}' requires l ≤ m ≤ u.` };
      }
    }
  }
  return { ok: true };
};

const ScenarioParametersForm = ({ model, values, setValues, leafNames }) => {
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

  const onChangeNumber = (name, raw, r = {}) => {
    if (raw === "") {
      setValues((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    const n = toNumberOrEmpty(raw);
    if (n === "") {
      setValues((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    setValues((prev) => ({ ...prev, [name]: clamp(n, r.min ?? null, r.max ?? null) }));
  };

  const onChangeArrayItem = (name, i, raw, r = {}) => {
    setValues((prev) => {
      const current = Array.isArray(prev?.[name]) ? [...prev[name]] : [];
      const next = ensureArrayLen(current, i + 1, "");
      if (raw === "") next[i] = "";
      else {
        const n = toNumberOrEmpty(raw);
        next[i] = n === "" ? "" : clamp(n, r.min ?? null, r.max ?? null);
      }
      return { ...prev, [name]: next };
    });
  };

  const onChangeFuzzy = (name, i, j, raw, r = {}) => {
    setValues((prev) => {
      const cur = Array.isArray(prev?.[name])
        ? prev[name].map((t) => (Array.isArray(t) ? [...t] : ["", "", ""]))
        : [];
      const next = ensureArrayLen(cur, i + 1, ["", "", ""]);
      const triple = Array.isArray(next[i]) ? [...next[i]] : ["", "", ""];
      if (raw === "") triple[j] = "";
      else {
        const n = toNumberOrEmpty(raw);
        triple[j] = n === "" ? "" : clamp(n, r.min ?? null, r.max ?? null);
      }
      next[i] = triple;
      return { ...prev, [name]: next };
    });
  };

  const sumFor = (name) => {
    const arr = values?.[name];
    if (!Array.isArray(arr)) return null;
    const nums = arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (nums.length !== arr.length) return null;
    return nums.reduce((a, b) => a + b, 0);
  };

  return (
    <Stack spacing={2}>
      {params.map((param) => {
        const { name, type, restrictions = {}, default: def } = param;

        if (type === "number" && Array.isArray(restrictions.allowed) && restrictions.allowed.length) {
          const current = values?.[name] ?? def ?? "";
          return (
            <Stack key={param._id || name} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}>
                {name}
              </Typography>

              <TextField
                select
                size="small"
                color="info"
                value={current}
                onChange={(e) => onChangeNumber(name, e.target.value, restrictions)}
                sx={{ minWidth: 160 }}
              >
                {restrictions.allowed.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
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
          const current = values?.[name] ?? def ?? "";
          return (
            <Stack key={param._id || name} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}>
                {name}
              </Typography>

              <TextField
                type="number"
                size="small"
                color="info"
                value={current}
                onChange={(e) => onChangeNumber(name, e.target.value, restrictions)}
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
                : Array.isArray(def)
                  ? def.length
                  : 2;

          const currentValues = ensureArrayLen(
            Array.isArray(values?.[name]) ? values[name] : Array.isArray(def) ? def : [],
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
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap">
                <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", minWidth: 130 }}>
                  {name}
                </Typography>

                {restrictions.sum != null ? (
                  <Pill tone={sum != null && Math.abs(sum - restrictions.sum) < 1e-6 ? "success" : "warning"}>
                    {sum == null ? `sum: ${restrictions.sum}` : `sum: ${sum.toFixed(4)} / ${restrictions.sum}`}
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
                  {leafNames.map((cName, i) => (
                    <Stack key={`${name}-${cName}-${i}`} spacing={0.5} alignItems="flex-start" sx={{ minWidth: 180 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                        {cName}
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        color="info"
                        value={currentValues[i] ?? ""}
                        onChange={(e) => onChangeArrayItem(name, i, e.target.value, restrictions)}
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
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ pl: 0.25 }}>
                  <Typography variant="h6" sx={{ m: 0, opacity: 0.85 }}>
                    [
                  </Typography>
                  {currentValues.map((val, i) => (
                    <TextField
                      key={`${name}-${i}`}
                      type="number"
                      size="small"
                      color="info"
                      value={val ?? ""}
                      onChange={(e) => onChangeArrayItem(name, i, e.target.value, restrictions)}
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
                : Array.isArray(def)
                  ? def.length
                  : 1;

          const L = Number(length) || 1;

          const currentValues =
            Array.isArray(values?.[name]) && values[name].length === L
              ? values[name]
              : Array.from({ length: L }, () => ["", "", ""]);

          return (
            <Box key={param._id || name}>
              <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.75, minWidth: 130 }}>
                {name}
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={2} sx={{ pl: 0.25 }}>
                {currentValues.map((triple, i) => (
                  <Box
                    key={`${name}-${i}`}
                    sx={{
                      p: 1.2,
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.10)",
                      bgcolor: alpha(theme.palette.background.paper, 0.06),
                      minWidth: 260,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                      {restrictions.length === "matchCriteria" ? leafNames?.[i] ?? `C${i + 1}` : `#${i + 1}`}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 0.8 }}>
                      {["l", "m", "u"].map((label, j) => (
                        <TextField
                          key={`${name}-${i}-${label}`}
                          type="number"
                          size="small"
                          color="info"
                          label={label}
                          value={Array.isArray(triple) ? triple[j] ?? "" : ""}
                          onChange={(e) => onChangeFuzzy(name, i, j, e.target.value, restrictions)}
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

const deepClone = (v) =>
  typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));

const applyScenarioToIssueInfo = (baseIssueInfo, scenario) => {
  const out = deepClone(baseIssueInfo || {});
  const details = scenario?.outputs?.details || {};
  const ce = scenario?.outputs?.collectiveEvaluations || null;

  // summary (lo tuyo)
  out.summary = {
    ...(out.summary || {}),
    model: scenario?.targetModelName || out?.summary?.model,
    modelName: scenario?.targetModelName || out?.summary?.modelName,
    targetModelName: scenario?.targetModelName,
    modelParameters:
      scenario?.config?.normalizedModelParameters ||
      scenario?.config?.modelParameters ||
      out?.summary?.modelParameters,
  };

  // ✅ CLAVE: pisa modelParams.base para que tu UI deje de “ganar” con los params del base
  out.modelParams = { ...(out.modelParams || {}) };
  out.modelParams.base = {
    ...(out.modelParams.base || {}),
    modelName: scenario?.targetModelName || out.modelParams.base?.modelName,
    paramsSaved: scenario?.config?.modelParameters || out.modelParams.base?.paramsSaved,
    paramsResolved: scenario?.config?.normalizedModelParameters || out.modelParams.base?.paramsResolved,
  };

  // ranking / plots / collective (lo tuyo)
  const ranking = Array.isArray(details?.rankedAlternatives) ? details.rankedAlternatives : [];
  out.alternativesRankings = [{ ranking }];

  const pg = details?.plotsGraphic;
  if (pg?.expert_points && pg?.collective_point) {
    out.analyticalGraphs = { ...(out.analyticalGraphs || {}), scatterPlot: [pg] };
  }

  if (ce && out?.expertsRatings && typeof out.expertsRatings === "object") {
    for (const k of Object.keys(out.expertsRatings)) {
      if (out.expertsRatings[k]) out.expertsRatings[k].collectiveEvaluations = ce;
    }
  }

  return out;
};

export const FinishedIssueDialog = ({
  selectedIssue,
  openFinishedIssueDialog,
  handleCloseFinishedIssueDialog,
  setOpenRemoveConfirmDialog,
}) => {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const scatterPlotRef = useRef(null);
  const consensusLevelChartRef = useRef(null);
  const resetZoom = (chartRef) => chartRef?.current?.resetZoom?.();

  const openTokenRef = useRef(0);
  const baseIssueRef = useRef(null);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  const [openDescriptionList, setOpenDescriptionList] = useState(false);
  const [openCriteriaList, setOpenCriteriaList] = useState(false);
  const [openAlternativeList, setOpenAlternativesList] = useState(false);
  const [openConsensusInfoList, setOpenConsensusInfoList] = useState(false);
  const [openExpertsList, setOpenExpertsList] = useState(false);
  const [openParamsViewer, setOpenParamsViewer] = useState(false);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [issue, setIssue] = useState({});

  const [activeStep, setActiveStep] = useState(0);
  const handleNext = () => setActiveStep((p) => Math.min(1, p + 1));
  const handleBack = () => setActiveStep((p) => Math.max(0, p - 1));

  const [showCollective, setShowCollective] = useState(false);

  const [runsLoading, setRunsLoading] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedRunKey, setSelectedRunKey] = useState("base");
  const [runCache, setRunCache] = useState({});

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const [selectedModelName, setSelectedModelName] = useState("");
  const [scenarioParamValues, setScenarioParamValues] = useState({});

  const [modelsCatalog, setModelsCatalog] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [paramsJson, setParamsJson] = useState("{}");

  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  const unwrap = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

  useEffect(() => {
    baseIssueRef.current = issue;
  }, [issue]);

  const refreshRuns = async (issueId) => {
    if (!issueId) return [];
    const data = unwrap(await getIssueScenarios(issueId));
    const list = data?.scenarios || [];
    const normalized = Array.isArray(list) ? list : [];
    setRuns(normalized);
    return normalized;
  };

  useEffect(() => {
    const issueId = selectedIssue?.id;
    if (!issueId || !openFinishedIssueDialog) return;

    let cancelled = false;
    const token = ++openTokenRef.current;

    const run = async () => {
      setLoadingInfo(true);
      setRunsLoading(true);

      try {
        const [baseResp, runsResp] = await Promise.all([getFinishedIssueInfo(issueId), getIssueScenarios(issueId)]);
        if (cancelled || openTokenRef.current !== token) return;

        const baseData = unwrap(baseResp);
        const loadedIssue = baseData?.issueInfo || baseData || {};

        setIssue(loadedIssue || {});
        setSelectedRunKey("base");
        setRunCache({});
        setRuns([]);

        const rData = unwrap(runsResp);
        const list = rData?.scenarios || [];
        setRuns(Array.isArray(list) ? list : []);

        const idx = getLastPhaseIndex(loadedIssue || {});
        setCurrentPhaseIndex(idx);

        setActiveStep(0);
        setShowCollective(false);
        setOpenDescriptionList(false);
        setOpenCriteriaList(false);
        setOpenAlternativesList(false);
        setOpenConsensusInfoList(false);
        setOpenExpertsList(false);
        setOpenParamsViewer(false);

        setSelectedModelName("");
        setScenarioParamValues({});
        setScenarioName("");
        setParamsJson("{}");
      } catch {
        if (cancelled || openTokenRef.current !== token) return;
        setIssue({});
        setRuns([]);
        setSelectedRunKey("base");
        setRunCache({});
        setCurrentPhaseIndex(0);
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        if (cancelled || openTokenRef.current !== token) return;
        setLoadingInfo(false);
        setRunsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [selectedIssue?.id, openFinishedIssueDialog]);

  const ensureRunLoaded = async (runKey) => {
    if (!runKey || runKey === "base") return null;

    const cached = runCache[runKey];
    if (cached) return cached;

    try {
      setRunsLoading(true);
      const resp = unwrap(await getIssueScenarioById(runKey));
      const scenario = resp?.scenario || null;

      if (!scenario?.outputs?.details) {
        setToast({ open: true, severity: "warning", msg: "Scenario results not available yet." });
        return null;
      }

      const info = applyScenarioToIssueInfo(baseIssueRef.current || issue, scenario);
      setRunCache((prev) => ({ ...prev, [runKey]: info }));
      return info;
    } catch {
      setToast({ open: true, severity: "error", msg: "Could not load scenario." });
      return null;
    } finally {
      setRunsLoading(false);
    }
  };

  const handleSelectRun = async (runKey) => {
    setSelectedRunKey(runKey);
    setActiveStep(0);
    setShowCollective(false);

    if (runKey === "base") {
      setCurrentPhaseIndex(getLastPhaseIndex(issue || {}));
      return;
    }

    const info = await ensureRunLoaded(runKey);
    setCurrentPhaseIndex(info ? getLastPhaseIndex(info) : 0);
  };

  useEffect(() => {
    if (!openFinishedIssueDialog) return;

    if (selectedRunKey === "base") {
      setCurrentPhaseIndex(getLastPhaseIndex(issue || {}));
      return;
    }

    const info = runCache[selectedRunKey];
    if (info) setCurrentPhaseIndex(getLastPhaseIndex(info));
  }, [selectedRunKey, issue, runCache, openFinishedIssueDialog]);

  const viewIssue = selectedRunKey === "base" ? issue : runCache[selectedRunKey] || null;

  const roundsCount = getRoundsCount(viewIssue || {});
  const showRounds = Boolean(viewIssue?.summary?.consensusInfo && roundsCount > 1);

  const [selectedExpert, setSelectedExpert] = useState("");
  const isPairwise = Boolean(viewIssue?.summary?.isPairwise);
  const [selectedCriterion, setSelectedCriterion] = useState("");

  useEffect(() => {
    const evals = viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {};
    const newExpert = Object.keys(evals)[0] || "";
    setSelectedExpert(newExpert);

    if (isPairwise) {
      const newCriterion = Object.keys(evals?.[newExpert] || {})[0] || "";
      setSelectedCriterion(newCriterion);
    } else {
      setSelectedCriterion("");
    }
  }, [viewIssue, currentPhaseIndex, isPairwise]);

  const expertList = useMemo(
    () => Object.keys(viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {}),
    [viewIssue, currentPhaseIndex]
  );

  const criterionList = useMemo(() => {
    if (!isPairwise) return [];
    return Object.keys(viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert] || {});
  }, [viewIssue, currentPhaseIndex, selectedExpert, isPairwise]);

  const evaluations = useMemo(() => {
    if (!viewIssue) return isPairwise ? [] : {};
    if (isPairwise) {
      return (
        viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert]?.[selectedCriterion] || []
      );
    }
    return viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[selectedExpert] || {};
  }, [viewIssue, currentPhaseIndex, selectedExpert, selectedCriterion, isPairwise]);

  const collectiveEvaluations = useMemo(() => {
    if (!viewIssue) return isPairwise ? [] : {};
    if (!showCollective) return isPairwise ? [] : {};
    if (isPairwise) {
      return viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations?.[selectedCriterion] || [];
    }
    return viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations || {};
  }, [viewIssue, currentPhaseIndex, selectedCriterion, showCollective, isPairwise]);

  const ranking = viewIssue?.alternativesRankings?.[currentPhaseIndex]?.ranking ?? [];
  const lastIndex = ranking.length - 1;

  const formatScore = (num) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);

  const handleChangePhase = (index) => {
    setCurrentPhaseIndex(index);
    setActiveStep(0);
    setShowCollective(false);
  };

  const participated = viewIssue?.summary?.experts?.participated || [];
  const notAccepted = viewIssue?.summary?.experts?.notAccepted || [];
  const totalExperts = participated.length + notAccepted.length;

  const getRunId = (r) => r?._id || r?.id || r?.scenarioId || r?.runId;
  const getRunLabel = (r) => r?.name || r?.scenarioName || r?.targetModelName || r?.modelName || "Model run";

  const baseModelParamsBlock = issue?.modelParams || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const availableModelsRaw = baseModelParamsBlock?.availableModels || [];
  const availableModels = useMemo(() => availableModelsRaw.map(omitWeightsFromModel), [availableModelsRaw]);
  const domainType = baseModelParamsBlock?.domainType || null;

  const leafNames = useMemo(() => {
    const fromBackend = baseModelParamsBlock?.leafCriteria?.map((c) => c?.name).filter(Boolean);
    if (fromBackend?.length) return fromBackend;
    return getLeafCriteriaNamesFallback(issue?.summary?.criteria || []);
  }, [baseModelParamsBlock, issue?.summary?.criteria]);

  const useSchemaAdd = Boolean(Array.isArray(availableModels) && availableModels.length);

  const selectedModelFromSchema = useMemo(() => {
    if (!useSchemaAdd) return null;
    return availableModels.find((m) => m?.name === selectedModelName) || null;
  }, [useSchemaAdd, availableModels, selectedModelName]);

  const openAddDialog = async () => {
    setAddOpen(true);

    if (useSchemaAdd) {
      setModelsCatalog([]);
      return;
    }

    if (modelsCatalog?.length) return;

    try {
      setModelsLoading(true);
      const resp = unwrap(await getModelsInfo());
      const models = resp?.models || resp || [];
      setModelsCatalog(Array.isArray(models) ? models : []);
    } catch {
      setModelsCatalog([]);
    } finally {
      setModelsLoading(false);
    }
  };

  const closeAddDialog = () => {
    setAddOpen(false);
    setScenarioName("");
    setSelectedModelName("");
    setScenarioParamValues({});
    setParamsJson("{}");
  };

  useEffect(() => {
    if (!addOpen) return;
    if (!useSchemaAdd) return;
    if (!selectedModelFromSchema) return;

    const defaults = buildParamsResolved({ model: selectedModelFromSchema, leafCount: leafNames.length });
    setScenarioParamValues(defaults);
  }, [addOpen, useSchemaAdd, selectedModelFromSchema, leafNames]);

  const handleAddModelRun = async () => {
    if (!selectedIssue?.id) return;

    if (!selectedModelName) {
      setToast({ open: true, severity: "warning", msg: "Please select a model." });
      return;
    }

    let modelParameters = {};

    if (useSchemaAdd) {
      const leafCount = leafNames?.length || 0;

      const v = validateParams({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
      });

      if (!v.ok) {
        setToast({ open: true, severity: "error", msg: v.msg || "Invalid parameters." });
        return;
      }

      modelParameters = cleanParamsForSend({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
      });

      modelParameters = stripWeights(modelParameters);
    } else {
      let parsedParams = {};
      try {
        parsedParams = paramsJson?.trim() ? JSON.parse(paramsJson) : {};
      } catch {
        setToast({ open: true, severity: "error", msg: "Parameters JSON is not valid." });
        return;
      }
      modelParameters = stripWeights(parsedParams);
    }

    try {
      setAddLoading(true);

      const resp = unwrap(
        await createIssueScenario({
          issueId: selectedIssue.id,
          scenarioName: scenarioName?.trim() || undefined,
          targetModelName: selectedModelName,
          paramOverrides: modelParameters,
        })
      );

      if (!resp?.success) {
        const msg = resp?.msg || resp?.message || "Could not add model.";
        setToast({ open: true, severity: "error", msg });
        return;
      }

      const scenarioId = resp?.scenarioId;

      await refreshRuns(selectedIssue.id);

      if (scenarioId) {
        setSelectedRunKey(scenarioId);
        const info = await ensureRunLoaded(scenarioId);
        setCurrentPhaseIndex(info ? getLastPhaseIndex(info) : 0);
      }

      setToast({ open: true, severity: "success", msg: "Model run added." });
      closeAddDialog();
    } catch (e) {
      const msg = e?.response?.data?.msg || e?.response?.data?.message || "Unexpected error adding model.";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveSelectedRun = async () => {
    if (!selectedRunKey || selectedRunKey === "base") return;

    try {
      setRunsLoading(true);
      const resp = unwrap(await removeIssueScenario(selectedRunKey));
      if (!resp?.success) {
        setToast({ open: true, severity: "error", msg: resp?.message || resp?.msg || "Could not remove model." });
        return;
      }

      setToast({ open: true, severity: "success", msg: "Model removed." });
      const removedKey = selectedRunKey;

      setSelectedRunKey("base");
      setRunCache((prev) => {
        const next = { ...prev };
        delete next[removedKey];
        return next;
      });

      await refreshRuns(selectedIssue.id);
    } catch {
      setToast({ open: true, severity: "error", msg: "Unexpected error removing model." });
    } finally {
      setRunsLoading(false);
    }
  };

  const selectedModelNameView =
    viewIssue?.summary?.model ||
    viewIssue?.summary?.modelName ||
    viewIssue?.summary?.targetModelName ||
    viewIssue?.summary?.selectedModel ||
    viewIssue?.modelParams?.base?.modelName ||
    issue?.modelParams?.base?.modelName ||
    "—";

  const selectedModelParamsViewRaw =
    viewIssue?.modelParams?.base?.paramsSaved ||
    viewIssue?.modelParams?.base?.paramsResolved ||
    viewIssue?.summary?.modelParameters ||
    viewIssue?.summary?.parameters ||
    viewIssue?.summary?.params ||
    viewIssue?.summary?.modelParams ||
    null;

  const selectedModelParamsView = stripWeightsDeep(selectedModelParamsViewRaw || {});
  const paramsPretty = safeJsonStringify(selectedModelParamsView);

  const baseModelName = issue?.modelParams?.base?.modelName || "—";

  const baseModelSchemaFromCatalog =
    availableModels.find((m) => (m?.name || m?.modelName) === baseModelName) || null;

  const baseResolved = stripWeightsDeep(
    issue?.modelParams?.base?.paramsResolved || issue?.modelParams?.base?.paramsSaved || {}
  );

  const baseSchemaParams = filterOutWeightsParams(
    baseModelSchemaFromCatalog?.parameters || issue?.modelParams?.base?.parameters || []
  );

  const baseParamsForViewer = baseSchemaParams?.length ? baseSchemaParams : buildPseudoParametersFromValues(baseResolved);

  // -------- Selected run (simulation) --------
  const selectedRunModelName =
    viewIssue?.modelParams?.base?.modelName ||
    viewIssue?.summary?.targetModelName ||
    viewIssue?.summary?.modelName ||
    viewIssue?.summary?.model ||
    "—";

  const selectedResolved = stripWeightsDeep(
    viewIssue?.modelParams?.base?.paramsResolved || viewIssue?.modelParams?.base?.paramsSaved || {}
  );

  const selectedModelSchemaFromCatalog =
    availableModels.find((m) => (m?.name || m?.modelName) === selectedRunModelName) || null;

  const selectedSchemaParams = filterOutWeightsParams(
    selectedModelSchemaFromCatalog?.parameters || viewIssue?.modelParams?.base?.parameters || []
  );

  const selectedParamsForViewer = selectedSchemaParams?.length
    ? selectedSchemaParams
    : buildPseudoParametersFromValues(selectedResolved);

  const selectedRunMeta = useMemo(
    () => runs.find((r) => getRunId(r) === selectedRunKey) || null,
    [runs, selectedRunKey]
  );

  const selectedRunLabel = selectedRunKey === "base" ? "Base" : getRunLabel(selectedRunMeta);

  return (
    <GlassDialog
      open={openFinishedIssueDialog}
      onClose={handleCloseFinishedIssueDialog}
      fullScreen
      PaperProps={{
        elevation: 0,
        sx: {
          bgcolor: alpha("#070B10", 0.72),
          ...auroraBg(theme, 0.10),
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 1.5, md: 2.25 },
          pt: 1.35,
          pb: 1.15,
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          background: alpha("#0B1118", 0.55),
          backdropFilter: "blur(12px)",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(theme.palette.success.main, 0.14),
                color: "success.main",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <AssignmentTurnedInIcon />
            </Avatar>

            <Stack spacing={0.2} sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 980,
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={selectedIssue?.name || ""}
              >
                {selectedIssue?.name || "Finished issue"}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Pill tone={selectedRunKey === "base" ? "success" : "secondary"}>
                  {selectedRunKey === "base" ? "Base" : "Simulation"}
                </Pill>
                <Pill tone="info">{selectedModelNameView}</Pill>
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Remove issue" arrow>
              <IconButton
                onClick={() => setOpenRemoveConfirmDialog(true)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.error.main, 0.10),
                  "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.14) },
                }}
              >
                <DeleteOutlineIcon color="error" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Close" arrow>
              <IconButton
                onClick={handleCloseFinishedIssueDialog}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {showRounds ? (
          <Box sx={{ mt: 1.25 }}>
            <Tabs
              value={currentPhaseIndex}
              onChange={(_, v) => handleChangePhase(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              indicatorColor="secondary"
              textColor="inherit"
              sx={{
                minHeight: 40,
                "& .MuiTab-root": {
                  minHeight: 40,
                  textTransform: "none",
                  fontWeight: 950,
                  borderRadius: 999,
                  px: 2.0,
                  mr: 1,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                  border: "1px solid rgba(255,255,255,0.10)",
                },
                "& .MuiTab-root.Mui-selected": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  borderColor: alpha(theme.palette.secondary.main, 0.35),
                },
                "& .MuiTabs-indicator": { height: 0 },
              }}
            >
              {Array.from({ length: roundsCount }).map((_, idx) => (
                <Tab key={idx} label={`Round ${idx + 1}`} />
              ))}
            </Tabs>
          </Box>
        ) : null}
      </Box>

      {loadingInfo || !issue?.summary ? (
        <Backdrop open sx={{ zIndex: 999999 }}>
          <CircularLoading color="secondary" size={50} height="50vh" />
        </Backdrop>
      ) : (
        <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 2 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
              gridTemplateAreas: isMdUp
                ? `
                    "summary ranking"
                    "analysis analysis"
                    "models models"
                    "graphs graphs"
                    "ratings ratings"
                  `
                : `
                    "summary"
                    "ranking"
                    "analysis"
                    "models"
                    "graphs"
                    "ratings"
                  `,
              alignItems: "stretch",
            }}
          >
            <Box sx={{ gridArea: "summary", minWidth: 0 }}>
              <SectionCard title="Summary" icon={<AssignmentTurnedInIcon fontSize="small" />}>
                <Stack spacing={1.1}>
                  <Row label="Name" value={viewIssue?.summary?.name} />
                  <Row label="Admin" value={viewIssue?.summary?.admin} />

                  <SummaryAccordionRow
                    label="Description"
                    open={openDescriptionList}
                    onToggle={() => setOpenDescriptionList((v) => !v)}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 850, color: "text.primary" }}>
                      {viewIssue?.summary?.description || "—"}
                    </Typography>
                  </SummaryAccordionRow>

                  <Row label="Model" value={selectedModelNameView} />

                  {paramsPretty ? (
                    <SummaryAccordionRow
                      label="Model params (raw)"
                      open={openConsensusInfoList}
                      onToggle={() => setOpenConsensusInfoList((v) => !v)}
                    >
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          p: 1.25,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.background.paper, 0.08),
                          border: "1px solid rgba(255,255,255,0.10)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: 12,
                          fontWeight: 800,
                          color: alpha("#fff", 0.9),
                        }}
                      >
                        {paramsPretty}
                      </Box>
                    </SummaryAccordionRow>
                  ) : null}

                  {Array.isArray(viewIssue?.summary?.criteria) && viewIssue.summary.criteria.length > 1 ? (
                    <SummaryAccordionRow
                      label="Criteria"
                      open={openCriteriaList}
                      onToggle={() => setOpenCriteriaList((v) => !v)}
                    >
                      <List disablePadding sx={{ py: 0.25 }}>
                        {viewIssue.summary.criteria.map((criterion, index) => (
                          <CriterionItem key={index} criterion={criterion} isChild={false} />
                        ))}
                      </List>
                    </SummaryAccordionRow>
                  ) : (
                    <Row label="Criterion" value={viewIssue?.summary?.criteria?.[0]?.name} />
                  )}

                  <SummaryAccordionRow
                    label="Alternatives"
                    open={openAlternativeList}
                    onToggle={() => setOpenAlternativesList((v) => !v)}
                  >
                    <Stack spacing={0.5}>
                      {(viewIssue?.summary?.alternatives || []).map((alt, idx) => (
                        <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                          {alt}
                        </Typography>
                      ))}
                    </Stack>
                  </SummaryAccordionRow>

                  <SummaryAccordionRow
                    label="Experts"
                    open={openExpertsList}
                    onToggle={() => setOpenExpertsList((v) => !v)}
                    right={<Pill tone="info">{totalExperts}</Pill>}
                  >
                    <Stack spacing={1}>
                      <Stack spacing={0.5}>
                        {participated.map((e, idx) => (
                          <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                            {e}
                          </Typography>
                        ))}
                      </Stack>

                      {notAccepted.length ? (
                        <>
                          <Divider sx={{ opacity: 0.14 }} />
                          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
                            Not accepted
                          </Typography>
                          <Stack spacing={0.5}>
                            {notAccepted.map((e, idx) => (
                              <Typography key={idx} variant="body2" sx={{ fontWeight: 850 }}>
                                {e}
                              </Typography>
                            ))}
                          </Stack>
                        </>
                      ) : null}
                    </Stack>
                  </SummaryAccordionRow>

                  <Row label="Creation date" value={viewIssue?.summary?.creationDate} />
                  {viewIssue?.summary?.closureDate ? <Row label="Closure date" value={viewIssue.summary.closureDate} /> : null}
                </Stack>
              </SectionCard>
            </Box>

            <Box sx={{ gridArea: "ranking", minWidth: 0 }}>
              <SectionCard title="Results ranking" icon={<AssignmentTurnedInIcon fontSize="small" />}>
                {!viewIssue?.alternativesRankings ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    Ranking not available.
                  </Typography>
                ) : (
                  <List sx={{ width: "100%" }} disablePadding>
                    {ranking.map((item, index) => (
                      <ListItem key={item.name} sx={{ px: 0, py: 0.9 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%" spacing={2}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 980, opacity: 0.9 }}>
                              {index + 1}.
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 980,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                minWidth: 0,
                              }}
                              title={item.name}
                            >
                              {item.name}
                            </Typography>
                          </Stack>

                          <Chip
                            label={formatScore(item.score)}
                            variant="outlined"
                            color={index === 0 ? "success" : index === lastIndex ? "error" : "secondary"}
                            sx={{
                              fontWeight: 950,
                              borderColor: "rgba(255,255,255,0.18)",
                              bgcolor: alpha(theme.palette.background.paper, 0.08),
                            }}
                          />
                        </Stack>
                      </ListItem>
                    ))}
                  </List>
                )}
              </SectionCard>
            </Box>

            <Box sx={{ gridArea: "analysis", minWidth: 0 }}>
              <SectionCard title="Results analysis" icon={<AnalyticsIcon fontSize="small" />}>
                {!viewIssue?.consensusSection ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    Section is not available yet
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                    {viewIssue.consensusSection}
                  </Typography>
                )}
              </SectionCard>
            </Box>

            <Box sx={{ gridArea: "models", minWidth: 0 }}>
              <SectionCard
                title="Models"
                icon={<ScienceIcon fontSize="small" />}
                right={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {selectedRunKey !== "base" ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleRemoveSelectedRun}
                        sx={{ borderColor: "rgba(255,255,255,0.16)" }}
                      >
                        Remove
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={openAddDialog}
                      startIcon={<AddIcon />}
                      sx={{ borderColor: "rgba(255,255,255,0.16)" }}
                    >
                      Add model
                    </Button>
                  </Stack>
                }
              >
                <Stack spacing={1.4}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                    <Chip
                      icon={<LayersIcon />}
                      label="Base"
                      clickable
                      onClick={() => handleSelectRun("base")}
                      color={selectedRunKey === "base" ? "secondary" : "default"}
                      variant={selectedRunKey === "base" ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 950,
                        borderColor: "rgba(255,255,255,0.18)",
                        bgcolor: selectedRunKey === "base" ? alpha(theme.palette.secondary.main, 0.18) : "transparent",
                      }}
                    />

                    {runs.map((r) => {
                      const id = getRunId(r);
                      if (!id) return null;
                      const label = getRunLabel(r);
                      const selected = selectedRunKey === id;
                      return (
                        <Chip
                          key={id}
                          icon={<TuneIcon />}
                          label={label}
                          clickable
                          onClick={() => handleSelectRun(id)}
                          color={selected ? "secondary" : "default"}
                          variant={selected ? "filled" : "outlined"}
                          sx={{
                            fontWeight: 950,
                            borderColor: "rgba(255,255,255,0.18)",
                            bgcolor: selected ? alpha(theme.palette.secondary.main, 0.18) : "transparent",
                            maxWidth: 320,
                            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {runsLoading ? (
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      Loading models…
                    </Typography>
                  ) : null}

                  {selectedRunKey !== "base" && !viewIssue ? (
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      This model run is not available yet.
                    </Typography>
                  ) : null}

                  <Divider sx={{ opacity: 0.14 }} />

                  <SummaryAccordionRow
                    label="Parameters"
                    open={openParamsViewer}
                    onToggle={() => setOpenParamsViewer((v) => !v)}
                    right={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Pill tone="secondary">Method: {selectedRunKey === "base" ? baseModelName : selectedRunModelName}</Pill>
                        <Pill tone="info">{domainType ? `Domain: ${domainType}` : "domain: —"}</Pill>
                        {selectedRunKey === "base" ? <Pill tone="success">base</Pill> : <Pill tone="secondary">simulation</Pill>}
                      </Stack>
                    }
                  >
                    <Stack spacing={1.25}>
                      {/* ✅ SIEMPRE: Run seleccionado (si no es base) con MISMA UI */}
                      {selectedRunKey === "base" ? (
                        viewIssue ? (
                          <ModelParamsView
                            title="Base"
                            modelName={baseModelName}
                            parameters={baseParamsForViewer}
                            values={baseResolved}
                            leafNames={leafNames}
                          />
                        ) : (
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: 3,
                              bgcolor: alpha(theme.palette.background.paper, 0.08),
                              border: "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary" }}>
                              This simulation is not available yet.
                            </Typography>
                          </Box>
                        )
                      ) : <ModelParamsView
                        title={selectedRunLabel || "Simulation"}
                        modelName={selectedRunModelName}
                        parameters={selectedParamsForViewer}
                        values={selectedResolved}
                        leafNames={leafNames}
                      />}
                    </Stack>
                  </SummaryAccordionRow>
                </Stack>
              </SectionCard>
            </Box>

            <Box sx={{ gridArea: "graphs", minWidth: 0 }}>
              {viewIssue?.analyticalGraphs ? (
                <SectionCard
                  title="Analytical graphs"
                  icon={<AnalyticsIcon fontSize="small" />}
                  right={
                    activeStep === 0 && viewIssue?.analyticalGraphs?.scatterPlot ? (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => resetZoom(scatterPlotRef)}
                        sx={{ borderColor: "rgba(255,255,255,0.16)" }}
                      >
                        Reset zoom
                      </Button>
                    ) : null
                  }
                >
                  <Stack spacing={2} alignItems="center">
                    <Box sx={{ width: "100%", height: { xs: 290, md: 520 } }}>
                      {activeStep === 0 && viewIssue?.analyticalGraphs?.scatterPlot ? (
                        <AnalyticalScatterChart
                          data={viewIssue.analyticalGraphs.scatterPlot}
                          phase={currentPhaseIndex}
                          scatterPlotRef={scatterPlotRef}
                        />
                      ) : null}

                      {activeStep === 1 && viewIssue?.analyticalGraphs?.consensusLevelLineChart ? (
                        <AnalyticalConsensusLineChart
                          data={viewIssue.analyticalGraphs.consensusLevelLineChart}
                          consensusLevelChartRef={consensusLevelChartRef}
                        />
                      ) : null}
                    </Box>

                    {viewIssue?.analyticalGraphs?.consensusLevelLineChart?.data?.length > 1 ? (
                      <MobileStepper
                        variant="dots"
                        steps={2}
                        position="static"
                        activeStep={activeStep}
                        sx={{
                          width: "auto",
                          bgcolor: "transparent",
                          pb: 0,
                          "& .MuiMobileStepper-dot": { bgcolor: alpha(theme.palette.common.white, 0.26) },
                          "& .MuiMobileStepper-dotActive": { bgcolor: theme.palette.secondary.main },
                        }}
                        nextButton={
                          <Button size="small" onClick={handleNext} disabled={activeStep === 1} color="secondary" sx={{ mx: 1 }}>
                            {theme.direction === "rtl" ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                          </Button>
                        }
                        backButton={
                          <Button size="small" onClick={handleBack} disabled={activeStep === 0} color="secondary" sx={{ mx: 1 }}>
                            {theme.direction === "rtl" ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                          </Button>
                        }
                      />
                    ) : null}
                  </Stack>
                </SectionCard>
              ) : null}
            </Box>

            <Box sx={{ gridArea: "ratings", minWidth: 0 }}>
              <SectionCard title="Experts ratings" icon={<AnalyticsIcon fontSize="small" />}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    sx={{ width: "100%" }}
                  >
                    <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
                      <InputLabel color="info">Expert</InputLabel>
                      <Select
                        value={selectedExpert}
                        label="Expert"
                        color="info"
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedExpert(v);

                          if (isPairwise) {
                            const newCriteria = Object.keys(
                              viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[v] || {}
                            );
                            setSelectedCriterion(newCriteria[0] || "");
                          }
                        }}
                      >
                        {expertList.map((expert) => (
                          <MenuItem key={expert} value={expert}>
                            {expert}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {isPairwise ? (
                      <FormControl size="small" sx={{ width: { xs: "100%", sm: 280 } }}>
                        <InputLabel color="info">Criterion</InputLabel>
                        <Select
                          value={selectedCriterion}
                          label="Criterion"
                          color="info"
                          onChange={(e) => setSelectedCriterion(e.target.value)}
                        >
                          {criterionList.map((criterion) => (
                            <MenuItem key={criterion} value={criterion}>
                              {criterion}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : null}

                    <Box sx={{ flex: 1 }} />

                    {viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.collectiveEvaluations ? (
                      <ToggleButton
                        selected={showCollective}
                        onChange={() => setShowCollective((v) => !v)}
                        color="secondary"
                        sx={{
                          borderRadius: 3,
                          borderColor: "rgba(255,255,255,0.14)",
                          bgcolor: alpha(theme.palette.background.paper, 0.06),
                          "&.Mui-selected": {
                            bgcolor: alpha(theme.palette.secondary.main, 0.14),
                            borderColor: alpha(theme.palette.secondary.main, 0.30),
                          },
                        }}
                      >
                        Show collective
                      </ToggleButton>
                    ) : null}
                  </Stack>

                  <Divider sx={{ opacity: 0.14 }} />

                  {isPairwise ? (
                    <PairwiseMatrix
                      alternatives={viewIssue?.summary?.alternatives || []}
                      evaluations={evaluations}
                      collectiveEvaluations={collectiveEvaluations}
                      permitEdit={false}
                    />
                  ) : (
                    <Matrix
                      alternatives={viewIssue?.summary?.alternatives || []}
                      criteria={extractLeafCriteria(viewIssue?.summary?.criteria || []).map((c) => c.name)}
                      evaluations={evaluations}
                      collectiveEvaluations={collectiveEvaluations}
                      permitEdit={false}
                    />
                  )}
                </Stack>
              </SectionCard>
            </Box>
          </Box>

          {showRounds ? (
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "center" }}>
              <IconButton
                color="secondary"
                disabled={currentPhaseIndex === 0}
                onClick={() => handleChangePhase(currentPhaseIndex - 1)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>

              <IconButton
                color="secondary"
                disabled={currentPhaseIndex === roundsCount - 1}
                onClick={() => handleChangePhase(currentPhaseIndex + 1)}
                sx={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </Stack>
          ) : null}
        </Box>
      )}

      <Dialog
        open={addOpen}
        onClose={closeAddDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: 5,
            bgcolor: alpha("#0B1118", 0.72),
            ...auroraBg(theme, 0.10),
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.10)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 980 }}>Add model</DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ pt: 1 }}>
            <TextField
              label="Run name (optional)"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              size="small"
              fullWidth
            />

            <FormControl size="small" fullWidth>
              <InputLabel color="info">Model</InputLabel>
              <Select
                value={selectedModelName}
                label="Model"
                color="info"
                onChange={(e) => setSelectedModelName(e.target.value)}
              >
                {useSchemaAdd
                  ? availableModels.map((m) => {
                    const disabled = !isModelCompatible(m);
                    const reason = getCompatReason(m, domainType);
                    const label = m?.name || "—";

                    return (
                      <MenuItem key={label} value={label} disabled={disabled}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 900,
                              minWidth: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </Typography>

                          <Box sx={{ flex: 1 }} />

                          {disabled ? (
                            <Tooltip title={reason || "Incompatible"} arrow>
                              <Box>
                                <Pill tone="error">incompatible</Pill>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Pill tone="success">ok</Pill>
                          )}
                        </Stack>
                      </MenuItem>
                    );
                  })
                  : (modelsCatalog || []).map((m) => {
                    const name = m.name || m.model || m.id;
                    return (
                      <MenuItem key={name} value={name}>
                        {m.label || name}
                      </MenuItem>
                    );
                  })}
              </Select>
            </FormControl>

            {useSchemaAdd ? (
              <>
                <ScenarioParametersForm
                  model={selectedModelFromSchema}
                  values={scenarioParamValues}
                  setValues={setScenarioParamValues}
                  leafNames={leafNames}
                />

                {selectedModelFromSchema && filterOutWeightsParams(selectedModelFromSchema.parameters)?.length ? (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.25,
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.10)",
                      bgcolor: alpha(theme.palette.background.paper, 0.06),
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                      Tip: empty fields will use defaults (if any). Arrays must be complete.
                    </Typography>
                  </Box>
                ) : null}
              </>
            ) : (
              <>
                <TextField
                  label="Parameters (JSON)"
                  value={paramsJson}
                  onChange={(e) => setParamsJson(e.target.value)}
                  size="small"
                  fullWidth
                  multiline
                  minRows={6}
                  placeholder={`{\n  "alpha": 0.5,\n  "maxIter": 200\n}\n// don't include "weights"`}
                />

                {modelsLoading ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    Loading models…
                  </Typography>
                ) : null}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.25, pb: 2 }}>
          <Button onClick={closeAddDialog} variant="outlined" sx={{ borderColor: "rgba(255,255,255,0.16)" }}>
            Cancel
          </Button>
          <Button onClick={handleAddModelRun} variant="contained" color="secondary" disabled={addLoading}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ borderRadius: 3 }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </GlassDialog>
  );
};

export const AnalyticalScatterChart = ({ data, phase, scatterPlotRef }) => {
  const theme = useTheme();
  const current = data?.[phase];
  if (!current) return null;

  const expertPoints = Object.entries(current.expert_points || {}).map(([email, [x, y]]) => ({ x, y, email }));
  const collectivePoint = { x: current.collective_point?.[0], y: current.collective_point?.[1] };

  const chartData = {
    datasets: [
      {
        label: "Experts",
        data: expertPoints,
        backgroundColor: alpha(theme.palette.info.main, 0.85),
        pointRadius: 8,
        pointHoverRadius: 11,
      },
      {
        label: "Collective",
        data: [collectivePoint],
        backgroundColor: alpha(theme.palette.error.main, 0.95),
        pointRadius: 10,
        pointStyle: "rectRot",
        pointHoverRadius: 13,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: alpha("#fff", 0.85) },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const { datasetIndex, raw } = ctx;
            if (datasetIndex === 0) return `${raw.email} (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
            return `Collective (${raw.x.toFixed(2)}, ${raw.y.toFixed(2)})`;
          },
        },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
        pan: { enabled: true, mode: "xy" },
      },
    },
    scales: {
      x: {
        min: -1,
        max: 1,
        type: "linear",
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85) },
      },
      y: {
        min: -1,
        max: 1,
        grid: { color: alpha("#fff", 0.14) },
        ticks: { color: alpha("#fff", 0.85), stepSize: 0.4 },
      },
    },
  };

  return <Scatter ref={scatterPlotRef} data={chartData} options={chartOptions} />;
};

export const AnalyticalConsensusLineChart = ({ data, consensusLevelChartRef }) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data?.labels || !data?.data || !canvasRef.current) return;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const chartData = {
      labels: data.labels,
      datasets: [
        {
          label: "Consensus level",
          data: data.data,
          borderColor: alpha(theme.palette.secondary.main, 0.95),
          backgroundColor: alpha(theme.palette.secondary.main, 0.18),
          tension: 0.2,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 9,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Level: ${(ctx.raw * 100).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Round", color: alpha("#fff", 0.85) },
          ticks: { color: alpha("#fff", 0.85) },
          grid: { color: alpha("#fff", 0.14) },
        },
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: "Consensus level (%)", color: alpha("#fff", 0.85) },
          ticks: {
            color: alpha("#fff", 0.85),
            stepSize: 0.2,
            callback: (v) => `${(v * 100).toFixed(0)}`,
          },
          grid: { color: alpha("#fff", 0.14) },
        },
      },
    };

    const newChart = new Chart(canvasRef.current, { type: "line", data: chartData, options: chartOptions });
    chartInstanceRef.current = newChart;

    if (consensusLevelChartRef) {
      consensusLevelChartRef.current = { resetZoom: () => newChart.resetZoom?.() };
    }

    return () => newChart.destroy();
  }, [data, theme.palette.secondary.main, consensusLevelChartRef]);

  return <canvas ref={canvasRef} />;
};