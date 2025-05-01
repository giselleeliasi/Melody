// import { describe, it } from "node:test";
// import assert from "node:assert/strict";
// import parse from "../src/parser.js";
// import analyze from "../src/analyzer.js";

// // Programs that are semantically correct
// const semanticChecks = [
//   ["variable declarations", 'let x = 1; let y = "off";'],
//   ["array as parameter", "measure f(x: [number]) { return 3; }"],
//   ["nested array types", "measure f(x: [[number]]) { return 3; }"],
//   ["increment", "let x = 10; x++;"],
//   ["assign arrays", "let a = [1, 2, 3]; let b = [10, 20]; a = b; b = a;"],
//   ["assign to array element", "let a = [1, 2, 3]; a[1] = 100;"],
//   ["simple break", "repeatWhile on { break; }"],
//   ["break in nested if", "repeatWhile off { if on { break; } }"],
//   ["long if", "if on { play(1); } else { play(3); }"],
//   ["elsif", "if on { print(1); } else if on { print(0); } else { print(3); }"],
//   ["relations", 'print(1 <= 2); print("x" > "y");'],
//   ["ok to == arrays", "print([1] == [5, 8]);"],
//   ["ok to != arrays", "print([1] != [5, 8]);"],
//   ["arithmetic", "let x = 1; print(2 * 3 + 5 ** -3 / 2 - 5 % 8);"],
//   ["array length", "print(# [1, 2, 3]);"],
//   ["variables", "let x = [[[[1]]]]; print(x[0][0][0][0] + 2);"],
//   ["subscript exp", "let a = [1, 2]; print(a[0]);"],
//   ["optional unwrapping", "let x: number? = 5; let y = x ?? 10;"],
//   ["function type", "let f: (number, boolean) -> string = nil;"],
//   ["some operator", "let x = 5; let y = some x;"],
//   ["random operator", "let x = random 100;"],
//   ["bitwise operators", "let x = 1 & 2 | 3 ^ 4;"],
//   ["shift operators", "let x = 1 << 2; let y = 8 >> 1;"],
//   ["nested conditionals", "let x = 1 < 2 ? 3 + 4 : 5 * 6;"],
//   [
//     "member access",
//     "grand Point { x: number, y: number } let p = Point(1, 2); let x = p.x;",
//   ],
//   ["constructor", "grand Point { x: number, y: number } let p = Point(1, 2);"],
//   ["complex array", "let a = [[1, 2], [3, 4]]; a[0][1] = 10;"],
//   [
//     "measure with return",
//     "measure add(x: number, y: number): number { return x + y; }",
//   ],
//   ["for collection loop", "let a = [1, 2, 3]; for x in a { print(x); }"],
//   ["for range loop", "for i in 1...5 { print(i); }"],
//   ["for range loop exclusive", "for i in 1..<5 { print(i); }"],
//   ["repeat times", 'repeat 5 { print("hi"); }'],

//   ["empty array declaration", "let a: [number] = [];"],
//   ["grand with multiple fields", "grand Person { name: string, age: number }"],
//   ["short return statement", "measure f() { return; }"],
//   ["nil value for optionals", "let x: string? = nil;"],
//   ["empty optional creation", "let x = no number;"],
//   ["bitwise operators", "print(5 & 3); print(5 | 3); print(5 ^ 3);"],
//   ["shift operators", "print(5 << 2); print(10 >> 1);"],
//   ["nested conditional expressions", "print(on ? 1 : off ? 2 : 3);"],
//   [
//     "member access",
//     "grand Point { x: number, y: number } let p = Point(1, 2); print(p.x);",
//   ],
//   ["times loop", "repeat 5 { print(1); }"],
//   ["for each loop", "for i in [1, 2, 3] { print(i); }"],
//   [
//     "optional member access",
//     "grand Point { x: number, y: number } let p: Point? = Point(1, 2); let x = p?.x;",
//   ],
//   ["optional subscript", "let a: [number]? = [1, 2, 3]; let x = a?[0];"],

