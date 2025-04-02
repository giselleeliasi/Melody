// Base node creator
function baseNode(kind, properties = {}) {
  return { kind, ...properties };
}

// Program Structure
export function program(compositions) {
  return baseNode("Program", { compositions });
}

// Declarations
export function measureDecl(measure) {
  return baseNode("MeasureDecl", { measure });
}

export function measure(name, parameters, returnType, body) {
  return baseNode("Measure", {
    name,
    parameters,
    returnType,
    body,
  });
}

export function grandDecl(grandType) {
  return baseNode("GrandDecl", { grandType });
}

export function grandType(name, fields) {
  return baseNode("GrandType", { name, fields });
}

export function field(name, type) {
  return baseNode("Field", { name, type });
}

// Variables and Parameters
export function variable(name, type, mutable) {
  return baseNode("Variable", { name, type, mutable });
}

export function noteDecl(variable, initializer) {
  return baseNode("NoteDecl", { variable, initializer });
}

// Statements
export function bumpStatement(variable, op) {
  return baseNode("BumpStatement", { variable, op });
}

export function assignStatement(target, source) {
  return baseNode("AssignStatement", { target, source });
}

export function callStatement(call) {
  return baseNode("CallStatement", { call });
}

export function breakStatement() {
  return baseNode("BreakStatement");
}

export function returnStatement(expression) {
  return baseNode("ReturnStatement", { expression });
}

export function shortReturnStatement() {
  return baseNode("ShortReturnStatement");
}

// Control Structures
export function ifStmt(test, consequent, alternate) {
  return baseNode("IfStmt", { test, consequent, alternate });
}

export function shortIfStmt(test, consequent) {
  return baseNode("ShortIfStmt", { test, consequent });
}

export function repeatWhileStmt(test, body) {
  return baseNode("RepeatWhileStmt", { test, body });
}

export function timesStmt(times, body) {
  return baseNode("TimesStmt", { times, body });
}

export function rangeStmt(variable, start, rangeOp, end, body) {
  return baseNode("RangeStmt", { variable, start, rangeOp, end, body });
}

export function forEachStmt(element, collection, body) {
  return baseNode("ForEachStmt", { element, collection, body });
}

export function block(statements) {
  return baseNode("Block", { statements });
}

// Expressions
export function conditionalExp(test, consequent, alternate) {
  return baseNode("ConditionalExp", { test, consequent, alternate });
}

export function unwrapElseExp(left, right) {
  return baseNode("UnwrapElseExp", { left, right });
}

export function binaryExp(op, left, right, type) {
  return baseNode("BinaryExp", { op, left, right, type });
}

export function unaryExp(op, operand, type) {
  return baseNode("UnaryExp", { op, operand, type });
}

export function callExp(callee, args, type) {
  return baseNode("CallExp", { callee, args, type });
}

export function subscriptExp(array, index, type) {
  return baseNode("SubscriptExp", { array, index, type });
}

export function memberExp(object, field, type) {
  return baseNode("MemberExp", { object, field, type });
}

export function arrayExp(elements, type) {
  return baseNode("ArrayExp", { elements, type });
}

export function emptyArrayExp(type) {
  return baseNode("EmptyArrayExp", { type: `[${type}]` });
}

// Literals
export function intLiteral(value) {
  return baseNode("IntLiteral", { value, type: "number" });
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
  return baseNode("NilLiteral", { type: `${type}?` });
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
