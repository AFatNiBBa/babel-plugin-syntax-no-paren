
// Hacks "@babel/parser"
const register = require("register-babel-syntax");

// Name of the plugin (in this case the name of the package)
const NAME = require("../package.json").name;

// Code of the plugin (change the content of the class)
const info = register(NAME, base => {
    const { __priv: { tt } } = require("@babel/parser");
    const LOOP_LABEL = { kind: 'loop' };
    const SCOPE_OTHER = 0b000000000;

    return class extends base {
        /**
         * Wraps with a block if a simple statement is given
         * @param node The statement to wrap
         * @returns A block
         */
        #statementToBlock(node) {
            if (node.type === "BlockStatement")
                return node;

            const block = this.startNode();
            block.body = [ node ];
            return this.finishNode(block, "BlockStatement");
        }

        // if
        parseIfStatement(node) {
            if (this.lookahead().type === tt.parenL)
                return super.parseIfStatement(node);

            this.next();
            node.test = this.parseExpression();

            const temp = this.parseStatement("if");
            node.consequent = temp.type === "EmptyStatement"
                ? this.parseStatement("if")
                : temp;

            node.alternate = this.eat(tt._else) ? this.parseStatement("if") : null;
            return this.finishNode(node, "IfStatement");
        }
    
        // do-while
        parseDoStatement(node) {
            this.next();
    
            this.state.labels.push(LOOP_LABEL);
            node.body = this.parseStatement(false);
            this.state.labels.pop();
            this.expect(tt._while);

            /*
                The base function is never called, because at this point it would have simply
                executed "this.parseHeaderExpression()", which is just "this.parseExpression()"
                but ensures the presence of the parentheses, and since parentheses can be present in expressions,
                it is just a subset.
            */
            node.test = this.parseExpression();

            this.eat(tt.semi);    
            return this.finishNode(node, 'DoWhileStatement');
        }

        // while
        parseWhileStatement(node) {
            if (this.lookahead().type === tt.parenL)
                return super.parseWhileStatement(node);
    
            this.next();
            node.test = this.parseExpression();
            this.state.labels.push(LOOP_LABEL);

            const temp = this.withSmartMixTopicForbiddingContext(() => this.parseStatement("while"));
            node.body = temp.type === "EmptyStatement"
                ? this.withSmartMixTopicForbiddingContext(() => this.parseStatement("while"))
                : temp;

            this.state.labels.pop();
            return this.finishNode(node, "WhileStatement");
        }
    
        // for-in for-of (beta)
        parseForStatement(node) {
            if (this.lookahead().type === tt.parenL)
                return super.parseForStatement(node);
    
            this.next();
    
            const init = this.startNode();
            const varKeyword = this.state.value;
            this.next();
            this.parseVar(init, true, varKeyword);
            this.finishNode(init, 'VariableDeclaration');
    
            const isForIn = this.match(tt._in);
            this.next();
    
            node.left = init;
            this.state.labels.push(LOOP_LABEL);
            node.right = isForIn ? this.parseExpression() : this.parseMaybeAssignAllowIn();
            node.body = this.withSmartMixTopicForbiddingContext(() => this.parseStatement("for"));
            this.scope.exit();
            this.state.labels.pop();
            return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
        }

        // try-catch-finally
        parseTryStatement(node) {
            this.next();
            node.block = this.#statementToBlock(this.parseStatement("try"));
            node.handler = null;

            if (this.match(tt._catch))
            {
                const clause = this.startNode();
                this.next();

                if (this.match(tt.parenL))
                    this.expect(tt.parenL),
                    clause.param = this.parseCatchClauseParam(),
                    this.expect(tt.parenR);
                else
                    clause.param = null,
                    this.scope.enter(SCOPE_OTHER);

                clause.body = this.#statementToBlock(this.withSmartMixTopicForbiddingContext(() => this.parseStatement("catch")));
                this.scope.exit();
                node.handler = this.finishNode(clause, "CatchClause");
            }

            node.finalizer = this.eat(tt._finally)
                ? this.#statementToBlock(this.parseStatement("finally"))
                : null;

            if (!node.handler && !node.finalizer)
            {
                // Empty catch if none is given
                const clause = this.startNode();                        // catch creation
                clause.param = null;                                    // catch no param
                const block = this.startNode();                         // empty body creation 
                block.body = [];                                        // empty body no statements
                clause.body = this.finishNode(block, "BlockStatement");  // empty body finalization
                node.handler = this.finishNode(clause, "CatchClause");  // catch finalization
            }

            return this.finishNode(node, "TryStatement");
        }
    }
});

// Base babel plugin registration
module.exports = () => info;