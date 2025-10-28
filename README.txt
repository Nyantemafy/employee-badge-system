EMPLOYEE BADGE SYSTEM - GUIDE D'UTILISATION

1) INSTALLATION
- Téléchargez le dossier complet du projet.
- Double-cliquez sur index.html pour ouvrir l'application dans votre navigateur.
- Aucune installation de serveur n'est nécessaire.

2) INTERFACES
- Ajouter Employé: Formulaire pour saisir Prénom, Nom, Téléphone, Titre.
  • À l'enregistrement, un ID est généré automatiquement (EMP0001, EMP0002, ...).
  • Les données sont enregistrées dans le navigateur (localStorage) sur cet ordinateur.

- Liste des Employés: Affiche la liste. Vous pouvez rechercher par nom ou ID.
  • Bouton "Télécharger Excel": Exporte toutes les données en fichier Excel nommé
    employees_YYYY-MM-DD_HH-mm.xlsx

- Détail Employé: Cliquez un employé dans la liste pour voir son détail.
  • Un QR code est généré (ID, Nom, Téléphone, Titre).
  • Bouton "Télécharger Badge PDF": Génère un badge en PDF au format A7 portrait.

-- Paramètres: (supprimé) L'application fonctionne sans configuration.

3) COMPORTEMENT DES TÉLÉCHARGEMENTS (IMPORTANT)
- En mode double-clic (file://), les fichiers sont toujours enregistrés dans le dossier
  "Téléchargements" configuré par votre navigateur.
- L'application nomme clairement les fichiers pour faciliter le classement manuel:
  • badge_EMPxxxx.pdf
  • employees_YYYY-MM-DD_HH-mm.xlsx

4) FORMAT DES DONNÉES
- Champs employés: id, firstName (prénom), lastName (nom), phone (téléphone), title (titre).
- Export Excel: Colonnes correspondantes.

5) CRÉATION DES BADGES PDF (A7)
- Format: A7 portrait, texte (ID, Nom, Téléphone, Titre) et QR code centré.
- Fichier: badge_EMPxxxx.pdf

6) SAUVEGARDE DES DONNÉES
- Les données sont stockées dans le localStorage du navigateur.
- Si vous videz le cache ou changez d'ordinateur/navigateur, la liste sera vide.
  Exportez régulièrement en Excel si vous souhaitez conserver une copie externe.

7) BONNES PRATIQUES
- Définissez vos chemins cibles dans Paramètres dès le début.
- Après chaque téléchargement, déplacez le fichier vers le dossier indiqué (Badges / Historique).
- Conservez des sauvegardes régulières de votre fichier Excel d'historique.

8) SUPPORT
- Personnalisation CSS: modifier style/styles.css
- Logo/couleurs: ajoutez votre logo et ajustez les couleurs CSS si nécessaire.

FIN.
 
 
