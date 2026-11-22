# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for zxfnt, in the [MADR 4.0](https://adr.github.io/madr/)
format.

## Index

| ADR                                        | Title                                        | Status                                 | Date       |
| ------------------------------------------ | -------------------------------------------- | -------------------------------------- | ---------- |
| [0001](0001-build-tool-and-language.md)    | Build Tool And Language                      | Accepted                               | 2026-11-18 |
| [0002](0002-plain-text-glyph-format.md)    | Plain Text Glyph Format As The Single Source | Accepted, partially superseded by 0005 | 2026-11-18 |
| [0003](0003-characters-beyond-ascii.md)    | Characters Beyond ASCII                      | Accepted                               | 2026-11-18 |
| [0004](0004-taller-variant-for-accents.md) | Taller Variant For Accents                   | Accepted                               | 2026-11-20 |
| [0005](0005-glyph-editor.md)               | Glyph Editor                                 | Accepted                               | 2026-11-20 |
| [0006](0006-demo-page.md)                  | Demo Page With One View At A Time            | Accepted                               | 2026-11-20 |
| [0007](0007-generated-bold.md)             | Generated Bold Style                         | Accepted                               | 2026-11-21 |

## Creating a New ADR

1. Copy `template.md` to `NNNN-title-with-dashes.md`
2. Fill in the template. Remove optional sections that you do not need
3. Update this index

## ADR Status

- **Proposed**: Under discussion
- **Accepted**: Decision made
- **Deprecated**: No longer relevant
- **Superseded**: Replaced by another ADR
