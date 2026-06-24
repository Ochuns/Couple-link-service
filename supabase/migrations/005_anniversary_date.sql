-- couples テーブルに記念日カラムを追加
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS anniversary_date DATE;
