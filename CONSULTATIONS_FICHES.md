# Mesure des consultations de fiches

## Règles de comptage

- Une consultation est l'ouverture volontaire de la fiche détaillée (depuis une carte ou la carte géographique), après affichage du dialogue. Afficher une liste, une miniature, le stock, un formulaire de modification, les statistiques ou recharger l'application ne compte pas.
- Seuls les comptes connectés et actifs, hors comptes commerciaux, sont mesurés. Les visiteurs anonymes ne sont pas suivis ; ce nombre n'est donc **pas** une estimation de toute l'audience.
- Une seule consultation par compte visiteur, fiche et jour civil **UTC**. Réouvertures, rechargements suivis d'une ouverture, onglets simultanés, reconnexions et redémarrages du serveur ne rajoutent pas de consultation le même jour.
- Les consultations du propriétaire sont exclues, même administrateur. Un administrateur consultant la fiche d'un autre propriétaire suit les règles normales.
- Les agents signalant robot, crawler, spider, preview, headless ou des outils automatisés connus sont exclus, comme les agents absents. Cela ne garantit pas d'identifier un robot qui se fait passer pour un navigateur humain.
- `DNT: 1` et `Sec-GPC: 1` excluent la mesure. Le navigateur ne l'envoie pas non plus si son option de refus de suivi est active ou si la page est masquée.
- Les demandes de navigateur provenant d'une autre origine sont refusées. La route exige une session valide et un en-tête dédié ; aucun identifiant de visiteur ou propriétaire envoyé dans le corps ne fait autorité.

## Persistance et disponibilité

Les totaux sont enregistrés dans PostgreSQL, jamais en mémoire locale ni en nombres aléatoires. L'anti-doublon et l'incrément du compteur s'effectuent dans **une seule instruction atomique** avec contrainte d'unicité, y compris pour deux demandes simultanées.

Les tables sont créées de façon idempotente à la première utilisation de cette fonctionnalité ; aucun changement des anciennes tables n'est nécessaire. Le compte SQL doit pouvoir créer ces deux tables et leur index. En l'absence de `SESSION_SECRET` stable ou si la création/lecture échoue, les API de statistiques renvoient `null` et `views_available=false`. Une écriture échouée renvoie HTTP 503, sans bloquer l'affichage de la fiche. Une tentative ultérieure peut rétablir la mesure. Ne pas changer `SESSION_SECRET` au cours d'une journée sans accepter la perte de dédoublonnage de cette journée (ce changement invalide aussi les sessions).

Zéro signifie qu'aucune consultation admissible n'a été enregistrée depuis l'activation, pas qu'aucun visiteur n'a jamais vu la fiche. Aucune vue historique n'est reconstituée. Le total d'un propriétaire est la somme des compteurs de ses fiches actuelles, avec le même filtre d'appartenance pour les deux API, sans filtre sur l'identifiant demandé par le client. Une suppression de fiche supprime ses compteurs et ses clés anti-doublons en cascade. Deux lectures effectuées à des instants différents peuvent naturellement différer si une consultation arrive entre elles.

## Confidentialité

Aucune adresse IP, adresse email, chaîne d'agent utilisateur, cookie analytique ou identité brute du visiteur n'est stockée dans ces tables. Une empreinte HMAC secrète et différente pour chaque fiche et jour suffit pour le dédoublonnage ; il s'agit d'un identifiant **pseudonymisé**, pas d'une promesse d'anonymat. Les clés des jours précédents sont purgées au prochain enregistrement ; si aucun nouvel enregistrement ne survient, elles restent inactives dans la table jusqu'à la prochaine purge. Les totaux agrégés restent jusqu'à la suppression de la fiche. Seuls les totaux sont exposés au propriétaire authentifié ; aucune liste de visiteurs n'est accessible.

## Vérification isolée

`npm test` comprend les tests de consultations. Les routes Express réelles tournent avec un double de base en mémoire ; `db.js` n'est jamais importé et aucune connexion à une base de développement ou de production n'est utilisée. Un test SQL complémentaire exécute le schéma et les requêtes PostgreSQL dans une instance locale temporaire lorsqu'on lance `node tests/actor-views-postgres.mjs`.
