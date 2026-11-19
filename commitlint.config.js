module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "refactor", "test"]],
    "header-max-length": [2, "always", 100],
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};
