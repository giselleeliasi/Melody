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
  ["bitwise or operation", "let x = 5 | 3;"],
  ["bitwise xor operation", "let x = 5 ^ 3;"],
  ["bitwise and operation", "let x = 5 & 3;"],
  ["bit shift operations", "let x = 5 << 2; let y = 10 >> 1;"],
  ["no operator with type", "let x: number? = no number;"],
  ["nil literal", "let x = nil;"],
  ["empty array with type", "let a: [number] = [number]();"],
  ["grand declaration", "grand Point { x: number, y: number };"],
  [
    "member expression",
    "grand Point { x: number, y: number }; let p = new Point(5, 10); let x = p.x;",
  ],
  [
    "constructor call",
    "grand Point { x: number, y: number }; let p = new Point(5, 10);",
  ],
  ["optional call", "let f: (number) -> number? = nil; let x = f?(5);"],
  ["optional subscript", "let a: [number]? = [1, 2, 3]; let x = a?[0];"],
  [
    "optional member",
    "grand Point { x: number, y: number }; let p: Point? = nil; let x = p?.x;",
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
  // [
  //   "already optional type with some",
  //   "let x: number? = 5; let y = some x;",
  //   /Expected non-optional/,
  // ],
  [
    "wrong number of arguments",
    "measure f(x: number) { return x; } f(1, 2);",
    /Expected 1 argument/,
  ],
  [
    "type mismatch in function call",
    "measure f(x: number) { return x; } f(on);",
    /Cannot assign boolean to number/,
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
