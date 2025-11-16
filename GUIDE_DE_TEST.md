# 🧪 Guide de Test - AgriRéseau Pro

## 🔐 Identifiants de Test

### Compte Administrateur
```
Email: admin@agrireseau.tg
Mot de passe: Admin2025!
```

**Privilèges admin** :
- ✅ Gestion complète des utilisateurs
- ✅ Activation/désactivation de comptes
- ✅ Activation manuelle du Premium
- ✅ Accès à tous les acteurs

### Compte Utilisateur Standard (à créer)
```
Pour tester en tant qu'utilisateur normal :
1. Cliquez sur "Se connecter"
2. Cliquez sur "Créer un compte"
3. Créez votre compte test
```

---

## 🌐 URL de l'Application

Votre application est accessible via le webview Replit (port 5000).

---

## 📋 Scénarios de Test

### **Test 1 : Affichage des Onglets selon État de Connexion** 🔐

**Objectif** : Vérifier que les onglets Budget et Coût de revient sont cachés pour les visiteurs

#### Étape 1 : Mode Visiteur (non connecté)
1. **Ouvrir l'application** sans se connecter
2. **Vérifier les onglets visibles** :
   - ✅ **Acteurs** (visible)
   - ✅ **Carte** (visible)
   - ✅ **Logistique** (visible)
   - ❌ **Coût de revient** (MASQUÉ)
   - ❌ **Budget** (MASQUÉ)
   - ❌ **Statistiques** (MASQUÉ)
   - ❌ **Paramètres** (MASQUÉ)
   - ❌ **Administration** (MASQUÉ)

