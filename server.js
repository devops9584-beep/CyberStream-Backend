const db = require('./db');
const cors = require('cors');
const path = require('path');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const app = express();

// TMDB API KEY (Should be in .env, but hardcoded for now as requested/implied)
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE';

app.use(cors());
app.use(express.json());

// ==========================
// DB INIT (Ensure tables exist)
// ==========================
const initQuery = `
    CREATE TABLE IF NOT EXISTS offline_downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        media_id INT,
        device_id VARCHAR(255),
        status VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ratings_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        media_id INT,
        rating INT,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE media_content ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0;
    ALTER TABLE media_content ADD COLUMN IF NOT EXISTS tmdb_id VARCHAR(50);
    ALTER TABLE media_content ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE media_content ADD COLUMN IF NOT EXISTS release_date DATE;
`;
// Split queries because mysql2 might not support multiple statements by default unless configured
const initQueries = initQuery.split(';').filter(q => q.trim());
initQueries.forEach(q => {
    db.query(q, err => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') console.error('DB Init Error:', err.message);
    });
});

// Helper to log actions
function logUserAction(userIdentifier, action, detail) {
    if (!userIdentifier) return;

    if (typeof userIdentifier === 'number') {
        const query = `
            INSERT INTO logs_users (user, action, detail, date)
            SELECT email, ?, ?, NOW()
            FROM users
            WHERE id = ?
        `;
        db.query(query, [action, detail, userIdentifier], err => {
            if (err) console.error('Error logUserAction (ID):', err);
        });
    } else {
        const query = `
            INSERT INTO logs_users (user, action, detail, date)
            VALUES (?, ?, ?, NOW())
        `;
        db.query(query, [userIdentifier, action, detail], err => {
            if (err) console.error('Error logUserAction (Email):', err);
        });
    }
}

// ==========================
// STATIC FILES
// ==========================
// app.use('/media', express.static('/home/cyber-stream/www/media')); // alwaydata
// app.use('/media', express.static(path.join(__dirname, '../media')));  // localhost

// app.use(express.static('/home/cyber-stream/www/frontend'));  // alwaydata
// app.use(express.static(path.join(__dirname, '../frontend')));   // localhost
app.use('/media', express.static(path.join(__dirname, '../media')));
app.use(express.static(path.join(__dirname, '../frontend')));


// ==========================
// ADMIN CHECK
// ==========================
function verifyAdmin(req, res, next) {
    if (req.headers['x-user-role'] === 'admin') return next();
    res.status(403).json({ success: false, message: 'Acceso denegado' });
}

