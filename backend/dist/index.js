"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({
    adapter,
    log: ['query', 'info', 'warn', 'error'],
});
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.teacher = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
app.get('/', (req, res) => {
    res.send('Hello from the backend!');
});
// Teacher login endpoint
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const teacher = yield prisma.teacher.findFirst({
            where: { username: username },
        });
        if (!teacher) {
            return res.status(401).json({ error: 'Wrong username and/or password.' });
        }
        if (!teacher.password_hash) {
            return res.status(401).json({ error: 'Wrong username and/or password.' });
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, teacher.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Wrong username and/or password.' });
        }
        // Create JWT token
        const token = jsonwebtoken_1.default.sign({
            teacher_id: teacher.teacher_id,
            username: teacher.username,
        }, JWT_SECRET, { expiresIn: '7d' } // Token expires in 7 days
        );
        res.json({
            success: true,
            token: token,
            teacher_id: teacher.teacher_id,
            username: teacher.username
        });
    }
    catch (error) {
        console.error('Login error', {
            username: (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : null,
            errorName: error instanceof Error ? error.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof client_1.Prisma.PrismaClientInitializationError ||
            (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2021')) {
            return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Example protected route (you can add more protected routes as needed)
app.get('/api/auth/me', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const teacher = yield prisma.teacher.findUnique({
            where: { teacher_id: (_a = req.teacher) === null || _a === void 0 ? void 0 : _a.teacher_id },
            select: {
                teacher_id: true,
                username: true,
                email: true,
                school_id: true,
            },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        res.json(teacher);
    }
    catch (error) {
        console.error('Error fetching teacher data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get full teacher profile (teacher + teacher_personal_info)
app.get('/api/settings/profile', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teacherId = req.teacher.teacher_id;
        const rows = yield prisma.$queryRaw `
      SELECT t.teacher_id, t.username, t.email,
             p.title, p.given_name, p.surname, p.tel, p.school, p.subject
      FROM teacher t
      LEFT JOIN teacher_personal_info p ON p.teacher_id = t.teacher_id
      WHERE t.teacher_id = ${teacherId}
      LIMIT 1
    `;
        if (rows.length === 0)
            return res.status(404).json({ error: 'Teacher not found' });
        res.json(rows[0]);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Update teacher profile (UPSERT teacher_personal_info)
app.put('/api/settings/profile', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teacherId = req.teacher.teacher_id;
        const { title, given_name, surname, tel, email, school, subject } = req.body;
        yield prisma.$executeRaw `
      INSERT INTO teacher_personal_info (teacher_id, title, given_name, surname, tel, email, school, subject)
      VALUES (${teacherId}, ${title !== null && title !== void 0 ? title : null}, ${given_name !== null && given_name !== void 0 ? given_name : null}, ${surname !== null && surname !== void 0 ? surname : null},
              ${tel !== null && tel !== void 0 ? tel : null}, ${email !== null && email !== void 0 ? email : null}, ${school !== null && school !== void 0 ? school : null}, ${subject !== null && subject !== void 0 ? subject : null})
      ON CONFLICT (teacher_id) DO UPDATE SET
        title      = EXCLUDED.title,
        given_name = EXCLUDED.given_name,
        surname    = EXCLUDED.surname,
        tel        = EXCLUDED.tel,
        email      = EXCLUDED.email,
        school     = EXCLUDED.school,
        subject    = EXCLUDED.subject
    `;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Change password
app.put('/api/settings/password', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teacherId = req.teacher.teacher_id;
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password)
            return res.status(400).json({ error: 'Both current and new password are required' });
        if (new_password.length < 8)
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        const teacher = yield prisma.teacher.findUnique({ where: { teacher_id: teacherId } });
        if (!(teacher === null || teacher === void 0 ? void 0 : teacher.password_hash))
            return res.status(404).json({ error: 'Teacher not found' });
        const valid = yield bcryptjs_1.default.compare(current_password, teacher.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Current password is incorrect' });
        const hash = yield bcryptjs_1.default.hash(new_password, 10);
        yield prisma.$executeRaw `UPDATE teacher SET password_hash = ${hash} WHERE teacher_id = ${teacherId}`;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Get teacher data with school information (legacy — kept for compatibility)
app.get('/api/settings/school/:teacherId', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const teacherId = parseInt(req.params.teacherId);
        // Verify the teacher is accessing their own data
        if (((_a = req.teacher) === null || _a === void 0 ? void 0 : _a.teacher_id) !== teacherId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const teacher = yield prisma.teacher.findUnique({
            where: { teacher_id: teacherId },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        // Get school name using raw query since we need to join with school table
        const schoolResult = yield prisma.$queryRaw `
      SELECT school 
      FROM school 
      WHERE school_id = ${teacher.school_id}
      LIMIT 1
    `;
        const school_name = schoolResult.length > 0 ? schoolResult[0].school : null;
        res.json({
            teacher_id: teacher.teacher_id,
            username: teacher.username,
            email: teacher.email,
            school_id: teacher.school_id,
            school_name: school_name,
            first_name: null, // These fields don't exist in current schema
            last_name: null,
            telephone: null,
        });
    }
    catch (error) {
        console.error('Error fetching teacher settings data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ── Students endpoints ───────────────────────────────────────────────────────
// Paginated, searchable, sortable student list
app.get('/api/students', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const search = req.query.search || '';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const like = `%${search}%`;
        // Whitelist sort columns to prevent SQL injection
        const SORT_COLS = {
            username: 's.username',
            nickname: 'COALESCE(s.nickname, \'\')',
            plan: 'COALESCE(p.value, \'\')',
            register_date: 's.register_date',
            total_sessions: 'total_sessions',
            last_active: 'last_active',
        };
        const sortParam = req.query.sort || 'username';
        const orderParam = req.query.order === 'desc' ? 'DESC' : 'ASC';
        const sortCol = (_a = SORT_COLS[sortParam]) !== null && _a !== void 0 ? _a : SORT_COLS['username'];
        const nullsClause = (sortParam === 'last_active' || sortParam === 'total_sessions')
            ? (orderParam === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST')
            : '';
        const [countRows, students] = yield Promise.all([
            prisma.$queryRaw `
        SELECT count(*) FROM student
        WHERE username ILIKE ${like} OR COALESCE(nickname, '') ILIKE ${like}
      `,
            prisma.$queryRawUnsafe(`SELECT
          s.student_id,
          s.username,
          s.nickname,
          s.register_date,
          p.value                          AS plan,
          count(pr.practice_record_id)     AS total_sessions,
          max(pr.tested_date)              AS last_active
        FROM student s
        LEFT JOIN plan             p  ON p.plan_id    = s.plan_id
        LEFT JOIN practice_record  pr ON pr.student_id = s.student_id
        WHERE s.username ILIKE $1 OR COALESCE(s.nickname, '') ILIKE $1
        GROUP BY s.student_id, s.username, s.nickname, s.register_date, p.value
        ORDER BY ${sortCol} ${orderParam} ${nullsClause}
        LIMIT $2 OFFSET $3`, like, limit, offset),
        ]);
        const total = Number(countRows[0].count);
        res.json({
            students: students.map(s => (Object.assign(Object.assign({}, s), { total_sessions: Number(s.total_sessions) }))),
            total,
            page,
            total_pages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Student performance chart data (separate endpoint so chart filters don't reload the whole page)
app.get('/api/students/:id/performance', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId))
            return res.status(400).json({ error: 'Invalid student ID' });
        const range = req.query.range || '30';
        const groupBy = req.query.group_by || 'daily';
        const dateFilter = {
            '10': "tested_date >= NOW() - INTERVAL '10 days'",
            '30': "tested_date >= NOW() - INTERVAL '30 days'",
            '90': "tested_date >= NOW() - INTERVAL '90 days'",
            'all': '1=1',
        };
        const dateWhere = (_a = dateFilter[range]) !== null && _a !== void 0 ? _a : dateFilter['30'];
        // Whitelisted period truncation expressions (HKT = UTC+8)
        const periodExpr = {
            daily: "DATE(tested_date + INTERVAL '8 hours')",
            weekly: "DATE_TRUNC('week',  (tested_date + INTERVAL '8 hours'))::date",
            monthly: "DATE_TRUNC('month', (tested_date + INTERVAL '8 hours'))::date",
        };
        const expr = (_b = periodExpr[groupBy]) !== null && _b !== void 0 ? _b : periodExpr['daily'];
        const rows = yield prisma.$queryRawUnsafe(`SELECT ${expr}                                    AS period,
              ROUND(AVG(wrong_count)::numeric, 1)       AS avg_wrong,
              count(*)                                   AS sessions
       FROM practice_record
       WHERE student_id = $1 AND ${dateWhere}
       GROUP BY period
       ORDER BY period ASC`, studentId);
        res.json(rows.map(r => ({
            period: r.period,
            avg_wrong: r.avg_wrong !== null ? Number(r.avg_wrong) : null,
            sessions: Number(r.sessions),
        })));
    }
    catch (error) {
        console.error('Error fetching student performance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Single student detail
app.get('/api/students/:id', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = parseInt(req.params.id);
        if (isNaN(studentId))
            return res.status(400).json({ error: 'Invalid student ID' });
        const [studentRows, history, dailyPerf, coverageRows] = yield Promise.all([
            // Student info
            prisma.$queryRaw `
        SELECT s.student_id, s.username, s.nickname, s.register_date, p.value AS plan
        FROM student s LEFT JOIN plan p ON p.plan_id = s.plan_id
        WHERE s.student_id = ${studentId}
        LIMIT 1
      `,
            // Practice history (last 50)
            prisma.$queryRaw `
        SELECT pr.practice_record_id, pr.tested_date, pr.wrong_count, pr.duration,
               p.title AS passage_title, qr.type AS question_type
        FROM practice_record pr
        JOIN question_registry qr ON qr.question_id = pr.question_id
        JOIN passage           p  ON p.passage_id   = qr.passage_id
        WHERE pr.student_id = ${studentId}
        ORDER BY pr.tested_date DESC
        LIMIT 50
      `,
            // Daily avg wrong count — last 30 days
            prisma.$queryRaw `
        SELECT DATE(tested_date) AS day,
               ROUND(AVG(wrong_count)::numeric, 1) AS avg_wrong,
               count(*) AS sessions
        FROM practice_record
        WHERE student_id = ${studentId}
          AND tested_date >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day ASC
      `,
            // Passage coverage
            prisma.$queryRaw `
        SELECT
          (SELECT count(DISTINCT qr.passage_id)
           FROM practice_record pr
           JOIN question_registry qr ON qr.question_id = pr.question_id
           WHERE pr.student_id = ${studentId}) AS passages_attempted,
          (SELECT count(*) FROM passage)        AS total_passages
      `,
        ]);
        if (studentRows.length === 0)
            return res.status(404).json({ error: 'Student not found' });
        res.json({
            student: studentRows[0],
            history,
            daily_performance: dailyPerf.map(r => ({
                day: r.day,
                avg_wrong: Number(r.avg_wrong),
                sessions: Number(r.sessions),
            })),
            passages_attempted: Number(coverageRows[0].passages_attempted),
            total_passages: Number(coverageRows[0].total_passages),
        });
    }
    catch (error) {
        console.error('Error fetching student detail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ── Reports endpoint ─────────────────────────────────────────────────────────
app.get('/api/reports/summary', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const range = req.query.range || '30';
        const plan = req.query.plan || 'all';
        const dateFilter = {
            '7': "pr.tested_date >= NOW() - INTERVAL '7 days'",
            '30': "pr.tested_date >= NOW() - INTERVAL '30 days'",
            '90': "pr.tested_date >= NOW() - INTERVAL '90 days'",
            'all': '1=1',
        };
        const dateWhere = (_a = dateFilter[range]) !== null && _a !== void 0 ? _a : '1=1';
        // Plan filter for student-level queries
        const planWhere = plan === 'free' ? "AND (p.value = 'free' OR s.plan_id IS NULL)"
            : plan === 'premium' ? "AND p.value = 'premium'"
                : '';
        // Teacher + school
        const teacherRows = yield prisma.$queryRaw `
      SELECT t.username,
             (SELECT sc.value FROM school sc WHERE sc.school_id = t.school_id LIMIT 1) AS school_name
      FROM teacher t
      WHERE t.teacher_id = ${req.teacher.teacher_id}
      LIMIT 1
    `;
        const teacher = (_b = teacherRows[0]) !== null && _b !== void 0 ? _b : { username: 'admin', school_name: null };
        const studentBase = `
      FROM practice_record pr
      JOIN student s ON s.student_id = pr.student_id
      LEFT JOIN plan p ON p.plan_id = s.plan_id
      WHERE ${dateWhere} ${planWhere}
      GROUP BY s.student_id, s.username, s.nickname, p.value
      HAVING count(pr.practice_record_id) >= 10
    `;
        const passageBase = `
      FROM practice_record pr
      JOIN question_registry qr ON qr.question_id = pr.question_id
      JOIN passage            pa ON pa.passage_id  = qr.passage_id
      JOIN student            s  ON s.student_id   = pr.student_id
      LEFT JOIN plan          p  ON p.plan_id       = s.plan_id
      WHERE ${dateWhere} ${planWhere}
      GROUP BY pa.passage_id, pa.title, pa.author
    `;
        const studentSelect = `
      SELECT s.student_id, s.username, s.nickname, p.value AS plan,
             count(pr.practice_record_id)                                       AS sessions,
             ROUND(AVG(pr.wrong_count)::numeric, 2)                            AS avg_wrong,
             ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)
                   / NULLIF(count(*), 0), 1)                                   AS pct_perfect,
             max(pr.tested_date)                                                AS last_active
    `;
        const passageSelect = `
      SELECT pa.passage_id, pa.title, pa.author,
             count(pr.practice_record_id)                                       AS attempts,
             count(DISTINCT pr.student_id)                                      AS students,
             ROUND(AVG(pr.wrong_count)::numeric, 2)                            AS avg_wrong,
             ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)
                   / NULLIF(count(*), 0), 1)                                   AS pct_perfect
    `;
        const [topStudents, bottomStudents, topAttempts, topMistakes] = yield Promise.all([
            prisma.$queryRawUnsafe(`${studentSelect} ${studentBase} ORDER BY avg_wrong ASC  NULLS LAST LIMIT 10`),
            prisma.$queryRawUnsafe(`${studentSelect} ${studentBase} ORDER BY avg_wrong DESC NULLS LAST LIMIT 10`),
            prisma.$queryRawUnsafe(`${passageSelect} ${passageBase} ORDER BY attempts   DESC LIMIT 10`),
            prisma.$queryRawUnsafe(`${passageSelect} ${passageBase} ORDER BY avg_wrong  DESC NULLS LAST LIMIT 10`),
        ]);
        const mapStudent = (r, i) => ({
            rank: i + 1,
            student_id: r.student_id,
            username: r.username,
            nickname: r.nickname,
            plan: r.plan,
            sessions: Number(r.sessions),
            avg_wrong: r.avg_wrong !== null ? Number(r.avg_wrong) : null,
            pct_perfect: r.pct_perfect !== null ? Number(r.pct_perfect) : null,
            last_active: r.last_active,
        });
        const mapPassage = (r, i) => ({
            rank: i + 1,
            passage_id: r.passage_id,
            title: r.title,
            author: r.author,
            attempts: Number(r.attempts),
            students: Number(r.students),
            avg_wrong: r.avg_wrong !== null ? Number(r.avg_wrong) : null,
            pct_perfect: r.pct_perfect !== null ? Number(r.pct_perfect) : null,
        });
        res.json({
            meta: {
                teacher_username: teacher.username,
                school_name: teacher.school_name,
                generated_at: new Date().toISOString(),
                range,
                plan,
            },
            top_students: topStudents.map(mapStudent),
            bottom_students: bottomStudents.map(mapStudent),
            top_passages_attempts: topAttempts.map(mapPassage),
            top_passages_mistakes: topMistakes.map(mapPassage),
        });
    }
    catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ── Analytics endpoint ───────────────────────────────────────────────────────
app.get('/api/analytics', authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const range = req.query.range || 'all';
        const passageId = req.query.passage_id || 'all';
        // Whitelist date range → SQL fragment
        const dateFilter = {
            '7': "pr.tested_date >= NOW() - INTERVAL '7 days'",
            '30': "pr.tested_date >= NOW() - INTERVAL '30 days'",
            '90': "pr.tested_date >= NOW() - INTERVAL '90 days'",
            'all': '1=1',
        };
        const dateWhere = (_a = dateFilter[range]) !== null && _a !== void 0 ? _a : '1=1';
        // Validate passage filter (must be integer or 'all')
        const parsedPassage = parseInt(passageId);
        const passageWhere = (!isNaN(parsedPassage) && passageId !== 'all')
            ? `AND p.passage_id = ${parsedPassage}` : '';
        const [passages, questionTypes, dayOfWeek, hourOfDay] = yield Promise.all([
            // 1. Per-passage stats
            prisma.$queryRawUnsafe(`SELECT p.passage_id, p.title, p.author,
                count(pr.practice_record_id)                                        AS attempts,
                count(DISTINCT pr.student_id)                                       AS students,
                ROUND(AVG(pr.wrong_count)::numeric, 1)                             AS avg_wrong,
                ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)
                      / NULLIF(count(*), 0), 1)                                    AS pct_perfect,
                ROUND(AVG(pr.duration)::numeric, 0)                                AS avg_duration
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         WHERE ${dateWhere} ${passageWhere}
         GROUP BY p.passage_id, p.title, p.author
         ORDER BY attempts DESC`),
            // 2. Question type breakdown
            prisma.$queryRawUnsafe(`SELECT qr.type,
                count(pr.practice_record_id)           AS attempts,
                ROUND(AVG(pr.wrong_count)::numeric, 2) AS avg_wrong
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         WHERE ${dateWhere} ${passageWhere}
         GROUP BY qr.type
         ORDER BY avg_wrong DESC NULLS LAST`),
            // 3. Day of week (HKT = UTC+8, no DST)
            prisma.$queryRawUnsafe(`SELECT EXTRACT(DOW FROM (pr.tested_date + INTERVAL '8 hours'))::int AS dow,
                count(*) AS attempts
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         WHERE ${dateWhere} ${passageWhere}
         GROUP BY dow
         ORDER BY dow`),
            // 4. Hour of day (HKT)
            prisma.$queryRawUnsafe(`SELECT EXTRACT(HOUR FROM (pr.tested_date + INTERVAL '8 hours'))::int AS hour,
                count(*) AS attempts
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         WHERE ${dateWhere} ${passageWhere}
         GROUP BY hour
         ORDER BY hour`),
        ]);
        // Fill missing hours (0-23) and days (0-6) with 0
        const hourMap = new Map(hourOfDay.map(r => [r.hour, Number(r.attempts)]));
        const dowMap = new Map(dayOfWeek.map(r => [r.dow, Number(r.attempts)]));
        const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        res.json({
            passages: passages.map(p => ({
                passage_id: p.passage_id,
                title: p.title,
                author: p.author,
                attempts: Number(p.attempts),
                students: Number(p.students),
                avg_wrong: p.avg_wrong !== null ? Number(p.avg_wrong) : null,
                pct_perfect: p.pct_perfect !== null ? Number(p.pct_perfect) : null,
                avg_duration: p.avg_duration !== null ? Number(p.avg_duration) : null,
            })),
            question_types: questionTypes.map(q => ({
                type: q.type,
                attempts: Number(q.attempts),
                avg_wrong: q.avg_wrong !== null ? Number(q.avg_wrong) : null,
            })),
            day_of_week: DOW_NAMES.map((name, i) => {
                var _a;
                return ({
                    dow: i, name, attempts: (_a = dowMap.get(i)) !== null && _a !== void 0 ? _a : 0,
                });
            }),
            hour_of_day: Array.from({ length: 24 }, (_, h) => {
                var _a;
                return ({
                    hour: h, attempts: (_a = hourMap.get(h)) !== null && _a !== void 0 ? _a : 0,
                });
            }),
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Passage list for analytics dropdown
app.get('/api/analytics/passages', authenticateToken, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const passages = yield prisma.$queryRaw `
      SELECT passage_id, title, author FROM passage ORDER BY passage_id
    `;
        res.json(passages);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ── Dashboard endpoints ──────────────────────────────────────────────────────
// Summary stats for dashboard home
app.get('/api/dashboard/summary', authenticateToken, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prisma.$queryRaw `
      SELECT
        (SELECT count(*) FROM student)                                                         AS total_students,
        (SELECT count(DISTINCT student_id) FROM practice_record
           WHERE tested_date >= NOW() - INTERVAL '7 days')                                    AS active_this_week,
        (SELECT ROUND(AVG(wrong_count)::numeric, 1)
           FROM practice_record WHERE tested_date >= NOW() - INTERVAL '7 days')               AS avg_wrong_count,
        (SELECT count(*) FROM practice_record
           WHERE tested_date >= NOW() - INTERVAL '7 days')                                    AS total_sessions
    `;
        const r = rows[0];
        res.json({
            total_students: Number(r.total_students),
            active_this_week: Number(r.active_this_week),
            avg_wrong_count: r.avg_wrong_count !== null ? Number(r.avg_wrong_count) : null,
            total_sessions: Number(r.total_sessions),
        });
    }
    catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Recent activity feed (last 20 practice records)
app.get('/api/dashboard/recent-activity', authenticateToken, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prisma.$queryRaw `
      SELECT
        pr.practice_record_id,
        pr.tested_date,
        pr.wrong_count,
        pr.duration,
        s.username,
        s.nickname,
        p.title AS passage_title,
        qr.type  AS question_type
      FROM practice_record pr
      JOIN student          s  ON s.student_id   = pr.student_id
      JOIN question_registry qr ON qr.question_id = pr.question_id
      JOIN passage           p  ON p.passage_id   = qr.passage_id
      ORDER BY pr.tested_date DESC
      LIMIT 20
    `;
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Top passages by attempt count this week
app.get('/api/dashboard/top-passages', authenticateToken, (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rows = yield prisma.$queryRaw `
      SELECT
        p.passage_id,
        p.title,
        count(pr.practice_record_id)           AS attempt_count,
        ROUND(AVG(pr.wrong_count)::numeric, 1) AS avg_wrong_count
      FROM practice_record pr
      JOIN question_registry qr ON qr.question_id = pr.question_id
      JOIN passage           p  ON p.passage_id   = qr.passage_id
      WHERE pr.tested_date >= NOW() - INTERVAL '7 days'
      GROUP BY p.passage_id, p.title
      ORDER BY attempt_count DESC
      LIMIT 5
    `;
        res.json(rows.map(r => ({
            passage_id: r.passage_id,
            title: r.title,
            attempt_count: Number(r.attempt_count),
            avg_wrong_count: r.avg_wrong_count !== null ? Number(r.avg_wrong_count) : null,
        })));
    }
    catch (error) {
        console.error('Error fetching top passages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// ────────────────────────────────────────────────────────────────────────────
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.$connect();
        app.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to connect to the database or start server:', error);
        yield prisma.$disconnect();
        process.exit(1);
    }
});
startServer();
process.on('beforeExit', () => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
