import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";

// Programs expected to be syntactically correct
const syntaxChecks = [
  ["simplest syntactically correct program", "rest;"],
  ["multiple statements", "C4++;\nrest;\nA4 = G4; return;"],
  ["variable declarations", "let note1 = C4;\nconst chord1 = [C4, E4, G4];"],
  ["scale declarations", "scale major {root: C4 third: E4 fifth: G4}"],
  ["melody declarations", "melody songA(piano: C4, violin: G4) { rest; }"],
  ["melody with return type", "melody songB(piano: C4): D4 { return C4; }"],
  ["note transposition", "C4++; D4--;"],
  ["chord assignments", "C4 = [C4, E4, G4];"],
  ["note play statements", "C4(piano); G4.play();"],
  ["rest statements", "rest;"],
  ["return statements", "return [C4, E4, G4];"],
  ["simple if", "if C4 { D4++; }"],
  ["if-else", "if C4 { D4++; } else { E4--; }"],
  ["if-else chain", "if C4 { D4++; } else if E4 { F4--; }"],
  ["while loop", "while C4 { D4++; }"],
  ["repeat loop", "repeat C4 { D4++; }"],
  ["for range closed", "for note in C4...G4 { note++; }"],
  ["for range half-open", "for note in C4..<G4 { note++; }"],
  ["for in collection", "for note in [C4, D4, E4] { note++; }"],
  ["conditional expressions", "return C4 ? D4 : E4;"],
  ["fallback operator", "return C4 ?? D4 ?? E4;"],
  ["logical operators", "return C4 && D4 || E4;"],
  ["chord operations", "return [C4, E4] & [E4, G4] | [G4, B4];"],
  ["comparison operators", "if C4 < D4 && E4 >= F4 { rest; }"],
  ["shift operations", "return C4 << 2 >> 1;"],
  ["arithmetic", "return C4 + D4 * E4 / F4 % G4 ** 2;"],
  ["unary operators", "return #[C4, E4, G4]; return -C4; return !D4;"],
  ["numeric literals", "return 440.0E-3;"],
  ["chord literals", "return [C4, E4, G4];"],
  ["some operator", "return some [C4, D4, E4];"],
  ["random operator", "return random [C4, D4, E4];"],
  ["nested expressions", "return (C4 + D4) * (E4 - F4);"],
  ["method calls", "C4.transpose(2).play();"],
  ["string literals", 'print("♪ Hello Music ♫");'],
  ["comments", "C4++; ♫ transpose up\nD4--; ♫ transpose down"],
];

// Programs with syntax errors that the parser will detect
const syntaxErrors = [
  ["invalid note name", "let H4 = C4;", /Line 1, col 5:/],
  ["malformed number", "440.", /Line 1, col 4:/],
  ["missing operand", "C4 + ;", /Line 1, col 5:/],
  ["invalid operator", "C4 $ D4;", /Line 1, col 4:/],
  ["unmatched parenthesis", "return (C4;", /Line 1, col 10:/],
  ["invalid statement", "C4 D4;", /Line 1, col 4:/],
  ["missing braces", "if C4\nD4++;", /Line 2, col 1/],
  ["keywords as identifiers", "let if = C4;", /Line 1, col 5/],
  ["empty chord without type", "[];", /Line 1, col 2/],
  ["invalid chord literal", "[C4, D4,];", /Line 1, col 9/],
  ["empty note index", "C4[];", /Line 1, col 4/],
  ["invalid note reference", "440[C4];", /Line 1, col 4/],
  ["number as function", "440(C4);", /Line 1, col 4/],
  ["invalid string escape", '"\\z"', /Line 1, col 3/],
  ["unterminated string", '"music', /Line 1, col 6/],
  ["invalid unicode escape", '"\\u{GGGGG}"', /Line 1, col 10/],
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