//   // For error cases
//   [
//     "invalid function type",
//     "let f: (number -> string = nil;",
//     /Invalid function type/,
//   ],
//   ["invalid optional use", "let x = 5; let y = x??;", /Expected expression/],
//   ["invalid random use", "let x = random;", /Expected expression/],
//   ["invalid some use", "let x = some;", /Expected expression/],
//   ["invalid member access", "let x = 5; let y = x.z;", /No such field/],
//   ["simple calls", "print(1);"],
//   [
//     "type equivalence of nested arrays",
//     "measure f(x: number[][]) { return 3; } print(f([[1], [2]]));",
//   ],
//   ["outer variable", "let x = 1; repeatWhile off { print(x); }"],
//   ["vardec with nil", "let x: number? = nil;"],
//   ["vardec with optional type", "let x: number? = 55;"],
//   ["short return statement", "measure f() { return; }"],
//   ["grand declaration", "grand Point { x: number, y: number }"],
//   ["empty array with type", "let a: [number] = [];"],
//   [
//     "member expression",
//     "grand Person { name: string } let p = Person('Alice'); print(p.name);",
//   ],
//   ["conditional expression", "let x = true ? 5 : 10;"],
//   ["unwrap else with optional", "let x: number? = 5; let y = x ?? 10;"],
//   ["complex nested conditionals", "let x = (1 < 2) ? (3 > 4 ? 5 : 6) : 7;"],
//   ["multiple binary expressions", "let x = 1 + 2 * 3 / 4 - 5;"],
//   [
//     "all comparison operators",
//     "print(1 < 2); print(3 <= 4); print(5 > 6); print(7 >= 8); print(9 == 10); print(11 != 12);",
//   ],
//   ["nested subscript", "let a = [[1,2],[3,4]]; print(a[0][1]);"],
//   ["array of optionals", "let a: [number?] = [1, nil];"],
//   [
//     "function with multiple params",
//     "measure add(a: number, b: number, c: number): number { return a + b + c; }",
//   ],
//   ["empty grand", "grand Empty { }"],
//   ["play with expression", "play 440 + 110;"],
// ];

// const semanticErrors = [
//   ["non-number increment", "let x = off; ++x;", /Expected number/],
//   ["undeclared id", "print(x);", /x not declared/],
//   ["redeclared id", "let x = 1; let x = 1;", /Variable already declared: x/],
//   ["empty arrays", "let a = [];", /Expected/],
//   [
//     "assign to const",
//     "const x = 1; x = 2;",
//     /Assignment to immutable variable/,
//   ],
//   [
//     "assign to function",
//     "measure f() { return 3; } measure g() { return 5; } f = g;",
//     /Assignment to immutable variable/,
//   ],

//   ["empty array with type", "let a: [number] = [];"],

//   [
//     "grand with fields",
//     `
//   grand Person {
//     name: string,
//     age: number
//   }
//   let p = Person("Alice", 30);
//   print(p.name);
// `,
//   ],

//   ["short return", "measure f() { return; }"],

//   ["nil literal", "let x: string? = nil;"],

//   ["empty optional", "let x = no number;"],

//   ["bitwise and", "print(5 & 3);"],
//   ["bitwise or", "print(5 | 3);"],
//   ["bitwise xor", "print(5 ^ 3);"],
//   ["left shift", "print(5 << 2);"],
//   ["right shift", "print(10 >> 1);"],

//   [
//     "nested if-else",
//     `
//   if on {
//     if off {
//       print(1);
//     } else {
//       print(2);
//     }
//   } else {
//     print(3);
//   }
// `,
//   ],

//   [
//     "for-in with complex expression",
//     `
//   for i in [1, 2, 3][0] + 1 ... 5 {
//     print(i);
//   }
// `,
//   ],

//   ["nested conditional", "print((on ? 1 : 2) + (off ? 3 : 4));"],

//   [
//     "function returning function",
//     `
//   measure makeAdder(x: number): (number) -> number {
//     measure adder(y: number): number {
//       return x + y;
//     }
//     return adder;
//   }
//   let add5 = makeAdder(5);
//   print(add5(10));
// `,
//   ],

//   ["play statement", "play 440;"],

//   [
//     "optional member access",
//     `
//   grand Point { x: number, y: number }
//   let p: Point? = Point(1, 2);
//   let x = p?.x;
// `,
//   ],

//   [
//     "optional subscript",
//     `
//   let a: [number]? = [1, 2, 3];
//   let x = a?[0];
// `,
//   ],

