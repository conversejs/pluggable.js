DOCCO 			?= ./node_modules/docco/bin/docco
HTTPSERVE       ?= ./node_modules/.bin/http-server

FORCE:

.PHONY: serve
serve: stamp-npm
	$(HTTPSERVE) -p 8000 -c -1

.PHONY: clean
clean:
	-rm -f stamp-npm
	-rm -rf node_modules

stamp-npm: package.json
	npm install
	touch stamp-npm

.PHONY: docs
docs:
	$(DOCCO) --css=stylesheets/docco.css pluggable.js

.PHONY: lodash
lodash: 3rdparty/lodash.pluggable.js

3rdparty/lodash.pluggable.js:: stamp-npm FORCE
	./node_modules/.bin/lodash -o ./3rdparty/lodash.pluggable.js include=drop,each,extend,includes,partial,size
