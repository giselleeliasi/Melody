import { describe, it } from "node:test";
import assert from "node:assert/strict";
import optimize from "../src/optimizer.js";
import * as core from "../src/core.js";

const x = core.variable("x", true, core.intType);
const y = core.variable("y", true, core.floatType);
const a = core.variable("a", true, core.arrayType(core.intType));
const xpp = core.bump(x, "++");
const xmm = core.bump(x, "--");
const return1p1 = core.returnStatement(core.binary("+", 1, 1));
const return2 = core.returnStatement(2);
const returnX = core.returnStatement(x);
const onePlusTwo = core.binary("+", 1, 2);
const aParam = core.variable("a", false, core.anyType);
const anyToAny = core.functionType([core.anyType], core.anyType);
const identity = Object.assign(core.fun("id", [aParam], [returnX], anyToAny));
const voidInt = core.functionType([], core.intType);
const intFun = (body) => core.fun("f", [], body, voidInt);
const intFunDecl = (body) => core.measureDeclaration(intFun(body));
const callIdentity = (args) => core.functionCall(identity, args);
const or = (...d) => d.reduce((x, y) => core.binary("||", x, y));
const and = (...c) => c.reduce((x, y) => core.binary("&&", x, y));
const less = (x, y) => core.binary("<", x, y);
const eq = (x, y) => core.binary("==", x, y);
const times = (x, y) => core.binary("*", x, y);
const neg = (x) => core.unary("-", x);
const array = (...elements) => core.arrayExpression(elements);
const assign = (v, e) => core.assign(v, e);
const emptyArray = core.emptyArray(core.intType);
const sub = (a, e) => core.subscript(a, e);
const unwrapElse = (o, e) => core.unwrapElse(o, e);
const emptyOptional = core.emptyOptional(core.intType);
const some = (x) => core.unary("some", x);
const random = (x) => core.unary("random", x);
const on = core.on();
const off = core.off();
const play = (e) => core.playStatement(e);
const program = core.program;

const tests = [
  // Arithmetic optimizations
  ["folds +", core.binary("+", 5, 8), 13],
  ["folds -", core.binary("-", 5n, 8n), -3n],
  ["folds *", core.binary("*", 5, 8), 40],
  ["folds /", core.binary("/", 5, 8), 0.625],
  ["folds %", core.binary("%", 5, 3), 2],
  ["folds **", core.binary("**", 5, 3), 125],
  ["folds <<", core.binary("<<", 1, 3), 8],
  ["folds >>", core.binary(">>", 8, 2), 2],
  ["folds |", core.binary("|", 5, 3), 7],
  ["folds ^", core.binary("^", 5, 3), 6],
  ["folds &", core.binary("&", 5, 3), 1],

  // Comparison optimizations
  ["folds <", core.binary("<", 5, 8), true],
  ["folds <=", core.binary("<=", 5, 8), true],
  ["folds ==", core.binary("==", 5, 8), false],
  ["folds !=", core.binary("!=", 5, 8), true],
  ["folds >=", core.binary(">=", 5, 8), false],
  ["folds >", core.binary(">", 5, 8), false],

  // Logical optimizations
  ["optimizes || with false left", or(false, less(x, 1)), less(x, 1)],
  ["optimizes || with false right", or(less(x, 1), false), less(x, 1)],
  ["optimizes && with true left", and(true, less(x, 1)), less(x, 1)],
  ["optimizes && with true right", and(less(x, 1), true), less(x, 1)],

  // Identity optimizations
  ["optimizes +0", core.binary("+", x, 0), x],
  ["optimizes -0", core.binary("-", x, 0), x],
  ["optimizes *1", core.binary("*", x, 1), x],
  ["optimizes /1", core.binary("/", x, 1), x],
  ["optimizes *0", core.binary("*", x, 0), 0],
  ["optimizes 0*", core.binary("*", 0, x), 0],
  ["optimizes 0+", core.binary("+", 0, x), x],
  ["optimizes 0-", core.binary("-", 0, x), neg(x)],
  ["optimizes 1*", core.binary("*", 1, x), x],
  ["optimizes **0", core.binary("**", x, 0), 1],
  ["optimizes 1**", core.binary("**", 1, x), 1],

  // Unary optimizations
  ["folds negation", core.unary("-", 8), -8],
  ["folds logical not", core.unary("!", true), false],
  ["folds bitwise not", core.unary("#", 0b1010), ~0b1010],

  // Control flow optimizations
  [
    "removes x=x at beginning",
    program([core.assign(x, x), xpp]),
    program([xpp]),
  ],
  ["removes x=x at end", program([xpp, core.assign(x, x)]), program([xpp])],
  [
    "removes x=x in middle",
    program([xpp, assign(x, x), xpp]),
    program([xpp, xpp]),
  ],

  ["optimizes if-true", core.ifStatement(true, [xpp], []), [xpp]],
  ["optimizes if-false", core.ifStatement(false, [], [xpp]), [xpp]],
  ["optimizes short-if-true", core.shortIfStatement(true, [xmm]), [xmm]],
  ["optimizes short-if-false", core.shortIfStatement(false, [xpp]), []],

  [
    "optimizes repeatWhile-false",
    program([core.repeatWhileStatement(false, [xpp])]),
    program([]),
  ],
  [
    "optimizes repeat-0",
    program([core.repeatStatement(0, [xpp])]),
    program([]),
  ],
  ["optimizes for-range", core.forRangeStatement(x, 5, "...", 3, [xpp]), []],
  ["optimizes for-empty-array", core.forStatement(x, emptyArray, [xpp]), []],

  // Optional and array optimizations
  ["optimizes away nil", unwrapElse(emptyOptional, 3), 3],
  ["optimizes left conditional true", core.conditional(true, 55, 89), 55],
  ["optimizes left conditional false", core.conditional(false, 55, 89), 89],

  // Nested optimizations
  [
    "optimizes in functions",
    program([intFunDecl([return1p1])]),
    program([intFunDecl([return2])]),
  ],
  ["optimizes in subscripts", sub(a, onePlusTwo), sub(a, 3)],
  ["optimizes in array literals", array(0, onePlusTwo, 9), array(0, 3, 9)],
  ["optimizes in arguments", callIdentity([times(3, 5)]), callIdentity([15])],
  ["optimizes play statement", play(onePlusTwo), play(3)],

  // Music-specific constructs
  ["preserves on", on, on],
  ["preserves off", off, off],
  ["optimizes random", random(onePlusTwo), random(3)],

  // Non-optimizable constructs
  [
    "passes through nonoptimizable constructs",
    ...Array(2).fill([
      core.program([core.shortReturnStatement()]),
      core.noteDeclaration("x", true, "z"),
      core.grandDeclaration("g", []),
      core.assign(x, core.binary("*", x, "z")),
      core.assign(x, core.unary("not", x)),
      core.constructorCall(identity, core.memberExpression(x, ".", "f")),
      core.noteDeclaration("q", false, core.emptyArray(core.floatType)),
      core.noteDeclaration("r", false, core.emptyOptional(core.intType)),
      core.repeatWhileStatement(true, [core.breakStatement()]),
      core.repeatStatement(5, [core.returnStatement(1)]),
      core.conditional(x, 1, 2),
      unwrapElse(some(x), 7),
      core.ifStatement(x, [], []),
      core.shortIfStatement(x, []),
      core.forRangeStatement(x, 2, "..<", 5, []),
      core.forStatement(x, array(1, 2, 3), []),
      play(x),
      random(x),
      on,
      off,
    ]),
  ],
];

describe("The Melody optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(optimize(before), after);
    });
  }
});
