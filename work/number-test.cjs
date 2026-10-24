var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/math/numberExpression.ts
var numberExpression_exports = {};
__export(numberExpression_exports, {
  numberExpression: () => numberExpression
});
module.exports = __toCommonJS(numberExpression_exports);
function numberExpression(source, functions) {
  if (source.length > 2e4) throw Error("Expresi\xF3n demasiado larga");
  let pos = 0, depth = 0, steps = 0;
  const space = () => {
    while (/\s/.test(source[pos] || "") && pos < source.length) pos++;
    if (++steps > 5e4) throw Error("Expresi\xF3n demasiado compleja");
  };
  const take = (text) => {
    space();
    if (source.slice(pos, pos + text.length) === text) {
      pos += text.length;
      return true;
    }
    return false;
  };
  const expression = () => {
    let value = term();
    while (true) {
      if (take("+")) value += term();
      else if (take("-")) value -= term();
      else return value;
    }
  };
  const term = () => {
    let value = unary();
    while (true) {
      space();
      if (source.slice(pos, pos + 2) === "**") return value;
      if (take("*")) value *= unary();
      else if (take("/")) value /= unary();
      else if (take("%")) value %= unary();
      else return value;
    }
  };
  const unary = () => {
    if (++depth > 128) throw Error("Demasiados niveles en la expresi\xF3n");
    try {
      if (take("+")) return unary();
      if (take("-")) return -unary();
      return power();
    } finally {
      depth--;
    }
  };
  const power = () => {
    const value = atom();
    return take("**") ? value ** unary() : value;
  };
  const atom = () => {
    space();
    if (take("(")) {
      const value = expression();
      if (!take(")")) throw Error("Falta un par\xE9ntesis");
      return value;
    }
    const number = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(pos));
    if (number) {
      pos += number[0].length;
      return Number(number[0]);
    }
    const name = /^[A-Za-z_][A-Za-z_0-9]*/.exec(source.slice(pos));
    if (!name) throw Error("Expresi\xF3n no v\xE1lida");
    pos += name[0].length;
    if (!Object.prototype.hasOwnProperty.call(functions, name[0]) || !take("(")) throw Error("Funci\xF3n no permitida: " + name[0]);
    const args = [];
    if (!take(")")) {
      do {
        if (args.length >= 8) throw Error("Demasiados argumentos");
        args.push(expression());
      } while (take(","));
      if (!take(")")) throw Error("Falta un par\xE9ntesis");
    }
    return functions[name[0]](...args);
  };
  const result = expression();
  space();
  if (pos !== source.length || !Number.isFinite(result)) throw Error("Resultado no num\xE9rico");
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  numberExpression
});
