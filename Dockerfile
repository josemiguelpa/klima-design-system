# Reproducible Linux verification environment for klima-design-system (TASK-003).
#
# This image only ships the toolchain (Node, pnpm, git); it does not bake in the
# source tree. Mount the working tree as a volume so verification always runs
# against the current code, on Windows and macOS too. See docs/release-process.md.
#
# Node is pinned by the base image tag (matches .node-version / engines.node).
# pnpm is pinned via corepack, read directly from packageManager in package.json,
# so this file never drifts out of sync with the version the repo declares.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /workspace

COPY package.json ./
RUN corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

# Run the container as the host user (see docs/release-process.md), not root:
# root-owned files written into the bind-mounted node_modules would otherwise
# break `rm -rf node_modules` and further `pnpm install` runs on the host.
# An arbitrary --user uid has no /etc/passwd entry, so give it a writable HOME.
ENV HOME=/home/verify
RUN mkdir -p "$HOME" && chmod 1777 "$HOME"

CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build && pnpm verify:manifests && pnpm verify:repo-hygiene"]
