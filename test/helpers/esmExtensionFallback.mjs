// Node module-resolution hook (see test/helpers/mockHost.js for why this exists).
//
// powerbi-visuals-utils-formattingmodel ships plain ".js" files (no "type": "module" in its
// package.json) that use ES module `import`/`export` syntax with *extension-less* relative
// specifiers (e.g. `import ... from "./FormattingSettingsComponents"`). That is valid input for
// TypeScript/webpack resolution -- how the real pbiviz build consumes this package -- but not for
// Node's own ESM resolver, which requires an explicit extension on relative specifiers. Node's
// `require(esm)` support (used when a CommonJS `require(...)` target turns out to be an ES
// module) reuses that same strict resolver, so a plain `require("powerbi-visuals-utils-formattingmodel")`
// fails outside a bundler.
//
// This hook only changes resolution, never execution: it lets Node's default resolver try first,
// and only for a specifier it could not find does it retry once with ".js" appended.
export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        if (
            error &&
            error.code === "ERR_MODULE_NOT_FOUND" &&
            specifier.startsWith(".") &&
            !specifier.endsWith(".js")
        ) {
            return nextResolve(`${specifier}.js`, context);
        }
        throw error;
    }
}
