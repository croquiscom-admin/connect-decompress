.PHONY: test

test:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec --compilers coffee:coffee-script
