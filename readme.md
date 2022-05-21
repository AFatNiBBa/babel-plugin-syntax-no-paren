
# babel-plugin-syntax-no-paren
Allows parentheses to be omitted in javascript `if`, `while` and `for`(each) statements
> Always update to the latest version to have more features and bug fixes (A looot of bug fixes!) <br>
> ```bash
> npm r babel-plugin-syntax-no-paren & npm i babel-plugin-syntax-no-paren
> ```

## Warning
This module uses `register-babel-syntax`, which modifies the source code of `@babel/parser`, so ensure that `register-babel-syntax` loads before you require `@babel/core`

## Allowed Syntax
```js

// Normal 'if' with block
if (cond) {
    statement();
}

// Normal 'if' with statement
if (cond)
    statement();

// Paren-free 'if' with block
if cond {
    statement();
}

// Paren-free 'if' with statement
if cond
    statement();

// Single-line paren-free 'if' with statement
if cond; statement();
```
The same is valid for the `while` and `for`(each) statements
```js
while cond
    statement();

for const e of list
    statement();
```

## Not Allowed Syntax

### Number range `for`
```js
for let i = 0; i < 10; i++ {
    statement();
}
```

### Empty statements
The following code is ambiguous:
```js
const a = [ [ 1, 2, 3 ] ];

if a
    [0].forEach(console.log);

console.log(a);
```
It could be transpiled in both
```js
const a = [ [ 1, 2, 3 ] ];

if (a)
    [0].forEach(console.log);

console.log(a);
```
and
```js
const a = [ [ 1, 2, 3 ] ];

if (a[0].forEach(console.log))
    console.log(a);
```
So I made it so that when an empty statement (`;`) is inside a paren-free `if` it gets skipped. <br>
Practically this
```js
const a = [ [ 1, 2, 3 ] ];

if a; // ← Empty statement
    [0].forEach(console.log);

console.log(a);
```
doesn't get transpiled to this
```js
const a = [ [ 1, 2, 3 ] ];

if (a)
    ; // ← Empty statement

[0].forEach(console.log);
console.log(a);
```
but to this
```js
const a = [ [ 1, 2, 3 ] ];

if (a)
    [0].forEach(console.log);

console.log(a);
```
so basically, the following is not allowed.
```js
if cond
    ;
```
The same is valid for the `while` and `for`(each) statements.