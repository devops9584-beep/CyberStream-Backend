-- Forzamos el uso de la DB correcta
USE cyber-stream_db_cs_main;

-- 1. Maestras
CREATE TABLE subscription_levels (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(50) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id int NOT NULL AUTO_INCREMENT,
  name varchar(100) NOT NULL,
  section enum('pelicula','serie','musica') NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE logs_users (
  id int NOT NULL AUTO_INCREMENT,
  user varchar(255) NOT NULL,
  action varchar(255) NOT NULL,
  detail varchar(255) DEFAULT NULL,
  date datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 2. Dependientes
CREATE TABLE users (
  id int NOT NULL AUTO_INCREMENT,
  full_name varchar(100) NOT NULL,
  email varchar(100) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  role enum('admin','user') DEFAULT 'user',
  sub_level_id int DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (sub_level_id) REFERENCES subscription_levels (id)
) ENGINE=InnoDB;

CREATE TABLE media_content (
  id int NOT NULL AUTO_INCREMENT,
  title varchar(150) NOT NULL,
  section varchar(255) DEFAULT NULL,
  category_id int NOT NULL,
  file_path varchar(255) NOT NULL,
  rating_avg decimal(3,2) DEFAULT 0.00,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;

-- 3. Interacciones (AQUÍ ESTABA EL ERROR)
CREATE TABLE offline_downloads (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  media_id int NOT NULL,
  device_id varchar(255) NOT NULL,
  status varchar(50) DEFAULT 'active',
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE my_list (
  id int NOT NULL AUTO_INCREMENT,
  user_id int DEFAULT NULL,
  media_id int DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE ratings_reviews (
  id int NOT NULL AUTO_INCREMENT,
  user_id int NOT NULL,
  media_id int NOT NULL,
  rating int DEFAULT NULL,
  comment text,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- 4. Datos semilla para que el test encuentre algo
INSERT INTO subscription_levels (id, name) VALUES (1, 'Premium');
INSERT INTO categories (id, name, section) VALUES (1, 'Acción', 'pelicula');
INSERT INTO users (id, full_name, email, password, role, sub_level_id) VALUES (1, 'Administrador', 'admin@cyberstream.com', '123', 'admin', 1);
INSERT INTO media_content (id, title, section, category_id, file_path) VALUES (1, 'Test', 'pelicula', 1, 'media/test.mp4');