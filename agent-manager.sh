#!/bin/bash

# Playwright Test Agent Setup and Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
AGENT_LOG_DIR="logs/agents"

print_banner() {
    echo -e "${GREEN}"
    echo "=================================="
    echo "  Playwright Test Agent Manager   "
    echo "=================================="
    echo -e "${NC}"
}

show_help() {
    echo "Usage: ./agent-manager.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup           Setup test agents and dependencies"
    echo "  start           Start all test agents"
    echo "  stop            Stop all test agents"
    echo "  restart         Restart all test agents"
    echo "  status          Show agent status"
    echo "  logs [agent]    Show logs for specific agent or all agents"
    echo "  clean           Clean up agent data and logs"
    echo "  distributed     Run distributed test execution"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./agent-manager.sh setup"
    echo "  ./agent-manager.sh start"
    echo "  ./agent-manager.sh logs api-agent"
    echo "  ./agent-manager.sh distributed"
}

setup_agents() {
    echo -e "${YELLOW}Setting up test agents...${NC}"
    
    # Create necessary directories
    mkdir -p logs/agents
    mkdir -p allure-results
    mkdir -p allure-reports
    mkdir -p playwright-report
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci
    
    # Build Docker images
    echo "Building Docker images..."
    docker-compose build
    
    echo -e "${GREEN}✅ Agent setup completed!${NC}"
}

start_agents() {
    echo -e "${YELLOW}Starting test agents...${NC}"
    docker-compose up -d
    
    # Wait for services to be ready
    sleep 10
    
    echo -e "${GREEN}✅ Agents started successfully!${NC}"
    show_status
}

stop_agents() {
    echo -e "${YELLOW}Stopping test agents...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Agents stopped successfully!${NC}"
}

restart_agents() {
    echo -e "${YELLOW}Restarting test agents...${NC}"
    stop_agents
    sleep 5
    start_agents
}

show_status() {
    echo -e "${YELLOW}Agent Status:${NC}"
    docker-compose ps
    
    echo -e "\n${YELLOW}Docker Resources:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

show_logs() {
    local agent=${1:-""}
    
    if [[ -n "$agent" ]]; then
        echo -e "${YELLOW}Showing logs for $agent:${NC}"
        docker-compose logs -f "$agent"
    else
        echo -e "${YELLOW}Showing logs for all agents:${NC}"
        docker-compose logs -f
    fi
}

clean_agents() {
    echo -e "${YELLOW}Cleaning up agent data...${NC}"
    
    # Stop agents
    docker-compose down
    
    # Remove containers and images
    docker-compose down --rmi all --volumes --remove-orphans
    
    # Clean up log files
    rm -rf logs/agents/*
    rm -rf allure-results/*
    rm -rf playwright-report/*
    
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
}

run_distributed_tests() {
    echo -e "${YELLOW}Running distributed tests...${NC}"
    
    # Ensure agents are running
    docker-compose ps | grep -q "Up" || start_agents
    
    # Run distributed test manager
    npm run ts-node utilities/distributed-test-agent.ts
    
    echo -e "${GREEN}✅ Distributed tests completed!${NC}"
}

# Main script logic
case "${1:-help}" in
    setup)
        print_banner
        setup_agents
        ;;
    start)
        print_banner
        start_agents
        ;;
    stop)
        print_banner
        stop_agents
        ;;
    restart)
        print_banner
        restart_agents
        ;;
    status)
        print_banner
        show_status
        ;;
    logs)
        print_banner
        show_logs "$2"
        ;;
    clean)
        print_banner
        clean_agents
        ;;
    distributed)
        print_banner
        run_distributed_tests
        ;;
    help|*)
        print_banner
        show_help
        ;;
esac