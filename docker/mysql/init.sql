-- SIV Database Schema
CREATE DATABASE IF NOT EXISTS siv_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE siv_db;

-- Lignes (routes)
CREATE TABLE IF NOT EXISTS lignes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  description TEXT,
  couleur VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stations
CREATE TABLE IF NOT EXISTS stations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  ligne_id INT,
  ordre INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ligne_id) REFERENCES lignes(id) ON DELETE SET NULL
);

-- Bus
CREATE TABLE IF NOT EXISTS bus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  immatriculation VARCHAR(20) NOT NULL UNIQUE,
  numero VARCHAR(10) NOT NULL,
  ligne_id INT,
  etat ENUM('actif', 'inactif', 'maintenance') DEFAULT 'inactif',
  capacite INT DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ligne_id) REFERENCES lignes(id) ON DELETE SET NULL
);

-- Positions GPS
CREATE TABLE IF NOT EXISTS positions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  vitesse FLOAT DEFAULT 0,
  date_position TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bus_date (bus_id, date_position),
  FOREIGN KEY (bus_id) REFERENCES bus(id) ON DELETE CASCADE
);

-- Télémétrie CAN
CREATE TABLE IF NOT EXISTS telemetrie (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  speed FLOAT DEFAULT 0,
  fuel FLOAT DEFAULT 0,
  engine_temp FLOAT DEFAULT 0,
  odometer FLOAT DEFAULT 0,
  doors ENUM('open', 'closed') DEFAULT 'closed',
  date_reception TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bus_date (bus_id, date_reception),
  FOREIGN KEY (bus_id) REFERENCES bus(id) ON DELETE CASCADE
);

-- Alertes
CREATE TABLE IF NOT EXISTS alertes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  type ENUM('temperature', 'carburant', 'hors_ligne', 'porte') NOT NULL,
  message TEXT NOT NULL,
  valeur FLOAT,
  acquittee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bus_id) REFERENCES bus(id) ON DELETE CASCADE
);

-- Horaires
CREATE TABLE IF NOT EXISTS horaires (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ligne_id INT NOT NULL,
  station_id INT NOT NULL,
  heure_depart TIME NOT NULL,
  jours VARCHAR(20) DEFAULT 'lun-ven',
  FOREIGN KEY (ligne_id) REFERENCES lignes(id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

-- Users (admin auth)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operateur') DEFAULT 'operateur',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- SEED DATA
-- =====================

INSERT INTO lignes (nom, description, couleur) VALUES
('Ligne 1', 'Casablanca Centre - Ain Sebaa', '#EF4444'),
('Ligne 2', 'Hay Mohammadi - Maarif', '#3B82F6'),
('Ligne 3', 'Aïn Chock - Sidi Bernoussi', '#10B981');

INSERT INTO stations (nom, latitude, longitude, ligne_id, ordre) VALUES
('Casa-Port',       33.5966, -7.6197, 1, 1),
('Place des Nations', 33.5890, -7.6128, 1, 2),
('Mers Sultan',     33.5812, -7.6035, 1, 3),
('Ain Diab',        33.5780, -7.6780, 1, 4),
('Maarif Centre',   33.5731, -7.6338, 2, 1),
('Bd Zerktouni',    33.5750, -7.6200, 2, 2),
('Hay Mohammadi',   33.5650, -7.5870, 2, 3);

INSERT INTO bus (immatriculation, numero, ligne_id, etat, capacite) VALUES
('A-12345-01', 'BUS-01', 1, 'actif', 50),
('A-12346-01', 'BUS-02', 1, 'actif', 50),
('A-22341-02', 'BUS-03', 2, 'actif', 60),
('A-22342-02', 'BUS-04', 2, 'inactif', 60),
('A-33351-03', 'BUS-05', 3, 'actif', 45);

-- Default admin user: admin / admin123
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$rOzjqQ7Z9Q4kQ5X8Y1234.hashedpasswordhere', 'admin');
