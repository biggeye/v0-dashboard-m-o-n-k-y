-- Seed Sample Price History Data
-- This provides initial data for testing without relying on external APIs

INSERT INTO price_history (symbol, price, market_cap, volume_24h, change_24h, high_24h, low_24h, source, timestamp) VALUES
-- Bitcoin (BTC)
('BTC', 45000.00, 880000000000, 28000000000, 2.5, 46000.00, 44500.00, 'seed', NOW() - INTERVAL '1 hour'),
('BTC', 44800.00, 875000000000, 27500000000, 2.1, 45500.00, 44200.00, 'seed', NOW() - INTERVAL '2 hours'),
('BTC', 44500.00, 870000000000, 27000000000, 1.8, 45000.00, 44000.00, 'seed', NOW() - INTERVAL '3 hours'),
('BTC', 44200.00, 865000000000, 26500000000, 1.5, 44800.00, 43800.00, 'seed', NOW() - INTERVAL '4 hours'),
('BTC', 43900.00, 860000000000, 26000000000, 1.2, 44500.00, 43500.00, 'seed', NOW() - INTERVAL '5 hours'),

-- Ethereum (ETH)
('ETH', 2400.00, 288000000000, 15000000000, 3.2, 2450.00, 2380.00, 'seed', NOW() - INTERVAL '1 hour'),
('ETH', 2380.00, 285000000000, 14800000000, 2.9, 2420.00, 2360.00, 'seed', NOW() - INTERVAL '2 hours'),
('ETH', 2360.00, 283000000000, 14500000000, 2.6, 2400.00, 2340.00, 'seed', NOW() - INTERVAL '3 hours'),
('ETH', 2340.00, 281000000000, 14200000000, 2.3, 2380.00, 2320.00, 'seed', NOW() - INTERVAL '4 hours'),
('ETH', 2320.00, 278000000000, 14000000000, 2.0, 2360.00, 2300.00, 'seed', NOW() - INTERVAL '5 hours'),

-- Solana (SOL)
('SOL', 98.50, 42000000000, 2500000000, 5.8, 102.00, 95.00, 'seed', NOW() - INTERVAL '1 hour'),
('SOL', 95.20, 40500000000, 2400000000, 4.2, 98.00, 92.50, 'seed', NOW() - INTERVAL '2 hours'),
('SOL', 92.30, 39000000000, 2300000000, 2.8, 95.00, 90.00, 'seed', NOW() - INTERVAL '3 hours'),

-- Cardano (ADA)
('ADA', 0.55, 19500000000, 580000000, 1.8, 0.57, 0.54, 'seed', NOW() - INTERVAL '1 hour'),
('ADA', 0.54, 19200000000, 570000000, 1.5, 0.56, 0.53, 'seed', NOW() - INTERVAL '2 hours'),

-- Polygon (MATIC)
('MATIC', 0.92, 8500000000, 420000000, -0.5, 0.95, 0.90, 'seed', NOW() - INTERVAL '1 hour'),
('MATIC', 0.93, 8600000000, 430000000, 0.2, 0.96, 0.91, 'seed', NOW() - INTERVAL '2 hours');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Sample price history data seeded successfully!';
  RAISE NOTICE 'Symbols included: BTC, ETH, SOL, ADA, MATIC';
  RAISE NOTICE 'You can now test the dashboard without connecting external APIs';
END $$;
