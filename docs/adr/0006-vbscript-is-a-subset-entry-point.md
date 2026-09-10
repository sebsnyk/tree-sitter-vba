# ADR 0006: VBScript Is a Subset Entry Point on the Shared Core

## Status

Accepted

## Context

VBScript is Visual Basic at statement level with a script body: statements
run at the top of the file, procedures and `Class ... End Class` blocks are
the only declarations that do not, every variable is a `Variant`, and a long
list of VBA constructs does not exist (`As` clauses and type characters,
`Declare`, conditional compilation, `GoTo` and labels, file I/O statements,
events, `Optional`/`ParamArray`/named arguments, `Like`, `#...#` dates,
`Static`, `Friend`). Two community grammars exist; one is a flat token
grammar for highlighting, the other a partial grammar closer to VBA. Neither
produces statement-level trees comparable to `vba`.

[ADR 0005](0005-vba-parser-stays-the-base-grammar.md) fixes the constraint
any further dialect has to respect: the `vba` parser is the base grammar, its
table is at 15,317 states, and its browser artifact at 7,573,715 bytes sits
under a 7,864,320-byte gate with about 290 KB of headroom. A dialect that
widens the shared core, even with constructs VBA also accepts, costs `vba`
states and changes trees downstream consumers already handle.

## Decision

`vbscript/grammar.js` is a third one-line entry point over
`common/define-grammar.js`. The dialect delta is the `isVBScript` branches
in the core and nothing else.

The branches add three things: `_statement` as a top-level item, so a
script body parses without a wrapping procedure; `class_declaration` with
`end_class_statement`, whose members are variable declarations, procedures
and properties; and `default_modifier` in the procedure modifier position,
where `vba` has `static_modifier`. Everything else VBScript has, the base
already accepted.

The remaining branches remove alternatives. Each is written as
`...(isVBScript ? [] : [alternative])` or `isVBScript ? a : b` in place, so
the `vba` and `vb6` branches serialise to the same `grammar.json` as before.
That is the acceptance test for the change: `vba/src/grammar.json`,
`vba/src/parser.c`, `vb6/src/grammar.json` and `vb6/src/parser.c` are
byte-identical with and without the `vbscript` dialect, and
`scripts/compare-cst.mjs` reports 481 files, 0 differ, against the
previous commit.

Removing an alternative shrinks the `vbscript` table to 5,373 states. It
does not always turn the construct into an error. The base grammar keeps
its identifier vocabulary permissive, and a keyword that is no longer valid
in a state lexes as an identifier, so `Dim x As Long` parses as a
declaration followed by a bare call `As Long`, and `GoTo Done` as a call to
`GoTo`. Constructs whose leading token is not an identifier (`#If`, `s$`,
`#1/1/2000#`, `a:=1`) or that need a following keyword (`Declare Function`,
`Open ... For`, `Like`, `End` alone) are errors. The corpus pins both kinds,
because the trees a consumer receives are the contract, and a parser is not
a validator either way.

Classic ASP embedding (`<% ... %>` around HTML) is out of scope. It is an
injection problem: an ASP page is a host document with VBScript islands,
which tree-sitter handles with a host grammar plus an injection query, and
it would double the size of this change for a different consumer.

## Consequences

- A fourth dialect follows the same shape: one entry point, gated branches
  in the core, a corpus under `<dialect>/test/corpus/`, and the
  byte-identity check on the existing dialects' `grammar.json` before
  opening the pull request.
- `vbscript` shares `queries/*.scm` with the other two dialects. Node types
  the queries name and `vbscript` lacks are the same situation `vb6` is in
  today; a `vbscript`-specific query set is a separate change.
- `line_number_prefix` stays reachable in `vbscript` through the optional
  numbered-delimiter positions of `If`, `Select`, `For`, `Do`, `While` and
  `With`, and `line_number_literal` is what `On Error GoTo 0` produces for
  the `0`. Removing those would touch fifteen shared rules for no change in
  what real scripts produce.
- `Print`-method call shapes (`output_list`, `print_argument_sequence`) stay
  reachable through `call_statement`; a VBScript `obj.Print "x"` produces the
  `vba` tree for the same line.
- The npm addon, the Go module, the Wasm artifact and the playground remain
  the `vba` parser. `vbscript` ships as generated C source for the CLI and
  direct embedding, like `vb6`.