//   [
//     "expressions in various contexts",
//     `
//   let a = 1 + 2 * 3;
//   let b = (a ** 2) / 4;
//   let c = -b;
//   let d = #[1, 2, 3];
//   let e = random 10;
//   let f = !off;
//   let g = 1 < 2 ? 3 : 4;
//   let h = a & b | c ^ d;
//   let i = a << 1;
//   let j = b >> 1;
// `,
//   ],

//   [
//     "assign to const array element",
//     "const a = [1]; a[0] = 2;",
//     /Assignment to immutable variable/,
//   ],
//   ["assign bad type", "let x = 1; x = on;", /Operands must have the same type/],
//   [
//     "assign bad array type",
//     "let x = 1; x = [on];",
//     /Operands must have the same type/,
//   ],
//   ["break outside loop", "break;", /Break can only appear in a loop/],
//   ["non-boolean short if test", "if 1 {}", /Expected boolean/],
//   ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
//   ["non-boolean while test", "repeatWhile 1 {}", /Expected boolean/],
//   ["bad types for +", "print(off + 1);", /Expected number or string/],
//   ["bad types for -", "print(off - 1);", /Expected number/],
//   ["bad types for *", "print(off * 1);", /Expected number/],
//   ["bad types for /", "print(off / 1);", /Expected number/],
//   ["bad types for **", "print(off ** 1);", /Expected number/],
//   ["bad types for <", "print(off < 1);", /Expected number or string/],
//   ["bad types for <=", "print(off <= 1);", /Expected number or string/],
//   ["bad types for >", "print(off > 1);", /Expected number or string/],
//   ["bad types for >=", "print(off >= 1);", /Expected number or string/],
//   ["bad types for ==", 'print(2 == "x");', /Type mismatch/],
//   ["bad types for !=", "print(off != 1);", /Type mismatch/],
//   ["bad types for negation", "print(-on);", /Expected number/],
//   ["bad types for length", "print(# off);", /Expected string or array/],
//   ["bad types for not", 'print(!"hello");', /Expected boolean/],
//   ["non-number index", "let a = [1]; print(a[off]);", /Expected number/],
//   [
//     "diff type array elements",
//     "print([3, off]);",
//     /All elements must have the same type/,
//   ],
//   ["call of non-function", "let x = 1; print(x());", /x not a function/],
//   [
//     "Too many args",
//     "measure f(x: number) { return 3; } print(f(1, 2));",
//     /Expected 1 argument\(s\) but 2 passed/,
//   ],
//   [
//     "Too few args",
//     "measure f(x: number) { return 3; } print(f());",
//     /Expected 1 argument\(s\) but 0 passed/,
//   ],
//   [
//     "Parameter type mismatch",
//     "measure f(x: number) { return 3; } print(f(off));",
//     /Operands must have the same type/,
//   ],
//   ["nil as initializer", "let x = nil;", /Cannot use nil without a type/],
//   [
//     "optional type mismatch",
//     "let x: number? = off;",
//     /Cannot assign boolean to number?/,
//   ],
// ];

// describe("The analyzer", () => {
//   for (const [scenario, source] of semanticChecks) {
//     it(`recognizes ${scenario}`, () => {
//       assert.ok(analyze(parse(source)));
//     });
//   }
//   for (const [scenario, source, errorMessagePattern] of semanticErrors) {
//     it(`throws on ${scenario}`, () => {
//       assert.throws(() => analyze(parse(source)), errorMessagePattern);
//     });
//   }
// });

// import { describe, it } from "node:test";
// import assert from "node:assert/strict";
// import parse from "../src/parser.js";
// import analyze from "../src/analyzer.js";

