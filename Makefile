SHELL := /bin/bash

.PHONY: dev dev-server dev-client

SERVER_LOG_COLOR := \033[1;32m
CLIENT_LOG_COLOR := \033[1;34m
LOG_COLOR_RESET := \033[0m
BACKEND_PORT := 8000
CLIENT_PORT := 3000

dev-server:
	@if [ -x .venv/bin/python ]; then \
		.venv/bin/python -m uvicorn app.main:app --reload; \
	elif command -v uv >/dev/null 2>&1; then \
		uv run uvicorn app.main:app --reload; \
	else \
		printf "Missing backend runtime. Create a local .venv or use uv to manage Python dependencies.\n" >&2; \
		exit 1; \
	fi

dev-client:
	pnpm --dir client dev

dev:
	@set -euo pipefail; \
	repo_root="$$(pwd -P)"; \
	client_root="$$(cd client && pwd -P)"; \
	server_cmd() { \
		if [ -x .venv/bin/python ]; then \
			.venv/bin/python -m uvicorn app.main:app --reload; \
		elif command -v uv >/dev/null 2>&1; then \
			uv run uvicorn app.main:app --reload; \
		else \
			printf "Missing backend runtime. Create a local .venv or use uv to manage Python dependencies.\n" >&2; \
			return 1; \
		fi; \
	}; \
	collect_descendants() { \
		local parent_pid="$$1"; \
		local child_pid; \
		for child_pid in $$(pgrep -P "$$parent_pid" 2>/dev/null || true); do \
			collect_descendants "$$child_pid"; \
			printf '%s\n' "$$child_pid"; \
		done; \
	}; \
	terminate_tree() { \
		local root_pid="$$1"; \
		local signal_name="$${2:-TERM}"; \
		local pid; \
		[ -n "$$root_pid" ] || return 0; \
		kill -0 "$$root_pid" 2>/dev/null || return 0; \
		for pid in $$(collect_descendants "$$root_pid"); do \
			kill "-$$signal_name" "$$pid" 2>/dev/null || true; \
		done; \
		kill "-$$signal_name" "$$root_pid" 2>/dev/null || true; \
	}; \
	wait_for_port_release() { \
		local port="$$1"; \
		local attempt; \
		for attempt in 1 2 3 4 5; do \
			if ! lsof -tiTCP:"$$port" -sTCP:LISTEN >/dev/null 2>&1; then \
				return 0; \
			fi; \
			sleep 1; \
		done; \
		printf "Port %s is still busy after cleanup.\n" "$$port" >&2; \
		return 1; \
	}; \
	listener_cwd() { \
		local pid="$$1"; \
		lsof -a -p "$$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1; \
	}; \
	cleanup_stale_listener() { \
		local port="$$1"; \
		local expected_cwd="$$2"; \
		local label="$$3"; \
		local pid; \
		local actual_cwd; \
		for pid in $$(lsof -tiTCP:"$$port" -sTCP:LISTEN 2>/dev/null | awk '!seen[$$0]++'); do \
			actual_cwd="$$(listener_cwd "$$pid")"; \
			if [ "$$actual_cwd" = "$$expected_cwd" ]; then \
				printf "Stopping stale %s process on port %s (pid %s).\n" "$$label" "$$port" "$$pid"; \
				terminate_tree "$$pid" TERM; \
				sleep 1; \
				terminate_tree "$$pid" KILL; \
			else \
				if [ -n "$$actual_cwd" ]; then \
					printf "Port %s is already in use by pid %s (%s). Refusing to stop an unrelated process.\n" "$$port" "$$pid" "$$actual_cwd" >&2; \
				else \
					printf "Port %s is already in use by pid %s. Refusing to stop it because the working directory could not be determined.\n" "$$port" "$$pid" >&2; \
				fi; \
				return 1; \
			fi; \
		done; \
		wait_for_port_release "$$port"; \
	}; \
	cleanup() { \
		local pid; \
		trap - EXIT; \
		for pid in "$${server_pid:-}" "$${client_pid:-}"; do \
			terminate_tree "$$pid" TERM; \
		done; \
		sleep 1; \
		for pid in "$${server_pid:-}" "$${client_pid:-}"; do \
			terminate_tree "$$pid" KILL; \
		done; \
		if [ -n "$${server_pid:-}" ]; then \
			wait "$$server_pid" 2>/dev/null || true; \
		fi; \
		if [ -n "$${client_pid:-}" ]; then \
			wait "$$client_pid" 2>/dev/null || true; \
		fi; \
	}; \
	on_signal() { \
		cleanup; \
		exit 130; \
	}; \
	trap on_signal INT TERM; \
	trap cleanup EXIT; \
	cleanup_stale_listener "$(BACKEND_PORT)" "$$repo_root" "backend"; \
	cleanup_stale_listener "$(CLIENT_PORT)" "$$client_root" "client"; \
	( server_cmd 2>&1 | awk 'BEGIN { color = "$(SERVER_LOG_COLOR)"; reset = "$(LOG_COLOR_RESET)" } { printf "%s[server]%s %s\n", color, reset, $$0; fflush(); }' ) & server_pid=$$!; \
	( pnpm --dir client dev 2>&1 | awk 'BEGIN { color = "$(CLIENT_LOG_COLOR)"; reset = "$(LOG_COLOR_RESET)" } { printf "%s[client]%s %s\n", color, reset, $$0; fflush(); }' ) & client_pid=$$!; \
	status=0; \
	while :; do \
		server_alive=0; \
		client_alive=0; \
		kill -0 "$$server_pid" 2>/dev/null && server_alive=1 || true; \
		kill -0 "$$client_pid" 2>/dev/null && client_alive=1 || true; \
		if [ "$$server_alive" -eq 1 ] && [ "$$client_alive" -eq 1 ]; then \
			sleep 1; \
			continue; \
		fi; \
		if [ "$$server_alive" -eq 0 ]; then \
			if wait "$$server_pid"; then \
				server_status=0; \
			else \
				server_status=$$?; \
			fi; \
			status=$$server_status; \
		fi; \
		if [ "$$client_alive" -eq 0 ]; then \
			if wait "$$client_pid"; then \
				client_status=0; \
			else \
				client_status=$$?; \
			fi; \
			if [ "$$status" -eq 0 ]; then \
				status=$$client_status; \
			fi; \
		fi; \
		cleanup; \
		exit "$$status"; \
	done
