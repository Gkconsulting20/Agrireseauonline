# 🔑 Guide d'Obtention des Clés API

Ce document vous explique comment créer vos comptes FedaPay et Twilio, et récupérer les clés API nécessaires pour activer toutes les fonctionnalités d'AgriRéseau Pro.

---

## 💳 FEDAPAY (Paiements : T-Money, Flooz & Cartes)

### ✅ Pourquoi FedaPay ?
- **Couverture totale** : T-Money (61%) + Flooz (39%) = 100% du marché togolais + Visa/MasterCard internationales
- **Multi-pays** : Expansion prête vers Bénin, Burkina Faso, Côte d'Ivoire, Niger, Sénégal, Mali, Guinée
- **Règlement rapide** : 3 jours pour T-Money (vs 10 jours avec concurrents)
- **Frais transparents** : 2.9% par transaction (clair et compétitif)
- **Sans frais cachés** : Pas de frais d'inscription, pas de frais mensuels

---

### 📋 Étape 1 : Créer votre Compte Marchand FedaPay

1. **Visitez** : https://fedapay.com/ ou https://app.fedapay.com/register
2. **Cliquez sur** : "Créer un compte" ou "S'inscrire"
3. **Remplissez le formulaire** avec :
   - Nom de l'entreprise : "AgriRéseau Pro" (ou votre nom)
   - Email professionnel
   - Mot de passe sécurisé
   - Numéro de téléphone
   - Pays : Togo

4. **Vérifiez votre email** et confirmez votre compte

---

### 📄 Étape 2 : Compléter votre Profil Marchand

Une fois connecté au Dashboard FedaPay :

1. **Allez dans** : Paramètres → Informations de l'entreprise
2. **Remplissez** :
   - ✅ **Nom légal de l'entreprise**
   - ✅ **Adresse** au Togo
   - ✅ **Téléphone de contact**
   - ✅ **Description de l'activité** : "Plateforme agricole et d'élevage"

**Note** : Pour recevoir les paiements, vous devrez aussi configurer vos informations de règlement (compte Mobile Money ou bancaire).

---

### 🔑 Étape 3 : Récupérer vos Clés API

FedaPay utilise 2 environnements séparés :
- **Sandbox** (Test) : Pour tester sans argent réel
- **Live** (Production) : Pour les vrais paiements

#### Mode Sandbox (Test) - Commencez par ici !

1. **Connectez-vous** à https://sandbox.fedapay.com/
2. **Allez dans** : Paramètres → API ou Développeurs → Clés API
3. **Récupérez** :
   - **Public Key (Sandbox)** : Format `pk_sandbox_XXXXXXXXXXXXX`
   - **Secret Key (Sandbox)** : Format `sk_sandbox_XXXXXXXXXXXXX`

**Exemple** :
```
FEDAPAY_PUBLIC_KEY=pk_sandbox_a1b2c3d4e5f6789012345678901234
FEDAPAY_SECRET_KEY=sk_sandbox_9876543210fedcba9876543210abcd
FEDAPAY_ENVIRONMENT=sandbox
```

#### Mode Production (Live) - Quand vous êtes prêt

1. **Connectez-vous** à https://app.fedapay.com/
2. **Allez dans** : Paramètres → API ou Développeurs → Clés API
3. **Récupérez** :
   - **Public Key (Live)** : Format `pk_live_XXXXXXXXXXXXX`
   - **Secret Key (Live)** : Format `sk_live_XXXXXXXXXXXXX`

**Exemple** :
```
FEDAPAY_PUBLIC_KEY=pk_live_a1b2c3d4e5f6789012345678901234
FEDAPAY_SECRET_KEY=sk_live_9876543210fedcba9876543210abcd
FEDAPAY_ENVIRONMENT=live
```

---

### 🌐 Étape 4 : Configurer l'URL de Callback (Webhook)

Les webhooks permettent à FedaPay de notifier votre application quand un paiement est complété.

1. **Dashboard FedaPay** → **Paramètres** → **Webhooks**
2. **Ajoutez une URL de webhook** :
   - URL : `https://votre-app.replit.app/api/payments/webhook`
   - Remplacez `votre-app` par le nom de votre Repl

3. **Sélectionnez les événements** :
   - ✅ `transaction.approved` (IMPORTANT)
   - ✅ `transaction.canceled`
   - ✅ `transaction.declined`

4. **Copiez le secret webhook** si disponible (pour vérification de signature)

**Exemple** :
```
https://agrireseau-pro.replit.app/api/payments/webhook
```

---

### 💰 Frais & Tarifs FedaPay

| Méthode de paiement | Frais par transaction |
|---------------------|----------------------|
| **Mobile Money** (T-Money, Flooz) | **2.9%** |
| **Carte Visa/MasterCard** | **3.6%** |

