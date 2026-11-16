# AgriRéseau Pro — Togo 🌾

**Plateforme agricole connectant producteurs, transformateurs, transporteurs et distributeurs au Togo**

## 🎯 Statut du Projet

✅ **PRÊT POUR DÉPLOIEMENT EN PRODUCTION**

- ✅ Migration PostgreSQL terminée
- ✅ Système freemium opérationnel
- ✅ Système de notation et certifications
- ✅ Configuration Autoscale validée
- ✅ Infrastructure paiements prête (T-Money/Flooz)

## 🚀 Déploiement

### Option 1: Via Replit (Recommandé)
1. Cliquez sur le bouton **"Deploy"** dans Replit
2. Sélectionnez **"Autoscale Deployment"**
3. Configurez le domaine personnalisé (optionnel)
4. Cliquez sur **"Publish"**

Votre application sera déployée avec :
- ✅ Base de données PostgreSQL persistante
- ✅ Auto-scaling selon le trafic
- ✅ SSL/HTTPS automatique
- ✅ Domaine `.repl.co` gratuit

### Option 2: Configuration Manuelle
Déjà configuré dans `.replit` :
```
Deployment Target: Autoscale
Run Command: npm start
Port: 5000
```

## 📊 Plans Tarifaires

### 🆓 GRATUIT
- 2 acteurs maximum
- Toutes les fonctionnalités de base
- Stock public, carte, logistique, coûts, budget

### 💎 PREMIUM (1 000 FCFA/mois)
- Acteurs illimités
- Badge Premium visible
- Les statistiques basées sur les données enregistrées, les exports CSV et l’impression PDF sont aussi accessibles aux comptes gratuits connectés (hors comptes commerciaux dédiés).
- **Indisponibles, non inclus dans le Premium actuel** : comptage des vues, notifications automatiques SMS/WhatsApp/email, priorité dans les recherches, support prioritaire et messagerie interne.
- Les liens WhatsApp permettent un contact manuel, sans envoi automatique.

## 💳 Paiements Premium

Le parcours actuel utilise **FedaPay** pour proposer un abonnement à **1 000 FCFA/mois**. Les anciens exemples PayGate ne décrivent pas le parcours actif. Aucun paiement réel ne doit être effectué pour vérifier les avantages de l’offre.

### Notifications et mesures

Aucun fournisseur d’envoi automatique n’est implémenté. L’API d’envoi répond `503 notifications_unavailable`, sans enregistrer ni envoyer de nouveau message. Les anciennes demandes restent consultables par les comptes Premium ; `pending` ne signifie pas « envoyé » et un ancien statut `sent` ne prouve pas la livraison.

Les API statistiques renvoient `views_count: null` ou `views: null`, avec `views_available: false`. L’interface affiche **Indisponible**, jamais un nombre simulé ni un faux zéro. Les autres indicateurs proviennent des fiches, budgets, dépenses, récoltes et évaluations enregistrés ; ils ne constituent pas une mesure d’audience.

Les guides d’intégration décrivent des travaux futurs : ajouter des clés ne suffit pas à rendre l’envoi opérationnel. Ne pas activer de fournisseur payant ni effectuer de paiement réel sans autorisation.

## 🧪 Tester en Local

```bash
npm install
npm start
```

Identifiants de test : `test@agri.tg` / `test123`

## 📁 Structure Technique

```
/
├── server.js               # Serveur Express + PostgreSQL
├── db.js                   # Module de connexion PostgreSQL
├── package.json            # Dépendances Node.js
├── migrate-to-postgres.js  # Script de migration (déjà exécuté)
├── public/                 # Frontend
│   ├── index.html
│   ├── app.js
│   └── style.css
└── replit.md               # Documentation complète
```

## 🔑 Variables d'Environnement

Automatiquement configurées par Replit :
- `DATABASE_URL` - Connexion PostgreSQL
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `SESSION_SECRET` (auto-généré)

## 📚 Documentation Complète

Voir `replit.md` pour :
- Architecture détaillée
- Guide des fonctionnalités
- Historique des changements
- Instructions de maintenance

## 🌍 Production

Une fois déployé, votre application sera accessible 24/7 avec :
- Auto-scaling (0 à plusieurs machines selon trafic)
- Base de données serverless (Neon PostgreSQL)
- Coût optimisé (paie uniquement ce que vous utilisez)

---

**Développé avec Replit Agent** • Octobre 2025
