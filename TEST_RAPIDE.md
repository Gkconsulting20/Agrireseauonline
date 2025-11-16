# ⚡ Test Rapide - Cycle de Production

## 🔐 Identifiants Admin
```
Email: admin@agrireseau.tg
Mot de passe: Admin2025!
```

## 🧪 Test du Cycle de Production (5 minutes)

### 1️⃣ Connexion
- Connectez-vous avec les identifiants admin ci-dessus

### 2️⃣ Créer un acteur (si vous n'en avez pas)
- Onglet **"Acteurs"** → **"+ Ajouter"**
- Nom: "Ferme Test Maïs"
- Rôle: **producteur**
- Région: **Plateaux**
- Produits: **Maïs;Soja**
- → Enregistrer

### 3️⃣ Créer un budget avec cycle de production
- Onglet **"Budget"** → **"+ Nouveau budget"**

**Remplir** :
```
Activité: Production Maïs Saison 2025
Acteur: Ferme Test Maïs
Filière: Maïs
Produit récolté: Maïs

📅 Date de début: [Aujourd'hui]
⏱️ Cycle (jours): 90

Quantité prévue: 5000 kg
Prix de vente: 450 FCFA/kg
Dépenses prévues: 200000 FCFA
```

**✅ Vous verrez en temps réel** :
- CA prévu: 2 250 000 FCFA
- Profit: 2 050 000 FCFA
- **📅 Disponibilité estimée: [Date dans 90 jours]**

→ Cliquer **"💾 Créer"**

### 4️⃣ Vérifier sur la carte acteur
- Retourner dans **"Acteurs"**
- Chercher "Ferme Test Maïs"

**Vous devriez voir** :
```
📅 En production: Maïs: Dispo. estimée [date dans 90 jours] (5000 kg)
```

### 5️⃣ Simuler la récolte
- Retourner dans **"Budget"**
- Cliquer sur votre budget "Production Maïs Saison 2025"
- Section "Récolte" → Cliquer **"✏️"**
- Quantité réelle: **4800 kg**
- → Enregistrer

### 6️⃣ Voir le changement
- Retourner dans **"Acteurs"**
- Chercher "Ferme Test Maïs"

**Maintenant vous voyez** :
```
📦 Disponible: Maïs: 4800 kg
```

✅ **La production est terminée et le stock est disponible !**

---

## 🐔 Test Élevage (Bonus)

Même principe avec un éleveur :

```
Acteur: Ferme Avicole Test
Rôle: éleveur
Produits: Poulet;Œufs

Budget:
- Activité: Lot Poulets Mars 2025
- Filière: Aviculture
- Produit: Poulet
- Date début: Aujourd'hui
- Cycle: 50 jours (poulets de chair)
- Quantité: 500 poulets
```

Vous verrez :
```
📅 En production: Poulet: Dispo. estimée [date dans 50 jours] (500 kg)
```

---

## 📊 Autres Cycles à Tester

| Produit | Cycle | Type |
|---------|-------|------|
| Tomate | 60 jours | Agriculture |
| Riz | 130 jours | Agriculture |
| Poulets | 50 jours | Élevage |
| Porcs | 200 jours | Élevage |

---

## ✅ Ce qui doit fonctionner

- ✅ Calcul automatique de la date de disponibilité
- ✅ Affichage "En production" sur la carte acteur
- ✅ Passage à "Disponible" après récolte
- ✅ Plusieurs productions en parallèle (jusqu'à 5 affichées)
- ✅ Visiteurs non connectés peuvent voir les dates estimées

---

**Bon test ! 🚀**

Guide complet : voir **GUIDE_DE_TEST.md**
