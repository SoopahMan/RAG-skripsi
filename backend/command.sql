CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user'
);

INSERT INTO users (username, password, role)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb7c1c6a7c9c6f3d6f7c7d7e0e6b1e6e0c2e3f3a',
    'admin'
);