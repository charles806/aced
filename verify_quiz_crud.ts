import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './app/generated/prisma/client.js';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }) });
async function main(){
  // Find a user
  const user = await prisma.$queryRawUnsafe(`SELECT id FROM "RadonUser" LIMIT 1`);
  console.log('user', user);
  if (!user || user.length ===0){ console.log('No user'); process.exit(0); }
  const userId = user[0].id;
  // Find a note
  const note = await prisma.$queryRawUnsafe(`SELECT id FROM "Note" WHERE "userId"='${userId}' LIMIT 1`);
  console.log('note', note);
  const sourceNoteId = note && note.length ? note[0].id : null;
  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Test Quiz '+Date.now(),
      difficulty: 'easy',
      questionCount: 2,
      userId,
      sourceNoteId,
    }
  });
  console.log('quiz created', quiz.id);
  // Create questions
  await prisma.quizQuestion.createMany({
    data: [
      { quizId: quiz.id, prompt: 'Q1?', options: ['a','b','c'], correctIndex:0, position:0 },
      { quizId: quiz.id, prompt: 'Q2?', options: ['x','y','z'], correctIndex:1, position:1 },
    ]
  });
  const qCount = await prisma.quizQuestion.count({ where:{ quizId: quiz.id }});
  console.log('questions count', qCount);
  // Create attempt
  const deadline = new Date(Date.now()+60*60*1000);
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId,
      status: 'in_progress',
      deadline,
    }
  });
  console.log('attempt created', attempt.id);
  // Create answers
  const questions = await prisma.quizQuestion.findMany({ where:{ quizId: quiz.id }});
  for (const q of questions){
    await prisma.quizAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: q.id,
        selectedIndex: 0,
      }
    });
  }
  const ansCount = await prisma.quizAnswer.count({ where:{ attemptId: attempt.id }});
  console.log('answers count', ansCount);
  // Update attempt
  await prisma.quizAttempt.update({
    where:{ id: attempt.id },
    data:{ status:'submitted', score: 1, correctCount:1, incorrectCount:1, unansweredCount:0, submittedAt: new Date() }
  });
  const finalAttempt = await prisma.quizAttempt.findUnique({ where:{ id: attempt.id }});
  console.log('final attempt', finalAttempt);
  // Cleanup
  await prisma.quiz.delete({ where:{ id: quiz.id }});
  console.log('cleanup done');
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
