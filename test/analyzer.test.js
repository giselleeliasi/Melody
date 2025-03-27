// test/analyzer.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import parse from "../src/parser.js";
import analyze, {
  ScopeError,
  TypeCheckError,
  ControlFlowError,
  StaticAnalysisError,
} from "../src/analyzer.js";

function analyzeCode(source) {
  const match = parse(source);
  return analyze(match);
}

describe("Error Classes", () => {
  it("should properly construct StaticAnalysisError", () => {
    const node = { sourceString: "test" };
    const error = new StaticAnalysisError("message", node);
    assert.strictEqual(error.message, "message");
    assert.strictEqual(error.node, node);
    assert.strictEqual(error.name, "StaticAnalysisError");
  });

  it("should properly construct ScopeError", () => {
    const node = { sourceString: "test" };
    const error = new ScopeError("scope message", node);
    assert.strictEqual(error.message, "scope message");
    assert.strictEqual(error.name, "ScopeError");
  });

  it("should properly construct TypeCheckError", () => {
    const node = { sourceString: "test" };
    const error = new TypeCheckError("type message", node);
    assert.strictEqual(error.message, "type message");
    assert.strictEqual(error.name, "TypeCheckError");
  });

  it("should properly construct ControlFlowError", () => {
    const node = { sourceString: "test" };
    const error = new ControlFlowError("flow message", node);
    assert.strictEqual(error.message, "flow message");
    assert.strictEqual(error.name, "ControlFlowError");
  });
});

describe("Analyzer Core Functionality", () => {
  it("should reject invalid match objects", () => {
    assert.throws(() => analyze(null), {
      message: "Invalid match object provided",
    });
    assert.throws(() => analyze({}), {
      message: "Invalid match object provided",
    });
    assert.throws(() => analyze({ grammar: null }), {
      message: "Invalid match object provided",
    });
  });
});

describe("Note Declarations", () => {
  it("should analyze let declarations", () => {
    const result = analyzeCode("let x = 5;");
    assert.strictEqual(result.body[0].kind, "VariableDeclaration");
    assert.strictEqual(result.body[0].name, "x");
    assert.strictEqual(result.body[0].type, "int");
    assert.strictEqual(result.body[0].isConstant, false);
  });

  it("should analyze const declarations", () => {
    const result = analyzeCode("const y = on;");
    assert.strictEqual(result.body[0].kind, "VariableDeclaration");
    assert.strictEqual(result.body[0].name, "y");
    assert.strictEqual(result.body[0].type, "boolean");
    assert.strictEqual(result.body[0].isConstant, true);
  });

  it("should detect redeclarations", () => {
    assert.throws(() => analyzeCode("let x = 5; let x = 10;"), {
      message: "Variable 'x' already declared in this scope",
    });
  });

  it("should infer correct types", () => {
    const result = analyzeCode(`
      let a = 5;
      let b = 3.14;
      let c = "hello";
      let d = on;
      let e = off;
    `);
    assert.strictEqual(result.body[0].type, "int");
    assert.strictEqual(result.body[1].type, "float");
    assert.strictEqual(result.body[2].type, "string");
    assert.strictEqual(result.body[3].type, "boolean");
    assert.strictEqual(result.body[4].type, "boolean");
  });
});

describe("Measure Declarations", () => {
  it("should analyze simple measures", () => {
    const result = analyzeCode("measure foo() { return 1; }");
    assert.strictEqual(result.body[0].kind, "FunctionDeclaration");
    assert.strictEqual(result.body[0].name, "foo");
    assert.strictEqual(result.body[0].returnType, "void");
  });

  it("should analyze measures with parameters", () => {
    const result = analyzeCode(`
      measure add(x: int, y: int) : int { 
        return x + y; 
      }
    `);
    assert.strictEqual(result.body[0].params.length, 2);
    assert.strictEqual(result.body[0].params[0].name, "x");
    assert.strictEqual(result.body[0].params[1].name, "y");
  });

  it("should detect measure redeclarations", () => {
    assert.throws(() => analyzeCode("measure foo() {} measure foo() {}"), {
      message: "Measure 'foo' already declared",
    });
  });

  it("should enforce return types", () => {
    assert.throws(() => analyzeCode("measure foo() : int { return on; }"), {
      message: /Incompatible return type/,
    });
  });
});

describe("Grand Declarations", () => {
  it("should analyze grand declarations", () => {
    const result = analyzeCode(`
      grand Instrument {
        name: string
        volume: float
      }
    `);
    assert.strictEqual(result.body[0].kind, "GrandDeclaration");
    assert.strictEqual(result.body[0].fields.length, 2);
  });
});

describe("Control Flow", () => {
  it("should analyze if statements", () => {
    const result = analyzeCode(`
      if (on) {
        let x = 1;
      }
    `);
    assert.strictEqual(result.body[0].kind, "IfStatement");
  });

  it("should analyze repeat loops", () => {
    const result = analyzeCode(`
      repeat 5 {
        break;
      }
    `);
    assert.strictEqual(result.body[0].kind, "RepeatStatement");
    assert.strictEqual(result.body[0].body.body[0].kind, "BreakStatement");
  });

  it("should prevent break outside loops", () => {
    assert.throws(() => analyzeCode("break;"), {
      message: "Break statement used in invalid context",
    });
  });
});

describe("Expressions", () => {
  it("should analyze array expressions", () => {
    const result = analyzeCode("let arr = [1, 2, 3];");
    assert.strictEqual(result.body[0].initializer.kind, "ArrayExpression");
  });

  it("should analyze member expressions", () => {
    const result = analyzeCode(`
      grand Point { x: float, y: float }
      let p = Point { x: 1.0, y: 2.0 };
      let x = p.x;
    `);
    assert.strictEqual(result.body[2].initializer.kind, "MemberExpression");
  });

  it("should analyze binary operations", () => {
    const result = analyzeCode("let x = 5 + 3 * 2;");
    assert.strictEqual(result.body[0].initializer.kind, "BinaryExpression");
  });

  it("should analyze unary operations", () => {
    const result = analyzeCode("let x = -5;");
    assert.strictEqual(result.body[0].initializer.kind, "UnaryExpression");
  });
});

describe("Type System", () => {
  it("should analyze optional types", () => {
    const result = analyzeCode("let x: int? = no int;");
    assert.strictEqual(result.body[0].type, "int?");
  });

  it("should analyze array types", () => {
    const result = analyzeCode("let x: [float] = [3.14];");
    assert.strictEqual(result.body[0].type, "[float]");
  });

  it("should analyze function types", () => {
    const result = analyzeCode(`
      measure apply(fn: (int): int, x: int) : int {
        return fn(x);
      }
    `);
    assert.strictEqual(result.body[0].params[0].type, "(int):int");
  });
});

describe("Edge Cases", () => {
  it("should handle empty programs", () => {
    const result = analyzeCode("");
    assert.strictEqual(result.body.length, 0);
  });

  it("should handle unknown nodes", () => {
    const result = analyzeCode("someUnknownConstruct;");
    assert.strictEqual(result.body[0].kind, "Unknown");
  });

  it("should collect multiple errors", () => {
    assert.throws(
      () =>
        analyzeCode(`
        let x = y;
        break;
        return 5;
      `),
      {
        message: /Variable.*Break.*Return/,
      }
    );
  });
});
