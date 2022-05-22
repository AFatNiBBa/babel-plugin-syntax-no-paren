
const plugin = require("./main.js"); // Require it before before, because it will be reloaded
const { transformSync } = require("@babel/core");

const input = `
    const a = [ [ 1, 2, 3 ] ];
    if a;
        [0].forEach(x => console.log(x));
    console.log(12)
`;

const output = transformSync(input, { plugins: [ plugin ] }).code;

console.log(`\x1b[36m${output}\x1b[0m`);
console.log((0, eval)(`(function(){\n${ output }\n})`)());