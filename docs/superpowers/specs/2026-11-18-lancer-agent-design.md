# Lancer le travail depuis Start work

## 1. Demande initiale

> « pour les issues et les tickets Jira à faire, est-il possible d'avoir une action qui permette de lancer un agent
> pour soit appeler /bugfix pour une issue, soit m'attribuer le ticket et le passer à "en cours" puis appeler
> /feature ou /bugfix en fonction du type du ticket »

**But** : depuis le dialogue Start work (`ctrl-shift-i`), passer d'une issue ou d'un ticket à un agent qui travaille
dessus, sans recopier l'URL ni toucher à Jira à la main.

## Langage

Termes du glossaire (`docs/domaine.md`, contexte Start work, complété par l'analyse `ddd`) :

- **Ouvrir** : afficher l'élément dans le navigateur. C'est ce que fait Entrée aujourd'hui, et ça ne change pas.
- **Lancer le travail** : depuis une issue ou un ticket, démarrer un **agent** (une session `claude` dans un nouvel
  onglet Herdr du repo) dont la première demande est la skill et l'élément (`/bugfix <url>`).
- **Prise en charge** d'un ticket : me l'attribuer, puis le passer au statut « En cours ». Elle précède toujours le
  lancement.
- **Type de ticket** : le champ Jira `issuetype` (Bug, Bogue, Story, Tâche, Epic…). Il décide de la skill lancée.

L'onglet PR n'a pas l'action : la demande ne vise que les issues et les tickets.

## Comportement

### Déclencher l'action

Le geste : **Ctrl+Entrée** (Cmd+Entrée sur macOS), et un bouton « Lancer » sur la ligne survolée ou sélectionnée (décidé en relecture).

Le bas du dialogue rappelle le geste dans les onglets Issues et Jira : « Entrée ouvrir · Ctrl+Entrée lancer
le travail » (« Cmd+Entrée » sur macOS, où le modificateur secondaire est Cmd).

### Issue GitHub

Lancer le travail sur l'issue `#12` du repo `owner/repo` :

1. ouvre un nouvel onglet dans l'espace du terminal focalisé, dans son dossier (`cwd`), nommé `#12` ;
2. y démarre `claude` avec la première demande `/bugfix https://github.com/owner/repo/issues/12` ;
3. ferme le dialogue.

Toujours `/bugfix`, quel que soit le label de l'issue (demande telle quelle). L'issue n'est ni attribuée ni
modifiée sur GitHub.

### Ticket Jira

Lancer le travail sur le ticket `POSO-127` :

1. **prise en charge** : `acli jira workitem assign --key POSO-127 --assignee @me --yes`, puis
   `acli jira workitem transition --key POSO-127 --status "En cours" --yes` ;
2. ouvre un nouvel onglet dans l'espace du terminal focalisé, dans son dossier, nommé `POSO-127` ;
3. y démarre `claude` avec `/bugfix POSO-127 <url du ticket>` si son type est un bug, `/feature POSO-127 <url du
   ticket>` sinon ;
4. ferme le dialogue.

Pendant la prise en charge, la ligne affiche « Prise en charge… » à la place de sa colonne meta. Tant qu'un lancement est en cours (prise en charge ou ouverture de l'onglet), Entrée, Échap et le clic sur une ligne sont ignorés : fermer le dialogue arrêterait la prise en charge entre l'attribution et la transition, sans toast ni agent (décidé en review finale, M5 ; clic sur une ligne ajouté en review de la PR).

Un seul lancement à la fois dans le dialogue : pendant une prise en charge, tout Lancer (même sur un autre ticket) est ignoré (décidé en relecture).

Type de ticket → skill : `Bug` et `Bogue` (nom exact, sans tenir compte de la casse) → `/bugfix` ; `Epic` et
`Initiative` → refus (ci-dessous) ; tout autre type → `/feature`.

Epic et Initiative n'ont pas l'action : Lancer affiche le toast « POSO-12 est un Epic. Lance plutôt une de ses stories », sans prise en charge (décidé en relecture).

Le statut cible est fixe : « En cours ». Un projet qui le nomme autrement échoue à la transition, avec le toast de la table Échecs (décidé en relecture).

