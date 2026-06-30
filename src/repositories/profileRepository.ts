import { mapProfile, unwrap } from '../lib/databaseMappers';
import { getNeonClient } from '../lib/neon';

export type AuthUserIdentity = {
  id: string;
  email: string;
  name?: string | null;
};

export const profileRepository = {
  async ensure(user: AuthUserIdentity, now = () => new Date()) {
    const neon = getNeonClient();
    const existing = unwrap(
      await neon.from('profiles').select('*').eq('user_id', user.id),
      'Không thể tải hồ sơ.',
    );

    if (existing[0]) return mapProfile(existing[0], user.email);

    const timestamp = now().toISOString();
    const createdResult = await neon
      .from('profiles')
      .insert({
        user_id: user.id,
        display_name: user.name?.trim() || user.email.split('@')[0],
        avatar_url: null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('*');

    if (createdResult.error) {
      const racedResult = await neon
        .from('profiles')
        .select('*')
        .eq('user_id', user.id);
      if (!racedResult.error && racedResult.data?.[0]) {
        return mapProfile(racedResult.data[0], user.email);
      }
      throw new Error(`Không thể tạo hồ sơ: ${createdResult.error.message}`);
    }

    const created = unwrap(createdResult, 'Không thể tạo hồ sơ.');

    if (!created[0]) throw new Error('Không thể tạo hồ sơ.');
    return mapProfile(created[0], user.email);
  },

  async updateDisplayName(
    userId: string,
    email: string,
    displayName: string,
  ) {
    const neon = getNeonClient();
    const updated = unwrap(
      await neon
        .from('profiles')
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('*'),
      'Không thể cập nhật hồ sơ.',
    );

    if (!updated[0]) throw new Error('Không thể cập nhật hồ sơ.');
    return mapProfile(updated[0], email);
  },
};