// ==========================
// LOGIN
// ==========================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = `
        SELECT u.*, s.name AS plan_name, s.max_devices, s.quality, s.time_limit_mins
        FROM users u
        LEFT JOIN subscription_levels s ON u.sub_level_id = s.id
        WHERE u.email = ? AND u.password = ?
    `;

    db.query(query, [email, password], (err, result) => {
        if (err) return res.status(500).json({ auth: false });

        if (result.length) {
            const user = result[0];
            delete user.password;
            logUserAction(user.email, 'LOGIN', 'Inicio de sesión manual');
            res.json({ auth: true, user });
        } else {
            res.status(401).json({ auth: false, message: 'Credenciales inválidas' });
        }
    });
});

// ==========================
// USER PLAN
// ==========================
app.get('/api/users/:id/plan', (req, res) => {
    const query = `
        SELECT s.name, s.max_devices, s.quality, s.time_limit_mins
        FROM users u
        LEFT JOIN subscription_levels s ON u.sub_level_id = s.id
        WHERE u.id = ?
    `;
    db.query(query, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    });
});

// ==========================
// MEDIA (STRICT HIERARCHY)
// ==========================
app.get('/api/media/:section', (req, res) => {
    const section = req.params.section;

    // Base query
    let query = `
        SELECT m.*, c.name AS category_name
        FROM media_content m
        INNER JOIN categories c ON m.category_id = c.id
    `;

    const params = [];
    if (section !== 'inicio') {
        query += ' WHERE m.section = ?';
        params.push(section);
    }

    query += ' ORDER BY m.section, c.name, m.created_at DESC';

    db.query(query, params, (err, rows) => {
        if (err) return res.status(500).json({});

        // Structure: { Section: { Category: [Items] } }
        const grouped = {};

        rows.forEach(item => {
            // Ensure Section exists
            if (!grouped[item.section]) {
                grouped[item.section] = {};
            }
            // Ensure Category exists within Section
            if (!grouped[item.section][item.category_name]) {
                grouped[item.section][item.category_name] = [];
            }
            grouped[item.section][item.category_name].push(item);
        });

        // If specific section requested, return just that section's categories (for backward compat if needed, 
        // but user asked for strict structure. Let's return the full hierarchy for 'inicio' 
        // and for specific section, we can return { [section]: { ... } } or just { Category: ... }
        // The frontend expects { Category: [] } for specific section, and { Section: { Category: [] } } for inicio.

        if (section === 'inicio') {
            res.json(grouped);
        } else {
            // Return only the categories for this section
            res.json(grouped[section] || {});
        }
    });
});

// ==========================
// CATEGORIES
// ==========================
app.get('/api/categories/:section', (req, res) => {
    const query = 'SELECT id, name FROM categories WHERE section = ? ORDER BY name ASC';
    db.query(query, [req.params.section], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// ==========================
// PLANS
// ==========================
app.get('/api/plans', (req, res) => {
    db.query('SELECT * FROM subscription_levels', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// ==========================
// REGISTER
// ==========================
app.post('/api/register', (req, res) => {
    const { full_name, email, password, role, sub_level_id } = req.body;
    const query = 'INSERT INTO users (full_name, email, password, role, sub_level_id) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [full_name, email, password, role, sub_level_id], err => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// ==========================
// MULTER
// ==========================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const section = req.body.section || 'misc';
        // Ajustamos para que cree las rutas dentro de la carpeta del proyecto
        let dir = file.fieldname === 'thumbFile'
            ? path.join(__dirname, '../media/img')
            : path.join(__dirname, `../media/${section}`);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
    }
});
const upload = multer({ storage });

// ==========================
// ADD MEDIA (Admin)
// ==========================
app.post('/api/add-media', verifyAdmin, upload.fields([{ name: 'mediaFile' }, { name: 'thumbFile' }]), (req, res) => {
    const { title, section, category_id, duration_mins, tmdb_id, description, release_date } = req.body;

    // Validate required (mediaFile is required unless it's just metadata, but let's enforce file for now)
    if (!title || !section || !category_id || !req.files?.mediaFile) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    const mediaFile = req.files.mediaFile[0];
    const thumbFile = req.files.thumbFile ? req.files.thumbFile[0] : null;

    const file_path = `media/${section}/${mediaFile.filename}`;
    const thumbnail_path = thumbFile ? `media/img/${thumbFile.filename}` : (req.body.thumbnail_url || null); // Support URL from TMDB

    const query = `
        INSERT INTO media_content
        (title, section, category_id, file_path, thumbnail_path, duration_mins, tmdb_id, description, release_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        query,
        [title, section, category_id, file_path, thumbnail_path, duration_mins || null, tmdb_id || null, description || null, release_date || null],
        (err, result) => {
            if (err) return res.status(500).json({ success: false, err });

            // Log Admin Action
            // We don't have admin ID easily here without JWT, but we can log generic
            logUserAction('admin@system', 'ADD_MEDIA', `Added ${title} (ID: ${result.insertId})`);

            res.json({ success: true });
        }
    );
});

