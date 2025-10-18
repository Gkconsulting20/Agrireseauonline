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

### 💎 PREMIUM (5 000 FCFA/mois)
- Acteurs illimités
- Badge Premium visible
- Analytics (à venir)
- Messagerie interne (à venir)
- Alertes SMS/Email (à venir)

## 💳 Activer les Paiements (T-Money & Flooz)

**Infrastructure prête, en attente de clés API PayGate**

1. Créer compte sur [PayGate](https://www.paygateglobal.com/)
2. Obtenir API keys depuis dashboard PayGate
3. Ajouter les secrets dans Replit :
   - `PAYGATE_API_KEY`
   - `PAYGATE_MERCHANT_ID`
4. Activer endpoint de paiement (code déjà préparé)

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
