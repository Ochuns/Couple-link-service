-- RLS を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- profiles ポリシー
CREATE POLICY "authenticated users can read any profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- couples ポリシー
CREATE POLICY "couple members can read their couple"
  ON couples FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "authenticated users can create couples"
  ON couples FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "couple members can update their couple"
  ON couples FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "couple members can delete their couple"
  ON couples FOR DELETE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- tasks ポリシー
CREATE POLICY "couple members can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "couple members can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "couple members can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "couple members can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- reunions ポリシー
CREATE POLICY "couple members can read reunions"
  ON reunions FOR SELECT
  TO authenticated
  USING (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "couple members can insert reunions"
  ON reunions FOR INSERT
  TO authenticated
  WITH CHECK (
    couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "creators can delete their reunions"
  ON reunions FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- reunion_photos ポリシー
CREATE POLICY "couple members can read reunion photos"
  ON reunion_photos FOR SELECT
  TO authenticated
  USING (
    reunion_id IN (
      SELECT r.id FROM reunions r
      JOIN couples c ON c.id = r.couple_id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
  );

CREATE POLICY "couple members can insert reunion photos"
  ON reunion_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    reunion_id IN (
      SELECT r.id FROM reunions r
      JOIN couples c ON c.id = r.couple_id
      WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "creators can delete their reunion photos"
  ON reunion_photos FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- weather_cache ポリシー
CREATE POLICY "authenticated users can read weather cache"
  ON weather_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "service role can manage weather cache"
  ON weather_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
