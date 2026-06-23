# Convenience targets. Python 3.10+ stdlib only, no pip dependencies.

PYTHON ?= python3
SERVICE_URL ?= http://localhost:8080

.PHONY: help example smoke baseline burst offline adversarial

help:
	@echo "Targets:"
	@echo "  example        run the example stub service on :8080 (replace with yours)"
	@echo "  smoke          30s baseline run against \$$SERVICE_URL + scorecard"
	@echo "  baseline       60s baseline"
	@echo "  burst          3min run with two 10x bursts"
	@echo "  offline        2min run with 20% of devices going offline + replaying"
	@echo "  adversarial    4min run combining burst + offline + clock skew"
	@echo
	@echo "Override SERVICE_URL=... or DEVICES=... as needed."

DEVICES ?= 50


up:
	docker compose up --build -d

down:
	docker compose down -v


example:
	$(PYTHON) example_solution/service.py

smoke: up
	$(PYTHON) eval/check.py smoke --target $(SERVICE_URL) --devices $(DEVICES)
	$(MAKE) down

baseline: up
	$(PYTHON) eval/check.py baseline --target $(SERVICE_URL) --devices $(DEVICES)
	$(MAKE) down

burst: up
	$(PYTHON) eval/check.py burst --target $(SERVICE_URL) --devices $(DEVICES)
	$(MAKE) down

offline: up
	$(PYTHON) eval/check.py offline --target $(SERVICE_URL) --devices $(DEVICES)
	$(MAKE) down

adversarial: up
	$(PYTHON) eval/check.py adversarial --target $(SERVICE_URL) --devices $(DEVICES)
	$(MAKE) down
