import * as ohm from "ohm-js";
import fs from "fs";
import { strict as assert } from "assert";
import { fileURLToPath } from "url";
import path from "path";

// Dynamically get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the analyzer from the src directory
import { StaticAnalyzer, createAnalyzer } from "../src/analyzer.js";
import analyzeDefault from "../src/analyzer.js";

// Load the grammar
const grammarSource = fs.readFileSync(
  path.join(__dirname, "../melody.ohm"),
  "utf-8"
);
const grammar = ohm.grammar(grammarSource);
const semantics = grammar.createSemantics();

// Create the analyzer
const analyzedSemantics = createAnalyzer(semantics);

describe("Melody Static Analyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
  });

  // Core Analyzer Functionality Tests
  describe("Analyzer Initialization", () => {
    test("Initializes with correct default state", () => {
      assert.deepStrictEqual(
        analyzer.errors,
        [],
        "Errors should be an empty array initially"
      );
      assert.strictEqual(
        analyzer.currentScope,
        null,
        "Current scope should be null initially"
      );
      assert.strictEqual(
        analyzer.functionReturnType,
        null,
        "Function return type should be null initially"
      );
      assert.strictEqual(
        analyzer.inLoop,
        false,
        "inLoop should be false initially"
      );
    });
  });

  describe("Scope Management", () => {
    test("Can enter and exit scopes", () => {
      analyzer.enterScope();
      assert(analyzer.currentScope !== null, "Should create a new scope");
      assert.strictEqual(
        analyzer.currentScope.parent,
        null,
        "First scope should have no parent"
      );

      analyzer.enterScope();
      assert(
        analyzer.currentScope.parent !== null,
        "Nested scope should have a parent"
      );

      analyzer.exitScope();
      assert(
        analyzer.currentScope.parent === null,
        "Should return to root scope"
      );
    });

    test("Can add and lookup symbols in scope", () => {
      analyzer.enterScope();
      analyzer.addSymbol("x", "int");

      const symbol = analyzer.lookupSymbol("x");
      assert(symbol, "Symbol should be found");
      assert.deepStrictEqual(
        symbol,
        { type: "int", isConst: false },
        "Symbol details should match"
      );
    });

    test("Prevents duplicate symbol declaration in same scope", () => {
      analyzer.enterScope();
      analyzer.addSymbol("x", "int");

      analyzer.addSymbol("x", "string");

      assert(
        analyzer.errors.length > 0,
        "Should generate an error for duplicate declaration"
      );
      assert(
        analyzer.errors[0].includes("'x' is already declared in this scope"),
        "Error message should indicate duplicate declaration"
      );
    });
  });

  describe("Type Checking", () => {
    test("Handles basic type compatibility", () => {
      assert.strictEqual(
        analyzer.checkType("int", "int"),
        true,
        "Same type should be compatible"
      );
      assert.strictEqual(
        analyzer.checkType("float", "int"),
        true,
        "Float should be compatible with int"
      );
      assert.strictEqual(
        analyzer.checkType("int", "float"),
        true,
        "Int should be compatible with float"
      );
    });

    test("Handles optional types", () => {
      assert.strictEqual(
        analyzer.checkType("no", "int?"),
        true,
        "No value should be compatible with optional type"
      );
      assert.strictEqual(
        analyzer.checkType("int", "int?"),
        true,
        "Int should be compatible with optional int"
      );
      assert.strictEqual(
        analyzer.checkType("string", "int?"),
        false,
        "Different types should not be compatible"
      );
    });

    test("Handles array types", () => {
      assert.strictEqual(
        analyzer.checkType("[int]", "[int]"),
        true,
        "Same array types should be compatible"
      );
      assert.strictEqual(
        analyzer.checkType("[float]", "[int]"),
        true,
        "Mixed numeric array types should be compatible"
      );
      assert.strictEqual(
        analyzer.checkType("[string]", "[int]"),
        false,
        "Different array types should not be compatible"
      );
    });
  });

  describe("Error Handling", () => {
    test("Generates descriptive errors", () => {
      analyzer.error("Test error");
      assert(analyzer.errors.length > 0, "Should add error to errors array");
      assert(
        analyzer.errors[0].includes("Semantic Error"),
        "Error should include semantic error label"
      );
    });
  });

  // Integration Tests
  describe("Full Program Analysis", () => {
    test("Analyzes simple valid program", () => {
      const validProgram = "let x = 10;";
      const match = grammar.match(validProgram);
      assert(match.succeeded(), "Grammar match should succeed");

      const ast = semantics(match).toAST();
      const result = analyzeDefault(ast);

      assert(result, "Analysis should return the AST");
    });

    test("Detects type mismatches", () => {
      try {
        const invalidProgram = 'let x: int = "hello";';
        const match = grammar.match(invalidProgram);
        assert(match.succeeded(), "Grammar match should succeed");

        const ast = semantics(match).toAST();
        analyzeDefault(ast);

        assert.fail("Should have thrown an error");
      } catch (error) {
        assert(
          error instanceof Error,
          "Should throw an error for type mismatch"
        );
      }
    });
  });
});
