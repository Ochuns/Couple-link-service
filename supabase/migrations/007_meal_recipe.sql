-- meal_posts テーブルに料理名と作り方カラムを追加するマイグレーション
-- dish_name: 料理の名前（例：「カレーライス」「オムライス」）
-- recipe: 作り方の手順（複数行テキスト）
ALTER TABLE meal_posts
  ADD COLUMN IF NOT EXISTS dish_name TEXT,
  ADD COLUMN IF NOT EXISTS recipe    TEXT;
