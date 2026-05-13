import express, { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production';

app.use(cors());
app.use(express.json());

// JWT verification middleware
interface AuthRequest extends Request {
  teacher?: {
    teacher_id: number;
    username: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { teacher_id: number; username: string };
    req.teacher = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Teacher login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const rows = await prisma.$queryRaw<Array<{ teacher_id: number; username: string; password_hash: string; email: string | null; school_id: number }>>`
      SELECT teacher_id, username, password_hash, email, school_id FROM teacher WHERE username = ${username} LIMIT 1
    `;
    const teacher = rows[0] ?? null;

    if (!teacher) {
      return res.status(401).json({ error: 'Wrong username and/or password.' });
    }

    if (!teacher.password_hash) {
      return res.status(401).json({ error: 'Wrong username and/or password.' });
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, teacher.password_hash);
    } catch {
      // Malformed / non-bcrypt hash in DB — treat as invalid login, not 500
      return res.status(401).json({ error: 'Wrong username and/or password.' });
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Wrong username and/or password.' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        teacher_id: teacher.teacher_id,
        username: teacher.username,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    res.json({ 
      success: true,
      token: token,
      teacher_id: teacher.teacher_id,
      username: teacher.username 
    });
  } catch (error) {
    console.error('Login error', {
      username: req.body?.username ?? null,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      prismaCode:
        error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    });

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
    }

    // P1000 = DB auth failed; P1001 = can't reach server; P1017 = connection closed;
    // P2021 = table does not exist — all are infra/schema issues, not bad user credentials
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1000', 'P1001', 'P1017', 'P2021'].includes(error.code)
    ) {
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example protected route (you can add more protected routes as needed)
app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ teacher_id: number; username: string; email: string | null; school_id: number }>>`
      SELECT teacher_id, username, email, school_id FROM teacher WHERE teacher_id = ${req.teacher?.teacher_id} LIMIT 1
    `;
    const teacher = rows[0] ?? null;

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get full teacher profile (teacher + teacher_personal_info)
app.get('/api/settings/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.teacher_id;
    const rows = await prisma.$queryRaw<Array<{
      teacher_id: number; username: string; email: string | null;
      firstname: string | null; surname: string | null;
      tel: string | null; school: string | null; subject: string | null;
    }>>`
      SELECT t.teacher_id, t.username, t.email,
             p.firstname::text AS firstname, p.surname, p.tel, p.school, p.subject
      FROM teacher t
      LEFT JOIN teacher_personal_info p ON p.teacher_id = t.teacher_id
      WHERE t.teacher_id = ${teacherId}
      LIMIT 1
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update teacher profile (UPSERT teacher_personal_info)
app.put('/api/settings/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.teacher_id;
    const { firstname, surname, tel, email, school, subject } = req.body as Record<string, string>;

    await prisma.$executeRaw`
      INSERT INTO teacher_personal_info (teacher_id, firstname, surname, tel, email, school, subject)
      VALUES (${teacherId}, ${firstname ?? null}::"char", ${surname ?? null},
              ${tel ?? null}, ${email ?? null}, ${school ?? null}, ${subject ?? null})
      ON CONFLICT (teacher_id) DO UPDATE SET
        firstname  = EXCLUDED.firstname,
        surname    = EXCLUDED.surname,
        tel        = EXCLUDED.tel,
        email      = EXCLUDED.email,
        school     = EXCLUDED.school,
        subject    = EXCLUDED.subject
    `;
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
app.put('/api/settings/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.teacher_id;
    const { current_password, new_password } = req.body as { current_password: string; new_password: string };

    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Both current and new password are required' });
    if (new_password.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const pwRows = await prisma.$queryRaw<Array<{ password_hash: string }>>`
      SELECT password_hash FROM teacher WHERE teacher_id = ${teacherId} LIMIT 1
    `;
    const teacher = pwRows[0] ?? null;
    if (!teacher?.password_hash)
      return res.status(404).json({ error: 'Teacher not found' });

    const valid = await bcrypt.compare(current_password, teacher.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await prisma.$executeRaw`UPDATE teacher SET password_hash = ${hash} WHERE teacher_id = ${teacherId}`;

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get teacher data with school information (legacy — kept for compatibility)
app.get('/api/settings/school/:teacherId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    
    // Verify the teacher is accessing their own data
    if (req.teacher?.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tRows = await prisma.$queryRaw<Array<{ teacher_id: number; username: string; email: string | null; school_id: number }>>`
      SELECT teacher_id, username, email, school_id FROM teacher WHERE teacher_id = ${teacherId} LIMIT 1
    `;
    const teacher = tRows[0] ?? null;

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Get school name using raw query since we need to join with school table
    const schoolResult = await prisma.$queryRaw<Array<{ school: string }>>`
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
  } catch (error) {
    console.error('Error fetching teacher settings data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Students endpoints ───────────────────────────────────────────────────────

// Paginated, searchable, sortable student list
app.get('/api/students', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const search = (req.query.search as string) || '';
    const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const like   = `%${search}%`;

    // Whitelist sort columns to prevent SQL injection
    const SORT_COLS: Record<string, string> = {
      username:       's.username',
      nickname:       'COALESCE(s.nickname, \'\')',
      plan:           'COALESCE(p.value, \'\')',
      register_date:  's.register_date',
      total_sessions: 'total_sessions',
      last_active:    'last_active',
    };
    const sortParam  = (req.query.sort  as string) || 'username';
    const orderParam = (req.query.order as string) === 'desc' ? 'DESC' : 'ASC';
    const sortCol    = SORT_COLS[sortParam] ?? SORT_COLS['username'];
    const nullsClause = (sortParam === 'last_active' || sortParam === 'total_sessions')
      ? (orderParam === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST')
      : '';

    const [countRows, students] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM student
        WHERE username ILIKE ${like} OR COALESCE(nickname, '') ILIKE ${like}
      `,
      prisma.$queryRawUnsafe<Array<{
        student_id: number;
        username: string;
        nickname: string | null;
        register_date: Date;
        plan: string | null;
        total_sessions: bigint;
        last_active: Date | null;
      }>>(
        `SELECT
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
        LIMIT $2 OFFSET $3`,
        like, limit, offset
      ),
    ]);

    const total = Number(countRows[0].count);
    res.json({
      students: students.map(s => ({
        ...s,
        total_sessions: Number(s.total_sessions),
      })),
      total,
      page,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Paginated most/least active students, filterable by class
app.get('/api/students/extremes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const classId    = (req.query.class_id    as string) || 'all';
    const range      = (req.query.range       as string) || 'all';
    const topPage    = Math.max(1, parseInt((req.query.top_page    as string) || '1') || 1);
    const bottomPage = Math.max(1, parseInt((req.query.bottom_page as string) || '1') || 1);
    const limit      = 5;
    const topOffset    = (topPage    - 1) * limit;
    const bottomOffset = (bottomPage - 1) * limit;

    const parsedClass = parseInt(classId);
    const validClass  = !isNaN(parsedClass) && classId !== 'all';
    const classJoin   = validClass ? 'JOIN student_personal_info spi ON spi.student_id = s.student_id' : '';
    const classWhere  = validClass ? `AND spi.class_id = ${parsedClass}` : '';

    const dateOnClause: Record<string, string> = {
      '7':  "AND pr.tested_date >= NOW() - INTERVAL '7 days'",
      '30': "AND pr.tested_date >= NOW() - INTERVAL '30 days'",
      '90': "AND pr.tested_date >= NOW() - INTERVAL '90 days'",
      'all': '',
    };
    const dateOn = dateOnClause[range] ?? '';

    type ExtremeRow = {
      student_id: number; username: string; nickname: string | null;
      plan: string | null; questions_answered: bigint;
    };
    type CountRow = { total: bigint };

    const baseQuery = (order: 'DESC' | 'ASC', offset: number) =>
      `SELECT s.student_id, s.username, s.nickname, p.value AS plan,
              count(pr.practice_record_id) AS questions_answered
       FROM student s
       LEFT JOIN plan            p  ON p.plan_id    = s.plan_id
       LEFT JOIN practice_record pr ON pr.student_id = s.student_id ${dateOn}
       ${classJoin}
       WHERE 1=1 ${classWhere}
       GROUP BY s.student_id, s.username, s.nickname, p.value
       HAVING count(pr.practice_record_id) > 0
       ORDER BY questions_answered ${order}, s.student_id ${order}
       LIMIT ${limit} OFFSET ${offset}`;

    const countQuery =
      `SELECT count(*) AS total
       FROM (
         SELECT s.student_id
         FROM student s
         LEFT JOIN practice_record pr ON pr.student_id = s.student_id ${dateOn}
         ${classJoin}
         WHERE 1=1 ${classWhere}
         GROUP BY s.student_id
         HAVING count(pr.practice_record_id) > 0
       ) sub`;

    const [top, bottom, countRows] = await Promise.all([
      prisma.$queryRawUnsafe<ExtremeRow[]>(baseQuery('DESC', topOffset)),
      prisma.$queryRawUnsafe<ExtremeRow[]>(baseQuery('ASC',  bottomOffset)),
      prisma.$queryRawUnsafe<CountRow[]>(countQuery),
    ]);

    const map = (r: ExtremeRow) => ({
      student_id:         r.student_id,
      username:           r.username,
      nickname:           r.nickname,
      plan:               r.plan,
      questions_answered: Number(r.questions_answered),
    });

    res.json({
      top:    top.map(map),
      bottom: bottom.map(map),
      total:  Number(countRows[0]?.total ?? 0),
    });
  } catch (error) {
    console.error('Error fetching student extremes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student performance chart data (separate endpoint so chart filters don't reload the whole page)
app.get('/api/students/:id/performance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) return res.status(400).json({ error: 'Invalid student ID' });

    const range   = (req.query.range    as string) || '30';
    const groupBy = (req.query.group_by as string) || 'daily';

    const dateFilter: Record<string, string> = {
      '10': "tested_date >= NOW() - INTERVAL '10 days'",
      '30': "tested_date >= NOW() - INTERVAL '30 days'",
      '90': "tested_date >= NOW() - INTERVAL '90 days'",
      'all': '1=1',
    };
    const dateWhere = dateFilter[range] ?? dateFilter['30'];

    // Whitelisted period truncation expressions (HKT = UTC+8)
    const periodExpr: Record<string, string> = {
      daily:   "DATE(tested_date + INTERVAL '8 hours')",
      weekly:  "DATE_TRUNC('week',  (tested_date + INTERVAL '8 hours'))::date",
      monthly: "DATE_TRUNC('month', (tested_date + INTERVAL '8 hours'))::date",
    };
    const expr = periodExpr[groupBy] ?? periodExpr['daily'];

    const rows = await prisma.$queryRawUnsafe<Array<{
      period: Date; avg_wrong: number | null; sessions: bigint;
    }>>(
      `SELECT ${expr}                                    AS period,
              ROUND(AVG(wrong_count)::numeric, 1)       AS avg_wrong,
              count(*)                                   AS sessions
       FROM practice_record
       WHERE student_id = $1 AND ${dateWhere}
       GROUP BY period
       ORDER BY period ASC`,
      studentId
    );

    res.json(rows.map(r => ({
      period:    r.period,
      avg_wrong: r.avg_wrong !== null ? Number(r.avg_wrong) : null,
      sessions:  Number(r.sessions),
    })));
  } catch (error) {
    console.error('Error fetching student performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Single student detail
app.get('/api/students/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) return res.status(400).json({ error: 'Invalid student ID' });

    const [studentRows, history, dailyPerf, coverageRows, statsRows] = await Promise.all([
      // Student info
      prisma.$queryRaw<Array<{
        student_id: number; username: string; nickname: string | null;
        register_date: Date; plan: string | null;
      }>>`
        SELECT s.student_id, s.username, s.nickname, s.register_date, p.value AS plan
        FROM student s LEFT JOIN plan p ON p.plan_id = s.plan_id
        WHERE s.student_id = ${studentId}
        LIMIT 1
      `,
      // Practice history (last 50)
      prisma.$queryRaw<Array<{
        practice_record_id: number; tested_date: Date;
        wrong_count: number; duration: number | null;
        passage_title: string; question_type: string;
      }>>`
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
      prisma.$queryRaw<Array<{ day: Date; avg_wrong: number; sessions: bigint }>>`
        SELECT DATE(tested_date) AS day,
               ROUND(AVG(wrong_count)::numeric, 1) AS avg_wrong,
               count(*) AS sessions
        FROM practice_record
        WHERE student_id = ${studentId}
          AND tested_date >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day ASC
      `,
      // Passage coverage
      prisma.$queryRaw<Array<{ passages_attempted: bigint; total_passages: bigint }>>`
        SELECT
          (SELECT count(DISTINCT qr.passage_id)
           FROM practice_record pr
           JOIN question_registry qr ON qr.question_id = pr.question_id
           WHERE pr.student_id = ${studentId}) AS passages_attempted,
          (SELECT count(*) FROM passage)        AS total_passages
      `,
      // Total time + last online
      prisma.$queryRaw<Array<{ total_time: number; last_online: Date | null }>>`
        SELECT COALESCE(SUM(duration), 0)::float8 AS total_time,
               MAX(tested_date)                   AS last_online
        FROM practice_record
        WHERE student_id = ${studentId}
      `,
    ]);

    if (studentRows.length === 0) return res.status(404).json({ error: 'Student not found' });

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
      total_time: Number(statsRows[0]?.total_time ?? 0),
      last_online: statsRows[0]?.last_online ?? null,
    });
  } catch (error) {
    console.error('Error fetching student detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Passage performance for a student
app.get('/api/students/:id/passages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) return res.status(400).json({ error: 'Invalid student ID' });

    const rows = await prisma.$queryRaw<Array<{
      passage_id: number; title: string;
      attempts: bigint; avg_wrong: number | null;
      pct_perfect: number | null; total_time: number;
    }>>`
      SELECT p.passage_id,
             p.title,
             count(pr.practice_record_id) AS attempts,
             ROUND(AVG(pr.wrong_count)::numeric, 2) AS avg_wrong,
             ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)::numeric
                         / NULLIF(count(pr.practice_record_id), 0), 1) AS pct_perfect,
             COALESCE(SUM(pr.duration), 0)::float8 AS total_time
      FROM practice_record pr
      JOIN question_registry qr ON qr.question_id = pr.question_id
      JOIN passage p ON p.passage_id = qr.passage_id
      WHERE pr.student_id = ${studentId}
      GROUP BY p.passage_id, p.title
      ORDER BY avg_wrong DESC NULLS LAST, attempts DESC
    `;

    res.json(rows.map(r => ({
      passage_id:  r.passage_id,
      title:       r.title,
      attempts:    Number(r.attempts),
      avg_wrong:   r.avg_wrong  !== null ? Number(r.avg_wrong)  : null,
      pct_perfect: r.pct_perfect !== null ? Number(r.pct_perfect) : null,
      total_time:  Number(r.total_time),
    })));
  } catch (error) {
    console.error('Error fetching student passages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Question-level performance for a specific passage and student
app.get('/api/students/:id/passages/:passage_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const passageId = parseInt(req.params.passage_id);
    if (isNaN(studentId) || isNaN(passageId)) return res.status(400).json({ error: 'Invalid ID' });

    const rows = await prisma.$queryRaw<Array<{
      question_id: string; type: string; question_text: string | null;
      attempts: bigint; avg_wrong: number | null; pct_perfect: number | null;
    }>>`
      SELECT qr.question_id,
             qr.type,
             COALESCE(
               mc.question,
               w.value,
               ss.value,
               s.value,
               pg.value,
               tq.question
             ) AS question_text,
             count(pr.practice_record_id) AS attempts,
             ROUND(AVG(pr.wrong_count)::numeric, 2) AS avg_wrong,
             ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)::numeric
                         / NULLIF(count(pr.practice_record_id), 0), 1) AS pct_perfect
      FROM practice_record pr
      JOIN question_registry qr ON qr.question_id = pr.question_id
      LEFT JOIN multiple_choice      mc ON mc.question_id = qr.question_id
      LEFT JOIN word                 w  ON w.question_id  = qr.question_id
      LEFT JOIN short_sentence       ss ON ss.question_id = qr.question_id
      LEFT JOIN sentence             s  ON s.question_id  = qr.question_id
      LEFT JOIN paragraph            pg ON pg.question_id = qr.question_id
      LEFT JOIN translation_question tq ON tq.question_id = qr.question_id
      WHERE pr.student_id = ${studentId}
        AND qr.passage_id = ${passageId}
      GROUP BY qr.question_id, qr.type,
               mc.question, w.value, ss.value, s.value, pg.value, tq.question
      ORDER BY avg_wrong DESC NULLS LAST, attempts DESC
    `;

    res.json(rows.map(r => ({
      question_id:   r.question_id,
      type:          r.type,
      question_text: r.question_text,
      attempts:      Number(r.attempts),
      avg_wrong:     r.avg_wrong   !== null ? Number(r.avg_wrong)   : null,
      pct_perfect:   r.pct_perfect !== null ? Number(r.pct_perfect) : null,
    })));
  } catch (error) {
    console.error('Error fetching question performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Reports endpoint ─────────────────────────────────────────────────────────

app.get('/api/reports/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const range = (req.query.range as string) || '30';
    const plan  = (req.query.plan  as string) || 'all';

    const dateFilter: Record<string, string> = {
      '7':  "pr.tested_date >= NOW() - INTERVAL '7 days'",
      '30': "pr.tested_date >= NOW() - INTERVAL '30 days'",
      '90': "pr.tested_date >= NOW() - INTERVAL '90 days'",
      'all': '1=1',
    };
    const dateWhere = dateFilter[range] ?? '1=1';

    // Plan filter for student-level queries
    const planWhere = plan === 'free'    ? "AND (p.value = 'free' OR s.plan_id IS NULL)"
                    : plan === 'premium' ? "AND p.value = 'premium'"
                    : '';

    // Teacher + school
    const teacherRows = await prisma.$queryRaw<Array<{
      username: string; school_name: string | null;
    }>>`
      SELECT t.username,
             (SELECT sc.value FROM school sc WHERE sc.school_id = t.school_id LIMIT 1) AS school_name
      FROM teacher t
      WHERE t.teacher_id = ${req.teacher!.teacher_id}
      LIMIT 1
    `;
    const teacher = teacherRows[0] ?? { username: 'admin', school_name: null };

    type StudentRow = {
      student_id: number; username: string; nickname: string | null;
      plan: string | null; sessions: bigint;
      avg_wrong: number | null; pct_perfect: number | null; last_active: Date | null;
    };
    type PassageRow = {
      passage_id: number; title: string; author: string | null;
      attempts: bigint; students: bigint;
      avg_wrong: number | null; pct_perfect: number | null;
    };

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

    const [topStudents, bottomStudents, topAttempts, topMistakes] = await Promise.all([
      prisma.$queryRawUnsafe<StudentRow[]>(
        `${studentSelect} ${studentBase} ORDER BY avg_wrong ASC  NULLS LAST LIMIT 10`),
      prisma.$queryRawUnsafe<StudentRow[]>(
        `${studentSelect} ${studentBase} ORDER BY avg_wrong DESC NULLS LAST LIMIT 10`),
      prisma.$queryRawUnsafe<PassageRow[]>(
        `${passageSelect} ${passageBase} ORDER BY attempts   DESC LIMIT 10`),
      prisma.$queryRawUnsafe<PassageRow[]>(
        `${passageSelect} ${passageBase} ORDER BY avg_wrong  DESC NULLS LAST LIMIT 10`),
    ]);

    const mapStudent = (r: StudentRow, i: number) => ({
      rank: i + 1,
      student_id: r.student_id,
      username:   r.username,
      nickname:   r.nickname,
      plan:       r.plan,
      sessions:   Number(r.sessions),
      avg_wrong:  r.avg_wrong  !== null ? Number(r.avg_wrong)  : null,
      pct_perfect: r.pct_perfect !== null ? Number(r.pct_perfect) : null,
      last_active: r.last_active,
    });
    const mapPassage = (r: PassageRow, i: number) => ({
      rank: i + 1,
      passage_id: r.passage_id,
      title:      r.title,
      author:     r.author,
      attempts:   Number(r.attempts),
      students:   Number(r.students),
      avg_wrong:  r.avg_wrong  !== null ? Number(r.avg_wrong)  : null,
      pct_perfect: r.pct_perfect !== null ? Number(r.pct_perfect) : null,
    });

    res.json({
      meta: {
        teacher_username: teacher.username,
        school_name:      teacher.school_name,
        generated_at:     new Date().toISOString(),
        range,
        plan,
      },
      top_students:          topStudents.map(mapStudent),
      bottom_students:       bottomStudents.map(mapStudent),
      top_passages_attempts: topAttempts.map(mapPassage),
      top_passages_mistakes: topMistakes.map(mapPassage),
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Analytics endpoint ───────────────────────────────────────────────────────

app.get('/api/analytics', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const range     = (req.query.range      as string) || 'all';
    const passageId = (req.query.passage_id as string) || 'all';

    // Whitelist date range → SQL fragment
    const dateFilter: Record<string, string> = {
      '7':  "pr.tested_date >= NOW() - INTERVAL '7 days'",
      '30': "pr.tested_date >= NOW() - INTERVAL '30 days'",
      '90': "pr.tested_date >= NOW() - INTERVAL '90 days'",
      'all': '1=1',
    };
    const dateWhere = dateFilter[range] ?? '1=1';

    // Validate passage filter (must be integer or 'all')
    const parsedPassage = parseInt(passageId);
    const passageWhere  = (!isNaN(parsedPassage) && passageId !== 'all')
      ? `AND p.passage_id = ${parsedPassage}` : '';

    const classId    = (req.query.class_id as string) || 'all';
    const parsedClass = parseInt(classId);
    const validClass  = !isNaN(parsedClass) && classId !== 'all';
    const classJoin   = validClass ? 'JOIN student_personal_info spi ON spi.student_id = s.student_id' : '';
    const classWhere  = validClass ? `AND spi.class_id = ${parsedClass}` : '';

    const [passages, questionTypes, dayOfWeek, hourOfDay] = await Promise.all([

      // 1. Per-passage stats
      prisma.$queryRawUnsafe<Array<{
        passage_id: number; title: string; author: string | null;
        attempts: bigint; students: bigint;
        avg_wrong: number | null; pct_perfect: number | null; avg_duration: number | null;
      }>>(
        `SELECT p.passage_id, p.title, p.author,
                count(pr.practice_record_id)                                        AS attempts,
                count(DISTINCT pr.student_id)                                       AS students,
                ROUND(AVG(pr.wrong_count)::numeric, 1)                             AS avg_wrong,
                ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)
                      / NULLIF(count(*), 0), 1)                                    AS pct_perfect,
                ROUND(AVG(pr.duration)::numeric, 0)                                AS avg_duration
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         JOIN student            s  ON s.student_id   = pr.student_id
         ${classJoin}
         WHERE ${dateWhere} ${passageWhere} ${classWhere}
         GROUP BY p.passage_id, p.title, p.author
         ORDER BY attempts DESC`
      ),

      // 2. Question type breakdown
      prisma.$queryRawUnsafe<Array<{
        type: string; attempts: bigint; avg_wrong: number | null;
      }>>(
        `SELECT qr.type,
                count(pr.practice_record_id)           AS attempts,
                ROUND(AVG(pr.wrong_count)::numeric, 2) AS avg_wrong
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         JOIN student            s  ON s.student_id   = pr.student_id
         ${classJoin}
         WHERE ${dateWhere} ${passageWhere} ${classWhere}
         GROUP BY qr.type
         ORDER BY avg_wrong DESC NULLS LAST`
      ),

      // 3. Day of week (HKT = UTC+8, no DST)
      prisma.$queryRawUnsafe<Array<{ dow: number; attempts: bigint }>>(
        `SELECT EXTRACT(DOW FROM (pr.tested_date + INTERVAL '8 hours'))::int AS dow,
                count(*) AS attempts
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         JOIN student            s  ON s.student_id   = pr.student_id
         ${classJoin}
         WHERE ${dateWhere} ${passageWhere} ${classWhere}
         GROUP BY dow
         ORDER BY dow`
      ),

      // 4. Hour of day (HKT)
      prisma.$queryRawUnsafe<Array<{ hour: number; attempts: bigint }>>(
        `SELECT EXTRACT(HOUR FROM (pr.tested_date + INTERVAL '8 hours'))::int AS hour,
                count(*) AS attempts
         FROM practice_record pr
         JOIN question_registry qr ON qr.question_id = pr.question_id
         JOIN passage            p  ON p.passage_id   = qr.passage_id
         JOIN student            s  ON s.student_id   = pr.student_id
         ${classJoin}
         WHERE ${dateWhere} ${passageWhere} ${classWhere}
         GROUP BY hour
         ORDER BY hour`
      ),
    ]);

    // Fill missing hours (0-23) and days (0-6) with 0
    const hourMap = new Map(hourOfDay.map(r => [r.hour, Number(r.attempts)]));
    const dowMap  = new Map(dayOfWeek.map(r => [r.dow,  Number(r.attempts)]));
    const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    res.json({
      passages: passages.map(p => ({
        passage_id:   p.passage_id,
        title:        p.title,
        author:       p.author,
        attempts:     Number(p.attempts),
        students:     Number(p.students),
        avg_wrong:    p.avg_wrong    !== null ? Number(p.avg_wrong)    : null,
        pct_perfect:  p.pct_perfect  !== null ? Number(p.pct_perfect)  : null,
        avg_duration: p.avg_duration !== null ? Number(p.avg_duration) : null,
      })),
      question_types: questionTypes.map(q => ({
        type:     q.type,
        attempts: Number(q.attempts),
        avg_wrong: q.avg_wrong !== null ? Number(q.avg_wrong) : null,
      })),
      day_of_week: DOW_NAMES.map((name, i) => ({
        dow: i, name, attempts: dowMap.get(i) ?? 0,
      })),
      hour_of_day: Array.from({ length: 24 }, (_, h) => ({
        hour: h, attempts: hourMap.get(h) ?? 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Passage list for analytics dropdown
app.get('/api/analytics/passages', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const passages = await prisma.$queryRaw<Array<{ passage_id: number; title: string; author: string | null }>>`
      SELECT passage_id, title, author FROM passage ORDER BY passage_id
    `;
    res.json(passages);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Class list for analytics class filter
app.get('/api/analytics/classes', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const classes = await prisma.$queryRaw<Array<{ class_id: number; value: string; grade: number }>>`
      SELECT class_id, value, grade FROM class ORDER BY grade, value
    `;
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Dashboard endpoints ──────────────────────────────────────────────────────

// Summary stats for dashboard home
app.get('/api/dashboard/summary', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{
      total_students: bigint;
      active_this_week: bigint;
      avg_wrong_count: number | null;
      total_sessions: bigint;
    }>>`
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
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent activity feed (last 20 practice records)
app.get('/api/dashboard/recent-activity', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{
      practice_record_id: number;
      tested_date: Date;
      wrong_count: number;
      duration: number | null;
      username: string;
      nickname: string | null;
      passage_title: string;
      question_type: string;
    }>>`
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
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top passages by attempt count this week
app.get('/api/dashboard/top-passages', authenticateToken, async (_req: AuthRequest, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{
      passage_id: number;
      title: string;
      attempt_count: bigint;
      avg_wrong_count: number | null;
    }>>`
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
  } catch (error) {
    console.error('Error fetching top passages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Top 20 questions with lowest accuracy, filterable by passage
app.get('/api/dashboard/question-accuracy', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const passageId     = (req.query.passage_id as string) || 'all';
    const parsedPassage = parseInt(passageId);
    const passageWhere  = (!isNaN(parsedPassage) && passageId !== 'all')
      ? `AND p.passage_id = ${parsedPassage}` : '';

    const rows = await prisma.$queryRawUnsafe<Array<{
      question_id: string; type: string;
      passage_id: number; passage_title: string;
      attempts: bigint; avg_wrong: number | null; pct_perfect: number | null;
    }>>(
      `SELECT qr.question_id, qr.type,
              p.passage_id, p.title AS passage_title,
              count(pr.practice_record_id)                                       AS attempts,
              ROUND(AVG(pr.wrong_count)::numeric, 2)                            AS avg_wrong,
              ROUND(100.0 * count(CASE WHEN pr.wrong_count = 0 THEN 1 END)
                    / NULLIF(count(*), 0), 1)                                   AS pct_perfect
       FROM practice_record pr
       JOIN question_registry qr ON qr.question_id = pr.question_id
       JOIN passage            p  ON p.passage_id   = qr.passage_id
       WHERE 1=1 ${passageWhere}
       GROUP BY qr.question_id, qr.type, p.passage_id, p.title
       HAVING count(pr.practice_record_id) >= 5
       ORDER BY pct_perfect ASC NULLS LAST, avg_wrong DESC NULLS LAST
       LIMIT 20`
    );

    res.json(rows.map(r => ({
      question_id:   r.question_id,
      type:          r.type,
      passage_id:    r.passage_id,
      passage_title: r.passage_title,
      attempts:      Number(r.attempts),
      avg_wrong:     r.avg_wrong   !== null ? Number(r.avg_wrong)   : null,
      pct_perfect:   r.pct_perfect !== null ? Number(r.pct_perfect) : null,
    })));
  } catch (error) {
    console.error('Error fetching question accuracy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ────────────────────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database or start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
