import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze from "../src/analyzer.js";

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
  ["array length", "print(# [1, 2, 3]);"],
  ["variables", "let x = [[[[1]]]]; print(x[0][0][0][0] + 2);"],
  ["subscript exp", "let a = [1, 2]; print(a[0]);"],
  ["optional unwrapping", "let x: number? = 5; let y = x ?? 10;"],
  ["function type", "let f: (number, boolean) -> string = nil;"],
  ["some operator", "let x = 5; let y = some x;"],
  ["random operator", "let x = random 100;"],
  ["bitwise operators", "let x = 1 & 2 | 3 ^ 4;"],
  ["shift operators", "let x = 1 << 2; let y = 8 >> 1;"],
  ["nested conditionals", "let x = 1 < 2 ? 3 + 4 : 5 * 6;"],
  [
    "member access",
    "grand Point { x: number, y: number } let p = Point(1, 2); let x = p.x;",
  ],
  ["constructor", "grand Point { x: number, y: number } let p = Point(1, 2);"],
  ["complex array", "let a = [[1, 2], [3, 4]]; a[0][1] = 10;"],
  [
    "measure with return",
    "measure add(x: number, y: number): number { return x + y; }",
  ],
  ["for collection loop", "let a = [1, 2, 3]; for x in a { print(x); }"],
  ["for range loop", "for i in 1...5 { print(i); }"],
  ["for range loop exclusive", "for i in 1..<5 { print(i); }"],
  ["repeat times", 'repeat 5 { print("hi"); }'],

  ["empty array declaration", "let a: [number] = [];"],
  ["grand with multiple fields", "grand Person { name: string, age: number }"],
  ["short return statement", "measure f() { return; }"],
  ["nil value for optionals", "let x: string? = nil;"],
  ["empty optional creation", "let x = no number;"],
  ["bitwise operators", "print(5 & 3); print(5 | 3); print(5 ^ 3);"],
  ["shift operators", "print(5 << 2); print(10 >> 1);"],
  ["nested conditional expressions", "print(on ? 1 : off ? 2 : 3);"],
  [
    "member access",
    "grand Point { x: number, y: number } let p = Point(1, 2); print(p.x);",
  ],
  ["times loop", "repeat 5 { print(1); }"],
  ["for each loop", "for i in [1, 2, 3] { print(i); }"],
  [
    "optional member access",
    "grand Point { x: number, y: number } let p: Point? = Point(1, 2); let x = p?.x;",
  ],
  ["optional subscript", "let a: [number]? = [1, 2, 3]; let x = a?[0];"],

  // For error cases
  [
    "invalid function type",
    "let f: (number -> string = nil;",
    /Invalid function type/,
  ],
  ["invalid optional use", "let x = 5; let y = x??;", /Expected expression/],
  ["invalid random use", "let x = random;", /Expected expression/],
  ["invalid some use", "let x = some;", /Expected expression/],
  ["invalid member access", "let x = 5; let y = x.z;", /No such field/],
  ["simple calls", "print(1);"],
  [
    "type equivalence of nested arrays",
    "measure f(x: number[][]) { return 3; } print(f([[1], [2]]));",
  ],
  ["outer variable", "let x = 1; repeatWhile off { print(x); }"],
  ["vardec with nil", "let x: number? = nil;"],
  ["vardec with optional type", "let x: number? = 55;"],
  ["short return statement", "measure f() { return; }"],
  ["grand declaration", "grand Point { x: number, y: number }"],
  ["empty array with type", "let a: [number] = [];"],
  [
    "member expression",
    "grand Person { name: string } let p = Person('Alice'); print(p.name);",
  ],
  ["conditional expression", "let x = true ? 5 : 10;"],
  ["unwrap else with optional", "let x: number? = 5; let y = x ?? 10;"],
  ["complex nested conditionals", "let x = (1 < 2) ? (3 > 4 ? 5 : 6) : 7;"],
  ["multiple binary expressions", "let x = 1 + 2 * 3 / 4 - 5;"],
  [
    "all comparison operators",
    "print(1 < 2); print(3 <= 4); print(5 > 6); print(7 >= 8); print(9 == 10); print(11 != 12);",
  ],
  ["nested subscript", "let a = [[1,2],[3,4]]; print(a[0][1]);"],
  ["array of optionals", "let a: [number?] = [1, nil];"],
  [
    "function with multiple params",
    "measure add(a: number, b: number, c: number): number { return a + b + c; }",
  ],
  ["empty grand", "grand Empty { }"],
  ["play with expression", "play 440 + 110;"],
];

