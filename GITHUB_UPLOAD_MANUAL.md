# 📤 Guide : Upload Manuel sur GitHub

## 🎯 Étapes pour Télécharger et Pousser sur GitHub

### Étape 1 : Télécharger le Projet depuis Replit

1. **Dans Replit, cliquez sur les 3 points** (menu) en haut à gauche
2. Sélectionnez **"Download as ZIP"**
3. Le fichier `workspace.zip` sera téléchargé sur votre ordinateur
4. **Décompressez le fichier ZIP**

---

### Étape 2 : Nettoyer les Fichiers Inutiles

**AVANT de pousser sur GitHub**, supprimez ces dossiers/fichiers :

#### ❌ À SUPPRIMER OBLIGATOIREMENT :
```
node_modules/          (sera réinstallé automatiquement)
.cache/                (cache Replit)
.upm/                  (package manager Replit)
.local/                (données locales)
.git/                  (ancien git, on va recréer)
```

#### ❌ À SUPPRIMER (fichiers de test/backup) :
```
RAPPORT_VERIFICATION.md    (document de test)
TEST_RAPIDE.md             (document de test)
server.sqlite.backup.js    (ancien backup SQLite)
```

#### ✅ À GARDER (fichiers importants) :
```
server.js                  (serveur backend)
db.js                      (connexion base de données)
package.json               (dépendances)
package-lock.json          (versions lockées)
.replit                    (config Replit - optionnel)
.gitignore                 (config Git)
public/                    (tout le dossier)
  ├── app.js
  ├── index.html
  ├── style.css
  └── assets/
replit.md                  (documentation)
PRE_DEPLOY_CHECKLIST.md    (checklist déploiement)
GUIDE_DE_TEST.md           (guide de test)
DEPLOYMENT_RENDER.md       (guide Render)
INTEGRATION_GUIDE.md       (guide intégrations)
COMPTES_TEST.md            (comptes de test)
README.md                  (readme du projet)
GITHUB_UPLOAD_MANUAL.md    (ce fichier)
```

---

### Étape 3 : Vérifier le .gitignore

Assurez-vous que le fichier `.gitignore` contient bien :

```
node_modules/
*.sqlite
*.sqlite-shm
*.sqlite-wal
.env
.DS_Store
npm-debug.log*
.cache/
.upm/
.local/
```

---

### Étape 4 : Créer le Dépôt sur GitHub

#### Option A : Nouveau dépôt vide
1. Allez sur **GitHub.com**
2. Cliquez sur **"New repository"**
3. Nom : `agrireseau-pro` (ou autre nom)
4. **N'initialisez PAS** avec README, .gitignore ou license
5. Cliquez **"Create repository"**

#### Option B : Utiliser le dépôt existant
Si vous voulez utiliser `https://github.com/Gkconsulting20/agriconnect` :
1. Allez sur le dépôt
2. Cliquez **"Code"** → **"Download ZIP"** pour backup
3. Supprimez tous les fichiers existants (ou créez une nouvelle branche)

---

### Étape 5 : Pousser le Code sur GitHub

Ouvrez le **terminal** (CMD/PowerShell sur Windows, Terminal sur Mac/Linux) dans le dossier du projet :

```bash
# 1. Initialiser Git
git init

# 2. Ajouter le remote GitHub
git remote add origin https://github.com/Gkconsulting20/agriconnect.git

# 3. Créer la branche main
git branch -M main

# 4. Ajouter tous les fichiers
git add .

# 5. Créer le commit
git commit -m "Initial commit: AgriRéseau Pro - MVP complet

- Système d'authentification et gestion utilisateurs
- Gestion acteurs avec produits enrichis (nom, site, image)
- Logistique : offres et demandes de transport
- Budget prévisionnel et coût de revient
- Carte interactive avec géolocalisation
- Système d'abonnement freemium/premium
- Infrastructure paiement mobile money (PayGate)
- Infrastructure notifications (Twilio)
- Panel d'administration
- Prêt pour déploiement Render"

# 6. Pousser vers GitHub
git push -u origin main
```

**Si erreur d'authentification** :
```bash
# Utiliser un Personal Access Token au lieu du mot de passe
git push https://<VOTRE_USERNAME>:<VOTRE_TOKEN>@github.com/Gkconsulting20/agriconnect.git main
```

---

### Étape 6 : Créer un Personal Access Token (si nécessaire)

Si vous n'avez pas de token GitHub :

1. **GitHub** → **Settings** (votre profil)
2. **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token** → **Generate new token (classic)**
4. Nom : "AgriRéseau Deploy"
5. Cochez : **repo** (toutes les permissions repo)
6. **Generate token**
7. **COPIEZ le token** (vous ne le reverrez plus !)
8. Utilisez-le comme mot de passe dans la commande git push

---

### Étape 7 : Vérifier sur GitHub

1. Allez sur `https://github.com/Gkconsulting20/agriconnect`
2. Vérifiez que tous les fichiers sont là
3. Vérifiez que `node_modules/` n'est **PAS** présent (normal !)

---

## ✅ Checklist Finale avant GitHub

- [ ] Fichiers téléchargés et décompressés
- [ ] `node_modules/` supprimé
- [ ] `.cache/`, `.upm/`, `.local/` supprimés
- [ ] Fichiers de test supprimés (RAPPORT_, TEST_)
- [ ] `.gitignore` vérifié
- [ ] Git initialisé
- [ ] Remote ajouté
- [ ] Commit créé
- [ ] Push réussi
- [ ] Vérification sur GitHub ✓

---

## 🚀 Après le Push sur GitHub

Vous pourrez alors déployer sur Render :

1. **Render.com** → **New** → **Web Service**
2. **Connect Repository** → Sélectionner `Gkconsulting20/agriconnect`
3. Suivre `PRE_DEPLOY_CHECKLIST.md` pour la config

---

## 🆘 Problèmes Courants

### "Permission denied"
→ Utilisez un Personal Access Token au lieu du mot de passe

### "Repository not found"
→ Vérifiez l'URL : `https://github.com/Gkconsulting20/agriconnect.git`

### "node_modules trop gros"
→ Normal ! Supprimez-le, le `.gitignore` l'empêchera d'être pushé

### "Fatal: not a git repository"
→ Assurez-vous d'être dans le bon dossier et d'avoir fait `git init`

---

**Bon courage ! 🚀**