#### Étape 2 : Mode Utilisateur Connecté
1. **Se connecter** (n'importe quel compte)
2. **Vérifier les onglets visibles** :
   - ✅ **Acteurs** (visible)
   - ✅ **Carte** (visible)
   - ✅ **Logistique** (visible)
   - ✅ **Coût de revient** (maintenant visible)
   - ✅ **Budget** (maintenant visible)
   - ✅ **Statistiques** (maintenant visible)
   - ✅ **Paramètres** (maintenant visible)
   - ❓ **Administration** (visible UNIQUEMENT si admin)

#### Étape 3 : Se déconnecter
1. **Cliquer sur "Se déconnecter"**
2. **Vérifier** : Les onglets Budget et Coût de revient disparaissent

✅ **Résultat attendu** : Les visiteurs ne peuvent pas accéder aux fonctionnalités de gestion budgétaire

---

### **Test 2 : Onglet Logistique - Offres et Demandes** 🚚

**Objectif** : Vérifier le fonctionnement de l'onglet Logistique

#### Étape 1 : Consulter les offres/demandes existantes
1. **Cliquer sur l'onglet "Logistique"**
2. **Vérifier l'affichage des cartes** :
   - Titre de la demande/offre
   - Badge **"BESOIN"** (en rouge/orange) ou **"OFFRE"** (en vert)
   - Badge avec la région
   - Détails de la demande/offre
   - Liens **WhatsApp** et **Appeler** si disponibles
   - Bouton **"Supprimer"** (uniquement pour les utilisateurs connectés sur leurs propres entrées)

#### Étape 2 : Ajouter une nouvelle demande
1. **Se connecter** (obligatoire)
2. **Cliquer sur "+ Nouvelle demande/offre"**
3. **Remplir le formulaire** :
   - **Titre** : "Besoin de transport de Lomé à Kara"
   - **Type** : Sélectionner **"Besoin"**
   - **Région** : "Savanes"
   - **Détails** : "Transport de 5 tonnes de maïs, départ urgent"
   - **Téléphone** : "90 12 34 56"
   - **WhatsApp** : "90 12 34 56"
4. **Cliquer "Enregistrer"**

#### Étape 3 : Vérifier l'affichage
1. **Retourner dans "Logistique"**
2. **Voir votre nouvelle entrée** avec :
   - Badge **"BESOIN"**
   - Badge **"Savanes"**
   - Lien WhatsApp cliquable
   - Bouton **"Supprimer"** (car c'est votre entrée)

#### Étape 4 : Ajouter une offre
1. **Cliquer "+ Nouvelle demande/offre"**
2. **Remplir** :
   - **Titre** : "Camion disponible pour transport"
   - **Type** : Sélectionner **"Offre"**
   - **Région** : "Maritime"
   - **Détails** : "Camion 10 tonnes disponible toute la semaine"
   - **Téléphone** : "91 23 45 67"
3. **Enregistrer**

#### Étape 5 : Vérifier la différence visuelle
- Les **BESOINS** et **OFFRES** doivent être clairement identifiables par leurs badges

✅ **Résultat attendu** : L'onglet Logistique permet de publier et consulter facilement les besoins de transport et les capacités disponibles

---

### **Test 3 : Produits avec Site de Production et Images** 📦

**Objectif** : Tester la nouvelle structure des produits (nom, site de production, image)

#### Étape 1 : Créer un acteur avec produits enrichis
1. **Se connecter**
2. **Onglet "Acteurs"** → **"+ Ajouter"**
3. **Remplir les informations de base** :
   - **Nom** : "Ferme Bio Atakpamé"
   - **Rôle** : producteur
   - **Région** : Plateaux
   - **Localité** : Atakpamé

#### Étape 2 : Ajouter des produits avec détails
1. **Dans la section "📦 Produits"**
2. **Cliquer "+ Ajouter un produit"**
3. **Premier produit** :
   - **Nom du produit** : Tomates
   - **Site de production** : Ferme d'Atakpamé, Route de Kpalimé
   - **URL de l'image** : https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200

4. **Cliquer "+ Ajouter un produit"** pour un 2ème produit
5. **Deuxième produit** :
   - **Nom du produit** : Laitue bio
   - **Site de production** : Serres Atakpamé, Zone Agou
   - **URL de l'image** : https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=200

6. **Supprimer un produit** (tester) :
   - Cliquer sur le bouton **"🗑️"** d'un produit pour le retirer

#### Étape 3 : Enregistrer et vérifier l'affichage
1. **Remplir les autres champs** (volume, prix, etc.)
2. **Cliquer "Enregistrer"**
3. **Voir la carte de l'acteur** :
   - **Images des produits** (60x60 pixels) affichées sur la carte
   - **Nom des produits** visible
   - **Site de production** accessible (au survol ou dans les détails)

#### Étape 4 : Modifier un acteur existant
1. **Cliquer "Modifier"** sur un acteur existant
2. **Vérifier** :
   - Les produits existants (anciens, format texte) s'affichent correctement
   - On peut ajouter le site de production et l'image
   - La rétrocompatibilité fonctionne

#### Étape 5 : Tester la recherche
1. **Onglet "Acteurs"**
2. **Rechercher par nom de produit** : "Tomates"
3. **Vérifier** : Les acteurs avec tomates apparaissent

✅ **Résultat attendu** : Les produits ont maintenant une structure enrichie (site + image) tout en restant compatibles avec les anciennes données

---

### **Test 4 : Connexion et Navigation Complète** ✅

1. **Se connecter en tant qu'admin** :
   - Email: `admin@agrireseau.tg`
   - Mot de passe: `Admin2025!`
   
2. **Vérifier les onglets visibles** :
   - Acteurs
   - Carte
   - Logistique
   - Coût de revient
   - Budget
   - 📊 Statistiques (admin connecté)
   - ⚙️ Paramètres (admin connecté)
   - Administration (admin uniquement)

---

### **Test 2 : Catégories de Produits d'Élevage** 🐄

1. **Filtrer par catégorie** :
   - Dans l'onglet "Acteurs"
   - Sélectionner le filtre "Toutes catégories"
   - Essayer : Agriculture, Bovins, Volaille, Porcins, etc.

2. **Vérifier le stock disponible** :
   - Voir l'affichage par catégorie avec emojis :
     - 🌾 Agriculture
     - 🐄 Bovins
     - 🐔 Volaille
     - 🐷 Porcins
     - 🐟 Aquaculture

---

### **Test 3 : Cycle de Production** 📅

**Objectif** : Créer un budget avec cycle de production et voir la date de disponibilité

#### Étape 1 : Créer un acteur (si besoin)
1. Onglet "Acteurs" → Cliquer "+ Ajouter"
2. Remplir :
   - Nom: "Ma Ferme Test"
   - Rôle: Producteur ou Éleveur
   - Région: Plateaux
   - Produits: Maïs;Soja
3. Enregistrer

#### Étape 2 : Créer un budget avec cycle de production
1. Aller dans l'onglet **"Budget"**
2. Cliquer **"+ Nouveau budget"**
3. Remplir le formulaire :
   - **Activité** : "Production de Maïs Saison 2025"
   - **Acteur concerné** : Sélectionner "Ma Ferme Test"
   - **Filière** : Maïs
   - **Produit récolté** : Maïs
   - **Date de début** : Aujourd'hui (date actuelle)
   - **Cycle de production (jours)** : **90** (pour le maïs)
   - **Quantité prévue** : 5000 kg
   - **Prix de vente prévu** : 450 FCFA/kg
   - **Dépenses prévues** : 200000 FCFA

4. **Vérifier l'aperçu en temps réel** :
   - CA prévu : 2 250 000 FCFA
   - Profit : 2 050 000 FCFA
   - 📅 **Disponibilité estimée : [Date dans 90 jours]**

5. Cliquer **"💾 Créer"**

#### Étape 3 : Vérifier l'affichage sur la carte acteur
1. Retourner dans l'onglet **"Acteurs"**
2. Chercher votre acteur "Ma Ferme Test"
3. **Vérifier l'affichage** :
   - Vous devriez voir : 
   ```
   📅 En production: Maïs: Dispo. estimée [date] (5000 kg)
   ```

#### Étape 4 : Simuler la récolte
1. Retourner dans l'onglet **"Budget"**
2. Cliquer sur le budget créé
3. Cliquer sur le bouton **"✏️"** à côté de "Récolte"
4. Entrer la quantité réelle : **4800 kg** (exemple)
5. Enregistrer

#### Étape 5 : Vérifier le changement
1. Retourner dans "Acteurs"
2. Voir votre acteur
3. **Maintenant vous devriez voir** :
   ```
   📦 Disponible: Maïs: 4800 kg
   ```
   - La ligne "En production" a disparu
   - Le produit est maintenant disponible !

---

### **Test 4 : Exemples de Cycles par Filière** ⏱️

Voici des durées réalistes à tester :

| Filière | Cycle (jours) |
|---------|---------------|
| Maraîchage (Tomate, Salade) | 30-60 |
| Maïs | 90-120 |
| Riz | 120-150 |
| Soja | 90-110 |
| Manioc | 240-365 |
| Poulets de chair | 45-60 |
| Poules pondeuses | 120-150 |
| Porcs (engraissement) | 180-210 |
| Bovins (embouche) | 365-540 |

---

### **Test 5 : Abonnement Premium** 💎

1. **Voir le bouton abonnement** :
   - En haut à droite, cliquer **"💎 Abonnement"**

2. **Interface de paiement** :
   - Prix : **1 000 FCFA/mois**
   - Choix : T-Money ou Flooz
   - Fonctionnalités premium listées

3. **Tester l'activation manuelle (Admin)** :
   - Aller dans l'onglet **"Administration"**
   - Section "Activer Premium manuellement"
   - Email de l'utilisateur
   - Transaction ID : TEST-001
   - Méthode : Manual
   - Cliquer "Activer Premium"

---

### **Test 6 : Statistiques Premium** 📊

**Uniquement pour comptes Premium**

1. Aller dans l'onglet **"📊 Statistiques"**
2. Vérifier les KPIs :
   - Nombre d'acteurs
   - Nombre de budgets
   - Total des dépenses
   - Total des récoltes
   - Nombre d'évaluations

3. **Tableaux de bord** :
   - Performance par acteur
   - Analyse budgétaire (prévisionnel vs réel)
   - Graphiques visuels

4. **Export** :
   - Bouton "📥 Exporter CSV"
   - Bouton "🖨️ Exporter PDF"

---

### **Test 7 : Notification & Paiements** 📱

#### Historique des paiements
1. Onglet **"⚙️ Paramètres"**
2. Section **"💳 Historique des Paiements"**
3. Voir les transactions (si activées)

#### Notifications
1. Section **"📱 Notifications & Alertes"**
2. Cliquer **"🔔 Envoyer une notification test"**
3. Voir l'historique des notifications

---

### **Test 8 : Administration** 👨‍💼

**Uniquement avec compte admin**

1. Onglet **"Administration"**
2. **Gestion des utilisateurs** :
   - Voir tous les utilisateurs
   - Modifier un utilisateur (nom, email, rôle, statut)
   - Bloquer/débloquer un compte
   - Supprimer un utilisateur (sauf soi-même)

3. **Activation Premium manuelle** :
   - Activer Premium pour n'importe quel utilisateur
   - Utile pour tests ou paiements hors ligne

---

## 🐛 Points à Vérifier

### Fonctionnalités Critiques
- [ ] ✅ Connexion/Déconnexion
- [ ] ✅ Création d'acteur (limite 2 en gratuit)
- [ ] ✅ Filtrage par catégorie d'élevage
- [ ] ✅ Création de budget avec cycle de production
- [ ] ✅ Affichage "En production" avec date estimée
- [ ] ✅ Changement vers "Disponible" après récolte
- [ ] ✅ Interface de paiement (1 000 FCFA)
- [ ] ✅ Statistiques premium
- [ ] ✅ Panel admin

### Affichages Spéciaux
- [ ] Stock par catégorie (🌾 Agriculture, 🐄 Bovins, etc.)
- [ ] Badge Premium (💎)
- [ ] Certifications (🌿 Bio, ✅ Qualité, 🤝 Équitable)
- [ ] Distance si géolocalisation activée

---

## 🚀 Scénario Complet de Test

### Parcours Producteur
1. **Inscription** → Créer compte
2. **Créer un acteur** → Ma ferme de maïs
3. **Créer un budget** → Production maïs, cycle 90 jours
4. **Vérifier affichage** → "En production" visible aux visiteurs
5. **Enregistrer dépenses** → Dans "Coût de revient"
6. **Récolte** → Enregistrer quantité réelle
7. **Vérifier changement** → "Disponible" maintenant

### Parcours Acheteur
1. **Consulter acteurs** → Sans connexion
2. **Filtrer** → Par région, rôle, catégorie
3. **Voir disponibilités** :
   - Produits en stock (vert) 📦
   - Produits en production (bleu) 📅
4. **Contacter** → WhatsApp/Téléphone
5. **Noter** → Après connexion

---

## 📊 Données de Test Pré-remplies

Utilisez le bouton **"Réinitialiser (seed)"** pour charger des données exemple :
- 10 acteurs (producteurs, éleveurs, transformateurs, etc.)
- Différentes régions du Togo
- Produits variés (agriculture + élevage)
- Certifications
- Coordonnées GPS

---

## 🔧 Résolution de Problèmes

### Le cycle de production ne s'affiche pas
- Vérifier que le budget a :
  - Date de début remplie
  - Cycle de production > 0
  - Produit récolté sélectionné
  - Acteur lié

### "En production" n'apparaît pas sur l'acteur
- Vérifier que l'acteur est bien sélectionné dans le budget
- Rafraîchir la page
- Vérifier qu'il n'y a pas de récolte déjà enregistrée

### Statistiques vides
- Créer d'abord des acteurs et budgets
- Les stats se calculent automatiquement

---

## 📝 Notes Importantes

1. **Base de données** : PostgreSQL (Neon serverless)
2. **Session** : Cookie-based, expire à la fermeture
3. **Géolocalisation** : Demande permission navigateur
4. **Prix** : Cachés sur les cartes (négociation encouragée)
5. **Paiements** : Infrastructure prête, nécessite clés API PayGate/Twilio

---

## ✅ Checklist Finale

Avant de déployer en production :
- [ ] Configurer `SESSION_SECRET` dans Replit Secrets
- [ ] Obtenir clés API PayGate
- [ ] Obtenir clés API Twilio
- [ ] Tester tous les flux de paiement
- [ ] Vérifier les emails de notification
- [ ] Tester sur mobile
- [ ] Sauvegarder la base de données

---

**Bon test ! 🚀🇹🇬**
