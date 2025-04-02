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
      output.push(
        `${d.isConst ? "const" : "let"} ${gen(d.name)} = ${gen(d.initializer)};`
      );
    },

    GrandDecl(d) {
      output.push(`class ${d.name} {`);
      output.push(`  constructor(${d.fields.map((f) => f.name).join(", ")}) {`);
      d.fields.forEach((f) => {
        output.push(`    this.${f.name} = ${f.name};`);
      });
      output.push(`  }`);
      output.push(`}`);
    },

    MeasureDecl(d) {
      output.push(
        `function ${d.name}(${d.params.map((p) => p.name).join(", ")}) {`
      );
      d.body.forEach(gen);
      if (d.returnType.name !== "void") {
        output.push(`return ${gen(d.body[d.body.length - 1])};`);
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

    AssignStatement(s) {
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
    IfStmt(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      if (s.alternate?.kind?.endsWith?.("IfStmt")) {
        output.push("} else");
        gen(s.alternate);
      } else {
        output.push("} else {");
        s.alternate.forEach(gen);
        output.push("}");
      }
    },

    ShortIfStmt(s) {
      output.push(`if (${gen(s.test)}) {`);
      s.consequent.forEach(gen);
      output.push("}");
    },

    RepeatWhileStmt(s) {
      output.push(`while (${gen(s.test)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    TimesStmt(s) {
      output.push(`for (let i = 0; i < ${gen(s.times)}; i++) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    RangeStmt(s) {
      const endOp = s.rangeOp === "..." ? "<=" : "<";
      output.push(
        `for (let ${gen(s.variable)} = ${gen(s.start)}; ${gen(
          s.variable
        )} ${endOp} ${gen(s.end)}; ${gen(s.variable)}++) {`
      );
      s.body.forEach(gen);
      output.push("}");
    },

    ForEachStmt(s) {
      output.push(`for (let ${gen(s.element)} of ${gen(s.collection)}) {`);
      s.body.forEach(gen);
      output.push("}");
    },

    Block(b) {
      output.push("{");
      b.statements.forEach(gen);
      output.push("}");
    },

    // Expressions
    ConditionalExp(e) {
      return `(${gen(e.test)} ? ${gen(e.consequent)} : ${gen(e.alternate)})`;
    },

    UnwrapElseExp(e) {
      return `(${gen(e.left)} ?? ${gen(e.right)})`;
    },

    BinaryExp(e) {
      const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
      // Special case for array equality
      if (e.op === "==" || e.op === "!=") {
        if (e.left.type.startsWith("[")) {
          return `JSON.stringify(${gen(e.left)}) ${op} JSON.stringify(${gen(
            e.right
          )})`;
        }
      }
      return `(${gen(e.left)} ${op} ${gen(e.right)})`;
    },

    UnaryExp(e) {
      if (e.op === "#") {
        return `${gen(e.operand)}.length`;
      } else if (e.op === "some") {
        return `new Some(${gen(e.operand)})`;
      } else if (e.op === "random") {
        return `Math.random() * ${gen(e.operand)}`;
      }
      return `${e.op}(${gen(e.operand)})`;
    },

    CallExp(e) {
      return `${gen(e.callee)}(${e.args.map(gen).join(", ")})`;
    },

    SubscriptExp(e) {
      return `${gen(e.array)}[${gen(e.index)}]`;
    },

    MemberExp(e) {
      return `${gen(e.object)}.${gen(e.field)}`;
    },

    ArrayExp(e) {
      return `[${e.elements.map(gen).join(", ")}]`;
    },

    EmptyArrayExp(e) {
      return `[]`;
    },

    // Literals
    IntLiteral(e) {
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
