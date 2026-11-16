---
name: Dépendances portables
description: Éviter les adresses de registre internes dans les dépendances destinées aussi à Render.
---

Les archives npm verrouillées doivent rester accessibles depuis les hébergements externes, pas seulement depuis Replit.

**Why:** Le projet conserve une configuration Render. L’installation de paquets dans l’environnement de développement peut introduire des adresses de registre internes, faisant réussir les tests locaux mais échouer une installation externe propre.

**How to apply:** Après une installation ou une régénération du verrouillage, vérifier la portabilité des URL. Conserver les versions et empreintes lors de la normalisation vers les archives publiques; vérifier leur accessibilité et leurs empreintes sans contourner un refus de sécurité du gestionnaire de paquets.
