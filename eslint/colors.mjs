// Los colores viven en src/theme. Fuera de ahí, el lint no deja escribir uno a mano (PROJECT_CONTEXT.md §10.2).
// Son selectores para la regla no-restricted-syntax; cada caso tiene su archivo en tools/lint-fixtures
const MESSAGE = "Los colores van en src/theme";

// 1. Un color escrito tal cual, esté donde esté:
//    - un hexadecimal completo: #rgb, #rrggbb, #rrggbbaa o #rgba. Cuatro dígitos sin letras («#0042») no cuentan:
//      así se escribe un número de pedido
//    - un valor suelto de Tailwind: bg-[#fff] o border-[color:…]
//    - rgb(), rgba(), hsl() o hsla()
const HEX = "[0-9a-fA-F]";
const RAW_COLOR = `/^#(?:${HEX}{3}|${HEX}{6}|${HEX}{8}|(?![0-9]{4}$)${HEX}{4})$|\\[(?:color:|#${HEX}{3,8}\\])|\\b(?:rgba?|hsla?)\\(/`;

// 2. Un texto escrito a mano («red», «white») como valor de una propiedad de color: las que terminan en «color»,
//    como color, backgroundColor, tintColor o "border-color". El valor correcto sale del tema: colors.text
const COLOR_NAME = "/(?:^c|C|[-_]c)olor$/";
const TEXT = ":matches(Literal[raw=/^[\"']/], TemplateLiteral[expressions.length=0])";
// El texto puede ir directo o como rama de un «a ? b : c» o de un «a ?? b»
const CHOICE = ":matches(ConditionalExpression, LogicalExpression)";
const property = (key) => [
  `Property[${key}=${COLOR_NAME}] > ${TEXT}.value`,
  `Property[${key}=${COLOR_NAME}] > ${CHOICE}.value > ${TEXT}`,
];
const JSX_ATTRIBUTE = `JSXAttribute[name.name=${COLOR_NAME}]`;

export const colorSelectors = [
  `Literal[value=${RAW_COLOR}]`,
  `TemplateElement[value.raw=${RAW_COLOR}]`,
  ...property("key.name"),
  ...property("key.value"),
  `${JSX_ATTRIBUTE} > ${TEXT}`,
  `${JSX_ATTRIBUTE} > JSXExpressionContainer > ${TEXT}`,
  `${JSX_ATTRIBUTE} > JSXExpressionContainer > ${CHOICE} > ${TEXT}`,
].map((selector) => ({ selector, message: MESSAGE }));
