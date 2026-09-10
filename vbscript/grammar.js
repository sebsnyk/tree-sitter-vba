/**
 * @file Tree-sitter grammar for VBScript - entry point
 * @license MIT
 *
 * The statement grammar is shared with VBA; see ../common/define-grammar.js.
 * VBScript is a statement-level subset with a script body: this dialect adds
 * executable statements at the top level, `Class ... End Class` blocks and the
 * `Default` procedure modifier, and removes what VBScript lacks (types and
 * type characters, `Declare`, conditional compilation, jumps and labels, file
 * I/O, events, named arguments, `Like`, date literals). Classic ASP `<% %>`
 * embedding is not part of this grammar.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = require("../common/define-grammar")("vbscript");
