/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "modules-only-import-other-module-public-api",
      comment:
        "A module may not import another module's application/domain/infra/interfaces.",
      severity: "error",
      from: { path: "^src/server/modules/([^/]+)/" },
      to: {
        path: "^src/server/modules/([^/]+)/(application|domain|infra|interfaces)/",
        pathNot: "^src/server/modules/$1/",
      },
    },
    {
      name: "infra-must-not-import-modules",
      comment: "Shared infrastructure cannot depend on feature modules.",
      severity: "error",
      from: { path: "^src/server/infra/" },
      to: { path: "^src/server/modules/" },
    },
    {
      name: "core-must-not-import-infra-or-modules",
      comment: "Core ports stay framework-free.",
      severity: "error",
      from: { path: "^src/server/core/" },
      to: { path: "^src/server/(infra|modules|config|composition)/" },
    },
    {
      name: "infra-must-not-import-composition",
      comment: "Adapters cannot depend on the composition root.",
      severity: "error",
      from: { path: "^src/server/infra/" },
      to: { path: "^src/server/composition/" },
    },
    {
      name: "composition-must-not-import-module-internals",
      comment:
        "Composition wires modules through public API or contract.ts, not application/interfaces.",
      severity: "error",
      from: { path: "^src/server/composition/" },
      to: {
        path: "^src/server/modules/([^/]+)/(application|infra|interfaces)/",
      },
    },
    {
      name: "no-circular",
      comment: "Avoid circular dependencies.",
      severity: "warn",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
