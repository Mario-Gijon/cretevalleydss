import {
  Box,
  Button,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

import { AppDialog } from "../../../components/StyledComponents/AppDialog";
import {
  getEducationalList,
  getModelDescription,
  getModelDisplayName,
  getMoreInfoUrl,
  hasModelEducation,
} from "../logic/modelCatalog";

const DetailBlock = ({ title, children }) => (
  <Stack spacing={0.65}>
    <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 900 }}>
      {title}
    </Typography>
    {children}
  </Stack>
);

const EducationalList = ({ items, icon, color }) => (
  <List component="ul" dense disablePadding sx={{ py: 0 }}>
    {items.map((item) => (
      <ListItem key={item} component="li" disableGutters sx={{ alignItems: "flex-start", py: 0.2 }}>
        <ListItemIcon sx={{ minWidth: 30, color, mt: 0.1 }}>{icon}</ListItemIcon>
        <ListItemText primary={item} primaryTypographyProps={{ variant: "body2", color: "text.secondary" }} />
      </ListItem>
    ))}
  </List>
);

/**
 * Diálogo educativo de detalle para un modelo del catálogo.
 *
 * @param {object} props Propiedades del componente.
 * @returns {JSX.Element|null}
 */
const ModelDetailsDialog = ({ model, familyLabel, open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  if (!model) {
    return null;
  }

  const section = model?.modelSection && typeof model.modelSection === "object"
    ? model.modelSection
    : {};
  const whatItDoes = typeof section.whatItDoes === "string" ? section.whatItDoes.trim() : "";
  const whenToUse = typeof section.whenToUse === "string" ? section.whenToUse.trim() : "";
  const advantages = getEducationalList(section.advantages);
  const limitations = getEducationalList(section.limitations);
  const moreInfoUrl = getMoreInfoUrl(model.moreInfoUrl);
  const description = getModelDescription(model);

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={
        <Stack spacing={0.55} sx={{ minWidth: 0 }}>
          <Box>
            <Typography
              component="span"
              variant="overline"
              sx={{
                display: "inline-flex",
                px: 0.9,
                py: 0.2,
                borderRadius: 999,
                color: "secondary.main",
                border: "1px solid rgba(69, 197, 197, 0.28)",
                lineHeight: 1.5,
                fontWeight: 850,
              }}
            >
              {familyLabel}
            </Typography>
          </Box>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 950, overflowWrap: "anywhere" }}>
            {getModelDisplayName(model)}
          </Typography>
          {description ? (
            <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
              {description}
            </Typography>
          ) : null}
        </Stack>
      }
      icon={<InfoOutlinedIcon />}
      titleId="model-details-dialog-title"
      maxWidth="md"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          border: "1px solid rgba(255,255,255,0.12)",
          backgroundColor: alpha(theme.palette.background.paper, 0.94),
          backgroundImage: `linear-gradient(180deg, ${alpha(
            theme.palette.secondary.main,
            0.055
          )}, transparent 28%), radial-gradient(720px 280px at 0% 0%, ${alpha(
            theme.palette.info.main,
            0.1
          )}, transparent 68%)`,
          backgroundClip: "padding-box",
        },
      }}
    >
      <DialogContent dividers sx={{ borderColor: alpha(theme.palette.common.white, 0.1) }}>
        <Stack spacing={2}>
          {hasModelEducation(model) ? (
            <Stack spacing={2}>
              {whatItDoes ? (
                <DetailBlock title="What does it do?">
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {whatItDoes}
                  </Typography>
                </DetailBlock>
              ) : null}

              {whenToUse ? (
                <DetailBlock title="When should I use it?">
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {whenToUse}
                  </Typography>
                </DetailBlock>
              ) : null}

              {advantages.length > 0 ? (
                <DetailBlock title="Advantages">
                  <EducationalList
                    items={advantages}
                    icon={<CheckCircleOutlineIcon fontSize="small" />}
                    color={alpha(theme.palette.success.main, 0.82)}
                  />
                </DetailBlock>
              ) : null}

              {limitations.length > 0 ? (
                <DetailBlock title="Limitations">
                  <EducationalList
                    items={limitations}
                    icon={<ReportProblemOutlinedIcon fontSize="small" />}
                    color={alpha(theme.palette.warning.main, 0.82)}
                  />
                </DetailBlock>
              ) : null}
            </Stack>
          ) : (
            <Box
              sx={{
                p: 1.35,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.09)",
                bgcolor: alpha(theme.palette.common.white, 0.035),
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Additional educational information is not available yet.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      {moreInfoUrl ? (
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.25, justifyContent: "flex-start" }}>
          <Button
            component="a"
            href={moreInfoUrl}
            target="_blank"
            rel="noopener noreferrer"
            color="secondary"
            startIcon={<LaunchIcon />}
          >
            Further information
          </Button>
        </DialogActions>
      ) : null}
    </AppDialog>
  );
};

export default ModelDetailsDialog;
