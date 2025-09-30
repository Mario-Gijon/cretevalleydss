// ✅ hojas = todos los criterios terminales (raíz sin hijos o hijos hoja)
export const getLeafCriteria = (criteria) => {
  const leaves = [];
  const traverse = (nodes) => {
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        traverse(node.children);
      }
    });
  };
  traverse(criteria || []);
  return leaves;
};

// ✅ "mixed" si hay más de un valor distinto, null si no hay ninguno
export const getMixedOrValue = (values) => {
  const unique = [...new Set(values.filter((v) => v !== undefined && v !== null))];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return "mixed";
  return null;
};

// ✅ construir todo con un defaultValue dado
export const buildInitialAssignments = (experts, alternatives, leafCriteria, defaultValue) => {
  const base = { experts: {} };
  experts.forEach((exp) => {
    base.experts[exp] = { alternatives: {} };
    alternatives.forEach((alt) => {
      base.experts[exp].alternatives[alt] = { criteria: {} };
      leafCriteria.forEach((crit) => {
        base.experts[exp].alternatives[alt].criteria[crit.name] = defaultValue;
      });
    });
  });
  return base;
};