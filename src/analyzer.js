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
        ["number", "boolean", "string"].includes(entity),
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
    must(
      e.type === "string" || e.type.endsWith("[]"),
      `Expected string or array, got ${e.type}`,
      at
    );
  }

  function mustBeSameType(a, b, at) {
    must(a.type === b.type, `Type mismatch: ${a.type} vs ${b.type}`, at);
  }

  function mustBeAssignable(from, toType, at) {
    const fromType = from.type;
    must(
      typeof (fromType === "string" && fromType === toType) ||
        (from.type?.kind === "ArrayType" &&
          toType?.kind === "ArrayType" &&
          fromType.baseType ===
            toType.baseType`Cannot assign ${fromType} to ${toType}`),
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

    Composition_bump(exp, op, _semi) {
      const variable = exp.analyze();
      mustBeMutable(variable, exp);
      mustBeNumeric(variable, exp);
      return core.bumpStatement(variable, op.sourceString);
    },

    Composition_assign(target, _eq, exp, _semi) {
      const source = exp.analyze();
      const dest = target.analyze();
      mustBeAssignable(source, dest.type, target);
      mustBeMutable(dest, target);
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
      // must(context.inFunction, `Return can only appear in a function`, _return);
      const value = exp.analyze();
      return core.returnStatement(value);
    },

    Composition_shortreturn(_return, _semi) {
      // must(context.inFunction, `Return can only appear in a function`, _return);
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

    GrandDecl(_grand, id, _open, fields, _close) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const fieldList = fields.children.map((f) => f.analyze());
      const grandType = core.grandType(id.sourceString, fieldList);
      context.add(id.sourceString, grandType);
      return core.grandDeclaration(grandType);
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
      const entity = context.lookup(type);
      mustBeDeclared(type, id);
      mustBeType(entity, id);
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
      return core.conditionalExpression(condition, thenBranch, elseBranch);
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

    Exp3_bitor(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExpression("|", leftExp, rightExp, "number");
    },

    Exp3_bitxor(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExpression("^", leftExp, rightExp, "number");
    },

    Exp3_bitand(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExpression("&", leftExp, rightExp, "number");
    },

    Exp4_compare(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
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
        case "some":
          must(!exp.type.endsWith("?"), `Already an optional type`, operand);
          return core.unaryExpression("some", exp, `${exp.type}?`);
        case "random":
          mustBeNumeric(exp, operand);
          return core.unaryExpression("random", exp, "number");
      }
    },

    Exp9_emptyopt(_no, type) {
      const typeStr = type.analyze();
      must(typeStr.endsWith("?"), `Expected optional type`, type);
      return core.nilLiteral(typeStr);
    },

    Exp9_call(fun, _open, args, _close) {
      const func = fun.analyze();

      must(
        func.kind === "Measure" ||
          (func.kind === "id" && func.name === "print"),
        `Expected function`,
        fun
      );
      const argExps = args.asIteration().children.map((a) => a.analyze());

      if (func.kind === "Measure") {
        must(
          argExps.length === func.parameters.length,
          `Expected ${func.parameters.length} arguments(s) but got ${argExps.length} passed`,
          fun
        );
        argExps.forEach((arg, i) => {
          mustBeAssignable(arg, func.parameters[i].type, args.children[i]);
        });
      }
      return core.callExpression(func, argExps, func.returnType || "void");
    },

    Exp9_subscript(array, _open, index, _close) {
      const arr = array.analyze();
      const idx = index.analyze();
      must(arr.type.kind === "ArrayType", `Expected array type`, array);
      mustBeNumeric(idx, index);
      return core.subscriptExpression(arr, idx, arr.type.baseType);
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
