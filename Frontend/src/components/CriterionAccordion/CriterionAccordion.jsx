
import { Typography, Stack, Chip, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export const CriterionAccordion = ({ criterion, elevation = 1 }) => {
  return (
    <Accordion variant="outlined" disableGutters elevation={elevation} square={false}>
      <AccordionSummary
        expandIcon={criterion.children.length > 0 ? <ExpandMoreIcon /> : null}
        sx={{
          m: 0,
          pl: 1,
          pointerEvents: criterion.children.length === 0 && "none",
          "&:before": { display: "none" },
        }}
      >
        <Stack direction={"row"} spacing={1.5}>
          <Typography variant="body1" sx={{ color: "text.primary" }}>
            {criterion.name}
          </Typography>
          {elevation === 1 &&
            <Chip
              variant="outlined"
              label={criterion.type === "cost" ? "Cost" : "Benefit"}
              color={criterion.type === "cost" ? "error" : "success"}
              size="small"
            />
          }

        </Stack>
      </AccordionSummary>

      {/* Si tiene hijos, mostrarlos en un nuevo Accordion dentro de AccordionDetails */}
      {criterion.children.length > 0 && (
        <AccordionDetails sx={{ pl: 2, pt: 0, pb: elevation === 1 ? 1.5 : 0 }}>
          <Stack spacing={0}>
            {criterion.children.map((child, index) => (
              <CriterionAccordion key={index} criterion={child} elevation={0} />
            ))}
          </Stack>
        </AccordionDetails>
      )}
    </Accordion>
  );
};