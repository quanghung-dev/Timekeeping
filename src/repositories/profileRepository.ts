import { mapProfile, unwrap } from '../lib/databaseMappers';
import { neon } from '../lib/neon';

export type AuthUserIdentity = {
  id: string;
  email: string;
  name?: string | null;
};

export const profileRepository = {
  async ensure(user: AuthUserIdentity, now = () => new Date()) {
    const existing = unwrap(
      await neon.from('profiles').select('*').eq('user_id', user.id),
      'Không thể tải hồ sơ.',
    );

    if (existing[0]) return mapProfile(existing[0], user.email);

    const timestamp = now().toISOString();
    const created = unwrap(
      await neon
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: user.name?.trim() || user.email.split('@')[0],
          avatar_url: null,
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select('*'),
      'Không thể tạo hồ sơ.',
    );

    if (!created[0]) throw new Error('Không thể tạo hồ sơ.');
    return mapProfile(created[0], user.email);
  },
};
