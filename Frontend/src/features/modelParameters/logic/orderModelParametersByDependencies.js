import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters";

/**
 * Stable topological ordering for parameter fields whose plugin declares
 * value dependencies. Parameters without a dependency keep their input order.
 */
export const orderModelParametersByDependencies = (parameters) => {
  const rows = Array.isArray(parameters) ? parameters : [];
  const outgoing = rows.map(() => new Set());
  const incoming = rows.map(() => 0);

  rows.forEach((parameter, dependentIndex) => {
    let dependencies = [];
    try {
      dependencies = resolveParameterFieldEntry(parameter).valueDependencyStructureKeys || [];
    } catch {
      // Value-state helpers also operate on raw, not-yet-registered drafts.
      // Their existing order is preserved until a field host resolves them.
      return;
    }
    dependencies.forEach((structureKey) => {
      rows.forEach((candidate, dependencyIndex) => {
        if (
          dependencyIndex !== dependentIndex &&
          candidate?.parameterStructureKey === structureKey &&
          !outgoing[dependencyIndex].has(dependentIndex)
        ) {
          outgoing[dependencyIndex].add(dependentIndex);
          incoming[dependentIndex] += 1;
        }
      });
    });
  });

  const ready = rows.map((_, index) => index).filter((index) => incoming[index] === 0);
  const orderedIndexes = [];
  while (ready.length) {
    ready.sort((left, right) => left - right);
    const index = ready.shift();
    orderedIndexes.push(index);
    outgoing[index].forEach((dependentIndex) => {
      incoming[dependentIndex] -= 1;
      if (incoming[dependentIndex] === 0) ready.push(dependentIndex);
    });
  }

  // A cycle is a plugin configuration error. Retaining the manifest order is
  // safer than dropping parameters or changing their relative order silently.
  if (orderedIndexes.length !== rows.length) return rows;
  return orderedIndexes.map((index) => rows[index]);
};

export default orderModelParametersByDependencies;
