# 🚀 Guide de Déploiement sur Render.com

## 📋 Prérequis

- ✅ Application vérifiée (voir `RAPPORT_VERIFICATION.md`)
- ✅ Compte GitHub (gratuit)
- ✅ Compte Render.com (gratuit)
- ✅ Numéros T-Money/Flooz configurés

---

## 💰 Coûts Render

### Web Service
- **Plan Starter** : $7/mois
- Inclus : 512MB RAM, CPU partagé, SSL gratuit
- **Prix FIXE** (pas de surprises !)

### PostgreSQL
- **Plan Free** : GRATUIT jusqu'à 1GB de données
- Au-delà : **Starter** à $7/mois (10GB)

### Total : $7/mois (ou $14/mois avec PostgreSQL payant)

---

## 🔧 Étape 1 : Préparer le Code

### 1.1 Configurer les Numéros de Paiement

Modifiez `public/app.js` :

```javascript
// Ligne 488 - Numéro T-Money
<p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">90 12 34 56</p>

// Ligne 497 - Numéro Flooz  
<p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">91 23 45 67</p>

// Ligne 505 - WhatsApp
<p style="margin:5px 0;">2. Contactez-nous par WhatsApp au <strong>90 12 34 56</strong></p>
```

### 1.2 (Optionnel) Nettoyer les Fichiers Inutiles

```bash
rm migrate-to-postgres.js
rm server.sqlite.backup.js
```

### 1.3 Créer .gitignore

Créez le fichier `.gitignore` :

```
node_modules/
.env
*.log
.DS_Store
```

---

## 📦 Étape 2 : Pousser sur GitHub

### 2.1 Initialiser Git (si pas déjà fait)

```bash
git init
git add .
git commit -m "AgriRéseau Pro - Ready for deployment"
```

### 2.2 Créer un Repo sur GitHub

1. Allez sur https://github.com/new
2. Nom du repo : `agrireseau-pro`
3. Visibilité : **Private** (recommandé) ou Public
4. Cliquez "Create repository"

### 2.3 Pousser le Code

```bash
git remote add origin https://github.com/VOTRE-USERNAME/agrireseau-pro.git
git branch -M main
git push -u origin main
```

---

## 🗄️ Étape 3 : Créer la Base de Données PostgreSQL sur Render

### 3.1 Se Connecter à Render

1. Allez sur https://render.com/
2. Cliquez "Get Started" ou "Sign In"
3. Connectez-vous avec GitHub

### 3.2 Créer PostgreSQL

