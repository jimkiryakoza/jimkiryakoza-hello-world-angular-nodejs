module.exports = {
    env: {
        node: true,
        browser: true,
        commonjs: true,
        es6: true,
    },
    extends: ["eslint:recommended", "plugin:prettier/recommended"],
    overrides: [
        {
            env: {
                node: true,
            },
            files: [".eslintrc.{js,cjs}"],
            parserOptions: {
                sourceType: "script",
            },
        },
    ],
    parserOptions: {
        ecmaVersion: "latest",
    },
    rules: {
        "indent": ["error", 4],
        // Since you're using Prettier, you might not need to specify these rules here
        // Prettier will format your code based on its configuration
        // "indent": ["error", 4], // Managed by Prettier
        // "linebreak-style": ["error", "unix"], // Managed by Prettier, consider removing or setting to 'off'
        // "quotes": ["error", "single"], // Managed by Prettier
        // "semi": ["error", "always"], // Managed by Prettier
    },
};