**Aucun frais** d'inscription, aucun frais mensuel, aucun frais caché !

**Exemple pour 100 utilisateurs Premium/mois** :
- Revenus : 100,000 FCFA
- Frais FedaPay (2.9%) : 2,900 FCFA
- **Net : 97,100 FCFA** 💰

---

### 📞 Support FedaPay

- **Site** : https://fedapay.com/
- **Documentation** : https://docs.fedapay.com/
- **Dashboard Sandbox** : https://sandbox.fedapay.com/
- **Dashboard Live** : https://app.fedapay.com/
- **Email** : support@fedapay.com

---

## 📱 TWILIO (Notifications SMS & WhatsApp)

**Intégration future, non disponible dans l’offre actuelle.** Aucun envoi automatique SMS/WhatsApp/email n’est implémenté. Les exemples de configuration et estimations ci-dessous ne prouvent pas un service actif ; les clés seules ne suffisent pas. Ne pas activer de fournisseur payant ni effectuer de paiement réel sans autorisation.

### ✅ Pourquoi Twilio ?
- **15 USD de crédit gratuit** à l'inscription (200+ SMS ou 3,000 messages WhatsApp)
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

### 2. Ajouter FedaPay (Sandbox pour tester d'abord)
Cliquez sur "+ New secret" et ajoutez :

```
Key: FEDAPAY_SECRET_KEY
Value: sk_sandbox_VOTRE_CLE_SECRETE
```

```
Key: FEDAPAY_PUBLIC_KEY
Value: pk_sandbox_VOTRE_CLE_PUBLIQUE
```

```
Key: FEDAPAY_ENVIRONMENT
Value: sandbox
```

**Pour passer en production** : Remplacez les clés par les versions `pk_live_` et `sk_live_`, et changez `FEDAPAY_ENVIRONMENT` en `live`.

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

### FedaPay :
1. Connectez-vous en tant qu'utilisateur
2. Allez dans l'onglet **Abonnement**
3. Cliquez sur **"💎 Passer Premium"**
4. Cliquez sur **"💎 Payer 1,000 FCFA"**
5. Vous serez redirigé vers la page FedaPay
6. Testez avec **T-Money**, **Flooz** ou **Carte de test** (en mode sandbox)

**Cartes de test en Sandbox** :
- Succès : `4000000000000002`
- Refusé : `4000000000000010`
- Date d'expiration : N'importe quelle date future
- CVV : N'importe quels 3 chiffres

### Notifications actuellement indisponibles :
1. Vérifier que la section **Notifications SMS & WhatsApp** indique l’indisponibilité, même avec Premium.
2. Vérifier que le bouton d’envoi test est désactivé.
3. Un appel isolé à l’API d’envoi avec un compte Premium doit recevoir HTTP 503, sans nouvelle demande enregistrée ni message envoyé. Utiliser une base de test, pas un fournisseur réel.

---

## 💰 COÛTS ESTIMÉS

### Startup (premiers 3 mois)
- **FedaPay** : 0 FCFA (pas de frais fixes, seulement 2.9% par transaction)
- **Twilio** : 0 FCFA (15 USD de crédit gratuit = 200 SMS ou 3,000 WhatsApp)
- **Total** : 0 FCFA 🎉

### Production (100 utilisateurs Premium/mois)
- **FedaPay** : 2,900 FCFA de frais (2.9% de 100,000 FCFA)
- **Twilio SMS** : ~50 notifications × 45 FCFA = 2,250 FCFA
- **Twilio WhatsApp** : ~50 notifications × 3 FCFA = 150 FCFA
- **Total** : 3,050-5,150 FCFA/mois (selon SMS vs WhatsApp)

**Recommandation** : Utilisez **WhatsApp prioritairement** pour économiser 93% ! 💡

---

## 🌍 EXPANSION RÉGIONALE (Futur)

FedaPay est **déjà prêt** pour l'expansion multi-pays ! Aucun changement de code nécessaire.

**Pays supportés** :
- 🇹🇬 Togo (actuel)
- 🇧🇯 Bénin
- 🇧🇫 Burkina Faso
- 🇨🇮 Côte d'Ivoire
- 🇳🇪 Niger
- 🇸🇳 Sénégal
- 🇲🇱 Mali
- 🇬🇳 Guinée

Il suffira de configurer les nouveaux opérateurs mobile money locaux dans votre compte FedaPay !

---

## 🆘 BESOIN D'AIDE ?

Si vous rencontrez des difficultés :

1. **Vérifiez ce guide** étape par étape
2. **Consultez la documentation** FedaPay/Twilio
3. **Contactez le support** des services respectifs
4. **Vérifiez vos Secrets** Replit (orthographe, format)

**L'infrastructure AgriRéseau Pro est prête à 100% - il ne manque que vos clés API !** 🚀
