# Implement twoTupleAggregation Frontend — Agent prompt

Target package:

```text
Frontend/src/features/decisionPlugins/modelParameters/fields/twoTupleAggregation/
```

Read generated files/guide, matching Backend, theme/global styles and a nearby
Parameter Structure.

## Developer requirements

### Parameter Structure description
[PARAMETER STRUCTURE DESCRIPTION]

### Canonical value shape
[VALUE SHAPE]

### Desired UI / behavior
[DESIRED UI / BEHAVIOR]

### Additional requirements
[ADDITIONAL REQUIREMENTS]

### Actual runtime input — optional
[ACTUAL RUNTIME INPUT]

Preserve Field and ReadOnly public contracts. `onChange(nextValue)` replaces the
complete canonical value.


## Exact CreteValleyDSS Frontend/theme context

CreteValleyDSS already mounts the application with Material UI:

```jsx
<ThemeProvider theme={theme} disableTransitionOnChange>
  <CssBaseline enableColorScheme />
  <GlobalStyles styles={appGlobalStyles} />
  ...
</ThemeProvider>
```

Do not create another `ThemeProvider`, global theme or parallel design system.

The application uses `@mui/material` and supports both light and dark schemes.

The current theme contract is:

```js
const FONT_FAMILY = "Source Sans Pro, Arial, sans-serif";

let theme = extendTheme({
  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    h1: { fontWeight: "bold" },
    h2: { fontWeight: "bold" },
    h3: { fontWeight: "bold" },
    h4: { fontWeight: "bold" },
    h5: { fontWeight: "bold" },
    h6: { fontWeight: "bold" },
    subtitle1: { fontWeight: "normal" },
    subtitle2: { fontWeight: "bold" },
    body1: { fontWeight: "normal" },
    body2: { fontWeight: "normal" },
    button: { fontWeight: "bold" },
    caption: { fontWeight: "normal" },
    overline: { fontWeight: "normal" },
  },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: "#134F8A",
          light: "#134F8A",
        },
        secondary: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
        background: {
          default: "#F5F0F6",
          paper: "#FFFFFF",
        },
        text: {
          primary: "#1D1D1B",
          secondary: "#545454",
          disabled: "#134F8A",
        },
        info: {
          main: "#45C5C5",
          contrastText: "#fff",
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: "#224261",
          light: "#45C5C5",
        },
        secondary: {
          main: "#45C5C5",
        },
        background: {
          default: "#1D1D1B",
          paper: "#262B32",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#BFBFBF",
          disabled: "#9AECA4",
          info: "#45C5C5",
        },
        info: {
          main: "#45C5C5",
        },
      },
    },
  },
  colorSchemeSelector: "class",
});
```

Prefer semantic theme values in `sx` rather than copying literal colors:

```js
bgcolor: "background.paper"
color: "text.primary"
borderColor: "divider"
```

Use `secondary`/`info` accents for selected or interactive states when useful.

The app's plugin UI is intentionally compact:

- use `Stack`, `Box`, `Paper`, `Typography`, `Alert`, `Button`,
  `IconButton`, `TextField`, `Select`, etc. from Material UI as appropriate;
- prefer spacing around 1–1.5 theme units for compact plugin surfaces;
- prefer modest padding around 1–1.5 units;
- `borderRadius: 2` is a common compact surface radius;
- use subtle borders/dividers;
- use `body2` or `caption` for explanations;
- avoid giant cards, large empty areas and oversized controls;
- make selected/active states clear but restrained;
- wrap/reflow on narrow screens rather than assuming a fixed wide layout;
- preserve accessibility and do not communicate meaning only through color.

Do not introduce Tailwind, Bootstrap, styled-components, another component
library, a new ThemeProvider or a new global CSS architecture.

Prefer MUI `sx`. Extract `styles/<ComponentName>.styles.js` only when styling is
large enough that extraction improves readability.


Current repository theme wins if changed since this embedded reference.


## React implementation rules

Prefer the simplest state model that satisfies the UI:

- host-provided `evaluation`/`value` is the source of truth;
- treat props and nested objects/arrays as immutable;
- do not mirror props into component state without a genuine interaction/lifecycle
  requirement;
- do not add `useEffect` merely to synchronize a value that can be derived during
  render;
- derive inexpensive values directly;
- use `useMemo`/`useCallback` only for a concrete reason;
- do not create a custom hook for a single local use;
- do not fetch data already provided through `decisionContext` or
  `parameterContext`;
- do not create compatibility aliases or alternate payload shapes unless the
  supplied public contract requires them;
- do not add dependencies when React, Material UI and platform APIs are enough.



## Reference Frontend Parameter Structure convention

A current numeric field uses Material UI and the canonical `onChange(nextValue)`
boundary like this:

```jsx
import { Stack, Typography, TextField } from "@mui/material";

export const NumberGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const { restrictions = {}, label, valueType } = parameter;
  const isInteger = valueType === "integer";
  const min = Number.isFinite(restrictions.min)
    ? restrictions.min
    : undefined;
  const max = Number.isFinite(restrictions.max)
    ? restrictions.max
    : undefined;

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2">
          {label}:
        </Typography>

        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          size="small"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          inputProps={{
            "aria-label": label,
            min,
            max,
            step: isInteger ? 1 : "any",
          }}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error || ""}
        />
      </Stack>
    </Stack>
  );
};
```

This is a style/API reference only. Do not assume the new parameter is numeric.


Reuse Expression Domain UI only when the parameter is explicitly a
criterion-domain value.

Use `"ready"` when requested UI behavior is complete.

Tests are outside scope. Do not create/modify/run tests unless requested.

Run targeted lint/static/build checks when practical plus `git diff --check`.

Report files changed, canonical emitted value, context/domain usage, visual
conventions, status and validation.
