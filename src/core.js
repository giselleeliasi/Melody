export function program(compositions) {
  return { kind: "Program", compositions };
}

export function noteDeclaration(variable, initializer) {
  return { kind: "NoteDecl", variable, initializer };
}

export function variable(name, type, mutable) {
  return { kind: "Variable", name, type, mutable };
}

export function measureDeclaration(measure) {
  return { kind: "measureDeclaration", measure };
}

export function callStatement(call) {
  return { kind: "CallStatement", call };
}

export function measure(name, params, returnType, body) {
  return {
    kind: "Measure",
    name,
    parameters: params,
    returnType,
    body,
  };
}

export function Param(name, type) {
  return { kind: "Param", name, type };
}

export const booleanType = "boolean";
export const intType = "int";
export const floatType = "float";
export const stringType = "string";
export const voidType = "void";
export const anyType = "any";

export function optionalType(baseType) {
  return { kind: "OptionalType", baseType };
}

export function arrayType(baseType) {
  return { kind: "ArrayType", baseType };
}

export function functionType(paramTypes, returnType) {
  return { kind: "FunctionType", paramTypes, returnType };
}

export function bumpStatement(variable, op) {
  return { kind: "Bump", variable, op };
}

export function assignmentStatement(target, source) {
  return { kind: "Assign", target, source };
}

export const breakStatement = { kind: "Break" };

export function returnStatement(expression) {
  return { kind: "Return", expression };
}

export function callExpression(callee, args, returnType) {
  return {
    kind: "CallExpression",
    callee,
    args,
    type: returnType,
  };
}

export const ShortReturn = { kind: "ShortReturn" };

export function ifStatement(test, consequent, alternate) {
  return { kind: "IfStatement", test, consequent, alternate };
}

export function shortIfStmt(test, consequent) {
  return { kind: "ShortIfStatement", test, consequent };
}

export function elsifStatement(test, consequent, alternate) {
  return { kind: "ElsifStatement", test, consequent, alternate };
}

export function repeatWhileStatement(test, body) {
  return { kind: "RepeatWhileStmt", test, body };
}

export function repeatStatement(count, body) {
  return { kind: "RepeatStmt", count, body };
}

export function ForRangeStmt(iterator, low, op, high, body) {
  return { kind: "ForRangeStmt", iterator, low, op, high, body };
}

export function ForStmt(iterator, collection, body) {
  return { kind: "ForStmt", iterator, collection, body };
}

export function binaryExpression(op, left, right, type) {
  return {
    kind: "BinaryExp",
    op,
    left,
    right,
    type,
  };
}

export function Unary(op, operand, type) {
  return { kind: "Unary", op, operand, type };
}

export function no(baseType) {
  return { kind: "no", baseType, type: optionalType(baseType) };
}

export function subscriptExpression(array, index, optional) {
  return {
    kind: "Subscript",
    array,
    index,
    optional,
    type: array.type.baseType,
  };
}

export function arrayExpression(elements) {
  return { kind: "ArrayExp", elements, type: arrayType(elements[0].type) };
}

export function grandDeclaration(grandType) {
  return { kind: "GrandDecl", grandType };
}

export function field(name, type) {
  return { kind: "Field", name, type };
}

// export function shortReturnStatement() {
//   return { kind: "ShortReturn" };
// }

export function conditionalExpression(test, consequent, alternate) {
  return { kind: "Conditional", test, consequent, alternate };
}

export function timesStatement(times, body) {
  return { kind: "TimesStmt", times, body };
}

export function forEachStatement(iterator, collection, body) {
  return { kind: "ForEachStmt", iterator, collection, body };
}

export function memberExpression(object, field, type) {
  return { kind: "Member", object, field, type };
}

export function emptyArrayExpression(type) {
  return { kind: "EmptyArray", type };
}

export function Call(callee, args, optional) {
  const returnType =
    callee.type?.returnType ??
    (callee.kind === "Measure" ? callee.returnType : "void");
  return { kind: "Call", callee, args, optional, type: returnType };
}

export function ConstructorCall(type, args) {
  return { kind: "ConstructorCall", type, args, type: type };
}

// Literals
export function intlit(value) {
  return { kind: "intlit", value, type: intType };
}

export function floatlit(value) {
  return { kind: "floatlit", value, type: floatType };
}

export function stringlit(value) {
  return { kind: "stringlit", value, type: stringType };
}

export function on() {
  return { kind: "on", type: booleanType };
}

export function off() {
  return { kind: "off", type: booleanType };
}

export function playStatement(expression) {
  return { kind: "playStatement", expression };
}

export function id(name, type) {
  return { kind: "id", name, type };
}

export function nilLiteral(type = "any") {
  return { kind: "NilLiteral", type };
}

export function unaryExpression(op, operand, type) {
  return { kind: "UnaryExp", op, operand, type };
}

export function rangeStatement(variable, start, op, end, body) {
  return {
    kind: "RangeStmt",
    variable,
    start,
    rangeOp: op,
    end,
    body,
  };
}

export function shortReturnStatement() {
  return { kind: "ShortReturn" };
}

// Standard library for Melody
export const standardLibrary = Object.freeze({
  int: intType,
  float: floatType,
  boolean: booleanType,
  string: stringType,
  void: voidType,
  any: anyType,
  on: on(),
  off: off(),
  // Add music-specific intrinsics as needed
});

// Monkey patching for literals
Boolean.prototype.type = booleanType;
Number.prototype.type = floatType;
BigInt.prototype.type = intType;
String.prototype.type = stringType;
