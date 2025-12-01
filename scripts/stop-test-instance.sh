#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Stopping Test Instance ===${NC}\n"

# Get the workspace root
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Stop Docker container
echo "Stopping Docker container..."
cd "$WORKSPACE_ROOT"
docker-compose -f docker-compose.test.yml down 2>/dev/null || true

echo -e "\n${GREEN}Test instance stopped!${NC}"
echo ""