// ==========================
// DELETE MEDIA (Admin)
// ==========================
app.delete('/api/media/:id', verifyAdmin, (req, res) => {
    const mediaId = req.params.id;
    const getQuery = 'SELECT file_path, thumbnail_path, title FROM media_content WHERE id = ?';

    db.query(getQuery, [mediaId], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        if (rows.length > 0) {
            const m = rows[0];
            if (m.file_path && !m.file_path.startsWith('http')) {
                const p = path.join(__dirname, '..', m.file_path);
                if (fs.existsSync(p)) fs.unlink(p, () => { });
            }
            if (m.thumbnail_path && !m.thumbnail_path.startsWith('http')) {
                const p = path.join(__dirname, '../', m.thumbnail_path);
                if (fs.existsSync(p)) fs.unlink(p, () => { });
            }

            const query = 'DELETE FROM media_content WHERE id = ?';
            db.query(query, [mediaId], (err) => {
                if (err) return res.status(500).json({ success: false });

                logUserAction('admin@system', 'DELETE_MEDIA', `Deleted ${m.title} (ID: ${mediaId})`);
                res.json({ success: true });
            });
        } else {
            res.json({ success: true }); // Already gone
        }
    });
});

// ==========================
// UPDATE MEDIA (Admin)
// ==========================
app.put('/api/media/:id', verifyAdmin, (req, res) => {
    const { title, duration_mins } = req.body;
    const query = 'UPDATE media_content SET title = ?, duration_mins = ? WHERE id = ?';
    db.query(query, [title, duration_mins, req.params.id], (err) => {
        if (err) return res.status(500).json({ success: false });

        logUserAction('admin@system', 'UPDATE_MEDIA', `Updated Media ID ${req.params.id}`);
        res.json({ success: true });
    });
});

// ==========================
// ADMIN STATS
// ==========================
app.get('/api/admin/stats', verifyAdmin, (req, res) => {
    const stats = {};

    // 1. Total Users
    const q1 = 'SELECT COUNT(*) as count FROM users';
    // 2. Total Media
    const q2 = 'SELECT COUNT(*) as count FROM media_content';
    // 3. Total Views (from logs or playback_stats)
    const q3 = 'SELECT COUNT(*) as count FROM logs_users WHERE action = "PLAY_MEDIA"';
    // 4. Bandwidth (mock or real if playback_stats populated)
    const q4 = 'SELECT SUM(bandwidth_consumed_mb) as mb FROM playback_stats';

    db.query(q1, (err, r1) => {
        stats.users = r1[0].count;
        db.query(q2, (err, r2) => {
            stats.media = r2[0].count;
            db.query(q3, (err, r3) => {
                stats.views = r3[0].count;
                db.query(q4, (err, r4) => {
                    stats.bandwidth = r4[0].mb || 0;
                    res.json(stats);
                });
            });
        });
    });
});

// ==========================
// DOWNLOADS
// ==========================
app.post('/api/downloads', (req, res) => {
    const { user_id, media_id, device_id } = req.body;
    const query = `
        INSERT INTO offline_downloads (user_id, media_id, device_id, status)
        VALUES (?, ?, ?, 'active')
    `;
    db.query(query, [user_id, media_id, device_id || 'unknown'], (err) => {
        if (err) return res.status(500).json({ success: false });

        logUserAction(user_id, 'DOWNLOAD', `Media ID ${media_id}`);
        res.json({ success: true });
    });
});

