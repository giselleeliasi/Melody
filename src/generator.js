import { voidType } from "./core.js";

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
    NoteDecl(d) {
      output.push(`let ${gen(d.id)} = ${gen(d.initializer)};`);
    },
    GrandDecl(d) {
      output.push(`class ${gen(d.id)} {`);
      output.push(`constructor(${d.fields.map(gen).join(", ")}) {`);
      for (let f of d.fields) {
        output.push(`this[${JSON.stringify(gen(f))}] = ${gen(f)};`);
      }
      output.push("}");
      output.push("}");
    },
    Field(f) {
      return targetName(f);
    },
    MeasureDecl(d) {
      output.push(`function ${gen(d.id)}(${d.params.map(gen).join(", ")}) {`);
      d.body.forEach(gen);
      output.push("}");
    },
    Param(p) {
      return targetName(p);
    },
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      if (s.alternate?.kind?.endsWith("IfStatement")) {
        output.push("} else ");
        gen(s.alternate);
      } else if (s.alternate) {
        output.push("} else {");
        s.alternate.forEach(gen);
        output.push("}");
      } else {
        output.push("}");
      }
    },
    RepeatWhile(s) {
      output.push(`while (${gen(s.test)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },
    RepeatTimes(s) {
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
    ForCollection(s) {
      output.push(`for (let ${gen(s.iterator)} of ${gen(s.collection)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },
    Bump(s) {
      output.push(`${gen(s.id)}${s.op};`);
    },
    Assignment(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`);
    },
    Play(s) {
      output.push(`console.log(${gen(s.exp)});`);
    },
    Call(s) {
      output.push(`${gen(s.call)};`);
    },
    BreakStatement(_) {
      output.push("break;");
    },
    ReturnStatement(s) {
      output.push(`return ${gen(s.exp)};`);
    },
    ShortReturn(_) {
      output.push("return;");
    },
    Conditional(e) {
      return `(${gen(e.test)} ? ${gen(e.consequent)} : ${gen(e.alternate)})`;
    },
    BinaryExpression(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },
    UnaryExpression(e) {
      const operand = gen(e.operand);
      if (e.op === "#") return `${operand}.length`;
      if (e.op === "random")
        return `((a=>a[~~(Math.random()*a.length)])(${operand}))`;
      return `${e.op}${operand}`;
    },
    EmptyOptional(_) {
      return "undefined";
    },
    Nil(_) {
      return "null";
    },
    Variable(v) {
      return v.name;
    },
    NumberLiteral(n) {
      return n.value;
    },
    StringLiteral(s) {
      return JSON.stringify(s.value);
    },
    ArrayExpression(e) {
      return `[${e.elements.map(gen).join(", ")}]`;
    },
    EmptyArray(_) {
      return "[]";
    },
    Subscript(e) {
      return `${gen(e.array)}[${gen(e.index)}]`;
    },
    Member(e) {
      const obj = gen(e.object);
      const field = JSON.stringify(gen(e.field));
      const chain = e.op === "." ? "" : "?.";
      return `${obj}${chain}[${field}]`;
    },
    FunctionCall(c) {
      const args = c.args.map(gen).join(", ");
      const code = `${gen(c.callee)}(${args})`;
      if (c.callee.type?.returnType !== voidType) {
        return code;
      }
      output.push(`${code};`);
    },
    ConstructorCall(c) {
      return `new ${gen(c.callee)}(${c.args.map(gen).join(", ")})`;
    },
    Parens(e) {
      return `(${gen(e.expression)})`;
    },
  };

  gen(program);
  return output.join("\n");
}