Ticket attribué à quelqu'un d'autre : Lancer demande confirmation (« POSO-127 est attribué à Alice. Le prendre ? »). Oui → prise en charge puis agent ; Non → rien, le dialogue reste ouvert (décidé en relecture). Pendant la confirmation, tout Lancer, tout changement d'onglet et le clic sur une ligne sont ignorés ; Entrée ou Échap en sortent (décidé en relecture du plan ; clic sur une ligne ajouté en review de la PR).

Ticket déjà à moi : `assign` n'est pas rappelé. Ticket déjà au statut « En cours » : `transition` n'est pas rappelé
(Jira refuse une transition vers le statut courant). Un ticket à moi et « En cours » lance donc l'agent directement.

Ont l'action : les tickets de catégorie de statut « à faire » (`new` : À faire, Backlog, Selected for Development…) et ceux au statut « En cours » qui sont à moi (reprendre un travail). Les autres (Code Review, VAL PR, Bloqué, « En cours » d'un autre…) : toast « POSO-127 est déjà en Code Review », sans prise en charge (décidé en relecture).

### Échecs

Aucun agent ne démarre si une étape précédente échoue ; le dialogue reste ouvert et un toast d'erreur
(`notify`, niveau `error`) dit l'étape et la première ligne de sortie d'`acli` :

| Étape | Toast |
|---|---|
| lecture de l'assigné (`currentUser()`) | « Prise en charge de POSO-127 impossible » + sortie d'`acli` |
| attribution | « Attribution de POSO-127 impossible » + sortie d'`acli` |
| transition | « POSO-127 n'a pas pu passer « En cours » » + sortie d'`acli` (il reste attribué : l'attribution n'est pas annulée) |
| ouverture de l'onglet (`tab.new`) | « Agent non lancé » + erreur de Herdr |

Après un échec, la ligne reprend sa colonne meta et la liste Jira est rechargée : une attribution réussie avant une
transition refusée se voit, et un second Lancer ne repose pas de question sur l'ancien assigné.

L'onglet s'ouvre par `herdr-app do tab.new …` (lancé avec `exec`), qui rend l'erreur et sort en échec : le toast « Agent non lancé » et le dialogue gardé ouvert restent possibles (décidé en relecture ; `run()` ne rend rien).

## 2. Portée de chaque règle

