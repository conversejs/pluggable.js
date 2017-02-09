DOCCO 			?= ./node_modules/docco/bin/docco
HTTPSERVE       ?= ./node_modules/.bin/http-server
BABEL			?= ./node_modules/.bin/babel
FAUCET			?= ./node_modules/.bin/faucet

all: stamp-npm

FORCE:

stamp-npm: package.json
	npm install
	touch stamp-npm

.PHONY: check
check: stamp-npm
	$(BABEL) tests.js | $(FAUCET)

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

.PHONY: lodash
lodash: 3rdparty/lodash.pluggable.js

3rdparty/lodash.pluggable.js:: stamp-npm FORCE
	./node_modules/.bin/lodash -o ./3rdparty/lodash.pluggable.js include=drop,each,extend,includes,partial,size,pickBy

.PHONY: watchjs
watchjs: stamp-npm
	$(BABEL) --source-maps --out-file=./dist/pluggable.js --watch=src/pluggable.js

.PHONY: dist
dist: lodash
	$(BABEL) --source-maps --out-file=./dist/pluggable.js src/pluggable.js
