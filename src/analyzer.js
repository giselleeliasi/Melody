import * as core from "./core.js";

export default function analyze(match) {
  const grammar = match.matcher.grammar;

  class Context {
    constructor({
      parent = null,
      locals = new Map(),
      inLoop = false,
      function: f = null,
    }) {
      Object.assign(this, { parent, locals, inLoop, function: f });
    }

    add(name, entity) {
      this.locals.set(name, entity);
    }

    lookup(name) {
      return this.locals.get(name) ?? this.parent?.lookup(name);
    }

    newChildContext(props) {
      return new Context({
        ...this,
        ...props,
        parent: this,
        locals: new Map(),
      });
    }
  }

  let context = new Context({
    locals: new Map([
      [
        "print",
        core.measure("print", [core.Param("value", "any")], "void", []),
      ],
      ["play", core.measure("play", [core.Param("value", "any")], "void", [])],
      ["sin", core.measure("sin", [core.Param("x", "number")], "number", [])],
      ["cos", core.measure("cos", [core.Param("x", "number")], "number", [])],
      ["exp", core.measure("exp", [core.Param("x", "number")], "number", [])],
      ["ln", core.measure("ln", [core.Param("x", "number")], "number", [])],
      [
        "hypot",
        core.measure(
          "hypot",
          [core.Param("x", "number"), core.Param("y", "number")],
          "number",
          []
        ),
      ],
      [
        "bytes",
        core.measure("bytes", [core.Param("s", "string")], "[number]", []),
      ],
      [
        "codepoints",
        core.measure("codepoints", [core.Param("s", "string")], "[number]", []),
      ],
    ]),
  });

  function must(condition, message, at) {
    if (!condition) {
      const prefix = at.source.getLineAndColumnMessage();
      throw new Error(`${prefix} ${message}`);
    }
  }

  function mustNotAlreadyBeDeclared(name, at) {
    must(!context.locals.has(name), `Identifier ${name} already declared`, at);
  }

  function mustBeDeclared(name, at) {
    must(context.lookup(name), `Identifier ${name} not declared`, at);
  }

  function mustBeType(entity, at) {
    must(
      entity?.kind === "GrandType" ||
        ["number", "boolean", "string", "void", "any"].includes(entity),
      `Expected a type`,
      at
    );
  }

  function mustBeNumeric(e, at) {
    must(e.type === "number", `Expected number, got ${e.type}`, at);
  }

  function mustBeBoolean(e, at) {
    must(e.type === "boolean", `Expected boolean, got ${e.type}`, at);
  }

  function mustBeNumericOrString(e, at) {
    must(
      e.type === "number" || e.type === "string",
      `Expected number or string, got ${e.type}`,
      at
    );
  }

  function mustBeArrayOrString(e, at) {
    const type = typeof e.type === "string" ? e.type : e.type?.kind;
    must(
      type === "string" || type === "ArrayType",
      `Expected string or array, got ${type}`,
      at
    );
  }

  function mustBeSameType(a, b, at) {
    must(a.type === b.type, `Type mismatch: ${a.type} vs ${b.type}`, at);
  }

  function mustBeAssignable(from, toType, at) {
    const fromType = from.type;
    must(
      toType === "any" || // allow assigning anything to "any"
        (typeof fromType === "string" && fromType === toType) ||
        (from.type?.kind === "ArrayType" &&
          toType?.kind === "ArrayType" &&
          fromType.baseType === toType.baseType),
      `Cannot assign ${fromType} to ${toType}`,
      at
    );
  }

  function isMutable(variable) {
    return (
      variable.mutable ||
      (variable.kind === "Subscript" && isMutable(variable.array))
    );
  }

  function mustBeMutable(variable, at) {
    must(isMutable(variable), `Assignment to immutable variable`, at);
  }

  const analyzer = grammar.createSemantics().addOperation("analyze", {
    Program(compositions) {
      return core.program(compositions.children.map((c) => c.analyze()));
    },

    _iter(...children) {
      return children.map((child) => child.analyze());
    },

    Composition_bump(exp, op, _semi) {
      const variable = exp.analyze();
      mustBeMutable(variable, exp);
      mustBeNumeric(variable, exp);
      return core.bumpStatement(variable, op.sourceString);
    },

    Composition_assign(target, _eq, exp, _semi) {
      const source = exp.analyze();
      const dest = target.analyze();

      must(dest, `Assignment to undeclared identifier`, target);
      must(dest.kind !== "Measure", `Assignment to immutable variable`, target);

      mustBeMutable(dest, target);
      mustBeAssignable(source, dest.type, target);
      return core.assignmentStatement(dest, source);
    },

    Composition_call(exp, _semi) {
      return core.callStatement(exp.analyze());
    },

    Composition_break(_break, _semi) {
      must(context.inLoop, `Break can only appear in a loop`, _break);
      return core.breakStatement;
    },

    Composition_return(_return, exp, _semi) {
      const value = exp.analyze();
      return core.returnStatement(value);
    },

    Composition_shortreturn(_return, _semi) {
      return core.shortReturnStatement();
    },

    Composition_play(_play, exp, _semi) {
      const value = exp.analyze();
      return core.playStatement(value);
    },

    NoteDecl(_qualifier, id, _colon, type, _eq, exp, _semi) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const initializer = exp.analyze();
      const declaredType = type.child(1)?.analyze();
      if (declaredType) {
        mustBeAssignable(initializer, declaredType, exp);
      }
      const mutable = _qualifier.sourceString === "let";
      const variable = core.variable(
        id.sourceString,
        declaredType || initializer.type,
        mutable
      );
      context.add(id.sourceString, variable);
      return core.noteDeclaration(variable, initializer);
    },

    Field(id, _colon, type) {
      return core.field(id.sourceString, type.sourceString);
    },

    MeasureDecl(_measure, id, params, _colon, returnType, block) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const oldContext = context;
      context = context.newChildContext({ inFunction: true });

      const parameters = params.analyze();
      const returnTypeNode =
        returnType.child(1)?.child(0)?.sourceString || "void";
      const body = block.analyze();

      context = oldContext;

      const measure = core.measure(
        id.sourceString,
        parameters,
        returnTypeNode,
        body
      );
      context.add(id.sourceString, measure);
      return core.measureDeclaration(measure);
    },

    Params(_open, params, _close) {
      return params.asIteration().children.map((p) => p.analyze());
    },

    Param(id, _colon, type) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const paramType = type.sourceString;
      const param = core.variable(id.sourceString, paramType, false);
      context.add(id.sourceString, param);
      return param;
    },

    Type_optional(type, _questionMark) {
      return `${type.analyze()}?`;
    },

    Type_array(_open, type, _close) {
      return `[${type.analyze()}]`;
    },

    Type_function(_open, paramTypes, _close, _arrow, returnType) {
      const params = paramTypes.asIteration().children.map((t) => t.analyze());
      return `(${params.join(",")})->${returnType.analyze()}`;
    },

    Type_id(id) {
      const type = id.sourceString;
      // Built-in types are always valid
      if (["number", "boolean", "string", "void", "any"].includes(type)) {
        return type;
      }

      // Check if this is a user-defined type (GrandType)
      const entity = context.lookup(type);
      if (!entity || entity.kind !== "GrandType") {
        throw new Error(`Identifier ${type} not declared`);
      }

      return type;
    },

    IfStmt_long(_if, exp, block1, _else, block2) {
      const test = exp.analyze();
      mustBeBoolean(test, exp);
      context = context.newChildContext();
      const consequent = block1.analyze();
      context = context.parent;
      context = context.newChildContext();
      const alternate = block2.analyze();
      context = context.parent;
      return core.ifStatement(test, consequent, alternate);
    },

    IfStmt_elsif(_if, exp, block, _else, trailingIf) {
      const test = exp.analyze();
      mustBeBoolean(test, exp);
      context = context.newChildContext();
      const consequent = block.analyze();
      context = context.parent;
      const alternate = trailingIf.analyze();
      return core.ifStatement(test, consequent, alternate);
    },

    IfStmt_short(_if, exp, block) {
      const test = exp.analyze();
      mustBeBoolean(test, exp);
      context = context.newChildContext();
      const consequent = block.analyze();
      context = context.parent;
      return core.shortIfStmt(test, consequent);
    },

    RepeatStmt_repeatWhile(_repeatWhile, exp, block) {
      const test = exp.analyze();
      mustBeBoolean(test, exp);
      context = context.newChildContext({ inLoop: true });
      const body = block.analyze();
      context = context.parent;
      return core.repeatWhileStatement(test, body);
    },

    RepeatStmt_times(_repeat, exp, block) {
      const times = exp.analyze();
      mustBeNumeric(times, exp);
      context = context.newChildContext({ inLoop: true });
      const body = block.analyze();
      context = context.parent;
      return core.timesStatement(times, body);
    },

    RepeatStmt_range(_for, id, _in, start, rangeOp, end, block) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const startExp = start.analyze();
      const endExp = end.analyze();
      mustBeNumeric(startExp, start);
      mustBeNumeric(endExp, end);

      context = context.newChildContext({ inLoop: true });
      const counter = core.variable(id.sourceString, "number", true);
      context.add(id.sourceString, counter);

      const body = block.analyze();
      context = context.parent;

      return core.rangeStatement(
        counter,
        startExp,
        rangeOp.sourceString,
        endExp,
        body
      );
    },

    RepeatStmt_collection(_for, id, _in, exp, block) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const collection = exp.analyze();
      must(collection.type.startsWith("["), `Expected array type`, exp);

      context = context.newChildContext({ inLoop: true });
      const element = core.variable(
        id.sourceString,
        collection.type.slice(1, -1),
        true
      );
      context.add(id.sourceString, element);

      const body = block.analyze();
      context = context.parent;

      return core.forEachStatement(element, collection, body);
    },

    Block(_open, compositions, _close) {
      return compositions.children.map((c) => c.analyze());
    },

    Exp_conditional(cond, _qmark, thenExp, _colon, elseExp) {
      const condition = cond.analyze();
      mustBeBoolean(condition, cond);
      const thenBranch = thenExp.analyze();
      const elseBranch = elseExp.analyze();
      mustBeSameType(thenBranch, elseBranch, elseExp);
      return core.conditionalExpression(
        condition,
        thenBranch,
        elseBranch,
        thenBranch.type // Add the type
      );
    },

    Exp1_unwrapelse(left, _op, right) {
      const leftExp = left.analyze();
      must(leftExp.type.endsWith("?"), `Expected optional type`, left);
      const rightExp = right.analyze();
      mustBeSameType({ type: leftExp.type.slice(0, -1) }, rightExp, right);
      return core.unwrapElseExpression(leftExp, rightExp);
    },

    Exp2_or(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeBoolean(leftExp, left);
      mustBeBoolean(rightExp, right);
      return core.binaryExpression("||", leftExp, rightExp, "boolean");
    },

    Exp2_and(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeBoolean(leftExp, left);
      mustBeBoolean(rightExp, right);
      return core.binaryExpression("&&", leftExp, rightExp, "boolean");
    },

    Exp3_bitor(left, ops, rights) {
      let result = left.analyze();
      must(
        result.type === "int" || result.type === "number",
        "Expected number",
        left
      );

      // Handle each right operand in the iteration
      const rightNodes = rights.asIteration().children;
      const opNodes = ops.asIteration().children;

      for (let i = 0; i < rightNodes.length; i++) {
        const rightExp = rightNodes[i].analyze();
        must(
          rightExp.type === "int" || rightExp.type === "number",
          "Expected number",
          rightNodes[i]
        );
        result = core.binaryExpression("|", result, rightExp, "int");
      }

      return result;
    },

    Exp3_bitxor(left, _op, right) {
      left = left.analyze(this.context);
      right = right.analyze(this.context);
      must(
        left.type === "int" || left.type === "number",
        "Expected number",
        left
      );
      must(
        right.type === "int" || right.type === "number",
        "Expected number",
        right
      );
      return core.binaryExpression("^", left, right, "int");
    },

    Exp3_bitand(left, _op, right) {
      left = left.analyze(this.context);
      right = right.analyze(this.context);
      must(
        left.type === "int" || left.type === "number",
        "Expected number",
        left
      );
      must(
        right.type === "int" || right.type === "number",
        "Expected number",
        right
      );
      return core.binaryExpression("&", left, right, "int");
    },

    Exp4_compare(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        // Special case for array/object comparison
        if (
          leftExp.type.kind === "ArrayType" &&
          rightExp.type.kind === "ArrayType"
        ) {
          return core.binaryExpression(
            op.sourceString,
            leftExp,
            rightExp,
            "boolean"
          );
        }
        mustBeSameType(leftExp, rightExp, op);
      } else {
        mustBeNumericOrString(leftExp, left);
        mustBeNumericOrString(rightExp, right);
      }
      return core.binaryExpression(
        op.sourceString,
        leftExp,
        rightExp,
        "boolean"
      );
    },

    Exp5_shift(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExpression(
        op.sourceString,
        leftExp,
        rightExp,
        "number"
      );
    },

    Exp6_add(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeSameType(leftExp, rightExp, right);
      return core.binaryExpression(
        op.sourceString,
        leftExp,
        rightExp,
        leftExp.type
      );
    },

    Exp7_multiply(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeSameType(leftExp, rightExp, right);
      return core.binaryExpression(
        op.sourceString,
        leftExp,
        rightExp,
        leftExp.type
      );
    },

    Exp8_power(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExpression("**", leftExp, rightExp, "number");
    },

    Exp8_unary(op, operand) {
      const exp = operand.analyze();
      switch (op.sourceString) {
        case "#":
          mustBeArrayOrString(exp, operand);
          return core.unaryExpression("#", exp, "number");
        case "-":
          mustBeNumeric(exp, operand);
          return core.unaryExpression("-", exp, "number");
        case "!":
          mustBeBoolean(exp, operand);
          return core.unaryExpression("!", exp, "boolean");
        case "some": {
          const t = exp.type;
          const alreadyOptional =
            (typeof t === "string" && t.endsWith("?")) ||
            t?.kind === "OptionalType";

          must(!alreadyOptional, `Already an optional type`, operand);
          return core.unaryExpression("some", exp, `${t}?`);
        }

        case "random":
          mustBeNumeric(exp, operand);
          return core.unaryExpression("random", exp, "number");
      }
    },

    Exp9_emptyopt(_no, type) {
      let typeStr = type.analyze();
      if (!typeStr.endsWith("?")) {
        typeStr += "?";
      }
      return core.nilLiteral(typeStr);
    },

    Exp9_subscript(array, _open, index, _close) {
      const arr = array.analyze();
      const idx = index.analyze();
      must(arr.type.kind === "ArrayType", `Expected array type`, array);
      mustBeNumeric(idx, index);
      return core.subscriptExpression(arr, idx, arr.type.baseType);
    },

    Exp9_call(fun, _open, args, _close) {
      const func = fun.analyze();
      must(
        func.kind === "Measure" ||
          (func.kind === "Variable" && func.type?.kind === "FunctionType"),
        `Expected function`,
        fun
      );
      const argExps = args.asIteration().children.map((a) => a.analyze());

      if (func.kind === "Measure") {
        must(
          argExps.length === func.parameters.length,
          `Expected ${func.parameters.length} argument(s) but got ${argExps.length}`,
          fun
        );
        argExps.forEach((arg, i) => {
          mustBeAssignable(arg, func.parameters[i].type, args.children[i]);
        });
      }
      return core.callExpression(
        func,
        argExps,
        func.returnType || func.type?.returnType || "void"
      );
    },

    Exp9_member(object, _dot, id) {
      const obj = object.analyze();
      must(obj.kind === "Grand", `Expected grand type`, object);
      const field = obj.fields.find((f) => f.name === id.sourceString);
      must(field, `No such field: ${id.sourceString}`, id);
      return core.memberExpression(obj, field, field.type);
    },

    Exp9_emptyarray(type, _open, _close) {
      const typeStr = type.analyze();
      return core.emptyArrayExpression(typeStr);
    },

    Exp9_arrayexp(_open, elements, _close) {
      const exps = elements.asIteration().children.map((e) => e.analyze());
      if (exps.length > 0) {
        const type = exps[0].type;
        exps.slice(1).forEach((e) => {
          mustBeSameType({ type }, e, elements);
        });
        return core.arrayExpression(exps, `[${type}]`);
      }
      return core.arrayExpression([], "[any]");
    },

    Exp9_parens(_open, exp, _close) {
      return exp.analyze();
    },

    Exp9_nil(_nil) {
      return core.nilLiteral("any");
    },

    intlit(_digits) {
      const node = core.intlit(parseInt(this.sourceString));
      node.type = "number";
      return node;
    },

    floatlit(_int, _dot, _frac, _e, _sign, _exp) {
      const node = core.floatlit(parseFloat(this.sourceString));
      node.type = "number";
      return node;
    },

    stringlit(_open, chars, _close) {
      const node = core.stringlit(chars.sourceString);
      node.type = "string";
      return node;
    },

    on(_) {
      const node = core.on();
      node.type = "boolean";
      return node;
    },

    off(_) {
      const node = core.off();
      node.type = "boolean";
      return node;
    },

    id(_first, _rest) {
      const name = this.sourceString;
      const entity = context.lookup(name);
      mustBeDeclared(name, this);
      return entity;
    },
  });

  return analyzer(match).analyze();
}
