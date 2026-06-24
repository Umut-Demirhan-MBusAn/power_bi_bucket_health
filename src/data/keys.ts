// Shared delimiter for composite lookup keys (machine + component, alarm id, etc.).
// An unlikely literal so composite keys stay unambiguous for real-world IDs.
export const COMPOSITE_KEY_SEPARATOR = "|#|";

export function buildCompositeKey(...parts: string[]): string {
    return parts.join(COMPOSITE_KEY_SEPARATOR);
}
