module.exports = {
    moduleFileExtensions: ["ts", "js"],
    testMatch: [
        "<rootDir>/__tests__/**/*test.@(js|ts)?(x)"
    ],
    transform: {
        "^.+\\.(t|j)sx?$": ['@swc/jest', {
            "jsc": {
                "parser": {
                    "syntax": "typescript",
                    "tsx": true,
                },
                "target": "es2022",
                "loose": true
            }
        }],
    }
}
