#!/usr/bin/env bash
#
# Cross-platform setup script for the Markdown Converter Cloudflare Worker.
# Works on Windows (Git Bash/WSL), macOS, and Linux.
#

set -euo pipefail

# Colors for output (disabled on Windows or if not a tty)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [[ -t 1 ]]; then
  USE_COLORS=true
else
  USE_COLORS=false
fi

print_error() {
  if [[ "$USE_COLORS" == true ]]; then
    echo -e "${RED}✗ $1${NC}" >&2
  else
    echo "✗ $1" >&2
  fi
}

print_success() {
  if [[ "$USE_COLORS" == true ]]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo "✓ $1"
  fi
}

print_info() {
  if [[ "$USE_COLORS" == true ]]; then
    echo -e "${BLUE}ℹ $1${NC}"
  else
    echo "ℹ $1"
  fi
}

print_warning() {
  if [[ "$USE_COLORS" == true ]]; then
    echo -e "${YELLOW}⚠ $1${NC}"
  else
    echo "⚠ $1"
  fi
}

print_header() {
  if [[ "$USE_COLORS" == true ]]; then
    echo -e "${CYAN}==============================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}==============================================${NC}"
  else
    echo "=============================================="
    echo "  $1"
    echo "=============================================="
  fi
  echo ""
}

# Get script directory (works cross-platform)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_DIR="$REPO_DIR/workers/markdown-converter"

