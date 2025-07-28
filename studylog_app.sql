-- Create the database
CREATE DATABASE IF NOT EXISTS studylogTeam9_bowopenoff;
USE studylogTeam9_bowopenoff;

-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    contact VARCHAR(50),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample users
INSERT INTO users (username, email, password, address, contact, role)
VALUES 
('Alex', 'admin@example.com', SHA1('admin123'), '1 Admin St', '81234567', 'admin'),
('Sam', 'user@example.com', SHA1('user123'), '99 User Lane', '82345678', 'user');

-- Create the study_logs table
CREATE TABLE study_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    study_date DATE NOT NULL,
    topic VARCHAR(255) NOT NULL,
    duration INT NOT NULL, -- in minutes
    notes TEXT,
    mood VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Sample study logs
INSERT INTO study_logs (user_id, study_date, topic, duration, notes, mood)
VALUES
(2, '2025-07-16', 'Python Arrays', 60, 'Practiced exercises from class.', 'Productive'),
(2, '2025-07-17', 'Math Revision', 90, 'Past year paper with timer.', 'Focused'),
(2, '2025-07-18', 'ESports History', 45, 'Reviewed Week 3 slides.', 'Relaxed');
