# Convenience targets. Python 3.10+ stdlib only, no pip dependencies.

PYTHON ?= python3
SERVICE_URL ?= http://localhost:3000

.PHONY: help example smoke baseline burst offline adversarial up wait-healthy down

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
HEALTH_TIMEOUT_S ?= 60


up:
	docker compose up -d
	$(MAKE) wait-healthy

# docker compose up -d returns as soon as the container starts, not once
# `pnpm build && pnpm start` inside it has finished and is actually
# listening - polling /health closes that gap so the eval scripts never
# race the app's startup and mistake it for dropped events.
wait-healthy:
	@echo "waiting for $(SERVICE_URL)/health ..."
	@for i in $$(seq 1 $(HEALTH_TIMEOUT_S)); do \
		if curl -sf $(SERVICE_URL)/health > /dev/null 2>&1; then \
			echo "service is up"; \
			exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo "service did not become healthy within $(HEALTH_TIMEOUT_S)s"; \
	docker compose logs; \
	exit 1

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