// // Programs that are semantically correct
// const semanticChecks = [
//   ["variable declarations", 'let x = 1; let y = "off";'],
//   ["array as parameter", "measure f(x: [number]) { return 3; }"],
//   ["nested array types", "measure f(x: [[number]]) { return 3; }"],
//   ["increment", "let x = 10; x++;"],
//   ["assign arrays", "let a = [1, 2, 3]; let b = [10, 20]; a = b; b = a;"],
//   ["assign to array element", "let a = [1, 2, 3]; a[1] = 100;"],
//   ["simple break", "repeatWhile on { break; }"],
//   ["break in nested if", "repeatWhile off { if on { break; } }"],
//   ["long if", "if on { play(1); } else { play(3); }"],
//   ["elsif", "if on { print(1); } else if on { print(0); } else { print(3); }"],
//   ["relations", 'print(1 <= 2); print("x" > "y");'],
//   ["ok to == arrays", "print([1] == [5, 8]);"],
//   ["ok to != arrays", "print([1] != [5, 8]);"],
//   ["arithmetic", "let x = 1; print(2 * 3 + 5 ** -3 / 2 - 5 % 8);"],
//   ["variables", "let x = [[[[1]]]]; print(x[0][0][0][0] + 2);"],
//   ["subscript exp", "let a = [1, 2]; print(a[0]);"],
//   ["function type", "let f: (number, boolean) -> string = nil;"],
//   ["some operator", "let x = 5; let y = some x;"],
//   ["random operator", "let x = random 100;"],
//   ["nested conditionals", "let x = 1 < 2 ? 3 + 4 : 5 * 6;"],
//   [
//     "measure with return",
//     "measure add(x: number, y: number): number { return x + y; }",
//   ],
//   ["for range loop", "for i in 1...5 { print(i); }"],
//   ["for range loop exclusive", "for i in 1..<5 { print(i); }"],
//   ["repeat times", 'repeat 5 { print("hi"); }'],
//   ["vardec with nil", "let x: number? = nil;"],
//   ["vardec with optional type", "let x: number? = 55;"],
//   ["times loop", "repeat 5 { print(1); }"],
//   ["simple calls", "print(1);"],
//   ["outer variable", "let x = 1; repeatWhile off { print(x); }"],
//   ["multiple binary expressions", "let x = 1 + 2 * 3 / 4 - 5;"],
//   [
//     "all comparison operators",
//     "print(1 < 2); print(3 <= 4); print(5 > 6); print(7 >= 8); print(9 == 10); print(11 != 12);",
//   ],
//   ["play with expression", "play 440 + 110;"],
// ];

// const semanticErrors = [
//   ["undeclared id", "print(x);", /x not declared/],
//   ["empty arrays", "let a = [];", /Expected/],
//   [
//     "assign to const",
//     "const x = 1; x = 2;",
//     /Assignment to immutable variable/,
//   ],
//   [
//     "assign to function",
//     "measure f() { return 3; } measure g() { return 5; } f = g;",
//     /Assignment to immutable variable/,
//   ],
//   ["break outside loop", "break;", /Break can only appear in a loop/],
//   ["non-boolean short if test", "if 1 {}", /Expected boolean/],
//   ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
//   ["non-boolean while test", "repeatWhile 1 {}", /Expected boolean/],
//   ["bad types for **", "print(off ** 1);", /Expected number/],
//   ["bad types for <", "print(off < 1);", /Expected number or string/],
//   ["bad types for <=", "print(off <= 1);", /Expected number or string/],
//   ["bad types for >", "print(off > 1);", /Expected number or string/],
//   ["bad types for >=", "print(off >= 1);", /Expected number or string/],
//   ["bad types for ==", 'print(2 == "x");', /Type mismatch/],
//   ["bad types for !=", "print(off != 1);", /Type mismatch/],
//   ["bad types for negation", "print(-on);", /Expected number/],
//   ["bad types for not", 'print(!"hello");', /Expected boolean/],
//   ["non-number index", "let a = [1]; print(a[off]);", /Expected number/],
//   [
//     "assign to const array element",
//     "const a = [1]; a[0] = 2;",
//     /Assignment to immutable variable/,
//   ],
// ];

// describe("The analyzer", () => {
//   for (const [scenario, source] of semanticChecks) {
//     it(`recognizes ${scenario}`, () => {
//       assert.ok(analyze(parse(source)));
//     });
//   }
//   for (const [scenario, source, errorMessagePattern] of semanticErrors) {
//     it(`throws on ${scenario}`, () => {
//       assert.throws(() => analyze(parse(source)), errorMessagePattern);
//     });
//   }
// });

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";
import * as core from "../src/core.js";

