import { createJiti, type Jiti } from "jiti";
import type { MetadataCache } from "../core/cache.js";
import { MakitError } from "../core/errors.js";
import { getMetadataKind, type MetadataKind } from "./define.js";
import { scanDependencies, type MetadataWarning } from "./deps.js";

export interface LoadedMetadata<T> {
  value: T;
  filePath: string;
  /** Absolute paths of local files (transitively) imported by the metadata file. */
  dependencies: string[];
  warnings: MetadataWarning[];
  /** Wall-clock evaluation time, for the slow-metadata-eval diagnostic — `0` on a cache hit. */
  evalDurationMs: number;
}

export interface LoadMetadataOptions {
  /** Project root; imports resolving outside it are flagged (spec §46). */
  projectRoot: string;
  /**
   * Shared jiti instance for evaluating many metadata files in one build
   * pass. Create a fresh one per rebuild so changed files re-evaluate.
   */
  jiti?: Jiti;
  /** Skips re-evaluation when the file and its dependencies are unchanged (spec §22). */
  cache?: MetadataCache;
}

/** Above this, metadata evaluation is slow enough to warn about (spec §46 `slow-metadata-eval`). */
const SLOW_METADATA_EVAL_THRESHOLD_MS = 500;

export interface MetadataDiagnostic {
  code: MetadataWarning["code"] | "slow-metadata-eval";
  message: string;
  sourcePath: string;
}

/** Converts a loaded metadata file's warnings (spec §21, §46) and eval time into diagnostics. */
export function metadataLoadDiagnostics(
  loaded: Pick<LoadedMetadata<unknown>, "warnings" | "evalDurationMs" | "filePath">,
): MetadataDiagnostic[] {
  const diagnostics: MetadataDiagnostic[] = loaded.warnings.map((warning) => ({
    code: warning.code,
    message: warning.message,
    sourcePath: loaded.filePath,
  }));
  if (loaded.evalDurationMs > SLOW_METADATA_EVAL_THRESHOLD_MS) {
    diagnostics.push({
      code: "slow-metadata-eval",
      message: `Metadata evaluation took ${Math.round(loaded.evalDurationMs)}ms.`,
      sourcePath: loaded.filePath,
    });
  }
  return diagnostics;
}

const DEFINE_FUNCTION_BY_KIND: Record<MetadataKind, string> = {
  collection: "defineCollection",
  navigation: "defineNavigation",
  category: "defineCategory",
  page: "definePageMetadata",
};

/** Creates the jiti instance used to evaluate metadata files (spec §22). */
export function createMetadataJiti(): Jiti {
  return createJiti(import.meta.url, {
    interopDefault: true,
    // Metadata changes between rebuilds in dev; disable the in-process
    // module cache so re-loading a changed file works.
    moduleCache: false,
  });
}

/**
 * Evaluates a TypeScript metadata file and validates it against the
 * execution constraints of spec §20: a default export that is the return
 * value of the matching `define*` function, synchronous, serializable, and
 * free of circular references.
 */
