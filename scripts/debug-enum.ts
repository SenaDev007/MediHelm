import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_5TK7YFxdoRlk@ep-rapid-leaf-ag0eyijw-pooler.c-2.eu-central-1.aws.neon.tech/MediHelm?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon PostgreSQL');

    // Debug: List all custom enum types
    const enumRes = await client.query(`
      SELECT t.typname, e.enumlabel, e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND t.typname = 'PlanType'
      ORDER BY t.typname, e.enumsortorder;
    `);
    console.log('PlanType enum values:', enumRes.rows);

    // Debug: Find ALL columns with 'plan' in the name across all tables
    const planCols = await client.query(`
      SELECT c.relname AS table_name, a.attname AS column_name, 
             t.typname AS type_name, pg_get_expr(d.adbin, d.adrelid) AS col_default
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_type t ON a.atttypid = t.oid
      LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      WHERE a.attname ILIKE '%plan%'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND c.relkind = 'r'
        AND n.nspname = 'public';
    `);
    console.log('Columns with "plan" in name:', planCols.rows);

    // Debug: Check dependencies on PlanType
    const depRes = await client.query(`
      SELECT DISTINCT
        dependent_ns.nspname AS dependent_schema,
        dependent_cls.relname AS dependent_table,
        dependent_attr.attname AS dependent_column,
        CASE dependent_cls.relkind
          WHEN 'r' THEN 'table'
          WHEN 'v' THEN 'view'
          WHEN 'c' THEN 'composite type'
          ELSE dependent_cls.relkind::text
        END AS dependent_type
      FROM pg_depend dep
      JOIN pg_class dependent_cls ON dep.refobjid = dependent_cls.oid
      JOIN pg_namespace dependent_ns ON dependent_cls.relnamespace = dependent_ns.oid
      LEFT JOIN pg_attribute dependent_attr ON dep.refobjid = dependent_attr.attrelid
        AND dep.refobjsubid = dependent_attr.attnum
      JOIN pg_type typ ON dep.objid = typ.oid
      WHERE typ.typname = 'PlanType'
        AND dependent_ns.nspname = 'public';
    `);
    console.log('Dependencies on PlanType:', depRes.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main();