// Programs that are semantically correct
const semanticChecks = [
  ["variable declarations", 'let x = 1; let y = "off";'],
  ["array as parameter", "measure f(x: [number]) { return 3; }"],
  ["nested array types", "measure f(x: [[number]]) { return 3; }"],
  ["increment", "let x = 10; x++;"],
  ["assign arrays", "let a = [1, 2, 3]; let b = [10, 20]; a = b; b = a;"],
  ["assign to array element", "let a = [1, 2, 3]; a[1] = 100;"],
  ["simple break", "repeatWhile on { break; }"],
  ["break in nested if", "repeatWhile off { if on { break; } }"],
  ["long if", "if on { play(1); } else { play(3); }"],
  ["elsif", "if on { print(1); } else if on { print(0); } else { print(3); }"],
  ["relations", 'print(1 <= 2); print("x" > "y");'],
  ["ok to == arrays", "print([1] == [5, 8]);"],
  ["ok to != arrays", "print([1] != [5, 8]);"],
  ["arithmetic", "let x = 1; print(2 * 3 + 5 ** -3 / 2 - 5 % 8);"],
  ["variables", "let x = [[[[1]]]]; print(x[0][0][0][0] + 2);"],
  ["subscript exp", "let a = [1, 2]; print(a[0]);"],
  ["function type", "let f: (number, boolean) -> string = nil;"],
  ["some operator", "let x = 5; let y = some x;"],
  ["random operator", "let x = random 100;"],
  ["nested conditionals", "let x = 1 < 2 ? 3 + 4 : 5 * 6;"],
  [
    "measure with return",
    "measure add(x: number, y: number): number { return x + y; }",
  ],
  ["for range loop", "for i in 1...5 { print(i); }"],
  ["for range loop exclusive", "for i in 1..<5 { print(i); }"],
  ["repeat times", 'repeat 5 { print("hi"); }'],
  ["vardec with nil", "let x: number? = nil;"],
  ["vardec with optional type", "let x: number? = 55;"],
  ["times loop", "repeat 5 { print(1); }"],
  ["simple calls", "print(1);"],
  ["outer variable", "let x = 1; repeatWhile off { print(x); }"],
  ["multiple binary expressions", "let x = 1 + 2 * 3 / 4 - 5;"],
  [
    "all comparison operators",
    "print(1 < 2); print(3 <= 4); print(5 > 6); print(7 >= 8); print(9 == 10); print(11 != 12);",
  ],
  ["play with expression", "play 440 + 110;"],

  // Additional tests to improve coverage
  ["short return", "measure f() { return; }"],
  ["unwrap else expression", "let x: number? = 5; let y = x ?? 10;"],
  ["bitwise or operation", "let x = 5 | 3;"],
  ["bitwise xor operation", "let x = 5 ^ 3;"],
  ["bitwise and operation", "let x = 5 & 3;"],
  ["bit shift operations", "let x = 5 << 2; let y = 10 >> 1;"],
  ["no operator with type", "let x: number? = no number;"],
  ["nil literal", "let x = nil;"],
  ["empty array with type", "let a: [number] = [number]();"],
  ["grand declaration", "grand Point { x: number, y: number }"],
  [
    "member expression",
    "grand Point { x: number, y: number } let p = new Point(5, 10); let x = p.x;",
  ],
  [
    "constructor call",
    "grand Point { x: number, y: number } let p = new Point(5, 10);",
  ],
  ["optional call", "let f: (number) -> number? = nil; let x = f?(5);"],
  ["optional subscript", "let a: [number]? = [1, 2, 3]; let x = a?[0];"],
  [
    "optional member",
    "grand Point { x: number, y: number } let p: Point? = nil; let x = p?.x;",
  ],
  ["decrement", "let x = 10; x--;"],
];

