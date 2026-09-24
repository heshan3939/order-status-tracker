CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  status ENUM('created','paid','shipped','delivered','cancelled') NOT NULL,
  updated_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  status ENUM('created','paid','shipped','delivered','cancelled') NOT NULL,
  event_timestamp DATETIME(3) NOT NULL,
  received_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX(order_id, event_timestamp),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
