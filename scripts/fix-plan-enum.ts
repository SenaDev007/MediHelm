import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_5TK7YFxdoRlk@ep-rapid-leaf-ag0eyijw-pooler.c-2.eu-central-1.aws.neon.tech/MediHelm?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon PostgreSQL');

    // Current state:
    // - Pharmacie.plan is TEXT with default `'SEED'::"PlanType"` (still referencing old enum)
    // - Abonnement.plan is TEXT with no default
    // - PlanType enum has: SEED, GROW, LEAD, NETWORK, BLOOM, CROWN (both old and new)

    // Step 1: Update data in text columns first
    console.log('\n--- Updating data: GROW→BLOOM, LEAD→CROWN ---');
    const tables = ['Pharmacie', 'Abonnement'];
    for (const table of tables) {
      try {
        const r1 = await client.query(`UPDATE "${table}" SET plan = 'BLOOM' WHERE plan = 'GROW'`);
        const r2 = await client.query(`UPDATE "${table}" SET plan = 'CROWN' WHERE plan = 'LEAD'`);
        console.log(`  ${table}: ${r1.rowCount} GROW→BLOOM, ${r2.rowCount} LEAD→CROWN`);
      } catch (e: any) {
        console.log(`  ${table} error: ${e.message}`);
      }
    }

    // Step 2: Drop the default on Pharmacie.plan that references PlanType
    console.log('\n--- Dropping default on Pharmacie.plan ---');
    await client.query(`ALTER TABLE "Pharmacie" ALTER COLUMN "plan" DROP DEFAULT`);
    console.log('  Default dropped');

    // Step 3: Drop old PlanType enum
    console.log('\n--- Dropping old PlanType enum ---');
    await client.query(`DROP TYPE IF EXISTS "PlanType"`);
    console.log('  Dropped');

    // Step 4: Create new PlanType enum with correct values
    console.log('\n--- Creating new PlanType enum ---');
    await client.query(`CREATE TYPE "PlanType" AS ENUM ('SEED', 'BLOOM', 'CROWN', 'NETWORK')`);
    console.log('  Created with SEED, BLOOM, CROWN, NETWORK');

    // Step 5: Convert columns back to PlanType
    console.log('\n--- Converting columns back to PlanType ---');
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE "${table}" ALTER COLUMN "plan" TYPE "PlanType" USING plan::"PlanType"`);
        console.log(`  ${table}.plan converted to PlanType`);
      } catch (e: any) {
        console.log(`  ${table}.plan error: ${e.message}`);
      }
    }

    // Step 6: Set defaults
    console.log('\n--- Setting defaults ---');
    await client.query(`ALTER TABLE "Pharmacie" ALTER COLUMN "plan" SET DEFAULT 'SEED'::"PlanType"`);
    console.log('  Pharmacie.plan default → SEED');
    await client.query(`ALTER TABLE "Abonnement" ALTER COLUMN "plan" SET DEFAULT 'SEED'::"PlanType"`);
    console.log('  Abonnement.plan default → SEED');

    // Verify
    const finalEnum = await client.query(`
      SELECT enumlabel FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'PlanType'
      ORDER BY e.enumsortorder;
    `);
    console.log('\n✅ PlanType enum migration complete!');
    console.log('Final PlanType values:', finalEnum.rows.map(r => r.enumlabel));

    // Verify data
    for (const table of tables) {
      const dataRes = await client.query(`SELECT plan, count(*) FROM "${table}" GROUP BY plan`);
      console.log(`  ${table}.plan distribution:`, dataRes.rows);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
