import { useMemo, useState } from "react";
import { Table, TableHead, TableCell, TableBody, TableRow, IconButton, TextField, Stack, TableContainer, Chip, styled, Button } from "@mui/material";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { removeAccents } from "../../../../src/utils/createIssueUtils";
import { tableCellClasses } from '@mui/material/TableCell';
import { GlassPaper } from "../../../../src/components/StyledComponents/GlassPaper";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: "#26495b5a",
    color: theme.palette.common.white,
    fontSize: theme.typography.body1.fontSize,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 34,
  },
}));

export const ExpertsStep = ({ initialExperts, addedExperts, setAddedExperts, closeAddExpertsDialog = false }) => {
  const [searchFilter, setSearchFilter] = useState(""); // Un único filtro para todo

  // Filtrar expertos para eliminar los que ya han sido añadidos
  const experts = initialExperts.filter(expert => !addedExperts.includes(expert.email));

  // Filtrar la lista de expertos según el filtro único
  const filteredExperts = useMemo(() => {
    return experts.filter(expert =>
      removeAccents(expert.name.toLowerCase()).includes(removeAccents(searchFilter.toLowerCase())) ||
      removeAccents(expert.email.toLowerCase()).includes(removeAccents(searchFilter.toLowerCase())) ||
      removeAccents(expert.university.toLowerCase()).includes(removeAccents(searchFilter.toLowerCase()))
    );
  }, [experts, searchFilter]);

  const handleAddExpert = (email) => {
    setAddedExperts((prev) => [...prev, email]);
  };

  const handleDeleteExpert = (email) => {
    setAddedExperts((prev) => prev.filter(expertEmail => expertEmail !== email));
  };

  return (
    <GlassPaper
      variant="elevation"
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        pb: { xs: 1, sm: 2, md: 3 },
        borderRadius: 2,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        maxWidth: { xs: "95vw", lg: "65vw" },
        minWidth: { xs: "80vw", sm: "90vw", md: "90vw", lg: "50vw" },
        boxShadow: "0 8px 24px rgba(29, 82, 81, 0.1)",
      }}
    >
      <Stack spacing={2} justifyContent={"center"} alignItems={"center"}>
        {/* Filtros de búsqueda */}
        <Stack width={"100%"} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={"space-between"}>
          <TextField
            label="Search by Name, Email or University"
            variant="outlined"
            color="info"
            size="small"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            autoComplete="off"
            fullWidth
          />
        </Stack>
        {/* Chips para los expertos añadidos */}
        <Stack flexWrap={"wrap"} direction="row" gap={1} sx={{ display: addedExperts.length > 0 ? "flex" : "none", width: "100%" }}>
          {addedExperts.map((email, index) => (
            <Chip
              variant="outlined"
              key={index}
              label={email}
              onDelete={() => handleDeleteExpert(email)}

            />
          ))}
        </Stack>
        {/* Tabla de expertos */}
        <TableContainer sx={{ maxHeight: "50vh" }}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell>Name</StyledTableCell>
                <StyledTableCell>Email</StyledTableCell>
                <StyledTableCell>University</StyledTableCell>
                <StyledTableCell>Add</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExperts.map((expert) => (
                <TableRow key={expert.email}>
                  <TableCell>{expert.name}</TableCell>
                  <TableCell>{expert.email}</TableCell>
                  <TableCell>{expert.university}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleAddExpert(expert.email)}>
                      <AddCircleIcon color="success" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {closeAddExpertsDialog &&
          <Stack direction={{sx: "column-reverse",sm: "row"}} spacing={2} justifyContent={"flex-end"} width={"100%"} sx={{ pt: 1 }}>
            <Button onClick={closeAddExpertsDialog.closeAddExpertsDialog} color="info" variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={closeAddExpertsDialog.closeAddExpertsDialog}
              variant="outlined"
              color="success"
            >
              Add Selected
            </Button>
          </Stack>

        }


      </Stack>

    </GlassPaper>
  );
};
