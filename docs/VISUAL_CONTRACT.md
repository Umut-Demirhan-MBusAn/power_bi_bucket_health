# Power BI Visual Contract

This file defines the contract between Power BI and the visual. Update it before changing
`capabilities.json`, formatting settings, selections, privileges, or host interactions.

## Visual Identity

- Visual name:
- Display name:
- API version:
- Package target: internal / AppSource / both

## Data Roles

| Role | Kind | Required | Description | Constraints |
| --- | --- | --- | --- | --- |
| TBD | Grouping / Measure / GroupingOrMeasure | TBD | TBD | TBD |

## Data View Mapping

Chosen mapping: `categorical` / `table` / `matrix` / `single`

Rationale:

- `TBD`

Expected shape:

- Categories:
- Measures:
- Highlights:
- Metadata columns:

## Formatting Objects

| Object | Property | Type | Default | Description |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

## Host Interactions

- Selection:
- Cross-filter:
- Highlight:
- Tooltip:
- Sorting:
- Drill:
- Context menu:
- Fetch more data:
- Persist properties:

## Privileges

| Privilege | Required | Reason |
| --- | --- | --- |
| WebAccess | No | TBD |
| LocalStorage | No | TBD |
| ExportContent | No | TBD |

## Data Limits

- Maximum categories:
- Maximum rows:
- Reduction strategy:
- Aggregation/paging strategy:

## Validation Checklist

- [ ] Every formatting descriptor exists in `capabilities.json`.
- [ ] Empty/missing data views are handled.
- [ ] Invalid field assignments show useful guidance.
- [ ] Selection IDs are built from the correct data view shape.
- [ ] Privileges match actual behavior.
- [ ] High-cardinality behavior is explicit.
