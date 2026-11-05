import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './app/generated/prisma/client.js';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }) });
async function main(){
  const user = await prisma.$queryRawUnsafe(`SELECT id FROM "RadonUser" LIMIT 1`);
  const userId = user[0].id;
  const key = 'idem-'+Date.now();
  const q1 = await prisma.quiz.create({ data:{ title:'idem test', difficulty:'easy', questionCount:1, userId, idempotencyKey:key }});
  console.log('first', q1.id);
  const existing = await prisma.quiz.findFirst({ where:{ userId, idempotencyKey:key }});
  console.log('found', existing?.id, existing?.id===q1.id);
  // Try duplicate insert -> should violate unique constraint
  try {
    await prisma.quiz.create({ data:{ title:'idem test dup', difficulty:'easy', questionCount:1, userId, idempotencyKey:key }});
    console.log('duplicate allowed - BAD');
  } catch(e:any){
    console.log('duplicate rejected as expected', e.code);
  }
  await prisma.quiz.delete({ where:{ id: q1.id }});
  await prisma.$disconnect();
}
main();
