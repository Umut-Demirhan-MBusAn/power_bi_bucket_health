// Builds an unambiguous composite lookup key (machine + component, alarm id, etc.) from an
// arbitrary number of string parts. JSON-encoding the array (rather than joining on a literal
// delimiter) keeps keys unambiguous for real-world ids that might otherwise collide with a
// delimiter, since JSON escapes each part independently.
export function buildCompositeKey(...parts: string[]): string {
    return JSON.stringify(parts);
}
