# 🔑 Guide d'Obtention des Clés API

Ce document vous explique comment créer vos comptes PayGate et Twilio, et récupérer les clés API nécessaires pour activer toutes les fonctionnalités d'AgriRéseau Pro.

---

## 💳 PAYGATE (Paiements Mobile Money : T-Money & Flooz)

### ✅ Pourquoi PayGate ?
- **Couverture complète** : T-Money (61%) + Flooz (39%) = 100% du marché togolais
- **API unique** : Une seule intégration pour les deux services
- **Gratuit** : Pas de frais pour le marchand (payés par le client)
- **Local** : Basé au Togo, support disponible

---

### 📋 Étape 1 : Créer votre Compte Marchand

1. **Visitez** : https://www.paygateglobal.com/
2. **Cliquez sur** : "Créer un compte marchand" ou "Nouveau compte"
3. **Remplissez le formulaire** avec :
   - Nom de l'entreprise : "AgriRéseau Pro" (ou votre nom)
   - Email professionnel
   - Numéro de téléphone
   - Localisation au Togo

---

### 📄 Étape 2 : Fournir les Documents Légaux

PayGate demandera :
- ✅ **NIF** (Numéro d'Identification Fiscale)
- ✅ **Nom de l'entreprise** ou raison sociale
- ✅ **Informations bancaires** : Compte Ecobank ou BAT (pour règlement Flooz)
- ✅ **Pièce d'identité** du gérant

**Note** : Si vous n'avez pas de NIF, contactez le support PayGate pour voir les alternatives.

---

### 🔑 Étape 3 : Récupérer vos Clés API

Une fois votre compte approuvé (1-3 jours ouvrables) :

1. **Connectez-vous** à votre Dashboard PayGate
2. **Allez dans** : Paramètres → API ou Développeur
3. **Récupérez** :
   - **API Key** : Format UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Merchant ID** : Votre identifiant marchand unique

**Exemple** :
```
PAYGATE_API_KEY=a1b2c3d4-e5f6-7890-abcd-ef1234567890
PAYGATE_MERCHANT_ID=AGRI_TOGO_001
```

---

### 🌐 Étape 4 : Configurer l'URL de Callback

Dans votre Dashboard PayGate :
1. **Paramètres** → **Webhooks** ou **Callback URL**
2. **Ajoutez** : `https://votre-app.replit.app/api/payments/callback`
   - Remplacez `votre-app` par le nom de votre Repl

**Exemple** :
```
PAYGATE_CALLBACK_URL=https://agrireseau-pro.replit.app/api/payments/callback
```

---

### 📞 Support PayGate

- **Site** : https://www.paygateglobal.com/
- **Email** : support@paygateglobal.com
- **Téléphone** : Disponible sur leur site
- **Localisation** : Lomé, Togo

---

## 📱 TWILIO (Notifications SMS & WhatsApp)

### ✅ Pourquoi Twilio ?
- **15 USD de crédit gratuit** à l'inscription (200+ SMS)
- **WhatsApp** : 15x moins cher que SMS (~3 FCFA vs 45 FCFA)
- **API robuste** : Leader mondial des communications
- **Sans carte bancaire** : Démarrez sans payer

---

### 📋 Étape 1 : Créer votre Compte Twilio

1. **Visitez** : https://www.twilio.com/try-twilio
2. **Cliquez sur** : "Sign up for free" ou "Créer un compte"
3. **Remplissez** :
   - Nom
   - Email
   - Mot de passe
4. **Vérifiez votre email** et numéro de téléphone

**Important** : Pas de carte bancaire nécessaire pour l'essai gratuit !

---

### 🔑 Étape 2 : Récupérer vos Identifiants API

Une fois connecté au Dashboard Twilio :

1. **Account SID** :
   - Visible sur la page d'accueil du Dashboard
   - Format : `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (34 caractères)

2. **Auth Token** :
   - Cliquez sur "Show" à côté de "Auth Token" sur le Dashboard
   - Chaîne de 32 caractères alphanumériques

3. **Numéro Twilio** :
   - Allez dans : **Phone Numbers** → **Manage** → **Buy a number**
   - **Choisissez** : Un numéro international (USA recommandé, moins cher)
   - **Capacités requises** : SMS + Voice
   - **Coût** : ~1 USD/mois (prélevé sur votre crédit gratuit)

**Exemple** :
```
TWILIO_ACCOUNT_SID=ACa1b2c3d4e5f6789012345678901234
TWILIO_AUTH_TOKEN=1234567890abcdef1234567890abcdef
TWILIO_PHONE_NUMBER=+12345678901
```

**Format du numéro** : Toujours commencer par `+` et le code pays (ex: `+1` pour USA)

---

### 📞 Étape 3 : Vérifier les Numéros de Destination (Mode Trial)

En mode essai gratuit (15 USD de crédit), vous devez **vérifier chaque numéro** avant d'envoyer :

1. **Dashboard** → **Phone Numbers** → **Verified Caller IDs**
2. **Cliquez sur** : "+ Add a new number"
3. **Entrez** : Le numéro togolais (format `+228XXXXXXXX`)
4. **Twilio enverra un code** : Entrez-le pour vérifier

**Important** : En mode trial, vous ne pouvez envoyer qu'à des numéros vérifiés.

---

### ✨ Étape 4 : Passer en Mode Production (Optionnel)

Pour envoyer à n'importe quel numéro sans vérification :

1. **Ajoutez une carte bancaire** dans : Settings → Billing
2. **Rechargez** : Minimum 20 USD (ou laissez sur 0 USD, paiement à l'usage)
3. **Votre compte devient production** : Plus de restrictions

**Tarifs** :
- **SMS vers Togo** : ~0.075 USD/message (~45 FCFA)
- **WhatsApp** : ~0.005 USD/message (~3 FCFA) - **15x moins cher !**

---

### 📱 Configurer WhatsApp (Recommandé)

WhatsApp est **beaucoup moins cher** que SMS et très utilisé au Togo.

1. **Dashboard** → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. **Suivez le guide** pour :
   - Associer votre numéro Twilio à WhatsApp
   - Scanner le QR code pour activer
3. **Format d'envoi** :
   - De : `whatsapp:+12345678901` (votre numéro Twilio)
   - À : `whatsapp:+228XXXXXXXX` (numéro togolais)

---

### 🔐 Sécurité

**IMPORTANT** : Ne partagez JAMAIS vos clés API publiquement !

- ✅ Utilisez les Secrets Replit (sécurisés)
- ❌ Ne les mettez jamais dans le code
- ❌ Ne les commitez jamais sur Git
- ✅ Régénérez-les si elles sont compromises

---

### 📞 Support Twilio

- **Documentation** : https://www.twilio.com/docs
- **Support** : https://support.twilio.com
- **Console** : https://console.twilio.com

---

## ⚙️ ÉTAPE FINALE : Ajouter les Secrets dans Replit

Une fois vos clés obtenues :

### 1. Ouvrir les Secrets Replit
- **Panneau de gauche** → **Tools** → **Secrets**
- Ou raccourci : 🔒 icône cadenas

### 2. Ajouter PayGate
Cliquez sur "+ New secret" et ajoutez :

```
Key: PAYGATE_API_KEY
Value: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

```
Key: PAYGATE_MERCHANT_ID
Value: VOTRE_MERCHANT_ID
```

```
Key: PAYGATE_CALLBACK_URL
Value: https://votre-app.replit.app/api/payments/callback
```

### 3. Ajouter Twilio
```
Key: TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```
Key: TWILIO_AUTH_TOKEN
Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```
Key: TWILIO_PHONE_NUMBER
Value: +12345678901
```

### 4. Redémarrer l'Application
- **Arrêtez** le serveur (Stop)
- **Relancez** (Run)
- Les secrets seront chargés automatiquement

---

## ✅ VÉRIFICATION FINALE

Pour vérifier que tout fonctionne :

### PayGate :
1. Connectez-vous en tant qu'utilisateur Premium
2. Allez dans l'onglet **Abonnement**
3. Cliquez sur **"💎 Passer Premium"**
4. Choisissez **T-Money** ou **Flooz**
5. Testez avec **1,000 FCFA**

### Twilio :
1. Connectez-vous en tant qu'utilisateur Premium
2. Allez dans l'onglet **Statistiques**
3. Descendez à **"📱 Notifications SMS & WhatsApp"**
4. Cliquez sur **"🔔 Envoyer une notification test"**
5. Vérifiez la réception

---

## 💰 COÛTS ESTIMÉS

### Startup (premiers 3 mois)
- **PayGate** : 0 FCFA (gratuit)
- **Twilio** : 0 FCFA (15 USD de crédit gratuit)
- **Total** : 0 FCFA 🎉

### Production (100 utilisateurs/mois)
- **PayGate** : 0 FCFA (toujours gratuit pour le marchand)
- **Twilio SMS** : ~50 notifications × 45 FCFA = 2,250 FCFA
- **Twilio WhatsApp** : ~50 notifications × 3 FCFA = 150 FCFA
- **Total** : 150-2,250 FCFA/mois (selon SMS vs WhatsApp)

**Recommandation** : Utilisez **WhatsApp prioritairement** pour économiser 93% ! 💡

---

## 🆘 BESOIN D'AIDE ?

Si vous rencontrez des difficultés :

1. **Vérifiez ce guide** étape par étape
2. **Consultez la documentation** PayGate/Twilio
3. **Contactez le support** des services respectifs
4. **Vérifiez vos Secrets** Replit (orthographe, format)

**L'infrastructure AgriRéseau Pro est prête à 100% - il ne manque que vos clés API !** 🚀
