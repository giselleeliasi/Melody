import { voidType, standardLibrary } from "./core.js";

export default function generate(program) {
  const output = [];

  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1);
      }
      return `${entity.name}_${mapping.get(entity)}`;
    };
  })(new Map());

  const gen = (node) => generators?.[node?.kind]?.(node) ?? node;

  const generators = {
    Program(p) {
      p.compositions.forEach(gen);
    },

    // Declarations
    NoteDecl(d) {
      const declarator = d.modifier === "const" ? "const" : "let";
      output.push(`${declarator} ${gen(d.variable)} = ${gen(d.initializer)};`);
    },

    GrandDecl(d) {
      // Grand declarations translate to JS classes
      output.push(`class ${gen(d.type)} {`);
      output.push(`constructor(${d.type.fields.map(gen).join(", ")}) {`);
      for (let field of d.type.fields) {
        output.push(`this[${JSON.stringify(gen(field))}] = ${gen(field)};`);
      }
      output.push("}");
      output.push("}");
    },

    MeasureDecl(d) {
      // Measure declarations translate to JS functions
      output.push(
        `function ${gen(d.measure)}(${d.measure.params.map(gen).join(", ")}) {`
      );
      d.measure.body.forEach(gen);
      output.push("}");
    },

    // Statements
    Bump(s) {
      // Handle ++ and -- operations
      output.push(`${gen(s.variable)}${s.op};`);
    },

    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`);
    },

    Play(s) {
      // Play statement would translate to some function call in the target environment
      output.push(`play(${gen(s.note)});`);
    },

    Call(s) {
      output.push(`${gen(s.callee)}(${s.args.map(gen).join(", ")});`);
    },

    BreakStatement(s) {
      output.push("break;");
    },

    ReturnStatement(s) {
      output.push(`return ${gen(s.expression)};`);
    },

    ShortReturnStatement(s) {
      output.push("return;");
    },

    // Control flow
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      if (s.alternate) {
        if (s.alternate.kind?.endsWith?.("IfStatement")) {
          output.push("} else ");
          gen(s.alternate);
        } else {
          output.push("} else {");
          s.alternate.forEach(gen);
          output.push("}");
        }
      } else {
        output.push("}");
      }
    },

    ShortIfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      output.push("}");
    },

    RepeatWhileStatement(s) {
      output.push(`while (${gen(s.test)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    RepeatTimesStatement(s) {
      // JS can only repeat n times if you give it a counter variable!
      const i = targetName({ name: "i" });
      output.push(`for (let ${i} = 0; ${i} < ${gen(s.count)}; ${i}++) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    ForRangeStatement(s) {
      const i = targetName(s.iterator);
      const op = s.op === "..." ? "<=" : "<";
      output.push(
        `for (let ${i} = ${gen(s.low)}; ${i} ${op} ${gen(s.high)}; ${i}++) {`
      );
      s.body.forEach(gen);
      output.push("}");
    },

    ForCollectionStatement(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    // Expressions
    Conditional(e) {
      return `((${gen(e.test)}) ? (${gen(e.consequent)}) : (${gen(
        e.alternate
      )}))`;
    },

    UnwrapElseExpression(e) {
      return `(${gen(e.optional)} ?? ${gen(e.alternate)})`;
    },

    OrExpression(e) {
      return e.terms.map(gen).join(" || ");
    },

    AndExpression(e) {
      return e.terms.map(gen).join(" && ");
    },

    BitOrExpression(e) {
      return e.terms.map(gen).join(" | ");
    },

    BitXorExpression(e) {
      return e.terms.map(gen).join(" ^ ");
    },

    BitAndExpression(e) {
      return e.terms.map(gen).join(" & ");
    },

    CompareExpression(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },

    ShiftExpression(e) {
      return `(${gen(e.left)} ${e.op} ${gen(e.right)})`;
    },

    AddExpression(e) {
      return `(${gen(e.left)} ${e.op} ${gen(e.right)})`;
    },

    MultiplyExpression(e) {
      return `(${gen(e.left)} ${e.op} ${gen(e.right)})`;
    },

    PowerExpression(e) {
      return `Math.pow(${gen(e.left)}, ${gen(e.right)})`;
    },

    UnaryExpression(e) {
      const operand = gen(e.operand);
      if (e.op === "some") return operand;
      if (e.op === "#") return `${operand}.length`;
      if (e.op === "random")
        return `((a=>a[Math.floor(Math.random()*a.length)])(${operand}))`;
      return `${e.op}(${operand})`;
    },

    EmptyOptional(e) {
      return "undefined";
    },

    NilExpression(e) {
      return "null";
    },

    CallExpression(e) {
      return `${gen(e.callee)}(${e.args.map(gen).join(", ")})`;
    },

    SubscriptExpression(e) {
      const optional = e.op === "?[" ? "?" : "";
      return `${gen(e.array)}${optional}[${gen(e.index)}]`;
    },

    MemberExpression(e) {
      const object = gen(e.object);
      const field = JSON.stringify(gen(e.field));
      const chain = e.op === "." ? "" : "?";
      return `${object}${chain}[${field}]`;
    },

    IdExpression(e) {
      // Special handling for standard library constants if needed
      if (e.ref === standardLibrary.π) return "Math.PI";
      return targetName(e.ref);
    },

    EmptyArrayExpression(e) {
      return "[]";
    },

    ArrayExpression(e) {
      return `[${e.elements.map(gen).join(", ")}]`;
    },

    // Literals
    IntLiteral(e) {
      return e.value;
    },

    FloatLiteral(e) {
      return e.value;
    },

    StringLiteral(e) {
      return JSON.stringify(e.value);
    },

    BooleanLiteral(e) {
      return e.value === "on" ? "true" : "false";
    },

    // Types and variables
    Variable(v) {
      return targetName(v);
    },

    Measure(m) {
      return targetName(m);
    },

    Type(t) {
      return targetName(t);
    },

    Field(f) {
      return targetName(f);
    },

    Param(p) {
      return targetName(p);
    },
  };

  gen(program);
  return output.join("\n");
}
