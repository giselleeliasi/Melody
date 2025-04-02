import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";

// Programs that are semantically correct
const semanticChecks = [
  ["variable declarations", 'let x = 1; let y = "false";'],
  ["vardecl with types", 'let x: number = 1; let y: string = "false";'],
  ["complex array types", "measure f(x: [number][]) : number { return 3; }"],
  ["increment", "let x = 10; x++; "],
  ["initialize with empty array", "let a = [number]();"],
  ["assign arrays", "let a = [1,2,3]; let b=[10,20]; a=b; b=a;"],
  ["assign to array element", "let a = [1,2,3]; a[1]=100;"],
  ["simple break", "repeatWhile on { break; }"],
  ["break in nested if", "repeatWhile off { if on { break; } }"],
  ["long if", "if on { random 1; } else { random 3; }"],
  ["elsif", "if on { random 1; } else if on { random 0; } else { random 3; }"],
  ["relations", 'random(1<=2); random("x">"y");'],
  ["ok to == arrays", "random([1]==[5,8]);"],
  ["ok to != arrays", "random([1]!=[5,8]);"],
  ["arithmetic", "let x=1; random(2*3+5**-3/2-5%8);"],
  ["array length", "random(#[1,2,3]);"],
  ["variables", "let x=[[[[1]]]]; random(x[0][0][0][0]+2);"],
  ["subscript exp", "let a=[1,2]; random(a[0]);"],
  ["simple calls", "random(1);"],
  [
    "type equivalence of nested arrays",
    "measure f(x: [number][]) : number { return 3; } random(f([[1],[2]]));",
  ],
  ["outer variable", "let x=1; repeatWhile off { random(x); }"],
  ["vardec with nil", "let x: number? = no number;"],
  ["vardec with optional type", "let x: number? = 55;"],
];

// Programs that are syntactically correct but have semantic errors
const semanticErrors = [
  ["non-number increment", "let x=off; x++;", /Expected number/],
  ["undeclared id", "random(x);", /x not declared/],
  ["redeclared id", "let x = 1; let x = 1;", /Variable already declared: x/],
  [
    "assign to const",
    "const x = 1; x = 2;",
    /Assignment to immutable variable/,
  ],
  [
    "assign to function",
    "measure f() : number { return 3; } measure g() : number { return 5; } f = g;",
    /Assignment to immutable variable/,
  ],
  [
    "assign to const array element",
    "const a = [1]; a[0] = 2;",
    /Assignment to immutable variable/,
  ],
  ["assign bad type", "let x=1; x=on;", /Operands must have the same type/],
  [
    "assign bad array type",
    "let x=1; x=[on];",
    /Operands must have the same type/,
  ],
  ["break outside loop", "break;", /Break can only appear in a loop/],
  ["non-boolean short if test", "if 1 {}", /Expected boolean/],
  ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
  ["non-boolean while test", "repeatWhile 1 {}", /Expected boolean/],
  ["bad types for +", "random(off+1);", /Expected number or string/],
  ["bad types for -", "random(off-1);", /Expected number/],
  ["bad types for *", "random(off*1);", /Expected number/],
  ["bad types for /", "random(off/1);", /Expected number/],
  ["bad types for **", "random(off**1);", /Expected number/],
  ["bad types for <", "random(off<1);", /Expected number or string/],
  ["bad types for <=", "random(off<=1);", /Expected number or string/],
  ["bad types for >", "random(off>1);", /Expected number or string/],
  ["bad types for >=", "random(off>=1);", /Expected number or string/],
  ["bad types for ==", 'random(2=="x");', /Type mismatch/],
  ["bad types for !=", "random(off!=1);", /Type mismatch/],
  ["bad types for negation", "random(-on);", /Expected number/],
  ["bad types for length", "random(#off);", /Expected string or array/],
  ["bad types for not", 'random(!"hello");', /Expected boolean/],
  ["non-number index", "let a=[1]; random(a[off]);", /Expected number/],
  [
    "diff type array elements",
    "random([3,off]);",
    /All elements must have the same type/,
  ],
  ["call of non-function", "let x = 1;\nrandom(x());", /x not a function/],
  [
    "Too many args",
    "measure f(x: number) : number { return 3; } random(f(1,2));",
    /Expected 1 argument\(s\) but 2 passed/,
  ],
  [
    "Too few args",
    "measure f(x: number) : number { return 3; } random(f());",
    /Expected 1 argument\(s\) but 0 passed/,
  ],
  [
    "Parameter type mismatch",
    "measure f(x: number) : number { return 3; } random(f(off));",
    /Operands must have the same type/,
  ],
  ["nil as initializer", "let x = no number;", /Cannot use nil without a type/],
  [
    "optional type mismatch",
    "let x: number? = off;",
    /Cannot assign boolean to number?/,
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
  //   it("produces the expected representation for a trivial program", () => {
  //     assert.deepEqual(
  //       analyze(parse("let x = π + 2.2;")),
  //       program([
  //         variableDeclaration(
  //           variable("x", true, floatType),
  //           binary("+", variable("π", false, floatType), 2.2, floatType)
  //         ),
  //       ])
  //     )
  //   })
});
