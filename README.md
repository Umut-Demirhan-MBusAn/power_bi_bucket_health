# power_bi_bucket_health

Spec-driven development repo for a complex Microsoft Power BI custom visual.

The project is managed through documentation first:

- [BACKLOG.md](BACKLOG.md) tracks tasks, deliverables, status, and acceptance gates.
- [docs/SPEC.md](docs/SPEC.md) defines the product/visual requirements.
- [docs/VISUAL_CONTRACT.md](docs/VISUAL_CONTRACT.md) defines the Power BI host contract.
- [docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md) defines the source CSV schema and mock fixture.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) records implementation architecture.
- [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) defines module boundaries and runtime
  data flow.
- [docs/DECISIONS.md](docs/DECISIONS.md) records durable technical decisions.
- [docs/TESTING.md](docs/TESTING.md) defines validation and test strategy.
- [docs/POWERBI_VISUAL_TOOLING.md](docs/POWERBI_VISUAL_TOOLING.md) documents local tooling.
- [docs/design_handoff_bucket_health](docs/design_handoff_bucket_health) contains the Claude Design
  handoff and high-fidelity prototypes.

Do not scaffold or implement the visual until the relevant spec sections and backlog acceptance
criteria are clear enough to test.
