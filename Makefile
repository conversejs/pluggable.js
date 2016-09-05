DOCCO ?= ./node_modules/docco/bin/docco

.PHONY: docs
docs:
	$(DOCCO) --css=stylesheets/docco.css pluggable.js
