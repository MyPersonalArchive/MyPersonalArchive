#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Test Instance for P2P Testing ===${NC}\n"

# Get the workspace root
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$WORKSPACE_ROOT"

# Stop any existing test instance
echo -e "${YELLOW}Stopping any existing test instance...${NC}"
docker-compose -f "$WORKSPACE_ROOT/docker-compose.test.yml" down 2>/dev/null || true
sleep 2

# Build the application on host
echo -e "\n${GREEN}=== Building backend application ===${NC}"
dotnet publish Backend.WebApi/Backend.WebApi.csproj -c Release -o "$WORKSPACE_ROOT/publish" > /tmp/build.log 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Check /tmp/build.log${NC}"
    tail -30 /tmp/build.log
    exit 1
fi
echo -e "${GREEN}Build successful!${NC}"

# Build the frontend
echo -e "\n${GREEN}=== Building frontend application ===${NC}"
cd "$WORKSPACE_ROOT/frontend"
npm run build > /tmp/frontend-build.log 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed! Check /tmp/frontend-build.log${NC}"
    tail -30 /tmp/frontend-build.log
    exit 1
fi
cd "$WORKSPACE_ROOT"
mkdir -p frontend-dist
cp -r frontend/dist/* frontend-dist/
echo -e "${GREEN}Frontend build successful!${NC}"

# Start test instance container
echo -e "\n${GREEN}=== Starting test instance container ===${NC}"
docker-compose -f "$WORKSPACE_ROOT/docker-compose.test.yml" up --build -d

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker start failed!${NC}"
    exit 1
fi

# Wait for backend to be ready
echo -e "\n${YELLOW}Waiting for test instance to start...${NC}"
sleep 8

# Check if backend is running
if ! docker ps | grep -q mpa-test; then
    echo -e "${RED}Test instance failed to start. Check logs with: docker logs mpa-test${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Test Instance Running! ===${NC}\n"
echo -e "${BLUE}Test Instance:${NC}"
echo -e "  URL:      http://localhost:6054"
echo -e "  Logs:     docker logs -f mpa-test"
echo -e ""
echo -e "${BLUE}Your Dev Instance:${NC}"
echo -e "  Backend:  http://localhost:5054"
echo -e "  Frontend: http://localhost:5173"
echo -e ""
echo -e "${YELLOW}To stop test instance:${NC}"
echo -e "  docker-compose -f docker-compose.test.yml down"
echo -e ""
echo -e "${YELLOW}To reset test data:${NC}"
echo -e "  ./scripts/reset-test-data.sh"
echo -e ""
