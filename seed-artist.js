const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  const artist = await prisma.artist.upsert({
    where: { name: 'Jason Mraz' },
    update: {
      bio: 'Jason Thomas Mraz is an American singer-songwriter and guitarist. He rose to prominence with the release of his debut studio album, Waiting for My Rocket to Come.',
      imageUrl: 'https://i.scdn.co/image/ab6761610000e5ebb6bbfab27e3612cebd9ca688',
      socials: JSON.stringify({ instagram: 'jason_mraz', twitter: 'jason_mraz' })
    },
    create: {
      name: 'Jason Mraz',
      bio: 'Jason Thomas Mraz is an American singer-songwriter and guitarist. He rose to prominence with the release of his debut studio album, Waiting for My Rocket to Come.',
      imageUrl: 'https://i.scdn.co/image/ab6761610000e5ebb6bbfab27e3612cebd9ca688',
      socials: JSON.stringify({ instagram: 'jason_mraz', twitter: 'jason_mraz' })
    }
  });
  console.log('Created artist:', artist.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());
