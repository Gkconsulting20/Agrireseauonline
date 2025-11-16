-- 1. D'abord, voir tous les utilisateurs disponibles
SELECT id, name, email, phone, is_admin 
FROM users 
ORDER BY id;

-- 2. Promouvoir un utilisateur en admin (choisissez UNE de ces commandes)

-- Par email :
-- UPDATE users SET is_admin = true WHERE email = 'utilisateur@exemple.com';

-- Par téléphone :
-- UPDATE users SET is_admin = true WHERE phone = '+22812345678';

-- Par ID :
-- UPDATE users SET is_admin = true WHERE id = 2;

-- 3. Vérifier que ça a marché
-- SELECT id, name, email, is_admin FROM users WHERE is_admin = true;
