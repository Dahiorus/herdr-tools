# Panneau PR : la PR courante, à droite

Date : 2026-11-27 · Contexte : **Panneau PR** (`docs/domaine.md`), noyau partagé avec Start work.

## 1. Demande initiale

> voici le harnais commun à tous les projets vidal : https://github.com/softwarevidal/harnais […] il y a des panels
> intéressants à récupérer, comme le panel pr-inbox par exemple

> une vue rapide dans un panel à droite de la pr courante avec des informations comme les approves, si je dois
> review, comments, la description

> oui, B en ajoutant la CI, Sonar

B : un nouveau mod perso qui reprend les morceaux existants (start-work, `pr-inbox` et `pr-agents` du harnais), plutôt
qu'installer `pr-agents` (A) ou une vue dans le dialogue start-work (C).

Approches écartées :
- A, `pr-agents` du harnais : pas de description, de fils ni de « relecture demandée », et il embarque la
  surveillance (agents, force-push, merge armé).
- C, une vue dans le dialogue start-work : un dialogue qu'on ouvre, pas un panneau à côté du terminal.

## 2. Portée de chaque règle

### R1. Le panneau suit la PR courante du terminal focalisé

`focused()` → pane focalisé de `panes()` (son `cwd` et sa `branch`, tenus à jour par Herdr) → `origin` GitHub → PR
courante. Plusieurs PR ouvertes pour la branche (vers deux bases) : toutes, l'une sous l'autre, chacune avec ses
sections. Les PR venant d'un fork ne sont pas cherchées. Le focus passe sur un pane qui n'est pas un terminal
(Files, Changes, un autre mod) : le panneau garde la dernière PR affichée. La branche vient de Herdr, pas de `git branch` : un `git switch` dans le même terminal change `branch`, ce
qui redessine le panneau sans attendre. `git` et `gh` tournent sur la machine de l'espace du terminal (`on`), comme
Start work. Chaque état a son affichage (voir §4) ; premier chargement et changement de terminal ou de branche :
« Chargement… » ; ↻ et le rafraîchissement des 120 s gardent l'affichage jusqu'à la réponse.

| Endroit | Ce qu'il devient |
|---|---|
| `mods/pr-panel/` (nouveau : `mod.json`, `main.js`, `pr.js`, `load.js` et leurs tests) | Le panneau, posé à droite par `"place": "right"` |
| `originRepo` (`mods/start-work/launch.js:47`) | Sa regex sort dans `githubRepo(url)` (module pur), qu'il appelle : comportement inchangé |
| `ghCommand`, `GH_AS` (`mods/start-work/run.js:7-8`) | Déplacés dans `mods/start-work/profile.js`, réexportés par `run.js` : appelants (`launch.js:82,103,124`) inchangés |
| `profileAccount` (`profile.js:9`) | Réutilisé tel quel |
| Layout `main` (livré par Herdr) | Inchangé : le panneau s'y pose par `"place"` la première fois, sans clone du layout |

Un mod importe `../start-work/*.js`. `run.js` et `launch.js` importent `herdr` et ne tournent pas sous node, d'où les
déplacements vers `profile.js`, déjà pur et testé.

### R2. Contenu affiché

| Section | Source | Règle |
|---|---|---|
| En-tête | `gh pr list --json number,title,url,isDraft,…` | titre (clic : Ouvrir), `#n`, Statut de PR, `+add −del · n fichiers` |
| Approbations | `reviews` | Une par relecteur, sur son dernier avis décisif. Sur mes PR, le libellé de Start work (`myPrMeta` : « n/2 », « Prête pour la QA », « Changements demandés ») ; sur la PR d'un autre, toujours « n/2 ». Dessous, un relecteur par ligne : login, puis ✓ (approuvé, vert) ou « changements demandés » (rouge) ; un relecteur qui n'a fait que commenter n'y figure pas |
| Ma relecture demandée | `gh pr list --head <branche> --search review-requested:@me` | Seulement sur la PR d'un autre, demande à moi ou à une de mes équipes (même recherche que Start work) |
| CI | `statusCheckRollup` hors Sonar | Résumé `n en échec · n en cours · n ✓`, puis un check par ligne en échec ou en cours, cliquable |
| Analyse Sonar | checks dont le nom contient « sonar » | Une ligne, au pire état de ces checks, cliquable comme un check ; absente sans check Sonar |
| Fils et commentaires | GraphQL `reviewThreads` + commentaires de la conversation + texte des avis | Sur mes PR, fils en attente de ma réponse d'abord (`isPending`) ; sur la PR d'un autre, fils non résolus d'abord. Puis les commentaires hors fil. Un fil : `fichier:ligne`, puis chaque commentaire « auteur : texte » (réponses en retrait). Un commentaire hors fil : « auteur : texte ». Mes propres commentaires hors fil ne sont pas listés. Les commentaires des bots (Sonar, Jenkins, Copilot…) sont montrés en gris. Titre « Fils et commentaires » partout, suivi sur mes PR du compte des fils en attente (« 2 en attente ») |
| Description | `body` | Markdown ; vide : « Pas de description » |