const semanticErrors = [
  ["undeclared id", "print(x);", /x not declared/],
  ["empty arrays", "let a = [];", /Expected/],
  [
    "assign to const",
    "const x = 1; x = 2;",
    /Assignment to immutable variable/,
  ],
  [
    "assign to function",
    "measure f() { return 3; } measure g() { return 5; } f = g;",
    /Assignment to immutable variable/,
  ],
  ["break outside loop", "break;", /Break can only appear in a loop/],
  ["non-boolean short if test", "if 1 {}", /Expected boolean/],
  ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
  ["non-boolean while test", "repeatWhile 1 {}", /Expected boolean/],
  ["bad types for **", "print(off ** 1);", /Expected number/],
  ["bad types for <", "print(off < 1);", /Expected number or string/],
  ["bad types for <=", "print(off <= 1);", /Expected number or string/],
  ["bad types for >", "print(off > 1);", /Expected number or string/],
  ["bad types for >=", "print(off >= 1);", /Expected number or string/],
  ["bad types for ==", 'print(2 == "x");', /Type mismatch/],
  ["bad types for !=", "print(off != 1);", /Type mismatch/],
  ["bad types for negation", "print(-on);", /Expected number/],
  ["bad types for not", 'print(!"hello");', /Expected boolean/],
  ["non-number index", "let a = [1]; print(a[off]);", /Expected number/],
  [
    "assign to const array element",
    "const a = [1]; a[0] = 2;",
    /Assignment to immutable variable/,
  ],

  // Additional error cases to improve coverage
  [
    "mismatched types in bitwise operation",
    "print(on | 5);",
    /Expected number/,
  ],
  ["mismatched types in shift operation", "print(on << 2);", /Expected number/],
  ["mismatched types in addition", "print(5 + on);", /Type mismatch/],
  [
    "mismatched types in multiplication",
    'print("hello" * 5);',
    /Type mismatch/,
  ],
  [
    "type not defined",
    "let x: Undefined = 5;",
    /Identifier Undefined not declared/,
  ],
  [
    "already optional type with some",
    "let x: number? = 5; let y = some x;",
    /Already an optional type/,
  ],
  [
    "wrong number of arguments",
    "measure f(x: number) { return x; } f(1, 2);",
    /Expected 1 argument/,
  ],
  [
    "type mismatch in function call",
    "measure f(x: number) { return x; } f(on);",
    /Type mismatch/,
  ],
  [
    "cannot unwrap non-optional",
    "let x = 5; let y = x ?? 10;",
    /Expected optional type/,
  ],
];

