import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

// Programs expected to be syntactically correct
const syntaxChecks = [
  ["simplest syntactically correct program", "break;"],
  ["multiple statements", "print(1);\nbreak;\nx=5; return; return;"],
  ["variable declarations", "let e=99*1;\nconst z=off;"],
  ["function with no params, no return type", "measure f() {}"],
  ["function with one param", "measure f(x: int) {}"],
  ["function with two params", "measure f(x: int, y: boolean) {}"],
  ["function with no params + return type", "measure f(): int {}"],
  ["function types in params", "measure f(g: (int)->boolean) {}"],
  ["function types returned", "measure f(): (int)->(int)->void {}"],
  ["array type for param", "measure f(x: [[[boolean]]]) {}"],
  ["array type returned", "measure f(): [[int]] {}"],
  ["optional types", "measure f(c: int?): float {}"],
  ["assignments", "a--; c++; abc=9*3; a=1;"],
  ["complex var assignment", "c(5)[2] = 100;c.p.r=1;c.q(8)[2](1,1).z=1;"],
  ["complex var bumps", "c(5)[2]++;c.p.r++;c.q(8)[2](1,1).z--;"],
  ["call in statement", "let x = 1;\nf(100);\nprint(1);"],
  ["call in exp", "print(5 * f(x, y, 2 * y));"],
  ["short if", "if on { print(1); }"],
  ["longer if", "if on { print(1); } else { print(1); }"],
  ["even longer if", "if on { print(1); } else if off { print(1);}"],
  ["while with empty block", "repeatWhile on {}"],
  ["while with one statement block", "repeatWhile on { let x = 1; }"],
  ["repeat with long block", "repeat 2 { print(1);\nprint(2);print(3); }"],
  ["if inside loop", "repeat 3 { if on { print(1); } }"],
  ["for closed range", "for i in 2...9*1 {}"],
  ["for half-open range", "for i in 2..<9*1 {}"],
  ["for collection-as-id", "for i in things {}"],
  ["for collection-as-lit", "for i in [3,5,8] {}"],
  ["conditional", "return x?y:z?y:p;"],
  ["??", "return a ?? b ?? c ?? d;"],
  ["ors can be chained", "print(1 || 2 || 3 || 4 || 5);"],
  ["ands can be chained", "print(1 && 2 && 3 && 4 && 5);"],
  ["bitwise ops", "return (1|2|3) + (4^5^6) + (7&8&9);"],
  ["relational operators", "print(1<2||1<=2||1==2||1!=2||1>=2||1>2);"],
  ["shifts", "return 3 << 5 >> 8 << 13 >> 21;"],
  ["arithmetic", "return 2 * x + 3 / 5 - -1 % 7 ** 3 ** 3;"],
  ["length", "return #c; return #[1,2,3];"],
  ["boolean literals", "let x = off || on;"],
  ["all numeric literal forms", "print(8 * 89.123 * 1.3E5 * 1.3E+5 * 1.3E-5);"],
  ["empty array literal", "print([int]());"],
  ["nonempty array literal", "print([1, 2, 3]);"],
  ["some operator", "return some dog;"],
  ["no operator", "return no dog;"],
  ["random operator", "return random [1, 2, 3];"],
  ["parentheses", "print(83 * ((((((((-(13 / 21))))))))) + 1 - 0);"],
  ["variables in expression", "return r.p(3,1)[9]?.x?.y.z.p()(5)[1];"],
  ["more variables", "return c(3).p?.oh(9)[2][2].nope(1)[3](2);"],
  ["indexing array literals", "print([1,2,3][1]);"],
  ["member expression on string literal", `print("hello".append("there"));`],
  ["non-Latin letters in identifiers", "let コンパイラ = 100;"],
  ["a simple string literal", 'print("hello😉😬💀🙅🏽‍♀️—`");'],
  ["string literal with escapes", 'return "a\\n\\tbc\\\\de\\"fg";'],
  ["u-escape", 'print("\\u{a}\\u{2c}\\u{1e5}\\u{ae89}\\u{1f4a9}\\u{10ffe8}");'],
  ["end of program inside comment", "print(0); // yay"],
  ["comments with no text", "print(1);//\nprint(0);//"],
];

// Programs with syntax errors that the parser will detect
const syntaxErrors = [
  ["non-letter in an identifier", "let ab😭c = 2;", /Line 1, col 7:/],
  ["malformed number", "let x= 2.;", /Line 1, col 10:/],
  ["a float with an E but no exponent", "let x = 5E * 11;", /Line 1, col 10:/],
  ["a missing right operand", "print(5 -);", /Line 1, col 10:/],
  ["a non-operator", "print(7 * ((2 _ 3));", /Line 1, col 15:/],
  ["an expression starting with a )", "return );", /Line 1, col 8:/],
  ["a statement starting with expression", "x * 5;", /Line 1, col 3:/],
  ["an illegal statement on line 2", "print(5);\nx * 5;", /Line 2, col 3:/],
  ["a statement starting with a )", "print(5);\n)", /Line 2, col 1:/],
  ["an expression starting with a *", "let x = * 71;", /Line 1, col 9:/],
  ["negation before exponentiation", "print(-2**2);", /Line 1, col 10:/],
  ["mixing ands and ors", "print(1 && 2 || 3);", /Line 1, col 15:/],
  ["mixing ors and ands", "print(1 || 2 && 3);", /Line 1, col 15:/],
  ["associating relational operators", "print(1 < 2 < 3);", /Line 1, col 13:/],
  ["while without braces", "repeatWhile on\nprint(1);", /Line 2, col 1/],
  ["if without braces", "if x < 3\nprint(1);", /Line 2, col 1/],
  ["while as identifier", "let for = 3;", /Line 1, col 5/],
  ["if as identifier", "let if = 8;", /Line 1, col 5/],
  ["unbalanced brackets", "measure f(): int[;", /Line 1, col 17/],
  ["empty array without type", "print([]);", /Line 1, col 8/],
  ["random used like a measure", "print(random(1,2));", /Line 1, col 15/],
  ["bad array literal", "print([1,2,]);", /Line 1, col 12/],
  ["empty subscript", "print(a[]);", /Line 1, col 9/],
  ["on is not assignable", "on = 1;", /Line 1, col 3/],
  ["off is not assignable", "off = 1;", /Line 1, col 4/],
  ["numbers cannot be subscripted", "print(500[x]);", /Line 1, col 10/],
  ["numbers cannot be called", "print(500(x));", /Line 1, col 10/],
  ["numbers cannot be dereferenced", "print(500 .x);", /Line 1, col 11/],
  ["no-paren function type", "measure f(g:int->int) {}", /Line 1, col 16/],
  ["string lit with unknown escape", 'print("ab\\zcdef");', /col 11/],
  ["string lit with newline", 'print("ab\\zcdef");', /col 11/],
  ["string lit with quote", 'print("ab\\zcdef");', /col 11/],
  ["string lit with code point too long", 'print("\\u{1111111}");', /col 17/],
];

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`matches ${scenario}`, () => {
      assert(parse(source).succeeded());
    });
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern);
    });
  }
});
