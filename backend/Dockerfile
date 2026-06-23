FROM ghcr.io/pnpm/pnpm:11

RUN pnpm runtime set node 22 -g

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies with pnpm
RUN pnpm config set ignore-scripts false
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