// Test the core module functions directly
describe("Core module functions", () => {
  it("creates program objects", () => {
    const prog = core.program([]);
    assert.deepEqual(prog, { kind: "Program", compositions: [] });
  });

  it("creates note declaration objects", () => {
    const variable = core.variable("x", "number", true);
    const initializer = core.intlit(5);
    const decl = core.noteDeclaration(variable, initializer);
    assert.deepEqual(decl, {
      kind: "NoteDecl",
      variable,
      initializer,
    });
  });

  it("creates variables", () => {
    const v = core.variable("x", "number", true);
    assert.deepEqual(v, {
      kind: "Variable",
      name: "x",
      type: "number",
      mutable: true,
    });
  });

  it("creates measure declarations", () => {
    const measure = core.measure("add", [], "number", []);
    const decl = core.measureDeclaration(measure);
    assert.deepEqual(decl, { kind: "measureDeclaration", measure });
  });

  it("creates call statements", () => {
    const call = core.callExpression(
      core.variable("print", "function", false),
      [core.intlit(5)],
      "void"
    );
    const stmt = core.callStatement(call);
    assert.deepEqual(stmt, { kind: "CallStatement", call });
  });

  it("creates parameters", () => {
    const param = core.Param("x", "number");
    assert.deepEqual(param, { kind: "Param", name: "x", type: "number" });
  });

  it("creates optional types", () => {
    const type = core.optionalType("number");
    assert.deepEqual(type, { kind: "OptionalType", baseType: "number" });
  });

  it("creates array types", () => {
    const type = core.arrayType("number");
    assert.deepEqual(type, { kind: "ArrayType", baseType: "number" });
  });

  it("creates function types", () => {
    const type = core.functionType(["number", "string"], "boolean");
    assert.deepEqual(type, {
      kind: "FunctionType",
      paramTypes: ["number", "string"],
      returnType: "boolean",
    });
  });

  it("creates bump statements", () => {
    const v = core.variable("x", "number", true);
    const stmt = core.bumpStatement(v, "++");
    assert.deepEqual(stmt, { kind: "Bump", variable: v, op: "++" });
  });

  it("creates assignment statements", () => {
    const target = core.variable("x", "number", true);
    const source = core.intlit(5);
    const stmt = core.assignmentStatement(target, source);
    assert.deepEqual(stmt, { kind: "Assign", target, source });
  });

  it("creates break statements", () => {
    assert.deepEqual(core.breakStatement, { kind: "Break" });
  });

  it("creates return statements", () => {
    const expr = core.intlit(5);
    const stmt = core.returnStatement(expr);
    assert.deepEqual(stmt, { kind: "Return", expression: expr });
  });

  it("creates short return statements", () => {
    assert.deepEqual(core.ShortReturn, { kind: "ShortReturn" });
  });

  it("creates if statements", () => {
    const test = core.on();
    const cons = [core.intlit(1)];
    const alt = [core.intlit(2)];
    const stmt = core.ifStatement(test, cons, alt);
    assert.deepEqual(stmt, {
      kind: "IfStatement",
      test,
      consequent: cons,
      alternate: alt,
    });
  });

  it("creates short if statements", () => {
    const test = core.on();
    const cons = [core.intlit(1)];
    const stmt = core.shortIfStmt(test, cons);
    assert.deepEqual(stmt, {
      kind: "ShortIfStatement",
      test,
      consequent: cons,
    });
  });

  it("creates elsif statements", () => {
    const test = core.on();
    const cons = [core.intlit(1)];
    const alt = [core.intlit(2)];
    const stmt = core.elsifStatement(test, cons, alt);
    assert.deepEqual(stmt, {
      kind: "ElsifStatement",
      test,
      consequent: cons,
      alternate: alt,
    });
  });

  it("creates repeat while statements", () => {
    const test = core.on();
    const body = [core.intlit(1)];
    const stmt = core.repeatWhileStatement(test, body);
    assert.deepEqual(stmt, {
      kind: "RepeatWhileStmt",
      test,
      body,
    });
  });

  it("creates repeat statements", () => {
    const count = core.intlit(5);
    const body = [core.intlit(1)];
    const stmt = core.repeatStatement(count, body);
    assert.deepEqual(stmt, {
      kind: "RepeatStmt",
      count,
      body,
    });
  });

  it("creates for range statements", () => {
    const iterator = core.variable("i", "number", true);
    const low = core.intlit(1);
    const high = core.intlit(10);
    const body = [core.intlit(1)];
    const stmt = core.ForRangeStmt(iterator, low, "...", high, body);
    assert.deepEqual(stmt, {
      kind: "ForRangeStmt",
      iterator,
      low,
      op: "...",
      high,
      body,
    });
  });

  it("creates for statements", () => {
    const iterator = core.variable("x", "number", true);
    const collection = core.arrayExpression([core.intlit(1), core.intlit(2)]);
    const body = [core.intlit(1)];
    const stmt = core.ForStmt(iterator, collection, body);
    assert.deepEqual(stmt, {
      kind: "ForStmt",
      iterator,
      collection,
      body,
    });
  });

  it("creates binary expressions", () => {
    const left = core.intlit(5);
    const right = core.intlit(10);
    const expr = core.binaryExpression("+", left, right, "number");
    assert.deepEqual(expr, {
      kind: "BinaryExp",
      op: "+",
      left,
      right,
      type: "number",
    });
  });

  it("creates unary expressions", () => {
    const operand = core.intlit(5);
    const expr = core.Unary("-", operand, "number");
    assert.deepEqual(expr, {
      kind: "Unary",
      op: "-",
      operand,
      type: "number",
    });
  });

  it("creates no expressions", () => {
    const expr = core.no("number");
    assert.deepEqual(expr, {
      kind: "no",
      baseType: "number",
      type: { kind: "OptionalType", baseType: "number" },
    });
  });

  it("creates subscript expressions", () => {
    const array = {
      kind: "ArrayExp",
      elements: [core.intlit(1), core.intlit(2)],
      type: { kind: "ArrayType", baseType: "number" },
    };
    const index = core.intlit(0);
    const expr = core.subscriptExpression(array, index, false);
    assert.deepEqual(expr, {
      kind: "Subscript",
      array,
      index,
      optional: false,
      type: "number",
    });
  });

  it("creates array expressions", () => {
    const elements = [core.intlit(1), core.intlit(2)];
    const expr = core.arrayExpression(elements);
    assert.deepEqual(expr, {
      kind: "ArrayExp",
      elements,
      type: { kind: "ArrayType", baseType: elements[0].type },
    });
  });

  it("creates grand declarations", () => {
    const grandType = { kind: "GrandType", name: "Point", fields: [] };
    const decl = core.grandDeclaration(grandType);
    assert.deepEqual(decl, { kind: "GrandDecl", grandType });
  });

  it("creates fields", () => {
    const f = core.field("x", "number");
    assert.deepEqual(f, { kind: "Field", name: "x", type: "number" });
  });

  it("creates conditional expressions", () => {
    const test = core.on();
    const cons = core.intlit(1);
    const alt = core.intlit(2);
    const expr = core.conditionalExpression(test, cons, alt);
    assert.deepEqual(expr, {
      kind: "Conditional",
      test,
      consequent: cons,
      alternate: alt,
    });
  });

  it("creates times statements", () => {
    const times = core.intlit(5);
    const body = [core.intlit(1)];
    const stmt = core.timesStatement(times, body);
    assert.deepEqual(stmt, {
      kind: "TimesStmt",
      times,
      body,
    });
  });

  it("creates forEach statements", () => {
    const iterator = core.variable("x", "number", true);
    const collection = core.arrayExpression([core.intlit(1), core.intlit(2)]);
    const body = [core.intlit(1)];
    const stmt = core.forEachStatement(iterator, collection, body);
    assert.deepEqual(stmt, {
      kind: "ForEachStmt",
      iterator,
      collection,
      body,
    });
  });

  it("creates member expressions", () => {
    const object = { kind: "GrandType", name: "Point", fields: [] };
    const field = { kind: "Field", name: "x", type: "number" };
    const expr = core.memberExpression(object, field, "number");
    assert.deepEqual(expr, {
      kind: "Member",
      object,
      field,
      type: "number",
    });
  });

  it("creates empty array expressions", () => {
    const type = "[number]";
    const expr = core.emptyArrayExpression(type);
    assert.deepEqual(expr, {
      kind: "EmptyArray",
      type,
    });
  });

  it("creates call expressions", () => {
    const callee = {
      kind: "Measure",
      name: "print",
      parameters: [],
      returnType: "void",
    };
    const args = [core.intlit(5)];
    const expr = core.Call(callee, args, false);
    assert.deepEqual(expr, {
      kind: "Call",
      callee,
      args,
      optional: false,
      type: "void",
    });
  });

  it("creates constructor calls", () => {
    const type = { kind: "GrandType", name: "Point", fields: [] };
    const args = [core.intlit(5), core.intlit(10)];
    const expr = core.ConstructorCall(type, args);
    assert.deepEqual(expr, {
      kind: "ConstructorCall",
      type,
      args,
      type,
    });
  });

  it("creates int literals", () => {
    const expr = core.intlit(5);
    assert.deepEqual(expr, {
      kind: "intlit",
      value: 5,
      type: "int",
    });
  });

  it("creates float literals", () => {
    const expr = core.floatlit(3.14);
    assert.deepEqual(expr, {
      kind: "floatlit",
      value: 3.14,
      type: "float",
    });
  });

  it("creates string literals", () => {
    const expr = core.stringlit("hello");
    assert.deepEqual(expr, {
      kind: "stringlit",
      value: "hello",
      type: "string",
    });
  });

  it("creates on boolean literals", () => {
    const expr = core.on();
    assert.deepEqual(expr, {
      kind: "on",
      type: "boolean",
    });
  });

  it("creates off boolean literals", () => {
    const expr = core.off();
    assert.deepEqual(expr, {
      kind: "off",
      type: "boolean",
    });
  });

  it("creates play statements", () => {
    const expr = core.intlit(440);
    const stmt = core.playStatement(expr);
    assert.deepEqual(stmt, {
      kind: "playStatement",
      expression: expr,
    });
  });

  it("creates identifiers", () => {
    const expr = core.id("x", "number");
    assert.deepEqual(expr, {
      kind: "id",
      name: "x",
      type: "number",
    });
  });

  it("creates nil literals", () => {
    const expr = core.nilLiteral();
    assert.deepEqual(expr, {
      kind: "NilLiteral",
      type: "any",
    });
  });

  it("creates range statements", () => {
    const variable = core.variable("i", "number", true);
    const start = core.intlit(1);
    const end = core.intlit(10);
    const body = [core.intlit(1)];
    const stmt = core.rangeStatement(variable, start, "...", end, body);
    assert.deepEqual(stmt, {
      kind: "RangeStmt",
      variable,
      start,
      rangeOp: "...",
      end,
      body,
    });
  });
});

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
});
