import * as ohm from "ohm-js";

export class StaticAnalysisError extends Error {
  constructor(message, node) {
    super(message);
    this.node = node;
    this.name = "StaticAnalysisError";
  }
}

export class ScopeError extends StaticAnalysisError {
  constructor(message, node) {
    super(message, node);
    this.name = "ScopeError";
  }
}

export class TypeCheckError extends StaticAnalysisError {
  constructor(message, node) {
    super(message, node);
    this.name = "TypeCheckError";
  }
}

export class ControlFlowError extends StaticAnalysisError {
  constructor(message, node) {
    super(message, node);
    this.name = "ControlFlowError";
  }
}

export default function analyze(match) {
  if (!match || typeof match !== "object" || !match.grammar) {
    throw new Error("Invalid match object provided");
  }

  // Create semantic analyzer
  const semantics = match.grammar.createSemantics();

  const sharedContext = {
    scopes: [],
    errors: [],
    currentFunction: null,
  };

  // Utility functions for scope management
  const pushScope = (type, canBreak = false, canReturn = false) => {
    const parentScope =
      sharedContext.scopes.length > 0
        ? sharedContext.scopes[sharedContext.scopes.length - 1].variables
        : new Map();

    const newScope = {
      type,
      variables: new Map(parentScope),
      canBreak,
      canReturn,
    };
    sharedContext.scopes.push(newScope);
    return newScope;
  };

  const popScope = () => {
    return sharedContext.scopes.pop();
  };

  const getCurrentScope = () => {
    return sharedContext.scopes[sharedContext.scopes.length - 1];
  };

  const addVariable = (name, type, isConstant = false) => {
    const currentScope = getCurrentScope();

    // Check for redeclaration in the same scope
    if (currentScope.variables.has(name)) {
      throw new ScopeError(`Variable '${name}' already declared in this scope`);
    }

    currentScope.variables.set(name, { type, isConstant });
  };

  semantics.addOperation("analyze", {
    Program(body) {
      sharedContext.scopes = [];
      sharedContext.errors = [];
      sharedContext.currentFunction = null;

      // Create global scope
      pushScope("global");

      const analyzedBody = body.children
        .map((statement) => {
          try {
            return statement.analyze();
          } catch (error) {
            if (error instanceof StaticAnalysisError) {
              sharedContext.errors.push(error);
            }
            return null;
          }
        })
        .filter(Boolean);

      popScope();

      // Throw errors if any
      if (sharedContext.errors.length > 0) {
        throw new Error(sharedContext.errors.map((e) => e.message).join("\n"));
      }

      return {
        kind: "Program",
        body: analyzedBody,
      };
    },

    VariableDecl(keyword, name, initializer) {
      const variableName = name.sourceString;
      const isConstant = keyword.sourceString === "const";

      const type = this.inferType(initializer);

      addVariable(variableName, type, isConstant);

      return {
        kind: "VariableDeclaration",
        name: variableName,
        type: type,
        isConstant: isConstant,
        initializer: initializer.analyze ? initializer.analyze() : null,
      };
    },

    MeasureDecl(name, params, returnType, body) {
      const functionName = name.sourceString;

      const currentScope = getCurrentScope();
      const functionType = returnType ? this.analyzeType(returnType) : "void";

      // Check for function redeclaration
      if (currentScope.variables.has(functionName)) {
        throw new ScopeError(`Function '${functionName}' already declared`);
      }

      currentScope.variables.set(functionName, {
        type: functionType,
        kind: "function",
      });

      const functionScope = pushScope("function", false, true);
      sharedContext.currentFunction = {
        name: functionName,
        returnType: functionType,
      };

      // Add parameters to function scope
      const analyzedParams = params.children.map((param) => {
        const paramName = param.children[0].sourceString;
        const paramType = this.analyzeType(param.children[1]);

        addVariable(paramName, paramType);

        return {
          name: paramName,
          type: paramType,
        };
      });

      const analyzedBody = body.analyze();

      popScope();
      sharedContext.currentFunction = null;

      return {
        kind: "FunctionDeclaration",
        name: functionName,
        params: analyzedParams,
        returnType: functionType,
        body: analyzedBody,
      };
    },

    ReturnStatement(expr) {
      const currentFunction = sharedContext.currentFunction;
      const currentScope = getCurrentScope();

      // Check if return is in a function context
      if (!currentScope.canReturn) {
        throw new ControlFlowError("Return statement used in invalid context");
      }

      // Type check return statement
      if (currentFunction) {
        const returnedType = expr ? this.inferType(expr) : "void";

        if (returnedType !== currentFunction.returnType) {
          throw new TypeCheckError(
            `Incompatible return type for function '${currentFunction.name}'. ` +
              `Expected ${currentFunction.returnType}, got ${returnedType}`
          );
        }
      }

      return {
        kind: "ReturnStatement",
        value: expr ? expr.analyze() : null,
      };
    },

    BreakStatement() {
      const currentScope = getCurrentScope();

      if (!currentScope.canBreak) {
        throw new ControlFlowError("Break statement used in invalid context");
      }

      return {
        kind: "BreakStatement",
      };
    },

    RepeatStmt(type, condition, body) {
      const loopScope = pushScope("loop", true, false);

      const analyzedBody = body.analyze();

      popScope();

      return {
        kind: "RepeatStatement",
        type: type.sourceString,
        condition: condition.analyze(),
        body: analyzedBody,
      };
    },

    Block(statements) {
      const blockScope = pushScope(
        "block",
        getCurrentScope().canBreak,
        getCurrentScope().canReturn
      );

      // Analyze block statements
      const analyzedStatements = statements.children
        .map((stmt) => stmt.analyze())
        .filter(Boolean);

      popScope();

      return {
        kind: "Block",
        body: analyzedStatements,
      };
    },

    inferType(node) {
      if (!node || typeof node.sourceString === "undefined") return "any";

      const sourceString = node.sourceString;

      // Type inference rules
      if (/^-?\d+$/.test(sourceString)) return "int";
      if (/^-?\d+\.\d+([eE][-+]?\d+)?$/.test(sourceString)) return "float";
      if (/^"[^"]*"$/.test(sourceString)) return "string";
      if (sourceString === "on" || sourceString === "off") return "boolean";

      return "any";
    },

    analyzeType(typeNode) {
      // type analysis
      if (!typeNode) return "any";

      const ctorName = typeNode.ctorName || "";

      if (ctorName === "Type_optional") {
        return `${this.analyzeType(typeNode.children[0])}?`;
      }
      if (ctorName === "Type_array") {
        return `[${this.analyzeType(typeNode.children[0])}]`;
      }
      if (ctorName === "Type_function") {
        const paramTypes = typeNode.children
          .slice(0, -1)
          .map((t) => this.analyzeType(t));
        const returnType = this.analyzeType(
          typeNode.children[typeNode.children.length - 1]
        );
        return `(${paramTypes.join(",")}) -> ${returnType}`;
      }
      if (ctorName === "Type_id") {
        return typeNode.sourceString;
      }

      return "any";
    },

    _default() {
      return {
        kind: "Unknown",
        sourceString: this.sourceString,
      };
    },

    _iter() {
      return this.children.map((child) =>
        child.analyze ? child.analyze() : child
      );
    },
  });

  const analyzer = semantics(match);
  return analyzer.analyze();
}
