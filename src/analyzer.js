import * as core from "./core.js";

export default function analyze(match) {
  const grammar = match.matcher.grammar;

  class Context {
    constructor(parent = null, inLoop = false, inFunction = false) {
      this.parent = parent;
      this.locals = new Map();
      this.inLoop = inLoop;
      this.inFunction = inFunction;
    }

    add(name, entity) {
      this.locals.set(name, entity);
    }

    lookup(name) {
      return this.locals.get(name) ?? this.parent?.lookup(name);
    }

    newChildContext({ inLoop = false, inFunction = false } = {}) {
      return new Context(
        this,
        inLoop || this.inLoop,
        inFunction || this.inFunction
      );
    }
  }

  let context = new Context();

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
      e.type === "string" || e.type.endsWith("]"),
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
      (from.kind === "NilLiteral" && toType.endsWith("?")) ||
        fromType === toType ||
        toType === `${fromType}?`,
      `Cannot assign ${fromType} to ${toType}`,
      at
    );
  }

  function isMutable(variable) {
    return (
      variable.mutable ||
      (variable.kind === "SubscriptExp" && isMutable(variable.array))
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
      return core.assignStatement(dest, source);
    },

    Composition_call(exp, _semi) {
      const call = exp.analyze();
      must(call.kind === "CallExp", `Expected function call`, exp);
      return core.callStatement(call);
    },

    Composition_break(_break, _semi) {
      must(context.inLoop, `Break can only appear in a loop`, _break);
      return core.breakStatement();
    },

    Composition_return(_return, exp, _semi) {
      must(context.inFunction, `Return can only appear in a function`, _return);
      const value = exp.analyze();
      return core.returnStatement(value);
    },

    Composition_shortreturn(_return, _semi) {
      must(context.inFunction, `Return can only appear in a function`, _return);
      return core.shortReturnStatement();
    },

    NoteDecl(_qualifier, id, _eq, exp, _semi) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const initializer = exp.analyze();
      const mutable = _qualifier.sourceString === "let";
      const variable = core.variable(
        id.sourceString,
        initializer.type,
        mutable
      );
      context.add(id.sourceString, variable);
      return core.noteDecl(variable, initializer);
    },

    GrandDecl(_grand, id, _open, fields, _close) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const fieldList = fields.children.map((f) => f.analyze());
      const grandType = core.grandType(id.sourceString, fieldList);
      context.add(id.sourceString, grandType);
      return core.grandDecl(grandType);
    },

    Field(id, _colon, type) {
      return core.field(id.sourceString, type.analyze());
    },

    MeasureDecl(_measure, id, params, returnType, block) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const oldContext = context;
      context = context.newChildContext({ inFunction: true });

      const parameters = params.analyze();
      const returnTypeNode = returnType.child(1)?.child(0)?.analyze() || "void";
      const body = block.analyze();

      context = oldContext;

      const measure = core.measure(
        id.sourceString,
        parameters,
        returnTypeNode,
        body
      );
      context.add(id.sourceString, measure);
      return core.measureDecl(measure);
    },

    Params(_open, params, _close) {
      return params.asIteration().children.map((p) => p.analyze());
    },

    Param(id, _colon, type) {
      mustNotAlreadyBeDeclared(id.sourceString, id);
      const paramType = type.analyze();
      const param = core.variable(id.sourceString, paramType, false);
      context.add(id.sourceString, param);
      return param;
    },

    Type_optional(type, _qmark) {
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
      return core.ifStmt(test, consequent, alternate);
    },

    IfStmt_elsif(_if, exp, block, _else, trailingIf) {
      const test = exp.analyze();
      mustBeBoolean(test, exp);
      context = context.newChildContext();
      const consequent = block.analyze();
      context = context.parent;
      const alternate = trailingIf.analyze();
      return core.ifStmt(test, consequent, alternate);
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
      return core.repeatWhileStmt(test, body);
    },

    RepeatStmt_times(_repeat, exp, block) {
      const times = exp.analyze();
      mustBeNumeric(times, exp);
      context = context.newChildContext({ inLoop: true });
      const body = block.analyze();
      context = context.parent;
      return core.timesStmt(times, body);
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

      return core.rangeStmt(
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
      mustBeArrayOrString(collection, exp);

      context = context.newChildContext({ inLoop: true });
      const elementType = collection.type.startsWith("[")
        ? collection.type.slice(1, -1)
        : "string";
      const element = core.variable(id.sourceString, elementType, true);
      context.add(id.sourceString, element);

      const body = block.analyze();
      context = context.parent;

      return core.forEachStmt(element, collection, body);
    },

    Block(_open, compositions, _close) {
      return core.block(compositions.children.map((c) => c.analyze()));
    },

    Exp_conditional(cond, _qmark, thenExp, _colon, elseExp) {
      const condition = cond.analyze();
      mustBeBoolean(condition, cond);
      const thenBranch = thenExp.analyze();
      const elseBranch = elseExp.analyze();
      mustBeSameType(thenBranch, elseBranch, elseExp);
      return core.conditionalExp(condition, thenBranch, elseBranch);
    },

    Exp1_unwrapelse(left, _op, right) {
      const leftExp = left.analyze();
      must(leftExp.type.endsWith("?"), `Expected optional type`, left);
      const rightExp = right.analyze();
      mustBeSameType({ type: leftExp.type.slice(0, -1) }, rightExp, right);
      return core.unwrapElseExp(leftExp, rightExp);
    },

    Exp2_or(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeBoolean(leftExp, left);
      mustBeBoolean(rightExp, right);
      return core.binaryExp("||", leftExp, rightExp, "boolean");
    },

    Exp2_and(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeBoolean(leftExp, left);
      mustBeBoolean(rightExp, right);
      return core.binaryExp("&&", leftExp, rightExp, "boolean");
    },

    Exp3_bitor(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp("|", leftExp, rightExp, "number");
    },

    Exp3_bitxor(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp("^", leftExp, rightExp, "number");
    },

    Exp3_bitand(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp("&", leftExp, rightExp, "number");
    },

    Exp4_compare(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      if (op.sourceString === "==" || op.sourceString === "!=") {
        // Allow comparison between different types
      } else {
        mustBeNumericOrString(leftExp, left);
        mustBeNumericOrString(rightExp, right);
        mustBeSameType(leftExp, rightExp, right);
      }
      return core.binaryExp(op.sourceString, leftExp, rightExp, "boolean");
    },

    Exp5_shift(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp(op.sourceString, leftExp, rightExp, "number");
    },

    Exp6_add(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      if (op.sourceString === "+") {
        if (leftExp.type === "string" || rightExp.type === "string") {
          return core.binaryExp("+", leftExp, rightExp, "string");
        }
      }
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp(op.sourceString, leftExp, rightExp, "number");
    },

    Exp7_multiply(left, op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp(op.sourceString, leftExp, rightExp, "number");
    },

    Exp8_power(left, _op, right) {
      const leftExp = left.analyze();
      const rightExp = right.analyze();
      mustBeNumeric(leftExp, left);
      mustBeNumeric(rightExp, right);
      return core.binaryExp("**", leftExp, rightExp, "number");
    },

    Exp9_unary(op, operand) {
      const exp = operand.analyze();
      switch (op.sourceString) {
        case "#":
          mustBeArrayOrString(exp, operand);
          return core.unaryExp("#", exp, "number");
        case "-":
          mustBeNumeric(exp, operand);
          return core.unaryExp("-", exp, "number");
        case "!":
          mustBeBoolean(exp, operand);
          return core.unaryExp("!", exp, "boolean");
        case "some":
          must(!exp.type.endsWith("?"), `Already an optional type`, operand);
          return core.unaryExp("some", exp, `${exp.type}?`);
        case "random":
          mustBeNumeric(exp, operand);
          return core.unaryExp("random", exp, "number");
        default:
          throw new Error(`Unknown unary operator: ${op.sourceString}`);
      }
    },

    Exp9_emptyopt(_no, type) {
      const typeStr = type.analyze();
      must(typeStr.endsWith("?"), `Expected optional type`, type);
      return core.nilLiteral(typeStr);
    },

    Exp9_call(fun, _open, args, _close) {
      const func = fun.analyze();
      must(func.kind === "Measure", `${func.name} not a function`, fun);
      const argExps = args.asIteration().children.map((a) => a.analyze());
      must(
        argExps.length === func.parameters.length,
        `Expected ${func.parameters.length} arguments but got ${argExps.length}`,
        fun
      );
      argExps.forEach((arg, i) => {
        mustBeAssignable(arg, func.parameters[i].type, args.children[i]);
      });
      return core.callExp(func, argExps, func.returnType);
    },

    Exp9_subscript(array, _open, index, _close) {
      const arr = array.analyze();
      const idx = index.analyze();
      mustBeArrayOrString(arr, array);
      mustBeNumeric(idx, index);
      const elementType = arr.type.startsWith("[")
        ? arr.type.slice(1, -1)
        : "string";
      return core.subscriptExp(arr, idx, elementType);
    },

    Exp9_member(object, _dot, id) {
      const obj = object.analyze();
      must(obj.kind === "Grand", `Expected grand type`, object);
      const field = obj.fields.find((f) => f.name === id.sourceString);
      must(field, `No such field: ${id.sourceString}`, id);
      return core.memberExp(obj, field, field.type);
    },

    Exp9_id(_first, _rest) {
      const name = this.sourceString;
      const entity = context.lookup(name);
      mustBeDeclared(name, this);
      return entity;
    },

    Exp9_emptyarray(type, _open, _close) {
      const typeStr = type.analyze();
      return core.emptyArrayExp(typeStr);
    },

    Exp9_arrayexp(_open, elements, _close) {
      const exps = elements.asIteration().children.map((e) => e.analyze());
      if (exps.length > 0) {
        const type = exps[0].type;
        for (let i = 1; i < exps.length; i++) {
          mustBeSameType({ type }, exps[i], elements.children[i]);
        }
        return core.arrayExp(exps, `[${type}]`);
      }
      return core.arrayExp([], "[any]");
    },

    Exp9_parens(_open, exp, _close) {
      return exp.analyze();
    },

    intlit(_digits) {
      return core.integerLiteral(parseInt(this.sourceString));
    },

    floatlit(_int, _dot, _frac, _e, _sign, _exp) {
      return core.floatLiteral(parseFloat(this.sourceString));
    },

    stringlit(_open, chars, _close) {
      return core.stringLiteral(chars.sourceString);
    },

    on(_) {
      return core.booleanLiteral(true);
    },

    off(_) {
      return core.booleanLiteral(false);
    },
  });

  return analyzer(match).analyze();
}
