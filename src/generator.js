export default function generate(program) {
  const output = [];

  // Map to handle name mangling for JavaScript compatibility
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
    // Program structure
    Program(p) {
      p.compositions.forEach(gen);
    },

    // Declarations
    NoteDeclaration(d) {
      output.push(`let ${gen(d.variable)} = ${gen(d.initializer)};`);
    },

    GrandDeclaration(d) {
      output.push(`class ${gen(d.grandType)} {`);
      output.push(
        `  constructor(${d.grandType.fields
          .map((f) => gen(f.name))
          .join(", ")}) {`
      );
      d.grandType.fields.forEach((f) => {
        output.push(`    this.${gen(f.name)} = ${gen(f.name)};`);
      });
      output.push(`  }`);
      output.push(`}`);
    },

    MeasureDeclaration(d) {
      output.push(
        `function ${gen(d.measure)}(${d.measure.parameters
          .map(gen)
          .join(", ")}) {`
      );
      d.measure.body.forEach(gen);
      if (d.measure.returnType !== "void") {
        output.push(
          `return ${gen(d.measure.body[d.measure.body.length - 1])};`
        );
      }
      output.push("}");
    },

    // Variables and parameters
    Variable(v) {
      return targetName(v);
    },

    Field(f) {
      return targetName(f);
    },

    // Statements
    BumpStatement(s) {
      output.push(`${gen(s.variable)}${s.op};`);
    },

    AssignmentStatement(s) {
      output.push(`${gen(s.target)} = ${gen(s.source)};`);
    },

    CallStatement(s) {
      output.push(`${gen(s.call)};`);
    },

    BreakStatement() {
      output.push("break;");
    },

    ReturnStatement(s) {
      output.push(`return ${gen(s.expression)};`);
    },

    ShortReturnStatement() {
      output.push("return;");
    },

    // Control structures
    IfStatement(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      if (s.alternate?.kind?.endsWith?.("IfStatement")) {
        output.push("} else");
        gen(s.alternate);
      } else {
        output.push("} else {");
        s.alternate.forEach(gen);
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

    TimesStatement(s) {
      output.push(`for (let i = 0; i < ${gen(s.times)}; i++) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    RangeStatement(s) {
      const endOp = s.rangeOp === "..." ? "<=" : "<";
      output.push(
        `for (let ${gen(s.variable)} = ${gen(s.start)}; ${gen(
          s.variable
        )} ${endOp} ${gen(s.end)}; ${gen(s.variable)}++) {`
      );
      s.body.forEach(gen);
      output.push("}");
    },

    ForEachStatement(s) {
      output.push(`for (let ${gen(s.element)} of ${gen(s.collection)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    Block(b) {
      output.push("{");
      b.compositions.forEach(gen);
      output.push("}");
    },

    // Expressions
    ConditionalExpression(e) {
      return `(${gen(e.test)} ? ${gen(e.consequent)} : ${gen(e.alternate)})`;
    },

    UnwrapElseExpression(e) {
      return `(${gen(e.left)} ?? ${gen(e.right)})`;
    },

    BinaryExpression(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },

    UnaryExpression(e) {
      if (e.op === "#") {
        return `${gen(e.operand)}.length`;
      } else if (e.op === "some") {
        return `new Some(${gen(e.operand)})`;
      } else if (e.op === "random") {
        return `Math.random() * ${gen(e.operand)}`;
      }
      return `${e.op}(${gen(e.operand)})`;
    },

    CallExpression(e) {
      return `${gen(e.callee)}(${e.args.map(gen).join(", ")})`;
    },

    SubscriptExpression(e) {
      return `${gen(e.array)}[${gen(e.index)}]`;
    },

    MemberExpression(e) {
      return `${gen(e.object)}.${gen(e.field)}`;
    },

    ArrayExpression(e) {
      return `[${e.elements.map(gen).join(", ")}]`;
    },

    EmptyArrayExpression(e) {
      return `[]`;
    },

    // Literals
    IntegerLiteral(e) {
      return e.value;
    },

    FloatLiteral(e) {
      return e.value;
    },

    StringLiteral(e) {
      return `"${e.value}"`;
    },

    BooleanLiteral(e) {
      return e.value ? "true" : "false";
    },

    NilLiteral(e) {
      return "null";
    },
  };

  // Generate the runtime support code first
  output.unshift(`
    class Some {
      constructor(value) {
        this.value = value;
      }
      
      unwrapElse(defaultValue) {
        return this.value ?? defaultValue;
      }
    }
  `);

  gen(program);
  return output.join("\n");
}
