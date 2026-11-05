import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './app/generated/prisma/client.js';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }) });
async function main(){
  const user = await prisma.$queryRawUnsafe(`SELECT id FROM "RadonUser" LIMIT 1`);
  const userId = user[0].id;
  const quiz = await prisma.quiz.create({ data:{ title:'cascade test', difficulty:'easy', questionCount:1, userId }});
  const q = await prisma.quizQuestion.create({ data:{ quizId: quiz.id, prompt:'p', options:['a'], correctIndex:0, position:0 }});
  const attempt = await prisma.quizAttempt.create({ data:{ quizId: quiz.id, userId, status:'in_progress', deadline:new Date(Date.now()+3600000) }});
  await prisma.quizAnswer.create({ data:{ attemptId: attempt.id, questionId: q.id, selectedIndex:0 }});
  // Delete quiz
  await prisma.quiz.delete({ where:{ id: quiz.id }});
  const qLeft = await prisma.quizQuestion.count({ where:{ quizId: quiz.id }});
  const aLeft = await prisma.quizAttempt.count({ where:{ quizId: quiz.id }});
  console.log('questions left', qLeft, 'attempts left', aLeft);
  await prisma.$disconnect();
}
main();
