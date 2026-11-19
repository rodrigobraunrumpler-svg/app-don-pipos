import { pinIsObvious } from "./pin";

const PHONE = "+51900000101";

test.each(["123456", "654321", "012345", "987654", "111111", "121212", "123123", "000000", "000101"])(
  "%s es fácil",
  (pin) => {
    expect(pinIsObvious(pin, PHONE)).toBe(true);
  },
);

test.each(["197346", "582039", "901234", "120121"])("%s no es fácil", (pin) => {
  expect(pinIsObvious(pin, PHONE)).toBe(false);
});
