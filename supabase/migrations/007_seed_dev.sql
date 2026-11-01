-- Dev seed data (run manually in dev environments)

-- Default exercise library entries (global, no created_by)
INSERT INTO exercise_library (title, description, instructions, difficulty, tags)
VALUES
  (
    'Alongamento cervical',
    'Exercício para aliviar tensão no pescoço',
    'Incline a cabeça suavemente para cada lado, mantendo 15 segundos.',
    'easy',
    ARRAY['cervical', 'alongamento']
  ),
  (
    'Ponte glútea',
    'Fortalecimento de glúteos e core',
    'Deite-se de costas, joelhos flexionados. Eleve o quadril mantendo 5 segundos.',
    'medium',
    ARRAY['glúteos', 'core']
  ),
  (
    'Mobilização de ombro',
    'Melhora amplitude de movimento do ombro',
    'Realize movimentos circulares lentos com o braço, 10 repetições cada direção.',
    'easy',
    ARRAY['ombro', 'mobilidade']
  )
ON CONFLICT DO NOTHING;

-- Note: Admin user must be created manually:
-- 1. Sign up via auth
-- 2. UPDATE profiles SET role = 'admin' WHERE id = '<user_id>';