// ==========================
// RATINGS & REVIEWS
// ==========================
app.post('/api/rating', (req, res) => {
    const { user_id, media_id, rating, comment } = req.body;

    console.log('Rating Request:', req.body); // Debug

    const query = `
        INSERT INTO ratings_reviews (user_id, media_id, rating, comment)
        VALUES (?, ?, ?, ?)
    `;
    db.query(query, [user_id, media_id, rating, comment], (err) => {
        if (err) {
            console.error('Rating DB Error:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        // Update average rating in media_content
        const avgQuery = `
            UPDATE media_content 
            SET rating_avg = (SELECT AVG(rating) FROM ratings_reviews WHERE media_id = ?)
            WHERE id = ?
        `;
        db.query(avgQuery, [media_id, media_id]);

        res.json({ success: true });
    });
});

app.get('/api/reviews/:mediaId', (req, res) => {
    const query = `
        SELECT r.*, u.full_name 
        FROM ratings_reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.media_id = ?
        ORDER BY r.created_at DESC
    `;
    db.query(query, [req.params.mediaId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// ==========================
// TMDB INTEGRATION
// ==========================
app.get('/api/tmdb/search', async (req, res) => {
    const query = req.query.q;
    const type = req.query.type || 'movie'; // movie or tv
    if (!query) return res.json({ results: [] });

    try {
        const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&language=es-ES&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('TMDB Error Status:', response.status);
            const errText = await response.text();
            console.error('TMDB Error Body:', errText);
            return res.status(response.status).json({ error: 'TMDB API Error', details: errText });
        }

        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error('TMDB Exception:', e);
        res.status(500).json({ error: 'TMDB Error' });
    }
});

app.get('/api/tmdb/details/:id', async (req, res) => {
    const id = req.params.id;
    const type = req.query.type || 'movie';
    try {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=es-ES`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'TMDB Error' });
    }
});

// ==========================
// SUBSCRIPTION CHECK
// ==========================
app.post('/api/check-subscription', (req, res) => {
    const { userId } = req.body;
    const query = `
        SELECT s.time_limit_mins, s.name
        FROM users u
        LEFT JOIN subscription_levels s ON u.sub_level_id = s.id
        WHERE u.id = ?
    `;
    db.query(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ allowed: false });
        if (!rows.length) return res.json({ allowed: false, message: 'Usuario no encontrado' });
        res.json({ allowed: true, plan: rows[0] });
    });
});

// ==========================
// MY LIST
// ==========================
app.post('/api/my-list', (req, res) => {
    const { user_id, media_id } = req.body;
    const query = 'INSERT IGNORE INTO my_list (user_id, media_id) VALUES (?, ?)';
    db.query(query, [user_id, media_id], err => {
        if (err) return res.status(500).json({ success: false });
        logUserAction(user_id, 'ADD_MY_LIST', `Media ID ${media_id}`);
        res.json({ success: true });
    });
});

app.get('/api/my-list/:userId', (req, res) => {
    const query = `
        SELECT m.*, c.name AS category_name
        FROM my_list ml
        INNER JOIN media_content m ON ml.media_id = m.id
        INNER JOIN categories c ON m.category_id = c.id
        WHERE ml.user_id = ?
    `;
    db.query(query, [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.delete('/api/my-list', (req, res) => {
    const { user_id, media_id } = req.body;
    const query = 'DELETE FROM my_list WHERE user_id = ? AND media_id = ?';
    db.query(query, [user_id, media_id], err => {
        if (err) return res.status(500).json({ success: false });
        logUserAction(user_id, 'REMOVE_MY_LIST', `Media ID ${media_id}`);
        res.json({ success: true });
    });
});

// ==========================
// LOGS
// ==========================
app.get('/api/admin/logs', verifyAdmin, (req, res) => {
    const query = 'SELECT id, user, action, detail, date FROM logs_users ORDER BY date DESC LIMIT 500';
    db.query(query, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.post('/api/log', (req, res) => {
    const { user, action, detail } = req.body;
    if (!user || !action) return res.status(400).json({ success: false });
    logUserAction(user, action, detail);
    res.json({ success: true });
});

// ==========================
// PASSWORD
// ==========================
app.post('/api/update-password', (req, res) => {
    const { userId, oldPass, newPass } = req.body;
    const query = 'UPDATE users SET password = ? WHERE id = ? AND password = ?';
    db.query(query, [newPass, userId, oldPass], (err, result) => {
        if (err || result.affectedRows === 0) return res.status(401).json({ success: false });
        res.json({ success: true });
    });
});

// ==========================
// SPA FALLBACK
// ==========================
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Servidor escuchando en ${PORT}`));

// Al final de server.js reemplaza tu app.listen por esto:
// const PORT = process.env.PORT || 3000; // Si hay puerto de Alwaysdata úsalo, si no, usa el 3000

/*
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 CyberStream corriendo en: http://localhost:${PORT}`);
});
*/

// ==========================
// EXPORT & LISTEN
// ==========================
const PORT = process.env.PORT || 3000;

// Solo levantamos el servidor si NO estamos ejecutando tests de Jest
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 CyberStream corriendo en: http://localhost:${PORT}`);
    });
}

// Exportamos la app para que Supertest (Jest) pueda usarla sin levantar el puerto
module.exports = app;