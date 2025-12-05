#!/bin/bash
# Database Reset Script
# This script resets your Supabase database and applies the complete schema

set -e  # Exit on error

echo "========================================="
echo "Database Reset Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Confirm with user
echo -e "${YELLOW}WARNING: This will completely reset your database!${NC}"
echo "All data will be lost. This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${RED}Reset cancelled.${NC}"
    exit 0
fi

echo ""
echo "========================================="
echo "Step 1: Stopping Supabase"
echo "========================================="
supabase stop

echo ""
echo "========================================="
echo "Step 2: Resetting Database"
echo "========================================="
supabase db reset

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database Reset Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${BLUE}Database Schema Summary:${NC}"
echo "  ✓ Price snapshots with minute-level uniqueness"
echo "  ✓ API keys management"
echo "  ✓ User profiles and RBAC (admin/user roles)"
echo "  ✓ User portfolio tracking"
echo "  ✓ Crawler management system"
echo "  ✓ Reference data (retailers, provinces, product types)"
echo "  ✓ Backfill system for historical data"
echo "  ✓ Blog system (posts, categories, tags, comments)"
echo "  ✓ SJC crawler with type mappings"
echo "  ✓ Onus crawler with zone mappings"
echo "  ✓ Retailer-specific products (32 products seeded)"
echo "  ✓ All views, triggers, and functions"
echo ""
echo -e "${BLUE}Seeded Data:${NC}"
echo "  - SJC: 10 products"
echo "  - PNJ: 10 products"
echo "  - DOJI: 5 products"
echo "  - Bảo Tín Minh Châu: 7 products"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start Supabase: ${GREEN}supabase start${NC}"
echo "  2. Check status: ${GREEN}supabase status${NC}"
echo "  3. Open Studio: ${GREEN}http://localhost:54323${NC}"
echo "  4. Test crawlers from admin panel"
echo ""
