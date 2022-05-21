
// Hacks "@babel/parser"
const register = require("register-babel-syntax");

// Name of the plugin (in this case the name of the package)
const NAME = require("../package.json").name;

// Code of the plugin (change the content of the class)
const info = register(NAME, base => {
    const { __priv: { tt } } = require("@babel/parser");

    const VAR_TYPES = new Set([ tt._var, tt._let, tt._const ]);
    const LOOP_LABEL = { kind: 'loop' };

    return class extends base {
        parseParenFreeIfStatement(node) {
            this.next();
            node.test = this.parseExpression();

            const temp = this.parseStatement("if");
            node.consequent = temp.type === "EmptyStatement"
                ? this.parseStatement("if")
                : temp;

            node.alternate = this.eat(tt._else) ? this.parseStatement("if") : null;
            return this.finishNode(node, "IfStatement");
        }
    
        parseDoStatement(node) {
            this.next();
    
            const isBlock = this.state.type === tt.braceL;
    
            this.state.labels.push(LOOP_LABEL);
            node.body = this.parseStatement(false);
            this.state.labels.pop();
            this.expect(tt._while);
            node.test = isBlock ? this.parseExpression() : this.parseParenExpression();
            this.eat(tt.semi);
    
            return this.finishNode(node, 'DoWhileStatement');
        }

        /** @override */
        parseIfStatement(node) {
            return (this.lookahead().type === tt.parenL)
                ? super.parseIfStatement(node)
                : this.parseParenFreeIfStatement(node);
        }
    
        /** @override */
        parseForStatement(node) {
            if (!VAR_TYPES.has(this.lookahead().type)) return super.parseForStatement(node);
    
            this.next();
    
            const init = this.startNode();
            const varKind = this.state.type;
            this.next();
            this.parseVar(init, true, varKind);
            this.finishNode(init, 'VariableDeclaration');
    
            const type = this.match(tt._in) ? 'ForInStatement' : 'ForOfStatement';
            this.next();
    
            node.left = init;
            this.state.labels.push(LOOP_LABEL);
            node.right = this.parseExpression();
            this.state.labels.push(LOOP_LABEL);
            node.body = this.parseBlock(false);
    
            return this.finishNode(node, type);
        }
    
        /** @override */
        parseWhileStatement(node) {
            if (this.lookahead().type === tt.parenL) super.parseWhileStatement(node);
    
            this.next();
            this.state.labels.push(LOOP_LABEL);
            node.test = this.parseExpression();
            this.state.labels.push(LOOP_LABEL);
            node.body = this.parseBlock(false);
    
            return this.finishNode(node, 'WhileStatement');
        }
    }
});

// Base babel plugin registration
module.exports = () => info;