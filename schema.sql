CREATE TABLE IF NOT EXISTS subscription_levels (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    section VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    sub_level_id INT,
    profile_pic VARCHAR(255),
    FOREIGN KEY (sub_level_id) REFERENCES subscription_levels(id)
);

CREATE TABLE IF NOT EXISTS media_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    section VARCHAR(50),
    category_id INT,
    file_path VARCHAR(255),
    thumbnail_path VARCHAR(255),
    duration_mins INT,
    rating_avg DECIMAL(3,2),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS ratings_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    media_id INT,
    rating INT,
    comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (media_id) REFERENCES media_content(id)
);