const semanticErrors = [
  ["non-number increment", "let x = off; ++x;", /Expected number/],
  ["undeclared id", "print(x);", /x not declared/],
  ["redeclared id", "let x = 1; let x = 1;", /Variable already declared: x/],
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

  ["empty array with type", "let a: [number] = [];"],

  [
    "grand with fields",
    `
  grand Person { 
    name: string,
    age: number
  }
  let p = Person("Alice", 30);
  print(p.name);
`,
  ],

  ["short return", "measure f() { return; }"],

  ["nil literal", "let x: string? = nil;"],

  ["empty optional", "let x = no number;"],

  ["bitwise and", "print(5 & 3);"],
  ["bitwise or", "print(5 | 3);"],
  ["bitwise xor", "print(5 ^ 3);"],
  ["left shift", "print(5 << 2);"],
  ["right shift", "print(10 >> 1);"],

  [
    "nested if-else",
    `
  if on {
    if off {
      print(1);
    } else {
      print(2);
    }
  } else {
    print(3);
  }
`,
  ],

  [
    "for-in with complex expression",
    `
  for i in [1, 2, 3][0] + 1 ... 5 {
    print(i);
  }
`,
  ],

  ["nested conditional", "print((on ? 1 : 2) + (off ? 3 : 4));"],

  [
    "function returning function",
    `
  measure makeAdder(x: number): (number) -> number {
    measure adder(y: number): number {
      return x + y;
    }
    return adder;
  }
  let add5 = makeAdder(5);
  print(add5(10));
`,
  ],

  ["play statement", "play 440;"],

  [
    "optional member access",
    `
  grand Point { x: number, y: number }
  let p: Point? = Point(1, 2);
  let x = p?.x;
`,
  ],

  [
    "optional subscript",
    `
  let a: [number]? = [1, 2, 3];
  let x = a?[0];
`,
  ],

  [
    "expressions in various contexts",
    `
  let a = 1 + 2 * 3;
  let b = (a ** 2) / 4;
  let c = -b;
  let d = #[1, 2, 3];
  let e = random 10;
  let f = !off;
  let g = 1 < 2 ? 3 : 4;
  let h = a & b | c ^ d;
  let i = a << 1;
  let j = b >> 1;
`,
  ],

  [
    "assign to const array element",
    "const a = [1]; a[0] = 2;",
    /Assignment to immutable variable/,
  ],
  ["assign bad type", "let x = 1; x = on;", /Operands must have the same type/],
  [
    "assign bad array type",
    "let x = 1; x = [on];",
    /Operands must have the same type/,
  ],
  ["break outside loop", "break;", /Break can only appear in a loop/],
  ["non-boolean short if test", "if 1 {}", /Expected boolean/],
  ["non-boolean if test", "if 1 {} else {}", /Expected boolean/],
  ["non-boolean while test", "repeatWhile 1 {}", /Expected boolean/],
  ["bad types for +", "print(off + 1);", /Expected number or string/],
  ["bad types for -", "print(off - 1);", /Expected number/],
  ["bad types for *", "print(off * 1);", /Expected number/],
  ["bad types for /", "print(off / 1);", /Expected number/],
  ["bad types for **", "print(off ** 1);", /Expected number/],
  ["bad types for <", "print(off < 1);", /Expected number or string/],
  ["bad types for <=", "print(off <= 1);", /Expected number or string/],
  ["bad types for >", "print(off > 1);", /Expected number or string/],
  ["bad types for >=", "print(off >= 1);", /Expected number or string/],
  ["bad types for ==", 'print(2 == "x");', /Type mismatch/],
  ["bad types for !=", "print(off != 1);", /Type mismatch/],
  ["bad types for negation", "print(-on);", /Expected number/],
  ["bad types for length", "print(# off);", /Expected string or array/],
  ["bad types for not", 'print(!"hello");', /Expected boolean/],
  ["non-number index", "let a = [1]; print(a[off]);", /Expected number/],
  [
    "diff type array elements",
    "print([3, off]);",
    /All elements must have the same type/,
  ],
  ["call of non-function", "let x = 1; print(x());", /x not a function/],
  [
    "Too many args",
    "measure f(x: number) { return 3; } print(f(1, 2));",
    /Expected 1 argument\(s\) but 2 passed/,
  ],
  [
    "Too few args",
    "measure f(x: number) { return 3; } print(f());",
    /Expected 1 argument\(s\) but 0 passed/,
  ],
  [
    "Parameter type mismatch",
    "measure f(x: number) { return 3; } print(f(off));",
    /Operands must have the same type/,
  ],
  ["nil as initializer", "let x = nil;", /Cannot use nil without a type/],
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
});
