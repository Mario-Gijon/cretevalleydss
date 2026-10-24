import { Chip, Stack, Typography } from "@mui/material";

const categoryLabel = (category) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  return label || "Saved category";
};

export const OrderedCategoriesParameterReadOnly = ({ value }) => {
  const categories = Array.isArray(value) ? value : [];
  if (!categories.length) {
    return <Typography variant="body2" color="text.secondary">No categories configured.</Typography>;
  }

  return (
    <Stack spacing={0.65} role="list" aria-label="Categories from least to most preferred">
      {categories.map((category, index) => (
        <Stack key={category?.categoryId || `category-${index}`} direction="row" spacing={0.8} alignItems="center" role="listitem">
          <Chip size="small" variant="outlined" color="secondary" label={`${index + 1}`} />
          <Typography variant="body2" sx={{ fontWeight: 750 }}>{categoryLabel(category)}</Typography>
        </Stack>
      ))}
    </Stack>
  );
};

export default OrderedCategoriesParameterReadOnly;