État d'un check : `SUCCESS`, `NEUTRAL`, `SKIPPED` → réussi ; `FAILURE`, `ERROR`, `CANCELLED`, `TIMED_OUT`,
`ACTION_REQUIRED`, `STARTUP_FAILURE` → en échec ; le reste → en cours (table de `pr-agents`).

| Endroit | Ce qu'il devient |
|---|---|
| `isPending`, `prStatus`, `APPROVALS_FOR_QA` (`mods/start-work/github.js`) | Réutilisés tels quels |
| `lastVerdicts` (`github.js:71`, privé) | Exporté et rendu par relecteur (login → état) ; `myPrMeta` construit dessus, comportement inchangé (tests de `github.test.js` verts) |
| `THREADS_QUERY` (`github.js:36`) | Inchangé : il cherche mes PR sans le texte des commentaires. Le panneau a sa requête, dans `mods/pr-panel/pr.js` |
| Onglet PR de start-work | Inchangé |

### R3. Lancer le travail depuis le panneau

| Bouton | Quand | Effet |
|---|---|---|
| Relire | Ma relecture demandée | `/pr <n> review` dans un nouvel onglet de l'espace (`launchAgent`) |
| Retours | Une de mes PR avec au moins un fil en attente | `/pr <n> comments`, idem |

`launchAgent` (`launch.js:26`) est réutilisé tel quel. Il est importé depuis `main.js`, qui tourne dans Herdr.

### R4. Rafraîchissement

Au changement de `focused().cwd` ou `focused().terminal`, au clic sur ↻, et toutes les 120 s tant que
`window()?.visible`. Une réponse arrivée pour un ancien terminal est ignorée.

### Ce qui n'est pas repris du harnais

La surveillance de `pr-agents` (agents, squash, merge armé), Jenkins par `jk`, les déploiements dockersw, la vue
tous repos et les toasts de `pr-inbox`, le plugin `harnais@harnais` côté Claude.

## 3. Données existantes

Aucune donnée écrite. `mods/start-work/.config.json` et `~/.claude/profiles.json` sont lus comme avant, sans
changement de format.

## 4. Critères d'acceptation

Une seule story : la demande ne se découpe pas (les boutons ne servent à rien sans le panneau).

### P1. Voir la PR courante et lancer le travail dessus

Nominaux :
- Une de mes PR prête, 1 approbation d'alice, CI 1 en échec et 2 réussis, Sonar réussi, un fil d'alice en attente et
  une description : le panneau montre « Prête », « 1/2 » avec alice ✓, la ligne CI et le check en échec, Sonar ✓, le
  fil d'alice en tête, le bouton Retours, la description en markdown.
- La PR de bob qui me demande une relecture : « demandée » et le bouton Relire ; pas de bouton Retours ; « 1/2 »
  même avec 2 approbations ou une demande de changements (visible dans la liste des relecteurs) ; ses fils non
  résolus d'abord.
- La branche a deux PR ouvertes : les deux, l'une sous l'autre.
- Focus sur le panneau Files : le panneau PR garde la PR affichée.
- Un commentaire hors fil de `sonarqubecloud[bot]` : affiché en gris.
- Clic sur le titre ou sur un check : ouvert dans le navigateur.
- Changer de terminal focalisé vers un autre repo : le panneau montre la PR de ce repo.
- `git switch` vers une autre branche dans le même terminal : le panneau montre la PR de la nouvelle branche.
- Repo Vidal (`softwarevidal/…`) : `gh` tourne avec le compte du profil vidal, même si `GH_TOKEN` est celui de
  Dahiorus.

