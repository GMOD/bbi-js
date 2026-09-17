# Contributing

## Development

```sh
pnpm install
pnpm test
pnpm build
```

`pnpm build` also rebuilds the Rust/wasm decompressor, which needs a Rust
toolchain. The generated bundle is checked into git, so if you aren't touching
`crate/` you can skip it with `pnpm build:esm && pnpm build:es5`. See
[docs/wasm.md](./docs/wasm.md).

```sh
pnpm version patch  # or minor/major
```

That runs lint, format, types, tests, build and `test:pack`, regenerates
CHANGELOG.md with git-cliff, then pushes the tag, which triggers the publish
workflow.

## Publishing

Releases publish automatically via GitHub Actions using npm trusted publishing
(OIDC, no stored token). The workflow requires `--provenance` and
`id-token: write` permissions.

This repo is already configured. To set up a new package:
`npm trust github <pkg> --file publish.yml --repo GMOD/<repo>` (requires
npm >=11.10.0 and 2FA).

Once npm publish succeeds, the `release` job creates the GitHub release for the
tag, taking its notes from that version's CHANGELOG.md section — which
`scripts/release-notes.sh` extracts, so run that with a version to preview a
release's notes.
