// Program Structure
export function program(compositions) {
  return baseNode("Program", { compositions });
}

// Declarations
export function noteDeclaration(variable, initializer) {
  return baseNode("NoteDeclaration", { variable, initializer });
}

export function grandDeclaration(grandType) {
  return baseNode("GrandDeclaration", { grandType });
}

export function grandType(name, fields) {
  return baseNode("GrandType", { name, fields });
}

export function field(name, type) {
  return baseNode("Field", { name, type });
}

export function measureDeclaration(measure) {
  return baseNode("MeasureDeclaration", { measure });
}

export function measure(name, parameters, returnType, body) {
  return baseNode("Measure", {
    name,
    parameters,
    returnType,
    body,
    // Track whether all code paths return
    returns: false,
  });
}

// Variables and Parameters
export function variable(name, type, mutable) {
  return baseNode("Variable", { name, type, mutable });
}

// Statements
export function bumpStatement(variable, op) {
  return baseNode("BumpStatement", { variable, op });
}

export function assignmentStatement(target, source) {
  return baseNode("AssignmentStatement", { target, source });
}

export function callStatement(call) {
  return baseNode("CallStatement", { call });
}

export function breakStatement() {
  return baseNode("BreakStatement", {});
}

export function returnStatement(expression) {
  const node = baseNode("ReturnStatement", { expression });
  node.type = expression?.type || "void";
  return node;
}

export function shortReturnStatement() {
  return baseNode("ShortReturnStatement", { type: "void" });
}

// Control Structures
export function ifStatement(test, consequent, alternate) {
  const node = baseNode("IfStatement", { test, consequent, alternate });
  // Determine type based on branches
  node.type = alternate ? consequent.type : "void";
  return node;
}

export function shortIfStatement(test, consequent) {
  return baseNode("ShortIfStatement", { test, consequent, type: "void" });
}

export function repeatWhileStatement(test, body) {
  return baseNode("RepeatWhileStatement", { test, body, type: "void" });
}

export function timesStatement(times, body) {
  return baseNode("TimesStatement", { times, body, type: "void" });
}

export function rangeStatement(variable, start, rangeOp, end, body) {
  return baseNode("RangeStatement", {
    variable,
    start,
    rangeOp,
    end,
    body,
    type: "void",
  });
}

export function forEachStatement(element, collection, body) {
  return baseNode("ForEachStatement", {
    element,
    collection,
    body,
    type: "void",
  });
}

export function block(compositions) {
  const node = baseNode("Block", { compositions });
  // Determine if block returns
  node.returns = compositions.some((c) => c.returns);
  node.type = node.returns ? compositions.find((c) => c.returns).type : "void";
  return node;
}

// Expressions
export function conditionalExpression(test, consequent, alternate) {
  return baseNode("ConditionalExpression", {
    test,
    consequent,
    alternate,
    type: consequent.type,
  });
}

export function unwrapElseExpression(left, right) {
  return baseNode("UnwrapElseExpression", {
    left,
    right,
    type: right.type,
  });
}

export function binaryExpression(op, left, right, type) {
  return baseNode("BinaryExpression", { op, left, right, type });
}

export function unaryExpression(op, operand, type) {
  return baseNode("UnaryExpression", { op, operand, type });
}

export function callExpression(callee, args, type) {
  return baseNode("CallExpression", { callee, args, type });
}

export function subscriptExpression(array, index, type) {
  return baseNode("SubscriptExpression", { array, index, type });
}

export function memberExpression(object, field, type) {
  return baseNode("MemberExpression", { object, field, type });
}

export function arrayExpression(elements, type) {
  return baseNode("ArrayExpression", { elements, type });
}

export function emptyArrayExpression(type) {
  return baseNode("EmptyArrayExpression", { type: `[${type}]` });
}

// Literals
export function integerLiteral(value) {
  return baseNode("IntegerLiteral", { value, type: "number" });
}

export function floatLiteral(value) {
  return baseNode("FloatLiteral", { value, type: "number" });
}

export function stringLiteral(value) {
  return baseNode("StringLiteral", { value, type: "string" });
}

export function booleanLiteral(value) {
  return baseNode("BooleanLiteral", { value, type: "boolean" });
}

export function nilLiteral(type) {
  return baseNode("NilLiteral", {
    type: type.endsWith("?") ? type : `${type}?`,
  });
}

// Type Utilities
export function isArrayType(type) {
  return type.startsWith("[") && type.endsWith("]");
}

export function getArrayElementType(type) {
  return type.slice(1, -1);
}

export function isOptionalType(type) {
  return type.endsWith("?");
}

export function getBaseType(type) {
  return isOptionalType(type) ? type.slice(0, -1) : type;
}
