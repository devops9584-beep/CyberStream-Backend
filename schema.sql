-- 1. Tablas Base
CREATE TABLE IF NOT EXISTS `subscription_levels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `section` enum('pelicula','serie','musica') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- 2. Tablas con dependencias
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `sub_level_id` int(11),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`sub_level_id`) REFERENCES `subscription_levels` (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `media_content` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(150) NOT NULL,
  `section` varchar(255),
  `category_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `rating_avg` decimal(3,2) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB;

-- 3. SEMILLAS (Seed data para que el test no falle por falta de IDs)
INSERT IGNORE INTO `subscription_levels` (id, name) VALUES (1, 'Premium');
INSERT IGNORE INTO `categories` (id, name, section) VALUES (1, 'Acción', 'pelicula');
INSERT IGNORE INTO `users` (id, full_name, email, password, role, sub_level_id) 
VALUES (1, 'Administrador', 'admin@cyberstream.com', '123', 'admin', 1);
INSERT IGNORE INTO `media_content` (id, title, section, category_id, file_path) 
VALUES (1, 'Pelicula Test', 'pelicula', 1, 'media/test.mp4');