Refus et états vides :
- Terminal hors repo git, ou `origin` hors GitHub : « Pas de repo GitHub ».
- HEAD détaché (rebase en cours) : « Pas de branche », sans appel `gh`.
- Branche sans PR ouverte (une PR fermée existe pour elle) : « Pas de PR pour `<branche>` ».
- `gh` en échec : sa première ligne d'erreur et ↻.
- PR sans check : ni ligne CI ni Sonar. Sans relecteur : « 0/2 ». Corps vide : « Pas de description ».

Combinés :
- Ma PR sans fil en attente mais avec un commentaire hors fil d'un autre : le commentaire s'affiche, pas de bouton
  Retours.
- La requête des fils échoue mais pas la PR : tout le reste s'affiche, la section des fils dit « Fils non récupérés ».
- Deux checks Sonar, l'un réussi, l'autre en échec : une ligne Sonar en échec ; aucun des deux dans la CI.
- La réponse d'un ancien terminal arrive après le changement de focus : elle ne remplace pas l'affichage du nouveau.
- Sur une de mes PR, même si la recherche `review-requested:@me` la trouvait : pas de « demandée », pas de Relire.

- Le panneau est toujours là après un redémarrage de Herdr.

:::question
Comment ouvrir le panneau PR : un onglet « PR » à côté de Files et Changes, ou une colonne à part ?

Le layout « Herdr » et sa barre d'onglets appartiennent à Herdr : il les remplace à chaque démarrage, une modification directe est annulée. Pour un onglet « PR » à côté de Files et Changes, il faut une copie à soi (un « clone ») du layout et de la barre d'onglets : je les copie une fois, j'y ajoute l'onglet, et Herdr affiche ta copie. Le prix : ta copie ne reçoit plus les améliorations que Herdr apporte à ce layout et à cette barre ; pour les récupérer, on refait la copie et on y remet l'onglet.

- [ ] Onglet « PR » à côté de Files et Changes, avec une copie du layout et de la barre d'onglets — ce que tu demandes ; à refaire quand Herdr fait évoluer sa barre
- [ ] Colonne à part, à droite, ouverte et fermée par un raccourci — aucune copie, suit les mises à jour de Herdr, mais pas d'onglet dans la barre

Recommended: Onglet « PR » à côté de Files et Changes, avec une copie du layout et de la barre d'onglets
:::

## 5. Filet sur l'existant

| Fichier modifié | Couverture actuelle | À écrire avant de le modifier |
|---|---|---|
| `mods/start-work/run.js` (`ghCommand`) | aucun test direct | dans `profile.test.js` : `ghCommand(undefined, ["pr"])` → `["gh", ["pr"]]` ; `ghCommand("bob", ["pr"])` → `["sh", ["-c", GH_AS, "sh", "bob", "pr"]]` |
| `mods/start-work/github.js` (`lastVerdicts`, `myPrMeta`) | `github.test.js` couvre `myPrMeta` | rien : ses tests existants restent la caractérisation |
| `mods/start-work/launch.js` (`originRepo`) | aucun test de la regex | dans `profile.test.js`, sur `githubRepo` une fois extrait : `git@github.com:o/r.git`, `https://github.com/o/r`, `https://github.com/o/r.git` → `o/r` ; `https://gitlab.com/o/r` → `null`. Écrits d'abord contre une copie de la regex lue dans `launch.js`, verts sur `main` |

## 6. Origine

- Panneau PR : demande nouvelle, inspirée de `pr-inbox` et `pr-agents` (`softwarevidal/harnais`,
  `docs/specs/2026-11-16-herdr-pr-inbox-design.md`, `2026-11-20-herdr-pr-watch-design.md`).
- Hors périmètre (§2) : choix de cette spec, à noter au reste à faire s'il en existe un (le repo n'en a pas).

## 7. Dette du code touché

| Méthode | Écart | Décision |
|---|---|---|
| `originRepo` (`launch.js:47`) | lit `r.stdout` avant de tester `r.code` ; regex non testée | Corrigé dans cette PR : extraction `githubRepo`, testée (§5) |
| `ghCommand` (`run.js:8`) | pas de test | Corrigé dans cette PR : test (§5) |
