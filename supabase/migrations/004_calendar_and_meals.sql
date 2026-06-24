-- calendar_events: 共有カレンダー予定
CREATE TABLE calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'other' CHECK (event_type IN ('anniversary', 'video_date', 'meal_date', 'other')) NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- meal_posts: ごはんシェア投稿
CREATE TABLE meal_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  memo TEXT,
  together_flag BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- meal_reactions: 絵文字リアクション（1投稿につきユーザー1つ）
CREATE TABLE meal_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_post_id UUID NOT NULL REFERENCES meal_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(meal_post_id, user_id)
);

-- RLS 有効化
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_reactions ENABLE ROW LEVEL SECURITY;

-- calendar_events ポリシー
CREATE POLICY "couple members can read calendar events"
  ON calendar_events FOR SELECT TO authenticated
  USING (couple_id IN (SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()));

CREATE POLICY "couple members can insert calendar events"
  ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (couple_id IN (SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()) AND created_by = auth.uid());

CREATE POLICY "creators can update calendar events"
  ON calendar_events FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "creators can delete calendar events"
  ON calendar_events FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- meal_posts ポリシー
CREATE POLICY "couple members can read meal posts"
  ON meal_posts FOR SELECT TO authenticated
  USING (couple_id IN (SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()));

CREATE POLICY "couple members can insert meal posts"
  ON meal_posts FOR INSERT TO authenticated
  WITH CHECK (couple_id IN (SELECT id FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()) AND created_by = auth.uid());

CREATE POLICY "creators can delete meal posts"
  ON meal_posts FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- meal_reactions ポリシー
CREATE POLICY "couple members can read reactions"
  ON meal_reactions FOR SELECT TO authenticated
  USING (meal_post_id IN (SELECT mp.id FROM meal_posts mp JOIN couples c ON c.id = mp.couple_id WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()));

CREATE POLICY "authenticated users can upsert reactions"
  ON meal_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own reactions"
  ON meal_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users can delete own reactions"
  ON meal_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- meal-photos ストレージバケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meal-photos', 'meal-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']);

CREATE POLICY "couple members can read meal photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ));

CREATE POLICY "couple members can upload meal photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM couples WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ));

CREATE POLICY "uploaders can delete meal photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND owner = auth.uid());