| Endroit | Ce qu'il devient |
|---|---|
| `main.js` `submit` (Entrée, via `InputState`, qui a le focus) | l'événement porte les modificateurs (`gpui-kit.d.ts`, « Submit events carry key modifiers ») : `e.secondary` (Ctrl, Cmd sur macOS) → `start(item)` dans `issue` et `jira`, sans effet dans `pr` ; pendant un lancement : ignoré ; sinon inchangé (ouvre, ou enregistre la source Jira) |
| `main.js` `on_key_down` | Échap avec une confirmation en cours : l'annule sans fermer le dialogue ; pendant un lancement : ignoré ; sinon inchangé |
| `main.js` `init` | garde aussi `this.space = f?.space`, l'espace où ouvrir l'onglet de l'agent |
| `main.js` `render` (ou `rows.js`) | pied de dialogue, seulement dans `issue` et `jira`, et seulement quand la liste montre des éléments (masqué pendant le chargement, en erreur, sans source Jira, liste ou filtre vide ; décidé en review finale, P3) : « Entrée ouvrir · Ctrl+Entrée lancer le travail » |
| `main.js` `loadJira` | `--fields` ajoute `issuetype` ; chaque ticket garde `type` (nom du type), `statusName`, `statusCategory` (`status.statusCategory.key` : `new` / `indeterminate`) et le nom de l'assigné (`assigneeName`, pour la confirmation) pour les règles ci-dessus. `meta` inchangé (`statut · assigné`) |
| `main.js` `loadGh` | sort dans `launch.js` (`fetchGh`) pour tenir 200 lignes, comportement inchangé ; l'URL de l'issue (`url`) sert déjà à l'ouvrir |
| `main.js` `open` | sort dans `launch.js` (`openItem`, `openUrl`), comportement inchangé |
| nouveau `start.js` (pur, testé par `start.test.js`) | `skillFor(type)` (`/bugfix`, `/feature`, ou `null` pour Epic et Initiative), `agentTask(kind, item)` (texte de la première demande), `refusal(item, mine)` (texte du toast de refus, ou `null` si le ticket a l'action : type, catégorie de statut, « En cours » à moi), `askBeforeTaking(item, mine)`, `decide(item, mine)` (`{refusal}`, `{ask}` ou `{take}`, dans cet ordre), `takeSteps(item, mine)` et `takeWith(steps, run)` (assign puis transition, en sautant ce qui est déjà fait ; `{title, body}` du premier échec ou `null`), `ticketRow`, `footerText(tab, platform, confirming, empty)` (pied ou libellé de confirmation ; `null` quand rien n'est listé), `tabError`, `firstLine` (aussi importée par `run.js`) |
| nouveau `launch.js` (importe `herdr`) | tous les appels extérieurs de Start work : `fetchTickets` (ex-`loadJira`), `fetchGh` (ex-`loadGh`), `openItem` et `openUrl` (ex-`open`), `originRepo`, `isMine(key, machine)`, `takeTicket(item, mine, machine)` (= `takeWith` avec `acli` sur la machine), `assess(item, machine)` (lit l'assigné, émet les toasts de refus ou d'échec, rend `{mine, ask}` ou `{stop}`) et `launchAgent(item, space, cwd, task)` (`exec("herdr-app", ["do", "tab.new", …])`, décision Échecs) |
| `rows.js` `listRow` | le bouton « Lancer » (onglets `issue` et `jira`, ligne survolée ou sélectionnée) et l'état « Prise en charge… » |
| confirmation (ticket attribué à un autre) | dans le dialogue Start work, à la place du pied : « POSO-127 est attribué à Alice. Le prendre ? Entrée oui · Échap non ». Le mod `confirm` de Herdr ne peut pas servir : il ne sait que lancer une commande de l'app, pas rappeler Start work. Pendant la confirmation, Échap l'annule sans fermer le dialogue, et Entrée ne fait rien d'autre |
| `mod.json` `overlay` | `kind: "window"` au lieu de `"popup"` (décidé en review de la PR, R3) : un clic à côté ne ferme plus le dialogue, et Échap va au mod, qui le ferme sauf pendant une confirmation ou un lancement. Centré, même taille. Un bouton « × » à droite des onglets (`rows.js` `header`) la ferme, sauf pendant un lancement (`dismiss`, même garde qu'Échap ; pendant une confirmation il ferme, rien n'est encore écrit dans Jira). Un second `ctrl-shift-i` (`mod.open`) le ferme encore : geste explicite, que le mod ne peut pas intercepter |
| `filter.js` `matches` | inchangé : le filtre porte toujours sur id, titre, meta, tag |
| `README.md` § Start work | décrit Ctrl+Entrée, la prise en charge et la correspondance type → skill |
| `docs/domaine.md` | termes Ouvrir, Lancer le travail, Agent, Type de ticket, Prise en charge (ajoutés par `ddd`) |
| `.config.json` | inchangé (statut fixe) |

