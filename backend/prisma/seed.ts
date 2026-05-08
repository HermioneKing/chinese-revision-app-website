import 'dotenv/config';

/**
 * dse12app_demo is introspected production-shaped data — do not mass-delete tables here.
 * Restore from backup / manage rows via SQL or admin tools instead.
 */
async function main() {
  console.log(
    'No-op seed: database is introspected from dse12app_demo (see prisma/schema.prisma). Skipping destructive seed.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {});
