import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool) as any;
const prisma = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  // Create 10 plans
  for (let i = 1; i <= 10; i++) {
    await prisma.plan.create({
      data: {
        plan_name: `Plan ${i}`,
        freeorpremiumorschool: 'free',
      },
    });
  }

  // Create 10 students
  const plans = await prisma.plan.findMany();
  for (let i = 1; i <= 10; i++) {
    const randomPlan = plans[Math.floor(Math.random() * plans.length)];
    await prisma.student.create({
      data: {
        username: `student${i}`,
        nickname: `Student ${i}`,
        plan_id: randomPlan.plan_id,
      },
    });
  }

  // Create 10 question_info records
  for (let i = 1; i <= 10; i++) {
    await prisma.questionInfo.create({
      data: {
        table_name: 'multiple_choice',
        type: 'multiple_choice',
      },
    });
  }

  // Create 10 question_record entries
  const students = await prisma.student.findMany();
  const questions = await prisma.questionInfo.findMany();
  for (let i = 1; i <= 10; i++) {
    const randomStudent = students[Math.floor(Math.random() * students.length)];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    await prisma.questionRecord.create({
      data: {
        student_id: randomStudent.student_id,
        questions_id: randomQuestion.question_id,
        is_correct: Math.random() > 0.5,
        tested_date: new Date(),
      },
    });
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });