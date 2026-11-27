# Panneau PR : la PR de la branche affichée, à droite

Date : 2026-11-27

## Intention

Voir d'un coup d'œil, sans quitter le terminal, où en est la PR de la branche sur laquelle je travaille : ses
approbations, si ma relecture est demandée, sa CI et Sonar, ses retours et sa description. Idée reprise du harnais
Vidal (`softwarevidal/harnais`, mods `pr-agents` et `pr-inbox`), dont aucun panneau ne montre tout ça.

## Approches

- A : installer `pr-agents` du harnais. Écartée : pas de description, de commentaires ni de « relecture demandée »,
  et il embarque la surveillance (agents, force-push, merge armé), dont je ne veux pas.
- **B (retenue)** : nouveau mod perso `pr-panel`, posé à droite, qui reprend ce qui existe : compte `gh` par profil
  et approbations de `start-work`, fils de relecture de `pr-inbox`, lecture des checks de `pr-agents`.
- C : une vue « PR courante » dans le dialogue start-work. Écartée : c'est un dialogue, pas un panneau à côté.

## Objectifs

- Un panneau `mods/pr-panel/` (`"place": "right"`) qui suit le terminal focalisé : dossier → dépôt `origin` →
  branche → PR ouverte de cette branche (`gh pr view <branche> --repo <owner/repo>`).
- Compte `gh` : celui du profil dont les `owners` contiennent le propriétaire du dépôt (`~/.claude/profiles.json`),
  sinon le compte actif, comme start-work. Marche pour les dépôts perso comme Vidal, rien sous `/profile`.
- Il affiche :
  - titre (clic : la PR sur GitHub), numéro, statut Prête / Brouillon, `+add −del`, nombre de fichiers ;
  - **Approbations** : `n/2` et chaque relecteur avec son dernier avis décisif (même règle que `myPrMeta`) ;
  - **Ta relecture** : « demandée » si la PR est d'un autre et me demande une relecture (à moi ou une de mes
    équipes), avec le bouton Relire ;
  - **CI** : résumé des checks (`n en échec · n en cours · n ✓`) puis une ligne par check en échec ou en cours,
    cliquable vers son URL ;
  - **Sonar** : le check dont le nom contient « sonar » (casse ignorée) sorti de la ligne CI, avec son état et un
    clic vers l'analyse ; absent du dépôt : pas de ligne ;
  - **Retours** : fils de relecture et commentaires hors fil (même règle d'attente que start-work, `isPending`),
    les fils en attente d'abord, avec le bouton Retours sur une de mes PR ;
  - **Description** : le corps de la PR en markdown (`TextView.markdown`).
- Relire lance `/pr <n> review`, Retours `/pr <n> comments`, dans un nouvel onglet de l'espace, comme start-work.
- Rafraîchissement : au changement de terminal focalisé ou de dossier, au clic sur ↻, et toutes les 2 min tant
  que la fenêtre est visible (`window()?.visible`).
- États : hors dépôt git ou sans `origin` GitHub (« Pas de dépôt GitHub »), pas de PR pour la branche (« Pas de PR
  pour `<branche>` »), lecture en cours, échec de `gh` (message court, ↻ pour réessayer).

## Non-objectifs

- La surveillance de `pr-agents` (agents, squash, merge armé), Jenkins par `jk`, les déploiements dockersw.
- Répondre aux commentaires, approuver ou merger depuis le panneau.
- La vue tous dépôts de `pr-inbox`, ses toasts.
- Le reste du harnais côté Claude (plugin `harnais@harnais`, profil vidal) : chantier séparé.

## Laissé au constructeur

- Réutiliser les fonctions de start-work (`profileAccount`, `ghCommand`, `myPrMeta`, `isPending`) par import
  relatif `../start-work/…` si `herdr-app check` l'accepte ; sinon les déplacer dans un module partagé plutôt que
  les copier.
- Les requêtes `gh` exactes (une `gh pr view --json` plus la requête GraphQL des fils), le placement à côté des
  panneaux Files et Changes du layout `main`, à vérifier dans l'app.
- Une entrée « Panneau PR » dans `docs/domaine.md`, `!/mods/pr-panel/` dans `.gitignore`, une section au README.
