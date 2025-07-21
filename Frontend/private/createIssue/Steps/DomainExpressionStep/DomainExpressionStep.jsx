import { Divider, InputLabel, ListSubheader, Paper, Stack } from "@mui/material";
import { Fragment, useState } from "react";
import { Typography, Select, MenuItem, FormControl } from "@mui/material";
import { updateCriterionRecursively, getLeafCriteria } from "../../../../src/utils/createIssueUtils";

export const DomainExpressionStep = ({ allData, dataTypes, setDataTypes, dataTypeOptions }) => {

  const { selectedModel, addedExperts, alternatives, criteria } = allData;
  const [alternativeTypes, setAlternativeTypes] = useState({});

  const handleChange = (expertIndex, altIndex, critPath, value) => {
    setDataTypes((prev) => ({
      ...prev,
      [`${expertIndex}-${altIndex}-${critPath}`]: value,
    }));
  };

  const handleAlternativeChange = (expertIndex, altIndex, value) => {
    setAlternativeTypes((prev) => ({ ...prev, [`${expertIndex}-${altIndex}`]: value }));

    setDataTypes((prev) =>
      updateCriterionRecursively(criteria, expertIndex, altIndex, value, { ...prev })
    );
  };

  return (
    <Paper
      variant="elevation"
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: 2,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        maxWidth: "95vw",
        width: { xs: "95vw", sm: "auto" },
      }}
    >
      {!selectedModel || addedExperts.length === 0 || alternatives.length === 0 || criteria.length === 0 ? (
        <Typography variant="h5">You must finish previous steps</Typography>
      ) : (
        <Stack spacing={8} sx={{ maxHeight: "65vh", overflowY: "auto" }}>
          {addedExperts.map((expert, expertIndex) => (
            <Stack key={expertIndex} justifyContent="center" useFlexGap flexGrow={1} sx={{ width: "100%" }} spacing={2}>
              <Stack spacing={3}>
                <Typography variant="h5" textAlign={"center"}>
                  {expert}
                </Typography>
                <Divider />
              </Stack>
              <Stack justifyContent={"center"} width={"100%"} spacing={4}>
                {alternatives.map((alternative, altIndex) => (
                  <Fragment key={altIndex}>
                    <Stack justifyContent={"center"} useFlexGap flexGrow={1} sx={{ width: "100%" }} spacing={2}>
                      {/* Selector para cambiar todos los criterios de una alternativa */}
                      <Stack direction={{ sm: "row" }} spacing={{ xs: 2, sm: 5 }} justifyContent={"flex-start"} flexGrow={1} width={"100%"} alignItems={"flex-start"}>
                        <Typography
                          variant="h6"
                          textAlign="start"
                          sx={{
                            wordBreak: "break-word",
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "normal",
                          }}
                        >
                          {alternative}
                        </Typography>
                        <Stack justifyContent={"flex-start"} alignItems={"flex-end"} width={{ xs: "100%", sm: "auto" }}>
                          <FormControl sx={{ width: { xs: "100%", sm: 150 } }}>
                            <Select
                              color="info"
                              size="small"
                              value={alternativeTypes[`${expertIndex}-${altIndex}`] || ""}
                              onChange={(e) => handleAlternativeChange(expertIndex, altIndex, e.target.value)}
                            >
                              {dataTypeOptions.flatMap((group, groupIndex) =>
                                group.options
                                  ? [
                                    <ListSubheader key={`header-${groupIndex}`}><em>{group.label}</em></ListSubheader>,
                                    ...group.options.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    )),
                                  ]
                                  : [
                                    <MenuItem key={group.value} value={group.value}>
                                      {group.label}
                                    </MenuItem>,
                                  ]
                              )}
                            </Select>
                          </FormControl>
                        </Stack>
                      </Stack>
                      <Stack width={"100%"} minWidth={{ xs: "auto", sm: "75vw", lg: 1000 }} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={"space-between"}>
                        {getLeafCriteria(criteria).map((criterion, critIndex) => (
                          <Stack width={"100%"} key={critIndex}>
                            <InputLabel>{criterion.name}</InputLabel>
                            <FormControl fullWidth>
                              <Select
                                color="info"
                                size="small"
                                value={dataTypes[`${expertIndex}-${altIndex}-${criterion.path}`] || ""}
                                onChange={(e) => handleChange(expertIndex, altIndex, criterion.path, e.target.value)}
                              >
                                {dataTypeOptions.flatMap((group, groupIndex) =>
                                  group.options
                                    ? [
                                      <ListSubheader key={`header-${groupIndex}`}><em>{group.label}</em></ListSubheader>,
                                      ...group.options.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                          {option.label}
                                        </MenuItem>
                                      )),
                                    ]
                                    : [
                                      <MenuItem key={group.value} value={group.value}>
                                        {group.label}
                                      </MenuItem>,
                                    ]
                                )}
                              </Select>
                            </FormControl>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                    {altIndex !== alternatives.length - 1 && <Divider />}
                  </Fragment>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
};