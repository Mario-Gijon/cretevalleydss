import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { theme } from "../../src/theme/appTheme.js";

describe("application MUI form-control defaults", () => {
  it("defaults text inputs and selects to secondary while preserving explicit and state colors", () => {
    render(
      <ThemeProvider theme={theme}>
        <TextField label="Name" />
        <TextField label="Error field" error />
        <TextField label="Disabled field" disabled />
        <TextField label="Primary field" color="primary" />
        <FormControl>
          <InputLabel id="choice-label">Choice</InputLabel>
          <Select labelId="choice-label" label="Choice" value="one" onChange={() => {}}>
            <MenuItem value="one">One</MenuItem>
          </Select>
        </FormControl>
      </ThemeProvider>
    );

    const input = screen.getByLabelText("Name");
    expect(input.parentElement).toHaveClass("MuiInputBase-colorSecondary");

    fireEvent.focus(input);
    expect(input.parentElement).toHaveClass("Mui-focused");
    expect(input.labels[0]).toHaveClass("Mui-focused");

    expect(screen.getByLabelText("Error field").parentElement).toHaveClass("Mui-error");
    expect(screen.getByLabelText("Disabled field").parentElement).toHaveClass("Mui-disabled");
    expect(screen.getByLabelText("Primary field").parentElement).not.toHaveClass("MuiInputBase-colorSecondary");
    expect(screen.getByRole("combobox").parentElement).toHaveClass("MuiInputBase-colorSecondary");
  });
});
