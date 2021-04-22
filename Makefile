.PHONY: all run clean

files = $(addprefix scripts/, browser.js hvif.js svg.js)
sources = index.js $(files)

## Targets

all: dist/haikon.min.js dist/haikon.js

run:
	@echo ${sources}

dist/:
	@ mkdir dist/

dist/haikon.js: $(sources) dist/
	@ echo "Making a browser bundle"
	@ esbuild scripts/browser.js --bundle > dist/haikon.js

dist/haikon.min.js: $(sources) dist/
	@ echo "Making a minified browser bundle"
	@ esbuild scripts/browser.js --bundle --minify > dist/haikon.min.js

clean:
	@ test -d dist/ && echo "Removing dist/" && rm -r dist/ || exit 0