1. Dans le dashboard Render, cliquez **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Configurez :
   - **Name** : `agrireseau-db`
   - **Database** : `agrireseau`
   - **User** : (généré automatiquement)
   - **Region** : Choisissez le plus proche (ex: Frankfurt pour l'Europe)
   - **PostgreSQL Version** : **16** (dernière version)
   - **Plan** : **Free** (0$/mois, 1GB, suffisant pour commencer)

4. Cliquez **"Create Database"**

⏱️ **Patientez 2-3 minutes** pendant la création

### 3.3 Copier les Informations de Connexion

Une fois créée, vous verrez :
- **Internal Database URL** : `postgres://...` (pour Render)
- **External Database URL** : `postgres://...` (pour accès externe)

**📋 Copiez l'Internal Database URL** - vous en aurez besoin à l'étape suivante !

---

## 🌐 Étape 4 : Créer le Web Service

### 4.1 Créer le Service

1. Dans le dashboard Render, cliquez **"New +"**
2. Sélectionnez **"Web Service"**
3. Cliquez **"Build and deploy from a Git repository"**
4. Connectez votre repo GitHub : `agrireseau-pro`

### 4.2 Configurer le Service

- **Name** : `agrireseau-pro`
- **Region** : **Même région que la DB** (ex: Frankfurt)
- **Branch** : `main`
- **Root Directory** : (laisser vide)
- **Runtime** : **Node**
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Plan** : **Starter** ($7/mois)

### 4.3 Configurer les Variables d'Environnement

Cliquez sur **"Advanced"**, puis ajoutez ces variables :

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `[Collez l'Internal Database URL de l'étape 3.3]` |
| `SESSION_SECRET` | `[Générez avec : openssl rand -hex 32]` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

**Comment générer SESSION_SECRET** :

```bash
# Sur Mac/Linux
openssl rand -hex 32

# Résultat (exemple) :
# 3f8d9a2b1c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

### 4.4 Déployer

1. Cliquez **"Create Web Service"**
2. Render va :
   - Cloner votre repo
   - Installer les dépendances (`npm install`)
   - Démarrer le serveur (`npm start`)

⏱️ **Patientez 3-5 minutes** pour le premier déploiement

---

## 🎯 Étape 5 : Initialiser la Base de Données

### 5.1 Accéder au Shell Render

1. Dans votre Web Service Render, allez dans l'onglet **"Shell"**
2. Ou utilisez l'URL : `https://dashboard.render.com/web/[SERVICE-ID]/shell`

### 5.2 Créer les Tables

Dans le shell, exécutez :

```bash
node
```

Puis collez ce code :

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Créer les tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        region VARCHAR(100),
        role VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        plan VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'active',
        payment_method VARCHAR(50),
        amount INTEGER,
        transaction_id VARCHAR(255),
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS actors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50),
        region VARCHAR(100),
        localite VARCHAR(255),
        products JSONB DEFAULT '[]',
        need TEXT,
        volume INTEGER,
        price INTEGER,
        photo_url TEXT,
        certifications JSONB DEFAULT '[]',
        lat DECIMAL(10,6),
        lng DECIMAL(10,6),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        email VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        actor_id INTEGER REFERENCES actors(id),
        user_id INTEGER REFERENCES users(id),
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(actor_id, user_id)
      );
      
      CREATE TABLE IF NOT EXISTS logistics (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50),
        title VARCHAR(255),
        region VARCHAR(100),
        details TEXT,
        contact VARCHAR(50),
        whatsapp VARCHAR(50),
        owner_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        filiere VARCHAR(100),
        label VARCHAR(255),
        periode VARCHAR(100),
        output_qty DECIMAL(10,2),
        target_margin DECIMAL(5,2),
        price_expected DECIMAL(10,2),
        transport DECIMAL(10,2),
        autres DECIMAL(10,2),
        overhead_pct DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS activity_items (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER REFERENCES activities(id),
        kind VARCHAR(50),
        label VARCHAR(255),
        qty DECIMAL(10,2),
        unit VARCHAR(50),
        unit_price DECIMAL(10,2)
      );
      
      CREATE TABLE IF NOT EXISTS budget_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        kind VARCHAR(50),
        occurred_on DATE,
        amount DECIMAL(10,2),
        category VARCHAR(100),
        activity_id INTEGER REFERENCES activities(id),
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insérer les données de référence
    await client.query(`
      INSERT INTO regions (name) VALUES ('Maritime'), ('Plateaux'), ('Centrale'), ('Kara'), ('Savanes')
      ON CONFLICT (name) DO NOTHING;
      
      INSERT INTO products (name) VALUES ('Maïs'), ('Soja'), ('Igname'), ('Manioc'), ('Gari'), ('Riz'), ('Arachide'), ('Huile de soja'), ('Légumes'), ('Fruits')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
})();
```

Appuyez sur **Entrée** deux fois, puis attendez le message :  
✅ `Database initialized successfully!`

Tapez `.exit` pour quitter Node.

---

## 🌍 Étape 6 : Tester l'Application

### 6.1 Accéder à Votre App

Votre URL sera :  
**`https://agrireseau-pro.onrender.com`**

(ou le nom que vous avez choisi)

### 6.2 Tester les Fonctionnalités

1. ✅ Accéder à la page d'accueil
2. ✅ Voir le stock public (sans connexion)
3. ✅ Créer un compte
4. ✅ Se connecter
5. ✅ Cliquer sur "💎 Abonnement"
6. ✅ Voir les instructions de paiement

### 6.3 Initialiser les Données de Test (Optionnel)

Allez sur :  
**`https://agrireseau-pro.onrender.com`**

Cliquez sur **"Réinitialiser (seed)"** pour créer des acteurs de démonstration.

---

## 🔧 Étape 7 : Configuration Post-Déploiement

### 7.1 Ajouter un Domaine Personnalisé (Optionnel)

1. Dans Render, allez dans **Settings → Custom Domains**
2. Cliquez **"Add Custom Domain"**
3. Entrez votre domaine : `www.agrireseau.tg`
4. Suivez les instructions pour configurer les DNS
5. Render génère automatiquement le certificat SSL ✅

### 7.2 Configurer les Alertes

1. Allez dans **Settings → Notifications**
2. Activez les alertes email pour :
   - Déploiements échoués
   - Erreurs serveur
   - Utilisation élevée

### 7.3 Surveiller les Logs

- Allez dans l'onglet **"Logs"** de votre service
- Surveillez les erreurs pendant les premiers jours
- Consultez régulièrement pour détecter les problèmes

---

## 🆘 Dépannage

### Problème : Erreur de Connexion à la Base de Données

**Solution** :
1. Vérifiez que `DATABASE_URL` est bien configuré
2. Vérifiez que la DB et le Web Service sont dans la **même région**
3. Utilisez **Internal Database URL** (pas External)

### Problème : Le Serveur ne Démarre Pas

**Solution** :
1. Vérifiez les logs dans l'onglet "Logs"
2. Vérifiez que `NODE_ENV=production`
3. Vérifiez que `PORT=5000`

### Problème : 404 sur Toutes les Pages

**Solution** :
1. Vérifiez que le **Build Command** est `npm install`
2. Vérifiez que le **Start Command** est `npm start`
3. Redéployez le service

---

## 📊 Monitoring et Maintenance

### Surveiller la Performance

1. **Render Dashboard** :
   - CPU usage
   - Memory usage
   - Requêtes par minute

2. **Database Metrics** :
   - Taille de la DB
   - Connexions actives

### Backups de la Base de Données

Render fait des **backups automatiques** :
- **Plan Free** : Aucun backup
- **Plan Starter** : 7 jours de backups
- **Plan Standard** : 30 jours de backups

**Recommandation** : Exportez manuellement la DB chaque semaine :

```bash
pg_dump -h [HOST] -U [USER] -d [DATABASE] > backup.sql
```

---

## 💰 Gestion des Coûts

### Estimation Mensuelle

- **Web Service Starter** : $7
- **PostgreSQL Free** : $0
- **Total** : **$7/mois** 🎉

### Si Vous Dépassez 1GB de Données

- **PostgreSQL Starter** : +$7/mois
- **Total** : **$14/mois**

### Optimiser les Coûts

1. Utilisez **PostgreSQL Free** tant que possible
2. Nettoyez les données inutiles régulièrement
3. Surveillez l'usage dans le dashboard

---

## 🚀 Déploiement Continu

### Activer Auto-Deploy

Render redéploie automatiquement à chaque `git push` :

1. Dans Settings → Build & Deploy
2. **Auto-Deploy** : **Activé** (par défaut)

### Workflow

```bash
# Modifier le code localement
git add .
git commit -m "Fix: corrected payment number"
git push

# Render déploie automatiquement en 2-3 minutes ✅
```

---

## ✅ Checklist de Déploiement

- [ ] Numéros T-Money/Flooz configurés
- [ ] Code poussé sur GitHub
- [ ] PostgreSQL créé sur Render
- [ ] Web Service créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Base de données initialisée
- [ ] Application testée en production
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] Alertes activées
- [ ] Premier backup manuel effectué

---

## 🎉 Félicitations !

Votre application **AgriRéseau Pro** est maintenant déployée sur Render.com !

**URL de production** : `https://agrireseau-pro.onrender.com`

---

## 📞 Support

- **Documentation Render** : https://render.com/docs
- **Support Render** : https://render.com/support
- **Guide PayGate** : Voir `PAYGATE_INTEGRATION.md`
- **Rapport de vérification** : Voir `RAPPORT_VERIFICATION.md`

---

**Déployé avec succès ! 🇹🇬🌾**