# Extract the actual worker name from wrangler.jsonc
get_configured_worker_name() {
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$WORKER_DIR/wrangler.jsonc', 'utf8');
    const match = content.match(/\\\"name\\\":\\s*\\\"([^\\\"]+)\\\"/);
    console.log(match ? match[1] : 'rift-markdown-converter');
  "
}

WORKER_NAME=$(get_configured_worker_name)
DEFAULT_WORKER_NAME="rift-markdown-converter"

# Check if running on Windows
IS_WINDOWS=false
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
  IS_WINDOWS=true
fi

# ============================================
# Prerequisites Check
# ============================================

check_prerequisites() {
  print_header "Checking Prerequisites"
  
  # Check for Node.js
  if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed."
    echo ""
    echo "Please install Node.js first:"
    echo "  - Windows: https://nodejs.org/ (download LTS version)"
    echo "  - macOS:   brew install node  OR  https://nodejs.org/"
    echo "  - Linux:   sudo apt-get install nodejs  OR  https://nodejs.org/"
    echo ""
    exit 1
  fi
  
  local node_version
  node_version=$(node --version | cut -d'v' -f2)
  print_success "Node.js $node_version found"
  
  # Check for npm/npx
  if ! command -v npx &> /dev/null; then
    print_error "npx is required but not found."
    echo "Please ensure npm is installed with Node.js"
    exit 1
  fi
  
  print_success "npx is available"
}

# ============================================
# Wrangler Setup (using npx, no global install)
# ============================================

WRANGLER_CMD=""

check_wrangler() {
  print_header "Setting up Wrangler"
  
  # Always use npx to avoid global install issues
  WRANGLER_CMD="npx wrangler"
  
  print_info "Using npx to run wrangler (no global installation needed)"
  
  # Test that wrangler works
  if ! $WRANGLER_CMD --version &> /dev/null; then
    print_error "Failed to run wrangler via npx"
    echo "Trying to install wrangler locally..."
    
    cd "$WORKER_DIR"
    if ! npm install wrangler --save-dev; then
      print_error "Failed to install wrangler"
      exit 1
    fi
  fi
  
  local wrangler_version
  wrangler_version=$($WRANGLER_CMD --version 2>/dev/null || echo "unknown")
  print_success "Wrangler $wrangler_version ready"
}

# ============================================
# Cloudflare Authentication
# ============================================

mask_email() {
  local email="$1"
  if [[ -z "$email" ]]; then
    echo ""
    return
  fi
  
  local first_char="${email:0:1}"
  local domain="${email##*@}"
  
  if [[ -z "$domain" ]] || [[ "$email" != *@* ]]; then
    echo "$email"
    return
  fi
  
  echo "${first_char}*****@${domain}"
}

check_login() {
  local whoami_output
  whoami_output=$($WRANGLER_CMD whoami 2>&1) || true
  
  if echo "$whoami_output" | grep -qE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'; then
    local email
    email=$(echo "$whoami_output" | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1)
    local masked
    masked=$(mask_email "$email")
    print_success "Already logged in as: $masked"
    return 0
  fi
  
  return 1
}

login_cloudflare() {
  echo ""
  print_info "Step 1: Authenticating with Cloudflare..."
  echo ""
  echo "A browser window will open for authentication."
  echo "Please log in with your Cloudflare account."
  echo ""
  
  if ! $WRANGLER_CMD login; then
    print_error "Login failed. Please try again."
    exit 1
  fi
  
  print_success "Successfully logged in!"
}

# ============================================
# Worker Management
# ============================================

check_worker_exists() {
  cd "$WORKER_DIR"
  # Use dry-run to check if worker config is valid and exists
  if $WRANGLER_CMD deploy --dry-run &> /dev/null; then
    return 0
  else
    return 1
  fi
}

get_worker_url_from_config() {
  # Extract worker name from wrangler.jsonc
  local worker_name
  worker_name=$(get_configured_worker_name)
  
  # Workers.dev URL format
  echo "https://${worker_name}.workers.dev"
}

get_worker_url_and_regenerate_token() {
  print_header "Retrieving Worker URL & Managing API Token"
  
  print_info "This will:"
  print_info "  - Redeploy the worker to get its current URL"
  print_info "  - Optionally generate a new API token"
  echo ""
  
  cd "$WORKER_DIR"
  
  print_info "Redeploying to retrieve worker URL..."
  local deploy_output
  deploy_output=$($WRANGLER_CMD deploy 2>&1)
  local worker_url
  worker_url=$(echo "$deploy_output" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1 || echo "")
  
  print_success "Worker URL: $worker_url"
  echo ""
  print_warning "Note: Cloudflare API tokens cannot be retrieved once created."
  echo ""
  
  local generate_new="n"
  read -p "Do you want to generate a new token? (y/N): " generate_new
  
  if [[ "$generate_new" =~ ^[Yy]$ ]]; then
    local token
    # Cross-platform token generation
    if command -v openssl &> /dev/null; then
      token=$(openssl rand -hex 32)
    else
      token=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    fi
    
    echo "$token" | $WRANGLER_CMD secret put INTERNAL_TOKEN
    print_success "New token generated and saved to worker"
    
    echo ""
    print_header "Your Environment Variables"
    echo ""
    echo "# Add these to your .env file:"
    echo "CF_MARKDOWN_WORKER_URL=$worker_url"
    echo "CF_MARKDOWN_WORKER_TOKEN=$token"
  else
    echo ""
    print_header "Your Environment Variables (Token Not Regenerated)"
    echo ""
    echo "# Add these to your .env file:"
    echo "CF_MARKDOWN_WORKER_URL=$worker_url"
    echo "CF_MARKDOWN_WORKER_TOKEN=<your-existing-token>"
  fi
}

prompt_worker_action() {
  print_header "Worker Already Exists"
  
  echo ""
  print_info "The worker '$WORKER_NAME' already exists in your account."
  echo ""
  echo "What would you like to do?"
  echo ""
  echo "  1) Get worker URL & regenerate API token (Recommended)"
  echo "  2) Update worker code"
  echo "  3) Create new worker with custom name"
  echo "  4) Cancel"
  echo ""
  
  local choice
  read -p "Enter your choice [1-4]: " choice
  
  case $choice in
    1)
      get_worker_url_and_regenerate_token
      echo ""
      print_success "Done!"
      exit 0
      ;;
    2)
      update_worker
      ;;
    3)
      create_custom_worker
      ;;
    4)
      echo "Cancelled."
      exit 0
      ;;
    *)
      print_error "Invalid choice. Please enter 1-4."
      prompt_worker_action
      ;;
  esac
}

update_worker() {
  echo ""
  print_info "Updating worker..."
  cd "$WORKER_DIR"
  
  local deploy_output
  local exit_code=0
  deploy_output=$($WRANGLER_CMD deploy 2>&1) || exit_code=$?
  
  if [[ $exit_code -ne 0 ]]; then
    print_error "Failed to update worker"
    echo "$deploy_output"
    exit 1
  fi
  
  local worker_url
  worker_url=$(echo "$deploy_output" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1 || echo "")
  
  print_success "Worker updated successfully"
  echo ""
  print_info "Worker URL: $worker_url"
}

