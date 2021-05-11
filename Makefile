BABEL			?= ./node_modules/.bin/babel
BABEL-NODE		?= ./node_modules/.bin/babel-node
BROWSER-RUN		?= ./node_modules/.bin/browser-run
BROWSERIFY		?= ./node_modules/.bin/browserify
DOCCO 			?= ./node_modules/docco/bin/docco
ESLINT			?= ./node_modules/.bin/eslint
FAUCET			?= ./node_modules/.bin/faucet
HTTPSERVE       ?= ./node_modules/.bin/http-server
SED				?= sed

all: node_modules

FORCE:

node_modules: package.json package-lock.json
	npm install

dist/pluggable-with-lodash.js: node_modules src/pluggable.js
	npm run build

.PHONY: check
check: dist/pluggable-with-lodash.js
	$(BABEL-NODE) tests/tests.js | $(FAUCET)

.PHONY: browser-check
browser-check: node_modules
	$(BROWSERIFY) -t babelify tests/tests.js | $(BROWSER-RUN) -p 8022

.PHONY: serve
serve: node_modules
	$(HTTPSERVE) -p 8080 -c -1

.PHONY: clean
clean:
	-rm -rf node_modules

.PHONY: docs
docs:
	$(DOCCO) --css=stylesheets/docco.css src/pluggable.js

.PHONY: watchjs
watchjs: node_modules
	$(BABEL) --out-file=./dist/pluggable.js --watch=src/pluggable.js

.PHONY: dist
dist: node_modules dist/pluggable-with-lodash.js
	$(BABEL) --out-file=./dist/pluggable.js src/pluggable.js

.PHONY: release
release:
	$(SED) -ri s/\"version\":\ \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"version\":\ \"$(VERSION)\"/ package.json
	$(SED) -i "s/(Unreleased)/(`date +%Y-%m-%d`)/" CHANGES.md
	make docs
	make dist

.PHONY: eslint
eslint: node_modules
	$(ESLINT) src/*.js
