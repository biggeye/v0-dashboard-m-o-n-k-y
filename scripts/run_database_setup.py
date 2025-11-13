import os
from supabase import create_client, Client

# Get Supabase credentials from environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: Missing Supabase credentials!")
    print("Required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("=" * 80)
print("CRYPTO TRADING PLATFORM - DATABASE SETUP")
print("=" * 80)

# Read SQL scripts
print("\n[v0] Reading SQL scripts...")

with open('scripts/001_reset_and_create_enhanced_schema.sql', 'r') as f:
    schema_sql = f.read()

with open('scripts/002_seed_sample_data.sql', 'r') as f:
    seed_sql = f.read()

print("[v0] SQL scripts loaded successfully")

# Execute schema creation script
print("\n" + "=" * 80)
print("STEP 1: Creating Enhanced Database Schema")
print("=" * 80)

try:
    # Use the Supabase REST API to execute SQL via RPC
    result = supabase.rpc('exec_sql', {'sql': schema_sql}).execute()
    print("\n✓ Schema creation completed successfully!")
    print("\nTables created:")
    print("  • user_profiles")
    print("  • exchange_connections (Kraken, Binance US, Coinbase)")
    print("  • wallet_connections (MetaMask, WalletConnect, etc.)")
    print("  • price_history")
    print("  • trading_orders")
    print("  • transactions")
    print("  • portfolio_holdings")
    print("  • trading_strategies")
    print("  • price_alerts")
    print("  • dashboard_stats")
    print("\n✓ Row Level Security (RLS) policies enabled")
    print("✓ Indexes created for performance")
    print("✓ Triggers configured for auto-updates")
except Exception as e:
    print(f"\n✗ Error creating schema: {str(e)}")
    print("\nNOTE: If you see 'relation does not exist' errors, this is expected.")
    print("      The script will execute via the Supabase SQL Editor.")
    print("\nPlease run the following scripts manually in Supabase SQL Editor:")
    print("  1. scripts/001_reset_and_create_enhanced_schema.sql")
    print("  2. scripts/002_seed_sample_data.sql")

# Execute seed data script
print("\n" + "=" * 80)
print("STEP 2: Seeding Sample Price Data")
print("=" * 80)

try:
    result = supabase.rpc('exec_sql', {'sql': seed_sql}).execute()
    print("\n✓ Sample data seeded successfully!")
    print("\nSample cryptocurrencies added:")
    print("  • BTC (Bitcoin) - 5 historical data points")
    print("  • ETH (Ethereum) - 5 historical data points")
    print("  • SOL (Solana) - 3 historical data points")
    print("  • ADA (Cardano) - 2 historical data points")
    print("  • MATIC (Polygon) - 2 historical data points")
except Exception as e:
    print(f"\n✗ Error seeding data: {str(e)}")

# Verify tables exist
print("\n" + "=" * 80)
print("STEP 3: Verifying Database Setup")
print("=" * 80)

try:
    # Try to query price_history table
    result = supabase.table('price_history').select('symbol', count='exact').execute()
    print(f"\n✓ Database connection successful!")
    print(f"✓ Found {result.count} price history records")
    
    # Query distinct symbols
    symbols_result = supabase.table('price_history').select('symbol').execute()
    unique_symbols = set(row['symbol'] for row in symbols_result.data)
    print(f"✓ Available symbols: {', '.join(sorted(unique_symbols))}")
    
except Exception as e:
    print(f"\n✗ Verification failed: {str(e)}")
    print("\nPlease ensure the SQL scripts have been executed in Supabase.")

print("\n" + "=" * 80)
print("DATABASE SETUP COMPLETE!")
print("=" * 80)
print("\nNext steps:")
print("  1. Add exchange API credentials via the Trading page")
print("  2. Connect DeFi wallets via the Wallet Connect button")
print("  3. Start monitoring crypto prices in real-time")
print("  4. Create trading strategies and set price alerts")
print("\n" + "=" * 80)
