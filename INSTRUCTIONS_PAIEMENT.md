# 💳 Guide d'Utilisation du Système de Paiement Premium

> État actuel de l’offre : 1 000 FCFA/mois pour dépasser la limite de deux acteurs et afficher le badge Premium. Statistiques sur les données enregistrées, exports CSV et impression PDF aussi accessibles gratuitement. Vues, envoi automatique SMS/WhatsApp/email, priorité de recherche et support prioritaire indisponibles. Le parcours utilisateur actuel propose FedaPay ; les instructions manuelles ci-dessous concernent l’administration. Aucun paiement réel ni activation de fournisseur payant sans autorisation.

## 🎯 Ce qui a été implémenté

### ✅ Paiement Manuel (ACTIF MAINTENANT)
Les utilisateurs peuvent **passer à Premium** dès maintenant via paiement manuel T-Money ou Flooz.

### 🚀 Paiement Automatique PayGate (PRÉPARÉ)
L'intégration complète PayGate est documentée et prête à être activée quand vous créerez votre compte.

---

## 📱 Comment ça fonctionne pour vos utilisateurs ?

### Étape 1 : L'utilisateur clique sur "💎 Abonnement"
- Il doit être connecté
- Le bouton jaune apparaît dans le header

### Étape 2 : Il voit son plan actuel
- **🆓 GRATUIT** : 0/2 acteurs
- Bouton "💎 Passer à Premium maintenant"

### Étape 3 : Instructions de paiement s'affichent
- **T-Money** : *145# → Transfert → 5 000 FCFA
- **Flooz** : *155# → Transfert → 5 000 FCFA
- Vos numéros de réception (à configurer)
- WhatsApp de contact pour confirmation

### Étape 4 : L'utilisateur paie et vous contacte
- Il note son code de transaction (ex: TM123456789)
- Il vous envoie par WhatsApp : email + code transaction
- Vous activez manuellement son compte Premium

---

## 🔧 Configuration à faire

### 1. Remplacer les numéros de paiement

Dans le fichier `public/app.js`, ligne 488 et 497, remplacez :
```javascript
<p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">XX XX XX XX XX</p>
```

Par vos vrais numéros T-Money et Flooz :
```javascript
<p style="margin:10px 0;font-size:24px;font-weight:bold;color:#059669;">90 12 34 56</p>
```

### 2. Remplacer le WhatsApp de contact

Ligne 505, remplacez :
```javascript
<p style="margin:5px 0;">2. Contactez-nous par WhatsApp au <strong>XX XX XX XX XX</strong></p>
```

Par votre vrai numéro WhatsApp :
```javascript
<p style="margin:5px 0;">2. Contactez-nous par WhatsApp au <strong>90 12 34 56</strong></p>
```

---

## 👨‍💼 Comment activer Premium manuellement

Quand un utilisateur vous envoie son code de transaction :

### Méthode 1 : Via API (recommandé)

```bash
curl -X POST https://votre-app.replit.app/api/admin/activate-premium \
  -H "Content-Type: application/json" \
  -b "cookies.txt" \
  -d '{
    "userEmail": "client@example.com",
    "transactionId": "TM123456789",
    "paymentMethod": "tmoney"
  }'
```

**Note** : Vous devez être connecté pour utiliser cet endpoint.

### Méthode 2 : Via SQL (alternative)

Connectez-vous à votre base de données PostgreSQL et exécutez :

```sql
UPDATE subscriptions 
SET 
  plan = 'premium',
  status = 'active',
  payment_method = 'tmoney',
  amount = 5000,
  transaction_id = 'TM123456789',
  started_at = NOW(),
  expires_at = NOW() + INTERVAL '1 month'
WHERE user_id = (SELECT id FROM users WHERE email = 'client@example.com');
```

---

## 🚀 Passer au Paiement Automatique (PayGate)

Quand vous serez prêt pour des paiements automatiques :

### 1. Créez un compte PayGate
- Visitez : https://www.paygateglobal.com/
- Inscrivez-vous comme marchand
- Complétez la vérification KYC
- Liez vos comptes T-Money et Flooz

### 2. Suivez le guide complet
- Consultez `PAYGATE_INTEGRATION.md`
- Installez les dépendances (axios)
- Ajoutez vos identifiants API dans les Secrets Replit
- Implémentez les endpoints `/api/payment/initiate` et `/api/paygate/callback`

### 3. Avantages du paiement automatique
- ✅ Activation instantanée (pas d'intervention manuelle)
- ✅ Moins d'erreurs
- ✅ Meilleure expérience utilisateur
- ✅ Dashboard PayGate pour suivre les paiements
- ✅ Règlement automatique : J+1 (Flooz), tous les 10 jours (T-Money)

---

## 💡 Conseils

### Sécurité
- Ne partagez jamais vos identifiants API PayGate
- Stockez toujours les secrets dans Replit Secrets, jamais dans le code
- Vérifiez toujours les codes de transaction avant activation

### Support Client
- Répondez rapidement aux demandes d'activation (promesse : 24h)
- Gardez une trace des transactions dans un spreadsheet
- Envoyez une confirmation par email quand Premium est activé

### Suivi des revenus
- Utilisez le dashboard PayGate pour voir vos revenus
- Pour les paiements manuels, notez chaque transaction
- Conservez les preuves pour la comptabilité

---

## 📊 État actuel du système

✅ **Fonctionnel** :
- Interface utilisateur complète
- Instructions de paiement T-Money/Flooz
- Endpoint d'activation manuelle
- Gestion des abonnements en base de données
- Limite d'acteurs : 2 (gratuit) vs illimité (premium)
- Badge Premium sur les fiches acteurs

⏳ **À configurer** :
- Vos numéros T-Money et Flooz dans `app.js`
- Votre numéro WhatsApp de contact
- (Optionnel) Compte PayGate pour paiement automatique

---

## 🎉 Prochaines étapes

1. **Configurez vos numéros** dans `public/app.js`
2. **Testez le flux complet** : créez un compte → cliquez sur Abonnement → voyez les instructions
3. **Activez manuellement un Premium** pour tester
4. **Déployez** votre application sur Replit
5. **Plus tard** : Intégrez PayGate pour automatiser

---

## ❓ Questions fréquentes

**Q : Comment savoir si un utilisateur a vraiment payé ?**  
R : Demandez-lui le code de transaction et vérifiez sur votre compte T-Money/Flooz.

**Q : Que se passe-t-il après 1 mois ?**  
R : L'abonnement expire automatiquement. L'utilisateur devra repayer pour renouveler.

**Q : Puis-je offrir un essai gratuit Premium ?**  
R : Oui ! Utilisez l'endpoint admin avec un `transaction_id` comme "TRIAL-email@example.com".

**Q : Comment annuler un Premium ?**  
R : Connectez-vous à la base de données et changez `plan='free'` dans la table subscriptions.

---

Bon succès avec AgriRéseau Pro ! 🌾🇹🇬