export async function loadMetadataFile<T>(
  filePath: string,
  expectedKind: MetadataKind,
  options: LoadMetadataOptions,
): Promise<LoadedMetadata<T>> {
  const jiti = options.jiti ?? createMetadataJiti();
  const defineFunction = DEFINE_FUNCTION_BY_KIND[expectedKind];

  // The dependency scan is a cheap static parse (no evaluation), and must
  // run before any cache lookup — the cache key folds in every dependency's
  // content (spec §22) — so it always reflects the current import graph,
  // cache hit or not.
  const { dependencies, warnings } = await scanDependencies(filePath, jiti, options.projectRoot);

  const cached = await options.cache?.get(expectedKind, filePath, dependencies);
  if (cached) {
    return { value: cached.value as T, filePath, dependencies, warnings, evalDurationMs: 0 };
  }

  const start = performance.now();
  let mod: unknown;
  try {
    mod = await jiti.import(filePath);
  } catch (error) {
    throw new MakitError("metadata-eval-failed", `Failed to evaluate metadata file: ${filePath}`, {
      cause: error,
    });
  }
  const evalDurationMs = performance.now() - start;

  if (typeof mod !== "object" || mod === null || !("default" in mod)) {
    throw new MakitError(
      "metadata-missing-default-export",
      `${filePath} has no default export. Export the result of ${defineFunction}() as default.`,
    );
  }

  const value = (mod as { default: unknown }).default;

  if (value instanceof Promise) {
    throw new MakitError(
      "metadata-async",
      `${filePath} exports a Promise. Metadata must be evaluated synchronously (spec §20).`,
    );
  }
  if (typeof value === "function") {
    const isAsync = value.constructor?.name === "AsyncFunction";
    throw new MakitError(
      isAsync ? "metadata-async" : "metadata-wrong-define-function",
      isAsync
        ? `${filePath} exports an async function. Asynchronous metadata is not supported (spec §20); export ${defineFunction}(...) directly.`
        : `${filePath} exports a function. Export the result of ${defineFunction}(...) directly.`,
    );
  }

  const actualKind = getMetadataKind(value);
  if (actualKind !== expectedKind) {
    const hint =
      actualKind === undefined
        ? `Wrap the exported object with ${defineFunction}().`
        : `It was created with ${DEFINE_FUNCTION_BY_KIND[actualKind]}(), but this file requires ${defineFunction}().`;
    throw new MakitError(
      "metadata-wrong-define-function",
      `${filePath} does not export ${expectedKind} metadata. ${hint}`,
    );
  }

  assertSerializable(value, filePath);

  await options.cache?.set(expectedKind, filePath, dependencies, value);

  return { value: value as T, filePath, dependencies, warnings, evalDurationMs };
}

const REACT_ELEMENT_TYPES = new Set([
  Symbol.for("react.element"),
  Symbol.for("react.transitional.element"),
]);

function assertSerializable(value: unknown, filePath: string): void {
  // Tracks the current traversal path only (entries removed on exit), so
  // shared references stay legal while true cycles are rejected.
  const visiting = new Set<object>();

  function visit(node: unknown, path: string): void {
    if (node === null || node === undefined) return;

    switch (typeof node) {
      case "string":
      case "number":
      case "boolean":
        return;
      case "function":
        throw notSerializable(`a function at ${path}`);
      case "symbol":
        throw notSerializable(`a symbol at ${path}`);
      case "bigint":
        throw notSerializable(`a bigint at ${path}`);
    }

    const obj = node as Record<string, unknown>;

    if (visiting.has(obj)) {
      throw new MakitError(
        "metadata-circular-reference",
        `${filePath} contains a circular reference at ${path}. Metadata must be serializable (spec §20).`,
      );
    }

    if (REACT_ELEMENT_TYPES.has((obj as { $$typeof?: symbol }).$$typeof as symbol)) {
      throw notSerializable(`a React element at ${path}`);
    }
    if (node instanceof Promise) {
      throw new MakitError(
        "metadata-async",
        `${filePath} contains a Promise at ${path}. Metadata must be evaluated synchronously (spec §20).`,
      );
    }

    if (!Array.isArray(node)) {
      const proto: unknown = Object.getPrototypeOf(node);
      if (proto !== Object.prototype && proto !== null) {
        throw notSerializable(`a ${obj.constructor?.name ?? "non-plain"} instance at ${path}`);
      }
    }

    visiting.add(obj);
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else {
      for (const [key, item] of Object.entries(obj)) {
        visit(item, path === "" ? key : `${path}.${key}`);
      }
    }
    visiting.delete(obj);
  }

  function notSerializable(what: string): MakitError {
    return new MakitError(
      "metadata-not-serializable",
      `${filePath} contains ${what}. Metadata must be serializable data (spec §20).`,
    );
  }

  visit(value, "");
}
