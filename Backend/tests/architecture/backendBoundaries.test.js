import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const listJavaScriptFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJavaScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });

const relativePath = (filePath) =>
  path.relative(backendRoot, filePath).split(path.sep).join("/");

const readImports = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const imports = [];
  const importPattern = /(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    imports.push(match[1]);
  }

  return { source, imports };
};

const resolveLocalImport = (filePath, specifier) => {
  if (!specifier.startsWith(".")) return null;

  const absoluteCandidate = path.resolve(path.dirname(filePath), specifier);
  const candidates = [
    absoluteCandidate,
    `${absoluteCandidate}.js`,
    path.join(absoluteCandidate, "index.js"),
  ];

  return candidates.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  ) ?? null;
};

describe("Backend architecture boundaries", () => {
  it("keeps routes free of database, domain, filesystem, and HTTP-client work", () => {
    const violations = listJavaScriptFiles(path.join(backendRoot, "routes"))
      .flatMap((filePath) => {
        const { imports } = readImports(filePath);
        return imports
          .filter((specifier) =>
            /(?:\/models\/|\/modules\/|mongoose|axios|(?:node:)?fs)/.test(
              specifier
            )
          )
          .map((specifier) => `${relativePath(filePath)} -> ${specifier}`);
      });

    expect(violations).toEqual([]);
  });

  it("keeps controllers free of Mongoose models, sessions, Axios, and filesystem APIs", () => {
    const violations = listJavaScriptFiles(
      path.join(backendRoot, "controllers")
    ).flatMap((filePath) => {
      const { imports } = readImports(filePath);
      return imports
        .filter((specifier) =>
          /(?:\/models\/|^mongoose$|^axios$|^(?:node:)?fs(?:\/|$))/.test(
            specifier
          )
        )
        .map((specifier) => `${relativePath(filePath)} -> ${specifier}`);
    });

    expect(violations).toEqual([]);
  });

  it("keeps Finished Issue serializers pure and application modules Express-free", () => {
    const serializerRoot = path.join(
      backendRoot,
      "modules/issues/finished/finishedPayload/serializers"
    );
    const serializerViolations = listJavaScriptFiles(serializerRoot).flatMap(
      (filePath) => {
        const { imports } = readImports(filePath);
        return imports
          .filter((specifier) =>
            /(?:\/models\/|^express$|^axios$)/.test(specifier)
          )
          .map((specifier) => `${relativePath(filePath)} -> ${specifier}`);
      }
    );
    const expressViolations = listJavaScriptFiles(
      path.join(backendRoot, "modules")
    ).flatMap((filePath) => {
      const { source, imports } = readImports(filePath);
      const importViolations = imports
        .filter((specifier) => specifier === "express")
        .map((specifier) => `${relativePath(filePath)} -> ${specifier}`);
      const directTransportViolation =
        /\b(?:req|res|response)\.(?:cookie|clearCookie|json|on|redirect|send|status)\s*\(/.test(
          source
        )
          ? [`${relativePath(filePath)} -> Express response usage`]
          : [];

      return [...importViolations, ...directTransportViolation];
    });

    expect([...serializerViolations, ...expressViolations]).toEqual([]);
  });

  it("keeps raw upstream response access inside external-service adapters", () => {
    const productionRoots = ["controllers", "middlewares", "modules", "services"];
    const violations = productionRoots.flatMap((root) =>
      listJavaScriptFiles(path.join(backendRoot, root)).flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");
        const relative = relativePath(filePath);
        const isExternalAdapter =
          relative.startsWith("services/modelApi/") ||
          relative.startsWith("services/modelForge/");

        return !isExternalAdapter && /response\?*\.data/.test(source)
          ? [relative]
          : [];
      })
    );

    expect(violations).toEqual([]);
  });

  it("requires admin cross-domain issue imports to use deliberate public entries", () => {
    const violations = listJavaScriptFiles(
      path.join(backendRoot, "modules/admin")
    ).flatMap((filePath) => {
      const { imports } = readImports(filePath);
      return imports
        .filter(
          (specifier) =>
            specifier.includes("/issues/") && !specifier.endsWith("/index.js")
        )
        .map((specifier) => `${relativePath(filePath)} -> ${specifier}`);
    });

    expect(violations).toEqual([]);
  });

  it("has no circular local imports in production JavaScript", () => {
    const productionFiles = [
      "controllers",
      "database",
      "middlewares",
      "models",
      "modules",
      "routes",
      "services",
      "utils",
    ].flatMap((root) => listJavaScriptFiles(path.join(backendRoot, root)));
    const productionSet = new Set(
      productionFiles.map((filePath) => path.resolve(filePath))
    );
    const graph = new Map(
      productionFiles.map((filePath) => {
        const dependencies = readImports(filePath).imports
          .map((specifier) => resolveLocalImport(filePath, specifier))
          .filter((dependency) => dependency && productionSet.has(dependency));
        return [path.resolve(filePath), dependencies];
      })
    );
    const visiting = new Set();
    const visited = new Set();
    const cycles = [];

    const visit = (filePath, chain = []) => {
      if (visiting.has(filePath)) {
        const cycleStart = chain.indexOf(filePath);
        cycles.push(
          [...chain.slice(cycleStart), filePath]
            .map(relativePath)
            .join(" -> ")
        );
        return;
      }
      if (visited.has(filePath)) return;

      visiting.add(filePath);
      for (const dependency of graph.get(filePath) ?? []) {
        visit(dependency, [...chain, filePath]);
      }
      visiting.delete(filePath);
      visited.add(filePath);
    };

    for (const filePath of productionFiles) {
      visit(path.resolve(filePath));
    }

    expect([...new Set(cycles)]).toEqual([]);
  });
});
