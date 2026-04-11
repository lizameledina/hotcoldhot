import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_PRESETS = [
  {
    name: 'Новичок',
    hotDurationSec: 60,
    coldDurationSec: 15,
    breakDurationSec: 10,
    cyclesCount: 2,
    isSystem: true,
  },
  {
    name: 'Стандарт',
    hotDurationSec: 90,
    coldDurationSec: 30,
    breakDurationSec: 10,
    cyclesCount: 3,
    isSystem: true,
  },
  {
    name: 'Продвинутый',
    hotDurationSec: 120,
    coldDurationSec: 60,
    breakDurationSec: 0,
    cyclesCount: 5,
    isSystem: true,
  },
]

async function main() {
  console.log('Seeding system presets...')

  for (const preset of SYSTEM_PRESETS) {
    await prisma.preset.upsert({
      where: {
        // Use a unique combo — for system presets we match on name + isSystem
        id: `system_${preset.name}`,
      },
      update: {
        hotDurationSec: preset.hotDurationSec,
        coldDurationSec: preset.coldDurationSec,
        breakDurationSec: preset.breakDurationSec,
        cyclesCount: preset.cyclesCount,
      },
      create: {
        id: `system_${preset.name}`,
        ...preset,
        userId: null,
      },
    })
    console.log(`  ✓ ${preset.name}`)
  }

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
