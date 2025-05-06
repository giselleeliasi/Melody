import * as core from "./core.js";

export default function optimize(node) {
  return optimizers?.[node.kind]?.(node) ?? node;
}

const isZero = (n) => n === 0 || n === 0n;
const isOne = (n) => n === 1 || n === 1n;

const optimizers = {
  Program(p) {
    p.compositions = p.compositions.flatMap(optimize);
    return p;
  },
  NoteDeclaration(d) {
    d.variable = optimize(d.variable);
    d.initializer = optimize(d.initializer);
    return d;
  },
  GrandDeclaration(d) {
    d.type = optimize(d.type);
    return d;
  },
  MeasureDeclaration(d) {
    d.measure = optimize(d.measure);
    if (d.body) d.body = d.body.flatMap(optimize);
    return d;
  },
  Field(f) {
    f.type = optimize(f.type);
    return f;
  },
  Bump(s) {
    s.variable = optimize(s.variable);
    return s;
  },
  Assign(s) {
    s.source = optimize(s.source);
    s.target = optimize(s.target);
    if (s.source === s.target) {
      return [];
    }
    return s;
  },
  BreakStatement(s) {
    return s;
  },
  ReturnStatement(s) {
    s.expression = optimize(s.expression);
    return s;
  },
  ShortReturnStatement(s) {
    return s;
  },
  PlayStatement(s) {
    s.expression = optimize(s.expression);
    return s;
  },
  CallStatement(s) {
    s.call = optimize(s.call);
    return s;
  },
  IfStatement(s) {
    s.test = optimize(s.test);
    s.consequent = s.consequent.flatMap(optimize);
    if (s.alternate?.kind?.endsWith?.("IfStatement")) {
      s.alternate = optimize(s.alternate);
    } else {
      s.alternate = s.alternate.flatMap(optimize);
    }
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : s.alternate;
    }
    return s;
  },
  ShortIfStatement(s) {
    s.test = optimize(s.test);
    s.consequent = s.consequent.flatMap(optimize);
    if (s.test.constructor === Boolean) {
      return s.test ? s.consequent : [];
    }
    return s;
  },
  RepeatWhileStatement(s) {
    s.test = optimize(s.test);
    if (s.test === false) {
      return [];
    }
    s.body = s.body.flatMap(optimize);
    return s;
  },
  RepeatStatement(s) {
    s.count = optimize(s.count);
    if (s.count === 0) {
      return [];
    }
    s.body = s.body.flatMap(optimize);
    return s;
  },
  ForRangeStatement(s) {
    s.iterator = optimize(s.iterator);
    s.low = optimize(s.low);
    s.op = optimize(s.op);
    s.high = optimize(s.high);
    s.body = s.body.flatMap(optimize);
    if (s.low.constructor === Number) {
      if (s.high.constructor === Number) {
        if (s.low > s.high) {
          return [];
        }
      }
    }
    return s;
  },
  ForStatement(s) {
    s.iterator = optimize(s.iterator);
    s.collection = optimize(s.collection);
    s.body = s.body.flatMap(optimize);
    if (s.collection?.kind === "EmptyArray") {
      return [];
    }
    return s;
  },
  Conditional(e) {
    e.test = optimize(e.test);
    e.consequent = optimize(e.consequent);
    e.alternate = optimize(e.alternate);
    if (e.test.constructor === Boolean) {
      return e.test ? e.consequent : e.alternate;
    }
    return e;
  },
  UnwrapElse(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (e.left?.kind === "EmptyOptional") {
      return e.right;
    }
    return e;
  },
  Or(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (e.left === false) return e.right;
    if (e.right === false) return e.left;
    return e;
  },
  And(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (e.left === true) return e.right;
    if (e.right === true) return e.left;
    return e;
  },
  BitOr(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      return e.left | e.right;
    }
    return e;
  },
  BitXor(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      return e.left ^ e.right;
    }
    return e;
  },
  BitAnd(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      return e.left & e.right;
    }
    return e;
  },
  Compare(e) {
    e.left = optimize(e.left);
    e.op = optimize(e.op);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      if (e.op === "<") return e.left < e.right;
      if (e.op === "<=") return e.left <= e.right;
      if (e.op === "==") return e.left === e.right;
      if (e.op === "!=") return e.left !== e.right;
      if (e.op === ">=") return e.left >= e.right;
      if (e.op === ">") return e.left > e.right;
    }
    return e;
  },
  Shift(e) {
    e.left = optimize(e.left);
    e.op = optimize(e.op);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      if (e.op === "<<") return e.left << e.right;
      if (e.op === ">>") return e.left >> e.right;
    }
    return e;
  },
  Add(e) {
    e.left = optimize(e.left);
    e.op = optimize(e.op);
    e.right = optimize(e.right);
    if ([Number, BigInt].includes(e.left.constructor)) {
      if ([Number, BigInt].includes(e.right.constructor)) {
        if (e.op === "+") return e.left + e.right;
        if (e.op === "-") return e.left - e.right;
      }
      if (isZero(e.left) && e.op === "+") return e.right;
      if (isZero(e.left) && e.op === "-") return core.unary("-", e.right);
    } else if ([Number, BigInt].includes(e.right.constructor)) {
      if (isZero(e.right) && ["+", "-"].includes(e.op)) return e.left;
    }
    return e;
  },
  Multiply(e) {
    e.left = optimize(e.left);
    e.op = optimize(e.op);
    e.right = optimize(e.right);
    if ([Number, BigInt].includes(e.left.constructor)) {
      if ([Number, BigInt].includes(e.right.constructor)) {
        if (e.op === "*") return e.left * e.right;
        if (e.op === "/") return e.left / e.right;
        if (e.op === "%") return e.left % e.right;
      }
      if (isOne(e.left) && e.op === "*") return e.right;
      if (isZero(e.left) && ["*", "/"].includes(e.op)) return e.left;
    } else if ([Number, BigInt].includes(e.right.constructor)) {
      if (isOne(e.right) && ["*", "/"].includes(e.op)) return e.left;
      if (isZero(e.right) && e.op === "*") return e.right;
    }
    return e;
  },
  Power(e) {
    e.left = optimize(e.left);
    e.right = optimize(e.right);
    if (
      [Number, BigInt].includes(e.left.constructor) &&
      [Number, BigInt].includes(e.right.constructor)
    ) {
      return e.left ** e.right;
    }
    if (isOne(e.left)) return e.left;
    if (isZero(e.right)) return 1;
    return e;
  },
  UnaryExpression(e) {
    e.op = optimize(e.op);
    e.operand = optimize(e.operand);
    if (e.operand.constructor === Number) {
      if (e.op === "-") return -e.operand;
      if (e.op === "!") return !e.operand;
    }
    if (e.operand.constructor === Boolean && e.op === "!") return !e.operand;
    return e;
  },
  SubscriptExpression(e) {
    e.array = optimize(e.array);
    e.index = optimize(e.index);
    return e;
  },
  ArrayExpression(e) {
    e.elements = e.elements.map(optimize);
    return e;
  },
  MemberExpression(e) {
    e.object = optimize(e.object);
    return e;
  },
  FunctionCall(c) {
    c.callee = optimize(c.callee);
    c.args = c.args.map(optimize);
    return c;
  },
  ConstructorCall(c) {
    c.callee = optimize(c.callee);
    c.args = c.args.map(optimize);
    return c;
  },
  EmptyOptional(e) {
    return e;
  },
  EmptyArray(e) {
    return e;
  },
  On(e) {
    return e;
  },
  Off(e) {
    return e;
  },
  Nil(e) {
    return e;
  },
  Some(e) {
    e.operand = optimize(e.operand);
    return e;
  },
  Random(e) {
    e.operand = optimize(e.operand);
    return e;
  },
  StringLiteral(e) {
    return e;
  },
  IntLiteral(e) {
    return e;
  },
  FloatLiteral(e) {
    return e;
  },
  Variable(e) {
    return e;
  },
  Type(e) {
    return e;
  },
  OptionalType(e) {
    e.base = optimize(e.base);
    return e;
  },
  ArrayType(e) {
    e.base = optimize(e.base);
    return e;
  },
  FunctionType(e) {
    e.paramTypes = e.paramTypes.map(optimize);
    e.returnType = optimize(e.returnType);
    return e;
  },
  IdType(e) {
    return e;
  },
};
