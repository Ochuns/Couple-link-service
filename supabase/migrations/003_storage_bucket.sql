-- reunion-photos プライベートバケット作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reunion-photos',
  'reunion-photos',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS ポリシー
CREATE POLICY "couple members can read reunion photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reunion-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "couple members can upload reunion photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reunion-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "uploaders can delete their reunion photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reunion-photos'
    AND owner = auth.uid()
  );
