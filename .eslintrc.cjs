/** @type {import("eslint").Linter.Config} */
const config = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: true
    },
    plugins: ["@typescript-eslint", "prettier"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
        "plugin:prettier/recommended"
    ],
    rules: {
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/consistent-type-imports": [
            "warn",
            {
                prefer: "type-imports",
                fixStyle: "inline-type-imports"
            }
        ],
        "@typescript-eslint/no-unused-vars": [
            "warn",
            { argsIgnorePattern: "^_" }
        ],
        "@typescript-eslint/require-await": "off",
        "@typescript-eslint/no-misused-promises": [
            "error",
            {
                checksVoidReturn: { attributes: false }
            }
        ],
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/class-literal-property-style": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "@typescript-eslint/consistent-type-imports": "error",
    }
};

// eslint-disable-next-line no-undef
module.exports = config;
