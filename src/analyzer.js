import * as ohm from "ohm-js";

export class ControlFlowError extends Error {
  constructor(message) {
    super(message);
    this.name = "ControlFlowError";
  }
}

export class StaticAnalyzer {
  constructor() {
    this.currentScope = null;
    this.functionReturnType = null;
    this.inLoop = false;
    this.errors = [];
    this.grandTypes = new Map();
    this.currentFunction = null;
  }

  analyze(ast) {
    this.errors = [];
    try {
      this.analyzeNode(ast);
    } catch (e) {
      if (!(e instanceof ControlFlowError)) {
        throw e;
      }
      this.errors.push(e.message);
    }
    return this.errors;
  }
  analyzeNode(node) {
    if (!node || typeof node !== "object") return;

    if (node.ctorName) {
      const analyzerMethod = `analyze${node.ctorName}`;
      if (this[analyzerMethod]) {
        return this[analyzerMethod](node);
      }
    }

    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((c) => this.analyzeNode(c));
        } else {
          this.analyzeNode(child);
        }
      }
    }
  }

  enterScope(isFunction = false) {
    this.currentScope = {
      parent: this.currentScope,
      symbols: new Map(),
      isFunction,
    };
  }

  exitScope() {
    this.currentScope = this.currentScope.parent;
  }

  addSymbol(name, type, isConst = false) {
    if (this.currentScope.symbols.has(name)) {
      this.error(`Identifier '${name}' is already declared in this scope`);
      return;
    }
    this.currentScope.symbols.set(name, { type, isConst });
  }

  lookupSymbol(name) {
    let scope = this.currentScope;
    while (scope) {
      if (scope.symbols.has(name)) {
        return scope.symbols.get(name);
      }
      scope = scope.parent;
    }
    return null;
  }

  error(message, node = null) {
    let location = "";
    if (node && node.source) {
      const lineAndCol = node.source.getLineAndColumn();
      location = `[${lineAndCol.line}:${lineAndCol.column}] `;
    }
    this.errors.push(`${location}Error: ${message}`);
  }
  checkType(valueType, expectedType) {
    if (expectedType === "any") return true;
    if (valueType === expectedType) return true;

    // Enhanced optional type handling
    if (expectedType.endsWith("?")) {
      const baseType = expectedType.slice(0, -1);
      return valueType === "no" || this.checkType(valueType, baseType);
    }

    // More robust array type handling
    if (expectedType.startsWith("[") && expectedType.endsWith("]")) {
      if (!valueType.startsWith("[") || !valueType.endsWith("]")) return false;
      const expectedElementType = expectedType.slice(1, -1);
      const valueElementType = valueType.slice(1, -1);
      return this.checkType(valueElementType, expectedElementType);
    }

    // Improved numeric type compatibility
    if (
      (expectedType === "float" && valueType === "int") ||
      (expectedType === "int" && valueType === "float")
    ) {
      return true;
    }

    // Function type exact matching
    if (expectedType.includes("->")) {
      return expectedType === valueType;
    }

    return false;
  }

  // ENHANCED error handling to be more descriptive
  error(message, node = null) {
    let location = "";
    if (node && node.source) {
      try {
        const lineAndCol = node.source.getLineAndColumn();
        location = `[${lineAndCol.line}:${lineAndCol.column}] `;
      } catch (e) {
        // Fallback if source location cannot be retrieved
        location = "[unknown location] ";
      }
    }

    // More informative error message
    const fullMessage = `${location}Semantic Error: ${message}`;
    this.errors.push(fullMessage);

    // Optional: Throw for immediate error detection during development
    // throw new Error(fullMessage);
  }

  // Improved scope symbol management
  addSymbol(name, type, isConst = false) {
    if (this.currentScope.symbols.has(name)) {
      this.error(`Identifier '${name}' is already declared in this scope`);
      return false;
    }
    this.currentScope.symbols.set(name, { type, isConst });
    return true;
  }
}
export function createAnalyzer(semantics) {
  const analyzer = new StaticAnalyzer();

  semantics.addOperation("analyze()", {
    Program(compositions) {
      const ast = this.toAST();
      const errors = analyzer.analyze(ast);
      return { ast, errors };
    },
  });

  return semantics;
}

// New default export function added at the end
export default function analyze(ast) {
  const analyzer = new StaticAnalyzer();
  const errors = analyzer.analyze(ast);
  
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  
  return ast;
}