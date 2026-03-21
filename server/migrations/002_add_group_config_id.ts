import { Migration } from './migration-runner'

export const migration_002_add_group_config_id: Migration = {
  version: '002',
  description: 'Add config_id to user_group allowing stable group references despite name changes',

  async up (db) {
    // Add config_id column
    await db.query(`
            ALTER TABLE user_group ADD COLUMN config_id VARCHAR(255);
        `)

    // Backfill with group_name
    await db.query(`
            UPDATE user_group SET config_id = group_name;
        `)

    // Make config_id NOT NULL and UNIQUE
    await db.query(`
            ALTER TABLE user_group ALTER COLUMN config_id SET NOT NULL;
        `)
    await db.query(`
            ALTER TABLE user_group ADD CONSTRAINT unique_config_id UNIQUE(config_id);
        `)

    // Drop unique constraint on group_name
    await db.query(`
            ALTER TABLE user_group DROP CONSTRAINT user_group_group_name_key;
        `)
  },

  async down (db) {
    // Try restoring unique constraint on group_name (might fail if duplicates exist)
    try {
      await db.query(`
                ALTER TABLE user_group ADD CONSTRAINT user_group_group_name_key UNIQUE(group_name);
            `)
    } catch (error) {
      console.warn('Could not restore unique constraint on group_name during migration down. Duplicates might exist.')
    }

    // Drop config_id column
    await db.query(`
            ALTER TABLE user_group DROP COLUMN config_id;
        `)
  }
}