Mon identité Jira (« le ticket est-il à moi ? ») : au moment du Lancer, `acli jira workitem search --jql "key =
POSO-127 AND assignee = currentUser()"` ; un résultat = à moi. `acli jira auth status` ne donne pas d'accountId, et
l'`emailAddress` de l'assigné est masqué par la confidentialité Jira (vérifié à l'étape 1b).

## 3. Données existantes

Aucune donnée stockée par le mod n'est touchée. Côté Jira, la prise en charge modifie le ticket (assigné, statut) :
c'est le but de l'action, et elle n'est jamais annulée en cas d'échec ultérieur.

## 4. Critères d'acceptation

**P1 — Lancer le travail sur une issue**

- Sur l'issue `#12`, Lancer ouvre un onglet `#12` dans l'espace du terminal focalisé, dans son dossier, avec
  `claude` et la demande `/bugfix https://github.com/owner/repo/issues/12` ; le dialogue se ferme.
- Entrée sur la même issue ouvre toujours le navigateur, sans lancer d'agent.
- Lancer dans l'onglet PR ne fait rien.
- Liste vide ou filtre sans résultat : Lancer ne fait rien, et le pied « Ctrl+Entrée lancer le travail » est masqué
  (comme pendant le chargement et en erreur).
- `herdr-app do tab.new` en erreur : toast « Agent non lancé » avec l'erreur rendue, dialogue ouvert.

**P2 — Prendre en charge un ticket et lancer**

- Ticket `Story` à faire, non attribué : il m'est attribué, passe « En cours », puis l'agent `/feature POSO-127
  <url>` démarre dans l'onglet `POSO-127`.
- Ticket `Bogue` (MM) ou `Bug` (POSO) : agent `/bugfix`.
- Ticket à moi et déjà « En cours » : ni `assign` ni `transition`, l'agent démarre.
- Ticket à moi, à faire : seulement `transition`.
- Attribution refusée : toast, ticket inchangé, pas d'agent.
- Transition refusée (statut inconnu du workflow) : toast qui nomme « En cours », ticket attribué, pas d'agent.
- Deux Lancer rapides sur le même ticket : une seule prise en charge, un seul agent.
- Ticket `Story` à faire attribué à Alice : confirmation « POSO-127 est attribué à Alice. Le prendre ? » ; Oui →
  attribué à moi, « En cours », agent ; Non → rien.
- Ticket « En cours » à moi : l'agent démarre sans prise en charge. « En cours » à Alice : toast « déjà en En cours »,
  pas de confirmation.
- Ticket « Code Review » ou « Bloqué » : toast « POSO-127 est déjà en Code Review », Jira inchangé.
- Epic ou Initiative à faire : toast « Lance plutôt une de ses stories », Jira inchangé.
- Pendant la prise en charge de A, Lancer sur B : ignoré.
- Pendant la prise en charge, Échap, Entrée et clic sur une ligne : ignorés, le dialogue reste ouvert jusqu'à l'agent ou au toast.
- Onglet Jira sans source (panneau de saisie) : pas de pied « Ctrl+Entrée ».
- Cas combinés : `Bogue` attribué à Alice et « Bloqué » → toast de statut, sans confirmation (le statut se vérifie
  avant l'assigné) ; Epic attribué à Alice → toast Epic, sans confirmation (le type se vérifie en premier) ;
  `Bogue` à faire attribué à Alice, confirmé → agent `/bugfix`.

Tant que P2 n'est pas livrée : dans l'onglet Jira, Lancer ne fait rien et le rappel du bas ne mentionne que Entrée.

## 5. Filet sur l'existant

`toJql`, `jiraSource`, `withSource`, `profileAccount`, `prStatus`, `GH_LISTS` et `matches` sont déjà testés et ne
changent pas. `open`, `submit` et `on_key_down` (`main.js`) n'ont aucun test : ils ne se chargent pas sous node.
Leur comportement actuel (Entrée ouvre, Tab change d'onglet, ↑/↓, Échap) se vérifie par `herdr-app check` et dans
l'app avant et après la feature. Les règles nouvelles vont dans `start.js`, testé.
Ajouté après la review de risque de la PR : `fake.js` remplace `herdr`, `gpui-kit` et `gpui-base` sous node ;
`launch.test.js` fige les appels `acli` et `herdr-app` (arguments, machine, échecs) et `main.test.js` le parcours du
dialogue (Ctrl+Entrée, Entrée, Échap, Tab, confirmation, prise en charge en cours, échecs d'attribution et d'onglet).

## 6. Origine

Demande nouvelle de l'utilisateur, après `a3dca88` (statut des PR). Hors périmètre : attribuer l'issue GitHub ou
choisir `/feature` selon ses labels (la demande dit `/bugfix`), lancer l'agent dans un worktree, choisir l'agent
(autre que `claude`), annuler une prise en charge.

## 7. Dette du code touché

- `main.js` fait 199 lignes : toute ligne ajoutée passe le seuil de 200. Proposé : **corrigé dans cette PR**, la
  logique nouvelle va dans `start.js` et `launch.js`, et `main.js` n'ajoute que l'appel (`start(item, cx)`) ; s'il
  dépasse encore, `loadJira` (37 lignes) sort dans `launch.js` sous le nom `fetchTickets`, sans changement de
  comportement.
- `loadJira` (37 lignes, au-delà de 20) : touchée (champ `issuetype`). Proposé : **corrigé dans cette PR** par la
  même extraction, l'appel `acli` et la construction des lignes sortant de la méthode.
- Réalisé : pour tenir 200 lignes, `loadGh`, `open` et `originRepo` sont aussi sortis dans `launch.js`, et la
  décision et la boucle de prise en charge dans `start.js` (`decide`, `takeWith`, testées). `main.js` : 200 lignes.

## Non vérifié

Que `claude` démarré par `tab.new` prenne le profil du projet (Atlassian n'est actif que dans le profil vidal) :
`tab.new` lance l'agent dans le shell interactif de l'utilisateur, dans le dossier du repo, comme un `claude` tapé à
la main. À vérifier en recette.
