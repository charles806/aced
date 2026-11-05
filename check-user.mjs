import { prisma } from './app/lib/auth';
async function main() {
  const users = await prisma.radonUser.findMany({ take: 1 });
  console.log(users.map(u=>u.id));
}
main().then(()=>process.exit());
