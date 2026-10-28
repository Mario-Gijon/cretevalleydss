import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import { decisionMatrixSurface } from "../../../../shared/styles/decisionMatrixSurface.styles.js";
import SaatyComparisonSelect from "./SaatyComparisonSelect.jsx";
import {
  getAlternativeToProfileValue,
  getOrientedProfileComparisonValue,
} from "../operations/evaluationPayload.js";

const tableSx = {
  width: "max-content",
  minWidth: "100%",
  "& th": {
    bgcolor: decisionMatrixSurface.headerBackground,
    borderBottom: decisionMatrixSurface.cellBorder,
    fontWeight: 800,
  },
  "& td": {
    bgcolor: decisionMatrixSurface.cellBackground,
    borderBottom: decisionMatrixSurface.cellBorder,
    borderRight: decisionMatrixSurface.cellBorder,
  },
  "& tr:last-of-type td, & tr:last-of-type th": { borderBottom: 0 },
};

const matrixCellSx = (theme) => ({
  minWidth: 155,
  px: 0.6,
  py: 0.45,
  textAlign: "center",
  "& > *": { justifyContent: "center" },
  "&:hover": { bgcolor: alpha(theme.palette.info.main, 0.055) },
});

const RowLabel = ({ children }) => (
  <TableCell component="th" scope="row" sx={{ minWidth: 170, maxWidth: 260 }}>
    <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: "anywhere" }}>
      {children}
    </Typography>
  </TableCell>
);

export const AlternativeProfileComparisonsTable = ({
  alternatives,
  profiles,
  criterion,
  assessment,
  onChange,
  readOnly,
}) => (
  <TableContainer
    sx={{
      width: "100%",
      minWidth: 0,
      overflowX: "auto",
      overscrollBehaviorX: "contain",
      border: "1px solid rgba(255,255,255,0.075)",
      borderRadius: 1.25,
    }}
  >
    <Table size="small" stickyHeader aria-label={`${criterion.name} alternative to profile comparisons`} sx={tableSx}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ minWidth: 170 }}>Alternative / profile</TableCell>
          {profiles.map((profile) => (
            <TableCell key={profile.profileId} sx={{ minWidth: 155, maxWidth: 230 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                {profile.label}
              </Typography>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {alternatives.map((alternative) => (
          <TableRow key={alternative.id} hover>
            <RowLabel>{alternative.name}</RowLabel>
            {profiles.map((profile) => {
              const ariaLabel = `Compare ${alternative.name} with ${profile.label} for ${criterion.name}`;
              return (
                <TableCell key={profile.profileId} sx={matrixCellSx}>
                  <SaatyComparisonSelect
                    ariaLabel={ariaLabel}
                    value={getAlternativeValue({ assessment, alternative, criterion, profile })}
                    onChange={(value) => onChange({ alternative, profile, value })}
                    readOnly={readOnly}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const getAlternativeValue = ({ assessment, alternative, criterion, profile }) =>
  getAlternativeToProfileValue({
    assessment,
    criterionId: criterion.id,
    alternativeId: alternative.id,
    profileId: profile.profileId,
  });

export const ProfileComparisonsTable = ({
  profiles,
  criterion,
  assessment,
  onChange,
  readOnly,
}) => {
  if (profiles.length < 2) {
    return (
      <Typography variant="body2" color="text.secondary" role="status">
        One profile is configured, so no profile-to-profile comparisons are needed.
      </Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        width: "100%",
        minWidth: 0,
        overflowX: "auto",
        overscrollBehaviorX: "contain",
        border: "1px solid rgba(255,255,255,0.075)",
        borderRadius: 1.25,
      }}
    >
      <Table size="small" stickyHeader aria-label={`${criterion.name} profile comparisons`} sx={tableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 170 }}>Profile / profile</TableCell>
            {profiles.map((profile) => (
              <TableCell key={profile.profileId} sx={{ minWidth: 155, maxWidth: 230 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                  {profile.label}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {profiles.map((rowProfile) => (
            <TableRow key={rowProfile.profileId} hover>
              <RowLabel>{rowProfile.label}</RowLabel>
              {profiles.map((columnProfile) => {
                const diagonal = rowProfile.profileId === columnProfile.profileId;
                const ariaLabel = `Compare ${rowProfile.label} with ${columnProfile.label} for ${criterion.name}`;
                return (
                  <TableCell
                    key={columnProfile.profileId}
                    sx={(theme) => ({
                      ...matrixCellSx(theme),
                      ...(diagonal ? {
                        bgcolor: "#000000",
                        color: "text.disabled",
                        pointerEvents: "none",
                        fontWeight: 800,
                      } : {}),
                    })}
                  >
                    {diagonal ? (
                      <Box aria-label="Neutral profile self-comparison">1 — Neutral</Box>
                    ) : (
                      <SaatyComparisonSelect
                        ariaLabel={ariaLabel}
                        value={getProfileValue({ assessment, criterion, rowProfile, columnProfile })}
                        onChange={(value) => onChange({ rowProfile, columnProfile, value })}
                        readOnly={readOnly}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const getProfileValue = ({ assessment, criterion, rowProfile, columnProfile }) => {
  return getOrientedProfileComparisonValue({
    assessment,
    criterionId: criterion.id,
    rowProfileId: rowProfile.profileId,
    columnProfileId: columnProfile.profileId,
  });
};

export default AlternativeProfileComparisonsTable;
