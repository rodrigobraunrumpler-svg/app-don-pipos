import assert from "node:assert/strict";
import { test } from "node:test";

import { parseOwnerArgs } from "./owner-args.mjs";

test("create con el número, el negocio y --demo", () => {
  assert.deepEqual(parseOwnerArgs(["create", "--phone", "900 000 101", "--business", "Don Pipos (DEMO)", "--demo"]), {
    command: "create",
    phone: "+51900000101",
    business: "Don Pipos (DEMO)",
    modules: [],
    demo: true,
  });
});

test("los módulos van separados por comas", () => {
  assert.deepEqual(
    parseOwnerArgs(["create", "--phone", "900000101", "--business", "X", "--modules", "orders,stock"]).modules,
    ["orders", "stock"],
  );
});

test("reset-pin y sign-out-everywhere solo piden el número", () => {
  assert.equal(parseOwnerArgs(["reset-pin", "--phone", "900000101"]).command, "reset-pin");
  assert.equal(parseOwnerArgs(["sign-out-everywhere", "--phone", "900000101"]).phone, "+51900000101");
});

test("lo que falta o no vale se dice en español", () => {
  assert.throws(() => parseOwnerArgs(["create", "--phone", "900000101"]), /falta --business/);
  assert.throws(() => parseOwnerArgs(["create", "--business", "X"]), /falta --phone/);
  assert.throws(() => parseOwnerArgs(["create", "--phone", "90000010", "--business", "X"]), /el número no vale/);
  assert.throws(
    () => parseOwnerArgs(["borrar", "--phone", "900000101"]),
    /comandos: create, reset-pin, sign-out-everywhere/,
  );
});
