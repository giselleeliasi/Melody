import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import {
  program,
  variableDeclaration,
  variable,
  binary,
  floatType,
  noteDeclaration,
  grandDeclaration,
  measureDeclaration,
  ifStatement,
  repeatStatement,
  returnStatement,
  breakStatement,
  assignment,
  bumpExpression,
  functionCall,
  arrayType,
  optionalType,
  functionType,
  idType,
  onLiteral,
  offLiteral,
  floatLiteral,
  intLiteral,
  noLiteral,
  stringLiteral,
  arrayExpression,
  memberExpression,
  subscriptExpression,
  conditionalExpression,
  unwrapElseExpression,
  orExpression,
  andExpression,
  bitwiseExpression,
  comparisonExpression,
  shiftExpression,
  arithmeticExpression,
  powerExpression,
  unaryExpression,
  emptyArrayExpression,
  parenExpression,
} from "../src/core.js";

// Programs that are semantically correct
const semanticChecks = [
  ["note declarations", "const x = on; let y = off;"],
  ["grand declarations", "grand Note { pitch: float duration: float }"],
  ["measure declarations", "measure play(pitch: float): void { return; }"],
  ["increment and decrement", "let x = 10; x++; x--;"],
  ["initialize with empty array", "let a = [float]();"],
  ["type declaration", "grand S {f: (int)->boolean? g: string}"],
  ["assign arrays", "let a = [float](); let b=[1.0]; a=b; b=a;"],
  ["assign to array element", "let a = [1,2,3]; a[1]=100;"],
  ["initialize with empty optional", "let a = no float;"],
  ["short return", "measure f() { return; }"],
  ["long return", "measure f(): boolean { return on; }"],
  ["assign optionals", "let a = no float; let b=some 1.0; a=b; b=a;"],
  ["return in nested if", "measure f() {if on {return;}}"],
  ["break in nested if", "repeatWhile off {if on {break;}}"],
  ["long if", "if on {play(1.0);} else {play(3.0);}"],
  ["elsif", "if on {play(1.0);} else if on {play(0.0);} else {play(3.0);}"],
  ["for over collection", "for i in [2,3,5] {play(1.0);}"],
  ["for in range", "for i in 1..<10 {play(0.0);}"],
  ["repeat", "repeat 3 {let a = on; play(a);}"],
  ["conditionals", "play(on ? 8 : 5);"],
  ["??", "play(some 5 ?? 0);"],
  ["||", "play(on||off||!on);"],
  ["&&", "play(on&&off&&!on);"],
  ["bit ops", "play((1&2)|(9^3));"],
  ["relations", 'play(1<=2 && "x">"y" && 3.5<1.2);'],
  ["arithmetic", "let x=1; play(2*3+5**-3/2-5%8);"],
  ["array length", "play(#[1,2,3]);"],
  ["optional types", "let x = no float; x = some 100.0;"],
  ["random with array literals", "play(random [1,2,3]);"],
  ["random on array variables", "let a=[on, off]; play(random a);"],
  [
    "member access",
    "grand Note { pitch: float } let y = Note(1.0); play(y.pitch);",
  ],
  [
    "optional member access",
    "grand Note { pitch: float } let y = some Note(1.0); play(y?.pitch);",
  ],
  ["subscript access", "let a=[1,2]; play(a[0]);"],
  ["array of grand", "grand Note{} let x=[Note(), Note()];"],
  ["built-in constants", "play(25.0 * π);"],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  [
    "non-distinct fields",
    "grand Note { pitch: float pitch: int }",
    /Fields must be distinct/,
  ],
  ["non-number increment", "let x=off; x++;", /an number/],
  ["non-number decrement", "let x=some[on]; x--;", /an number/],
  ["undeclared id", "play(x);", /Identifier x not declared/],
  ["redeclared id", "let x = 1; let x = 1;", /Identifier x already declared/],
  ["assign to const", "const x = 1; x = 2;", /Cannot assign to immutable/],
  [
    "assign to measure",
    "measure f() {} measure g() {} f = g;",
    /Cannot assign to immutable/,
  ],
  ["assign to grand", "grand Note{} Note = 2;", /Cannot assign to immutable/],
  [
    "assign to const array element",
    "const a = [1]; a[0] = 2;",
    /Cannot assign to immutable/,
  ],
  [
    "assign to const optional",
    "const x = no float; x = some 1.0;",
    /Cannot assign to immutable/,
  ],
  [
    "assign to const field",
    "grand Note {pitch: float} const n = Note(1.0); n.pitch = 2.0;",
    /Cannot assign to immutable/,
  ],
  ["break outside loop", "break;", /Break can only appear in a loop/],
  [
    "break inside measure",
    "repeatWhile on {measure f() {break;}}",
    /Break can only appear in a loop/,
  ],
  ["return outside measure", "return;", /Return can only appear in a measure/],
  [
    "return value from void measure",
    "measure f() {return 1;}",
    /Cannot return a value/,
  ],
  [
    "return nothing from non-void",
    "measure f(): float {return;}",
    /should be returned/,
  ],
  [
    "return type mismatch",
    "measure f(): float {return off;}",
    /boolean to a float/,
  ],
  ["non-boolean if test", "if 1 {}", /Expected a boolean/],
  ["non-boolean repeatWhile test", "repeatWhile 1 {}", /Expected a boolean/],
  ["non-integer repeat", 'repeat "1" {}', /Expected an integer/],
  ["non-integer low range", "for i in off...2 {}", /Expected an integer/],
  ["non-integer high range", "for i in 1..<no int {}", /Expected an integer/],
  ["non-array in for", "for i in 100 {}", /Expected an array/],
  ["non-boolean conditional test", "play(1?2:3);", /Expected a boolean/],
  [
    "diff types in conditional arms",
    "play(on?1:off);",
    /not have the same type/,
  ],
  ["unwrap non-optional", "play(1??2);", /Expected an optional/],
  ["bad types for ||", "play(off||1);", /Expected a boolean/],
  ["bad types for &&", "play(on&&1);", /Expected a boolean/],
  ["bad types for ==", "play(off==1);", /Operands do not have the same type/],
  ["bad types for +", "play(off+1);", /Expected a number or string/],
  ["bad types for -", "play(off-1);", /Expected a number/],
  ["bad types for *", "play(off*1);", /Expected a number/],
  ["bad types for /", "play(off/1);", /Expected a number/],
  ["bad types for **", "play(off**1);", /Expected a number/],
  ["bad types for <", "play(off<1);", /Expected a number or string/],
  ["bad types for negation", "play(-off);", /Expected a number/],
  ["bad types for length", "play(#off);", /Expected an array/],
  ["bad types for not", 'play(!"hello");', /Expected a boolean/],
  ["bad types for random", "play(random 3);", /Expected an array/],
  ["non-integer index", "let a=[1]; play(a[off]);", /Expected an integer/],
  ["no such field", "grand Note{} let x=Note(); play(x.y);", /No such field/],
  [
    "diff type array elements",
    "play([3,off]);",
    /Not all elements have the same type/,
  ],
  ["call of uncallable", "let x = 1; play(x());", /Call of non-measure/],
  [
    "Too many args",
    "measure f(pitch: float) {} f(1.0, 2.0);",
    /1 argument\(s\) required but 2 passed/,
  ],
  [
    "Too few args",
    "measure f(pitch: float) {} f();",
    /1 argument\(s\) required but 0 passed/,
  ],
  [
    "Parameter type mismatch",
    "measure f(pitch: float) {} f(off);",
    /Cannot assign a boolean to a float/,
  ],
];

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)));
    });
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern);
    });
  }
  it("produces the expected representation for a trivial program", () => {
    assert.deepEqual(
      analyze(parse("let x = π + 2.2;")),
      program([
        noteDeclaration(
          variable("x", true, floatType),
          binary("+", variable("π", false, floatType), 2.2, floatType)
        ),
      ])
    );
  });
});
