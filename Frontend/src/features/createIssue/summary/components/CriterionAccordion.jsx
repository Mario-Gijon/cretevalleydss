import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Divider,
  Stack,
  Typography,
  styled,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const GlassAccordion = styled(Accordion)(() => ({
  transition: "transform 0.2s, boxShadow 0.2s, background 0.3s",
  background: "rgba(131, 211, 245, 0.02)",
  color: "#FFFFFF",
  backdropFilter: "blur(15px)",
  WebkitBackdropFilter: "blur(15px)",
  "&:before": {
    display: "none",
  },
  "&.Mui-expanded": {
    background: "rgba(131, 211, 245, 0.02)",
  },
}));

export const CriterionAccordion = ({ criterion, weightMap, elevation = 1 }) => {
  const isLeaf = !criterion.children || criterion.children.length === 0;

  const weight = weightMap?.[criterion.name];

  const formatWeight = (num) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);

  return (
    <GlassAccordion disableGutters elevation={elevation} square={false}>
      <AccordionSummary
        expandIcon={!isLeaf ? <ExpandMoreIcon /> : null}
        sx={{
          m: 0,
          pl: 1,
          pointerEvents: isLeaf ? "none" : "auto",
        }}
      >
        <Stack direction={"row"} spacing={2} alignItems={"center"} justifyContent={"space-between"} width={"100%"}>
          <Stack direction={"row"} spacing={2} alignItems={"center"}>
            <Typography variant="body1" sx={{ color: "#FFFFFF" }}>
              {criterion.name}
            </Typography>
            {elevation === 1 && (
              <Chip
                variant="outlined"
                label={criterion.type === "cost" ? "Cost" : "Benefit"}
                color={criterion.type === "cost" ? "error" : "success"}
                size="small"
              />
            )}
          </Stack>

          <Stack direction={"row"} spacing={1.5} alignItems={"center"}>
            <Divider flexItem orientation="vertical" />
            <Stack minWidth={42}>
              {isLeaf && weight != null && (
                <Chip
                  variant="outlined"
                  label={`${formatWeight(Number(weight))}`}
                  color="secondary"
                  size="small"
                />
              )}
            </Stack>
          </Stack>
        </Stack>
      </AccordionSummary>
      {!isLeaf && (
        <AccordionDetails sx={{ pl: 2, pt: 0, pb: elevation === 1 ? 1.5 : 1 }}>
          <Stack spacing={0}>
            {criterion.children.map((child, index) => (
              <CriterionAccordion
                key={index}
                criterion={child}
                weightMap={weightMap}
                elevation={0}
              />
            ))}
          </Stack>
        </AccordionDetails>
      )}
    </GlassAccordion>
  );
};
