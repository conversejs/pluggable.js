DOCCO 			?= ./node_modules/docco/bin/docco
HTTPSERVE       ?= ./node_modules/.bin/http-server
BABEL			?= ./node_modules/.bin/babel
BABEL-NODE		?= ./node_modules/.bin/babel-node
FAUCET			?= ./node_modules/.bin/faucet
BROWSER-RUN		?= ./node_modules/.bin/browser-run
BROWSERIFY		?= ./node_modules/.bin/browserify
SED				?= sed

all: stamp-npm

FORCE:

stamp-npm: package.json
	npm install
	touch stamp-npm

.PHONY: check
check: stamp-npm
	$(BABEL-NODE) tests/tests.js | $(FAUCET)

.PHONY: browser-check
browser-check: stamp-npm
	$(BROWSERIFY) -t babelify tests/tests.js | $(BROWSER-RUN) -p 8022

.PHONY: serve
serve: stamp-npm
	$(HTTPSERVE) -p 8080 -c -1

.PHONY: clean
clean:
	-rm -f stamp-npm
	-rm -rf node_modules

.PHONY: docs
docs:
	$(DOCCO) --css=stylesheets/docco.css src/pluggable.js

.PHONY: watchjs
watchjs: stamp-npm
	$(BABEL) --out-file=./dist/pluggable.js --watch=src/pluggable.js

.PHONY: dist
dist:
	$(BABEL) --out-file=./dist/pluggable.js src/pluggable.js

.PHONY: release
release:
	$(SED) -ri s/\"version\":\ \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"version\":\ \"$(VERSION)\"/ package.json
	$(SED) -i "s/(Unreleased)/(`date +%Y-%m-%d`)/" CHANGES.md
	make docs
	make dist
