.PHONY: postCreateCommand test

postCreateCommand:
	@echo "Running post create command"
	@echo "Installing bun"
	npm install -g bun
	@echo "Post create command completed"

test:
	$(MAKE) -C plugins test
