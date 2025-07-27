const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();

// MySQL connection
const connection = mysql.createConnection({
  host: 'j9oufe.h.filess.io',
  port: 61002,
  user: 'studylog_rocketgas',
  password: '808f96c52f25bfdf0d58d198072b5c544067d5d4',
  database: 'studylog_rocketgas'  
});

connection.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// App setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'studylog_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Middleware
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please log in first.');
    res.redirect('/login');
};

const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') return next();
    req.flash('error', 'Access denied.');
    res.redirect('/studylog');
};

const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;
    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

// Homepage
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

// ========================= AUTH =========================

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});

app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact, role } = req.body;
    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    connection.query(sql, [username, email, password, address, contact, role], (err) => {
        if (err) throw err;
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.flash('success'), errors: req.flash('error') });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }
    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    connection.query(sql, [email, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            if (results[0].role === 'admin') res.redirect('/admin/studylogs');
            else res.redirect('/studylog');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ========================= STUDY LOG =========================

app.get('/studylog', checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const keyword = req.query.keyword;

// ===== MERGED: Search/filter functionality =========
    let sql = 'SELECT * FROM study_logs WHERE user_id = ?';
    const params = [userId];

    if (keyword && keyword.trim() !== '') {
        sql += ' AND topic LIKE ?';
        params.push(`%${keyword}%`);
    }

    sql += ' ORDER BY study_date DESC';

    connection.query(sql, params, (err, results) => {
        if (err) {
            console.log(err);
            return res.send('Database error');
        }

        res.render('studylog', {
            logs: results,
            user: req.session.user,
            keyword: keyword || '',
            messages: req.flash('success'),
            errors: req.flash('error')
        });
    });
});

app.get('/studylog/add', checkAuthenticated, (req, res) => {
    res.render('addStudyLog', { user: req.session.user });
});

app.post('/studylog/add', checkAuthenticated, (req, res) => {
    const { study_date, topic, duration, notes, mood } = req.body;

    if (!study_date || !topic || !duration) {
        req.flash('error', 'Study Date, Topic, and Duration are required.');
        return res.redirect('/studylog/add');
    }

    const sql = 'INSERT INTO study_logs (user_id, study_date, topic, duration, notes, mood) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [req.session.user.id, study_date, topic, duration, notes, mood], (err) => {
        if (err) throw err;
        req.flash('success', 'Study log added successfully!');
        res.redirect('/studylog');
    });
});

app.get('/studylog/edit/:id', checkAuthenticated, (req, res) => {
    const sql = 'SELECT * FROM study_logs WHERE id = ? AND user_id = ?';
    connection.query(sql, [req.params.id, req.session.user.id], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send('Log not found.');
        res.render('editStudyLog', { log: results[0], user: req.session.user });
    });
});

app.post('/studylog/edit/:id', checkAuthenticated, (req, res) => {
    const { study_date, topic, duration, notes, mood } = req.body;

    if (!study_date || !topic || !duration) {
        req.flash('error', 'Study Date, Topic, and Duration are required.');
        return res.redirect(`/studylog/edit/${req.params.id}`);
    }

    const sql = 'UPDATE study_logs SET study_date = ?, topic = ?, duration = ?, notes = ?, mood = ? WHERE id = ? AND user_id = ?';
    connection.query(sql, [study_date, topic, duration, notes, mood, req.params.id, req.session.user.id], (err) => {
        if (err) throw err;
        req.flash('success', 'Study log updated successfully!');
        res.redirect('/studylog');
    });
});

app.get('/studylog/delete/:id', checkAuthenticated, (req, res) => {
    const sql = 'DELETE FROM study_logs WHERE id = ? AND user_id = ?';
    connection.query(sql, [req.params.id, req.session.user.id], (err) => {
        if (err) throw err;
        req.flash('success', 'Study log deleted successfully!');
        res.redirect('/studylog');
    });
});

// ========================= ADMIN =========================
app.get('/admin/studylogs', checkAuthenticated, checkAdmin, (req, res) => {
    const keyword = req.query.keyword;
    let sql = `
        SELECT 
            study_logs.id AS log_id,
            users.username,
            study_logs.study_date,
            study_logs.topic,
            study_logs.duration,
            study_logs.notes,
            study_logs.mood,
            study_logs.study_date AS created_at
        FROM study_logs
        JOIN users ON study_logs.user_id = users.id
    `;

    const params = [];

    if (keyword && keyword.trim() !== '') {
        sql += ' WHERE study_logs.topic LIKE ?';
        params.push(`%${keyword}%`);
    }

    sql += ' ORDER BY study_logs.study_date DESC';

    connection.query(sql, params, (err, results) => {
        if (err) throw err;
        res.render('adminStudylogs', {
            logs: results,
            user: req.session.user,
            keyword: keyword || '' // Send current keyword to EJS for display in input
        });
    });
});

// ========================= TIMER=========================
app.get('/studylog/timer', checkAuthenticated, (req, res) => {
  res.render('studyTimer', { user: req.session.user });
});

// Handle timer form submission
app.post('/studylog/timer', checkAuthenticated, (req, res) => {
  const { study_date, topic, duration, notes, mood } = req.body;
  const sql = 'INSERT INTO study_logs (user_id, study_date, topic, duration, notes, mood) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(sql, [req.session.user.id, study_date, topic, duration, notes, mood], (err) => {
    if (err) throw err;
    req.flash('success', 'Study session logged successfully!');
    res.redirect('/studylog');
  });
});

// ========================= SERVER =========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Study Log app running on http://localhost:${PORT}`));

