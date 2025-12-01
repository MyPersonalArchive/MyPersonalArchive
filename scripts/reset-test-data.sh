#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Resetting Test Instance Data ===${NC}\n"

# Get the workspace root
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Stop test instance first
echo "Stopping test instance..."
cd "$WORKSPACE_ROOT"
docker-compose -f docker-compose.test.yml down 2>/dev/null || true

# Remove Docker volume
echo -e "\n${YELLOW}Removing Docker volume...${NC}"
docker volume rm mypersonalarchive_test-instance-data 2>/dev/null || true
docker volume rm $(docker volume ls -q | grep "test-instance-data") 2>/dev/null || true

echo -e "\n${GREEN}Test data reset complete!${NC}"
echo -e "Run ${YELLOW}./scripts/start-test-instance.sh${NC} to start fresh test instance."
echo ""