# Cross-platform JSON modification using Node.js
update_wrangler_name() {
  local new_name="$1"
  local wrangler_file="$WORKER_DIR/wrangler.jsonc"
  local temp_file
  
  if [[ "$IS_WINDOWS" == true ]]; then
    temp_file="${TEMP:-/tmp}/wrangler.jsonc.tmp.$$"
  else
    temp_file="$(mktemp)"
  fi
  
  node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$wrangler_file', 'utf8');
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      if (line.match(/\"name\":\s*\"[^\"]*\"/)) {
        return line.replace(/\"name\":\s*\"[^\"]*\"/, '\"name\": \"$new_name\"');
      }
      return line;
    });
    fs.writeFileSync('$temp_file', newLines.join('\n'));
  "
  
  mv "$temp_file" "$wrangler_file"
}

create_new_token() {
  echo ""
  print_info "Step 3: Generating secure API token..."
  
  local token
  if command -v openssl &> /dev/null; then
    token=$(openssl rand -hex 32)
  else
    token=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  fi
  
  cd "$WORKER_DIR"
  echo "$token" | $WRANGLER_CMD secret put INTERNAL_TOKEN
  
  echo ""
  print_header "Your Environment Variables"
  echo ""
  echo "# Add these to your .env file:"
  echo "CF_MARKDOWN_WORKER_URL=$(get_worker_url_from_config)"
  echo "CF_MARKDOWN_WORKER_TOKEN=$token"
}

create_custom_worker() {
  echo ""
  print_info "Creating new worker with custom name..."
  echo ""
  
  local valid=false
  local new_worker_name=""
  
  while [[ "$valid" == false ]]; do
    read -p "Enter a name for the new worker (default: $DEFAULT_WORKER_NAME): " new_worker_name
    
    if [[ -z "$new_worker_name" ]]; then
      new_worker_name="$DEFAULT_WORKER_NAME"
    fi
    
    if [[ ! "$new_worker_name" =~ ^[a-z0-9-]+$ ]]; then
      print_error "Worker name can only contain lowercase letters, numbers, and hyphens."
      echo "Please try again."
      echo ""
    else
      valid=true
    fi
  done
  
  # Backup original config
  local backup_file="$WORKER_DIR/wrangler.jsonc.backup.$$"
  cp "$WORKER_DIR/wrangler.jsonc" "$backup_file"
  
  update_wrangler_name "$new_worker_name"
  
  cd "$WORKER_DIR"
  
  local deploy_output
  local exit_code=0
  deploy_output=$($WRANGLER_CMD deploy 2>&1) || exit_code=$?
  
  if [[ $exit_code -ne 0 ]]; then
    mv "$backup_file" "$WORKER_DIR/wrangler.jsonc"
    print_error "Failed to deploy worker"
    echo "$deploy_output"
    exit 1
  fi
  
  local worker_url
  worker_url=$(echo "$deploy_output" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1 || echo "")
  
  if [[ -z "$worker_url" ]]; then
    worker_url="https://${new_worker_name}.workers.dev"
  fi
  
  # Restore original config
  mv "$backup_file" "$WORKER_DIR/wrangler.jsonc"
  
  print_success "Worker '$new_worker_name' deployed successfully"
  
  # Generate and save token
  local token
  if command -v openssl &> /dev/null; then
    token=$(openssl rand -hex 32)
  else
    token=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  fi
  
  echo "$token" | $WRANGLER_CMD secret put INTERNAL_TOKEN
  
  echo ""
  print_header "Your Environment Variables"
  echo ""
  echo "# Add these to your .env file:"
  echo "CF_MARKDOWN_WORKER_URL=$(get_worker_url_from_config)"
  echo "CF_MARKDOWN_WORKER_TOKEN=$token"
}

# ============================================
# Main
# ============================================

main() {
  print_header "Markdown Converter Worker Setup"
  
  # Check prerequisites
  check_prerequisites
  
  # Setup wrangler
  check_wrangler
  
  # Check authentication
  if ! check_login; then
    login_cloudflare
  fi
  
  # Check if worker already exists
  if check_worker_exists; then
    prompt_worker_action
  else
    # First time setup - automatic, no questions asked
    create_new_worker
    create_new_token
  fi
  
  echo ""
  print_success "Setup complete!"
}

# Handle script interruption gracefully
trap 'print_error "Setup interrupted"; exit 130' INT TERM

main "$@"
