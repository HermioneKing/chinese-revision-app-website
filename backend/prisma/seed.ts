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
  // Clear the database
  await prisma.studentGroupMapping.deleteMany();
  await prisma.questionRecord.deleteMany();
  await prisma.questionInfo.deleteMany();
  await prisma.student.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.group.deleteMany();
  await prisma.school.deleteMany();

  // Create a school
  const school = await prisma.school.create({
    data: {
      school: 'Demo School',
    },
  });

  // Create 2 groups
  const group1 = await prisma.group.create({
    data: {
      group_name: 'Class A',
      school_id: school.school_id,
    },
  });

  const group2 = await prisma.group.create({
    data: {
      group_name: 'Class B',
      school_id: school.school_id,
    },
  });

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

  // Assign students to groups
  const allStudents = await prisma.student.findMany();
  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];
    const group = i < 5 ? group1 : group2; // Assign first 5 to group1, rest to group2
    await prisma.studentGroupMapping.create({
      data: {
        student_id: student.student_id,
        group_id: group.group_id,
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