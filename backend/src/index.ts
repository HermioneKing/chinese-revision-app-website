import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool) as any;
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Student routes
app.get('/api/students', async (req, res) => {
  const students = await prisma.student.findMany();
  res.json(students);
});

// QuestionRecord routes
app.get('/api/question_records', async (req, res) => {
  const questionRecords = await prisma.questionRecord.findMany();
  res.json(questionRecords);
});

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
