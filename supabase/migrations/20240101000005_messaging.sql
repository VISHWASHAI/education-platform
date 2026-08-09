-- Announcements & Messaging (adds onto the core schema).

CREATE TYPE announcement_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE conversation_type AS ENUM ('direct', 'class');

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_role TEXT,                 -- NULL = everyone, else a role name
  target_class_id INTEGER REFERENCES classes(id),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  status announcement_status NOT NULL DEFAULT 'published',
  expires_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  type conversation_type NOT NULL,
  class_id INTEGER REFERENCES classes(id),   -- set when type = 'class'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_target_role ON announcements(target_role);
CREATE INDEX IF NOT EXISTS idx_announcements_target_class ON announcements(target_class_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id);
