# Power BI Visual Tooling

This repo is prepared for a complex Microsoft Power BI custom visual.

## Installed Locally

- Node.js `v24.12.0`
- npm `11.6.2`
- PowerShell `7.6.2`
- `powerbi-visuals-tools` / `pbiviz` `7.1.0`
- VS Code extension: `analysis-services.powerbi-modeling-mcp`
- Codex curated skills: `playwright`, `screenshot`
- Codex custom skill: `powerbi-visuals` at `%USERPROFILE%\.codex\skills\powerbi-visuals`
- Power BI custom visual localhost certificate trusted in `Cert:\CurrentUser\Root`

Restart Codex to make newly installed Codex skills auto-discoverable.

## MCP Configuration

Repo-level MCP config is in [.vscode/mcp.json](../.vscode/mcp.json).

- `pbiviz`: local MCP server from `powerbi-visuals-tools`, useful for custom visual development.
- `powerbi-remote`: Microsoft-hosted remote MCP endpoint for querying Power BI semantic models.

The remote MCP server requires:

- Power BI tenant setting enabled: "Users can use the Power BI Model Context Protocol server endpoint
  (preview)".
- Microsoft authentication in the MCP client.
- Build permission on at least one semantic model.

The Power BI Modeling MCP VS Code extension is installed for semantic-model work. It is useful for
PBIP/TMDL/model/DAX tasks, not for rendering the visual itself.

## Custom Visual Workflow

1. Scaffold the visual when the design is clear:

   ```powershell
   pbiviz new <VisualName>
   ```

2. Use `pbiviz.json` for metadata and API version.
3. Use `capabilities.json` for field wells, mappings, privileges, formatting objects, tooltips,
   sorting, drill, and selection-related behavior.
4. Keep a typed parser between Power BI `DataView` objects and rendering code.
5. Run:

   ```powershell
   pbiviz lint
   pbiviz start
   pbiviz package
   ```

## Likely Packages After Scaffolding

Install these only after the visual skeleton exists and the design confirms they are needed:

- `d3` and focused D3 subpackages for custom SVG/canvas geometry.
- `react` / `react-dom` only if the visual has complex UI controls or internal state.
- `powerbi-visuals-utils-formattingmodel` for modern formatting pane support.
- `powerbi-visuals-utils-interactivityutils` for selection behavior.
- `powerbi-visuals-utils-chartutils` and `powerbi-visuals-utils-dataviewutils` for chart/data helpers.
- `powerbi-visuals-utils-testutils` for unit tests.

## Manual Power BI Steps

- Enable developer mode in Power BI Desktop for each session where local visual imports are used.
- In Power BI service, enable custom visual developer mode before using the Developer Visual.
- If Power BI shows a localhost connection error, open `https://localhost:8080/assets` in the same
  browser and accept/trust the certificate.

## Sources

- Microsoft Learn: Set up a Power BI visual development environment.
- Microsoft Learn: Power BI visual project structure.
- Microsoft Learn: Capabilities and properties of Power BI visuals.
- Microsoft Learn: Power BI MCP server overview and remote MCP setup.
- `npm view powerbi-visuals-tools`: package version, binary, and engine metadata.
