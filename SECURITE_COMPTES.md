# Protection des comptes et des fiches

## Autorisations

- Création : compte connecté non commercial; le serveur impose le propriétaire.
- Modification et suppression : propriétaire ou administrateur, sauf comptes commerciaux.
- Fiches sans propriétaire : administrateurs uniquement.
- Identifiant invalide : HTTP 400; fiche absente : HTTP 404; autre propriétaire : HTTP 403; sans connexion : HTTP 401.
- Les droits administrateur et le blocage du compte sont relus avant les opérations protégées. Une défaillance de vérification refuse l’opération.
- Un changement de mot de passe invalide les anciennes sessions lors de leur prochain accès protégé. Les sessions antérieures à cette mise à jour doivent se reconnecter.

## Récupération de compte

Le demandeur ne reçoit **jamais** le lien, le jeton ou les coordonnées du compte dans la réponse HTTP. Il doit ouvrir le lien reçu dans la boîte email enregistrée sur son compte pour pouvoir changer le mot de passe. Pour une recherche par téléphone, l’adresse de destination reste celle du compte, pas une destination choisie dans la demande.

Les comptes inconnus, bloqués ou sans email reçoivent la même réponse générique lorsqu’un service mail est configuré. Les comptes sans email doivent contacter l’administration; aucun lien de contournement n’est disponible.

Les jetons aléatoires de 256 bits expirent après 30 minutes. Seule leur empreinte est enregistrée. La consommation et la modification du mot de passe sont réalisées dans une même instruction PostgreSQL, afin d’empêcher deux utilisations simultanées. Les anciens jetons exposés par l’ancienne API ne sont plus acceptés.

Les demandes sont limitées par adresse réseau et par processus : 5 demandes de récupération et 10 tentatives de réinitialisation par période de 15 minutes. Cette limite n’est pas encore partagée entre plusieurs instances. L’email et le jeton ne sont pas journalisés.

### Configuration de l’envoi

**Aucun serveur d’envoi n’a été activé et aucun email réel n’a été envoyé pendant cette intervention.** Sans configuration complète, la demande retourne HTTP 503 avant tout accès aux comptes ou création de jeton.

Configurer les paramètres suivants avec le canal sécurisé de gestion de configuration du projet, jamais dans le code ni dans Git :

| Paramètre | Usage |
|---|---|
| `PASSWORD_RESET_ORIGIN` | Origine HTTPS officielle du site, sans chemin, paramètres ni fragment. Jamais déduite de l’en-tête `Host` du demandeur. |
| `SMTP_HOST` | Serveur SMTP autorisé |
| `SMTP_PORT` | `465` par défaut pour TLS direct, ou `587` avec STARTTLS obligatoire |
| `SMTP_USER` | Identifiant du serveur SMTP |
| `SMTP_PASSWORD` | Secret SMTP |
| `SMTP_FROM` | Adresse d’expédition autorisée par le serveur |

Obtenir l’autorisation du responsable avant d’activer un fournisseur ou de faire un envoi réel. En cas de refus ou panne d’envoi, le jeton créé est supprimé. La réponse reste générique pour ne pas révéler l’existence du compte; elle ne constitue pas une preuve de livraison. Les notifications commerciales SMS/WhatsApp/email restent un chantier distinct.

## Données de démonstration

`POST /api/seed` exige un administrateur, `NODE_ENV=development` **et** `ENABLE_DEMO_SEED=true`. Il est refusé en production, même si le second paramètre est activé.

Cette opération efface acteurs, logistique et avis. Ne jamais activer ces paramètres sur une base contenant des données réelles. Les tests vérifient les refus sans appeler le chemin destructif sur une base externe.

## Vérification sans toucher à la production

```sh
npm test
node tests/browser-priorities.mjs
```

Les tests d’API exécutent les vraies routes Express avec une base uniquement en mémoire et un destinataire mail simulé. Ils n’importent pas `db.js`. Le test navigateur utilise un serveur local avec des réponses simulées. Aucun mot de passe de production n’est changé, aucune donnée de production n’est supprimée et aucun prestataire d’envoi n’est appelé.

Les cas couverts comprennent deux comptes distincts, visiteurs non connectés, propriétaire, administrateur, commercial, fiche sans propriétaire, révocation de droits, compte bloqué, absence de service mail, panne d’envoi, jetons expirés, anciens liens publics, usage concurrent et invalidation des sessions après récupération.
