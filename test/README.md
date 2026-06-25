# Tests

Run all tests:

```bash
npm test
```

## Layout

```
test/
  unit/       Node.js unit tests — pure-logic tests and jsdom DOM tests
  fixtures/   Shared test data
    bucket_health_components.csv   Canonical mock dataset (4 machines, mixed statuses)
```

See [`docs/TESTING.md`](../docs/TESTING.md) for the full test inventory, infrastructure notes,
and what is intentionally not unit-tested.
