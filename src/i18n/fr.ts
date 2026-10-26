/**
 * French translation table.
 *
 * Keys are the English source strings. Entries prefixed `context|` win over
 * the bare entry, which is how identical English words get different French
 * ones depending on where they appear ("Engine" the system versus the trade).
 *
 * `tests/i18n.test.ts` fails if any game content is missing an entry here,
 * so adding a room, mission, course or event means adding its French text.
 */
export const FR: Record<string, string> = {
  // =========================================================================
  // UI chrome — top bar, bottom bar, panels, buttons
  // =========================================================================
  'DECK MASTER': 'DECK MASTER',
  TEMPO: 'RYTHME',
  SAVE: 'SAUVEGARDER',
  'END DAY': 'FIN DE JOURNÉE',
  'END DAY ({n} PENDING)': 'FIN DE JOURNÉE ({n} EN ATTENTE)',
  'DAY {n}': 'JOUR {n}',
  'DAY {n} COMPLETE': 'JOUR {n} TERMINÉ',
  'BEGIN DAY {n}': 'COMMENCER LE JOUR {n}',
  'DECK {n}': 'PONT {n}',
  'Day {n}': 'Jour {n}',
  '{n}d ago': 'il y a {n}j',
  d: 'j',
  '{n} days': '{n} jours',
  '(was {n})': '(était {n})',
  STAFF: 'EFFECTIF',
  MISSIONS: 'MISSIONS',
  DEVELOPMENT: 'DÉVELOPPEMENT',
  'CARRIER OVERVIEW': 'VUE D’ENSEMBLE',
  LEGEND: 'LÉGENDE',
  'SHIP STATUS': 'ÉTAT DU NAVIRE',
  STATUS: 'STATUT',
  CONTINUE: 'CONTINUER',
  'CAMPAIGN SEED': 'GRAINE DE CAMPAGNE',
  random: 'aléatoire',
  'CAMPAIGN WON': 'CAMPAGNE GAGNÉE',
  'COMMAND RELIEVED': 'COMMANDEMENT RELEVÉ',
  'Campaign saved': 'Campagne sauvegardée',
  'Could not save — browser storage unavailable':
    'Sauvegarde impossible — stockage du navigateur indisponible',
  'No save found': 'Aucune sauvegarde trouvée',
  'Command a nuclear aircraft carrier one day at a time. The ship is the interface: navigate the decks, inspect the spaces, and manage the people who keep it running. Every decision costs something.':
    'Commandez un porte-avions nucléaire, un jour à la fois. Le navire est l’interface : parcourez les ponts, inspectez les locaux et dirigez les femmes et les hommes qui le font fonctionner. Chaque décision a un coût.',
  'A seed makes a campaign reproducible — the same seed and the same decisions replay exactly.':
    'Une graine rend la campagne reproductible — même graine et mêmes décisions rejouent à l’identique.',
  'DRAG to pan · WHEEL to zoom · SHIFT+WHEEL or ↑↓ to change deck · CLICK a room, person or aircraft':
    'GLISSER pour déplacer · MOLETTE pour zoomer · MAJ+MOLETTE ou ↑↓ pour changer de pont · CLIC sur un local, une personne ou un aéronef',

  // Metrics (bottom bar)
  'metric|AIRCRAFT': 'AÉRONEFS',
  'metric|CREW': 'ÉQUIPAGE',
  'metric|READINESS': 'DISPONIBILITÉ',
  'metric|PRESTIGE': 'PRESTIGE',
  'metric|CREDITS': 'CRÉDITS',
  'metric|SORTIES': 'SORTIES',

  // Legend
  'legend|CREW': 'ÉQUIPAGE',
  'legend|AIRCRAFT': 'AÉRONEF',
  'legend|SYSTEM': 'SYSTÈME',
  'legend|SUPPORT': 'SOUTIEN',
  'legend|ELEVATOR': 'ASCENSEUR',
  'legend|STAIRS / LADDER': 'ESCALIER / ÉCHELLE',
  'legend|IDLE': 'INACTIF',
  'legend|WORKING': 'AU TRAVAIL',
  'legend|TRAINING': 'EN FORMATION',
  'legend|REPAIRING': 'EN RÉPARATION',
  'legend|ALERT': 'ALERTE',

  // Tempo
  'tempo|LOW': 'FAIBLE',
  'tempo|NORMAL': 'NORMAL',
  'tempo|HIGH': 'ÉLEVÉ',
  'tempo|MAXIMUM': 'MAXIMAL',
  'Less fatigue, less wear, fewer accidents — slower mission progress.':
    'Moins de fatigue, moins d’usure, moins d’accidents — progression plus lente.',
  Balanced: 'Équilibré.',
  'Faster progress and more sorties, at the cost of fatigue, wear and accident risk.':
    'Progression plus rapide et davantage de sorties, au prix de la fatigue, de l’usure et du risque d’accident.',
  'Maximum progress. Very high fatigue and wear, high accident risk, bonus prestige if it works.':
    'Progression maximale. Fatigue et usure très élevées, fort risque d’accident, prestige bonus en cas de réussite.',

  // Ship status readout
  MISSION: 'MISSION',
  PROGRESS: 'PROGRESSION',
  PRESTIGE: 'PRESTIGE',
  STANDING: 'RÉPUTATION',
  CREDITS: 'CRÉDITS',
  'CARRIER READINESS': 'DISPONIBILITÉ DU NAVIRE',
  ASSESSMENT: 'ÉVALUATION',
  'AIRCRAFT READY': 'AÉRONEFS PRÊTS',
  'CREW AVAILABLE': 'ÉQUIPAGE DISPONIBLE',
  'CREW MORALE': 'MORAL DE L’ÉQUIPAGE',
  'CREW FATIGUE': 'FATIGUE DE L’ÉQUIPAGE',
  'IN MEDICAL': 'À L’INFIRMERIE',
  'OPEN WORK ORDERS': 'ORDRES DE TRAVAIL OUVERTS',
  'READINESS BREAKDOWN': 'DÉTAIL DE LA DISPONIBILITÉ',
  Aircraft: 'Aéronefs',
  Crew: 'Équipage',
  Maintenance: 'Maintenance',
  Logistics: 'Logistique',
  '{label} {actual} / {min}': '{label} {actual} / {min}',
  '{label} skill {actual} / {min}': 'Compétence {label} {actual} / {min}',
  'Training: {course}': 'Formation : {course}',
  'Already at the highest rank aboard': 'Déjà au grade le plus élevé à bord',
  SUPPLIES: 'APPROVISIONNEMENTS',
  'No active mission': 'Aucune mission en cours',
  'No active mission.': 'Aucune mission en cours.',
  'Overall readiness blends the weighted mean with the single worst component — one collapsed department drags the whole ship down.':
    'La disponibilité globale combine la moyenne pondérée et la composante la plus faible — un service effondré fait chuter tout le navire.',
  'Attention required on deck {n}': 'Attention requise au pont {n}',

  // Readiness assessment
  'readiness|EXCELLENT': 'EXCELLENTE',
  'readiness|READY': 'OPÉRATIONNELLE',
  'readiness|DEGRADED': 'DÉGRADÉE',
  'readiness|LIMITED': 'LIMITÉE',
  'readiness|CRITICAL': 'CRITIQUE',

  // Campaign end
  'The Resolute has reached Legendary standing. Career victory.':
    'Le Resolute a atteint la réputation Légendaire. Victoire de carrière.',
  'The operating account has been unsustainable for ten days. Command relieved.':
    'Le budget de fonctionnement est intenable depuis dix jours. Commandement relevé.',
  'Carrier readiness has been critical for fourteen days. Command relieved.':
    'La disponibilité du navire est critique depuis quatorze jours. Commandement relevé.',

  // =========================================================================
  // Decks and rooms
  // =========================================================================
  'Flight Deck': 'Pont d’envol',
  'FLIGHT DECK': 'PONT D’ENVOL',
  'Hangar Deck': 'Pont hangar',
  'HANGAR DECK': 'PONT HANGAR',
  'Main Deck': 'Pont principal',
  'MAIN DECK': 'PONT PRINCIPAL',
  'Engineering Deck': 'Pont machines',
  'ENGINEERING DECK': 'PONT MACHINES',
  'Crew Deck': 'Pont équipage',
  'CREW DECK': 'PONT ÉQUIPAGE',
  'Support Deck': 'Pont soutien',
  'SUPPORT DECK': 'PONT SOUTIEN',
  'Lower Deck': 'Pont inférieur',
  'LOWER DECK': 'PONT INFÉRIEUR',
  'Hull — Below Waterline': 'Coque — sous la ligne de flottaison',
  'BELOW WATERLINE': 'SOUS LA FLOTTAISON',

  'Landing Area': 'Zone d’appontage',
  LANDING: 'APPONTAGE',
  'Takeoff Area (Catapults)': 'Zone de catapultage',
  CATAPULTS: 'CATAPULTES',
  'Parked Aircraft': 'Aéronefs en parc',
  PARKING: 'PARC',
  'Catapult Control': 'Contrôle catapultes',
  'CAT CTRL': 'CTRL CAT',
  'Island — Bridge & Flight Control': 'Îlot — passerelle et contrôle aérien',
  ISLAND: 'ÎLOT',
  'Radar / Sensors': 'Radar / capteurs',
  RADAR: 'RADAR',
  'Deck Edge Safety Net': 'Filets de sécurité',
  'SAFETY NET': 'FILETS',
  'Ladder / Access': 'Échelle / accès',
  LADDER: 'ÉCHELLE',
  'Aircraft Elevator (Fwd)': 'Ascenseur avant',
  'Aircraft Elevator (Aft)': 'Ascenseur arrière',
  'ELEV FWD': 'ASC AV',
  'ELEV AFT': 'ASC AR',

  'Aircraft Parking (Fwd)': 'Parc aéronefs (avant)',
  'PARKING F': 'PARC AV',
  'Aircraft Parking (Aft)': 'Parc aéronefs (arrière)',
  'PARKING A': 'PARC AR',
  'Aircraft Maintenance Bay 1': 'Baie de maintenance 1',
  'MAINT 1': 'MAINT 1',
  'Aircraft Maintenance Bay 2': 'Baie de maintenance 2',
  'MAINT 2': 'MAINT 2',
  'Avionics Shop': 'Atelier avionique',
  AVIONICS: 'AVIONIQUE',
  'Engine Shop': 'Atelier moteurs',
  'ENGINE SHOP': 'ATELIER MOTEURS',
  'Airframe Work Bays': 'Baies cellule',
  'WORK BAYS': 'BAIES',
  'Ordnance Handling': 'Manutention munitions',
  ORDNANCE: 'MUNITIONS',
  'Parts & Stores': 'Pièces et magasins',
  PARTS: 'PIÈCES',
  'Fueling Point': 'Point de ravitaillement',
  FUELING: 'CARBURANT',
  'Hangar Control': 'Contrôle hangar',
  'HANGAR CTRL': 'CTRL HANGAR',
  'Tool Room': 'Magasin d’outillage',
  'TOOL ROOM': 'OUTILLAGE',

  'Ready Room — Fighter Squadron': 'Salle d’alerte — escadron de chasse',
  'READY 1': 'ALERTE 1',
  'Ready Room — Support Squadron': 'Salle d’alerte — escadron de soutien',
  'READY 2': 'ALERTE 2',
  'Combat Information Center': 'Central opérations',
  CIC: 'CO',
  Communications: 'Transmissions',
  COMMS: 'TRANS',
  'Intelligence & EW': 'Renseignement et guerre électronique',
  'INTEL/EW': 'RENS/GE',
  'Officer Country': 'Carré officiers',
  OFFICERS: 'OFFICIERS',
  'Wardroom / Mess': 'Carré / mess',
  WARDROOM: 'CARRÉ',
  Galley: 'Cuisine',
  GALLEY: 'CUISINE',
  'Medical Clinic': 'Infirmerie',
  MEDICAL: 'INFIRMERIE',
  Dental: 'Cabinet dentaire',
  DENTAL: 'DENTAIRE',
  'Training Center': 'Centre de formation',
  TRAINING: 'FORMATION',
  'Ship Store': 'Coopérative du bord',
  'SHIP STORE': 'COOPÉRATIVE',

  'Engineering Control': 'PC machines',
  'ENG CTRL': 'PC MACHINES',
  'Main Machinery Room': 'Salle des machines',
  MACHINERY: 'MACHINES',
  'Boilers / Auxiliary Systems': 'Chaudières / auxiliaires',
  'AUX SYS': 'AUXILIAIRES',
  'Electrical Room': 'Local électrique',
  ELECTRICAL: 'ÉLECTRIQUE',
  'Cooling Systems': 'Circuits de refroidissement',
  COOLING: 'REFROIDISSEMENT',
  'Damage Control Central': 'PC sécurité',
  'DC CENTRAL': 'PC SÉCURITÉ',
  'Pump Room': 'Local pompes',
  'PUMP ROOM': 'POMPES',
  'Workshop / Machine Shop': 'Atelier d’usinage',
  'MACHINE SHOP': 'USINAGE',
  'Damage Control Locker': 'Poste de sécurité',
  'DC LOCKER': 'POSTE SÉCU',
  'Maintenance Storage': 'Magasin maintenance',
  'MAINT STORE': 'MAG MAINT',

  'Crew Quarters — Forward': 'Postes équipage — avant',
  'BERTHING F': 'POSTES AV',
  'Crew Quarters — Midships': 'Postes équipage — milieu',
  'BERTHING M': 'POSTES MIL',
  'Crew Quarters — Aft': 'Postes équipage — arrière',
  'BERTHING A': 'POSTES AR',
  'Chapel / Quiet Room': 'Chapelle / salle calme',
  CHAPEL: 'CHAPELLE',
  Laundry: 'Buanderie',
  LAUNDRY: 'BUANDERIE',
  'Crew Mess': 'Mess équipage',
  'CREW MESS': 'MESS',
  'Recreation Area': 'Espace détente',
  RECREATION: 'DÉTENTE',
  Gym: 'Salle de sport',
  GYM: 'SPORT',
  'Showers / Head': 'Douches / sanitaires',
  HEADS: 'SANITAIRES',
  'Elevator Lobby': 'Hall ascenseurs',
  LOBBY: 'HALL',

  'Aviation Fuel Storage': 'Soutes carburant aviation',
  'FUEL STORAGE': 'SOUTES CARB',
  'Ballast Tanks Access': 'Accès ballasts',
  BALLAST: 'BALLASTS',
  'Technical Spaces': 'Locaux techniques',
  TECHNICAL: 'TECHNIQUE',
  'Ventilation Systems': 'Ventilation',
  VENTILATION: 'VENTILATION',
  'Emergency Generators': 'Groupes de secours',
  'EMERG GEN': 'GROUPES SEC',
  'Sewage Treatment': 'Traitement des eaux usées',
  SEWAGE: 'EAUX USÉES',
  'Workshop Storage': 'Magasin d’atelier',
  'SHOP STORE': 'MAG ATELIER',
  'General Stores': 'Magasins généraux',
  'GEN STORES': 'MAG GÉNÉRAUX',
  'Access / Maintenance': 'Accès / maintenance',
  ACCESS: 'ACCÈS',
  'Medical Stores': 'Magasin médical',
  'MED STORES': 'MAG MÉDICAL',

  'Reactor Control': 'Contrôle réacteur',
  'REACTOR CTRL': 'CTRL RÉACTEUR',
  'Reactor Auxiliary': 'Auxiliaires réacteur',
  'REACTOR AUX': 'AUX RÉACTEUR',
  'Propulsion Machinery': 'Machines de propulsion',
  PROPULSION: 'PROPULSION',
  'Auxiliary Machinery': 'Machines auxiliaires',
  'AUX MACH': 'MACH AUX',
  'Ammunition Magazine': 'Soute à munitions',
  MAGAZINE: 'SOUTE MUN',
  'Weapons Preparation': 'Préparation armement',
  'WPN PREP': 'PRÉP ARM',
  'Refrigerated Stores': 'Chambres froides',
  REEFER: 'CHAMBRES FROIDES',
  'Stores Hold': 'Cale à vivres',
  HOLD: 'CALE',

  'Sonar Room': 'Local sonar',
  SONAR: 'SONAR',
  'Steering Gear Room': 'Local appareil à gouverner',
  STEERING: 'GOUVERNAIL',
  'Stabilizer Systems': 'Stabilisateurs',
  STABILIZERS: 'STABILISATEURS',
  'Void / Maintenance': 'Vide / maintenance',
  VOID: 'VIDE',
  'Fresh Water Tanks': 'Réserves d’eau douce',
  'FRESH WATER': 'EAU DOUCE',
  'Bilge / Pump Access': 'Cale / accès pompes',
  BILGE: 'CALE',

  // Room kinds
  'roomkind|WORK': 'LOCAL DE TRAVAIL',
  'roomkind|HANGAR': 'HANGAR',
  'roomkind|FLIGHT': 'PONT D’ENVOL',
  'roomkind|BERTHING': 'POSTES ÉQUIPAGE',
  'roomkind|MESS': 'MESS',
  'roomkind|MEDICAL': 'MÉDICAL',
  'roomkind|TRAINING': 'FORMATION',
  'roomkind|STORE': 'MAGASIN',
  'roomkind|COMMAND': 'COMMANDEMENT',
  'roomkind|ELEVATOR': 'ASCENSEUR',
  'roomkind|STAIRS': 'ÉCHELLE',

  // =========================================================================
  // Departments, specialties, ranks
  // =========================================================================
  Command: 'Commandement',
  'Air Department': 'Service aéronautique',
  'Deck Department': 'Service pont',
  'Aircraft Maintenance': 'Maintenance aéronefs',
  Operations: 'Opérations',
  Engineering: 'Machines',
  Medical: 'Service de santé',
  Supply: 'Commissariat',

  'Avionics Technician': 'Technicien avionique',
  Avionics: 'Avionique',
  'Aircraft Engine Technician': 'Technicien moteurs',
  Engine: 'Moteurs',
  'system|Engine': 'Moteur',
  'system|Avionics': 'Avionique',
  'system|Airframe': 'Cellule',
  'system|Fuel': 'Carburant',
  'Airframe Technician': 'Technicien cellule',
  Airframe: 'Cellule',
  'Weapons Technician': 'Technicien armement',
  Weapons: 'Armement',
  'Radar Operator': 'Opérateur radar',
  Radar: 'Radar',
  'Air Traffic Controller': 'Contrôleur aérien',
  'Air Ctrl': 'Ctrl aérien',
  'Aircraft Director': 'Chef de piste',
  Handling: 'Manœuvre',
  'Tractor Operator': 'Conducteur de tracteur',
  Tractor: 'Tracteur',
  'Communications Specialist': 'Spécialiste transmissions',
  Comms: 'Transmissions',
  Medic: 'Infirmier',
  'Supply Specialist': 'Spécialiste approvisionnement',
  'Damage Control Technician': 'Technicien sécurité',
  'Dmg Ctrl': 'Sécurité',
  'Electrical Technician': 'Technicien électricien',
  Electrical: 'Électricité',
  'Flight Operations Specialist': 'Spécialiste opérations aériennes',
  'Flight Ops': 'Ops aériennes',

  Airman: 'Matelot breveté',
  'Petty Officer Third Class': 'Quartier-maître de 2e classe',
  'Petty Officer Second Class': 'Quartier-maître de 1re classe',
  'Petty Officer First Class': 'Second maître',
  'Chief Petty Officer': 'Maître',
  'Senior Chief Petty Officer': 'Premier maître',
  Lieutenant: 'Lieutenant de vaisseau',

  'Junior {spec}': '{spec} junior',
  '{spec}': '{spec}',
  'Senior {spec}': '{spec} senior',
  '{spec} Division Supervisor': 'Chef de section {spec}',
  '{spec} Division Chief': 'Chef de service {spec}',

  // Promotion gates
  'Airman → Petty Officer Third Class': 'Matelot breveté → Quartier-maître de 2e classe',
  'Third Class → Second Class': 'Quartier-maître de 2e → 1re classe',
  'Second Class → First Class': 'Quartier-maître de 1re classe → Second maître',
  'First Class → Chief Petty Officer': 'Second maître → Maître',
  'Chief → Senior Chief': 'Maître → Premier maître',
  'Senior Chief → Lieutenant': 'Premier maître → Lieutenant de vaisseau',

  // Attributes and traits
  Technical: 'Technique',
  Discipline: 'Discipline',
  Speed: 'Rapidité',
  Stamina: 'Endurance',
  Leadership: 'Commandement',
  'Stress Resist.': 'Résist. stress',
  Experience: 'Expérience',
  Ambition: 'Ambition',
  Teamwork: 'Esprit d’équipe',
  'Risk Tolerance': 'Prise de risque',
  Adaptability: 'Adaptabilité',
  Loyalty: 'Loyauté',

  // Statuses
  'status|WORKING': 'AU TRAVAIL',
  'status|RESTING': 'AU REPOS',
  'status|TRAINING': 'EN FORMATION',
  'status|MENTORING': 'TUTORAT',
  'status|SICK': 'MALADE',
  'status|INJURED': 'BLESSÉ',
  'status|HOSPITAL': 'HOSPITALISÉ',
  'status|ON LEAVE': 'EN PERMISSION',
  'status|EMERGENCY': 'URGENCE',

  // =========================================================================
  // Contextual panels
  // =========================================================================
  CONDITION: 'ÉTAT',
  ATTRIBUTES: 'ATTRIBUTS',
  SKILLS: 'COMPÉTENCES',
  PERSONALITY: 'PERSONNALITÉ',
  ADVANCEMENT: 'AVANCEMENT',
  CAREER: 'CARRIÈRE',
  PERSONNEL: 'PERSONNEL',
  MENTORING: 'TUTORAT',
  SYSTEMS: 'SYSTÈMES',
  MAINTENANCE: 'MAINTENANCE',
  'WORK ORDERS': 'ORDRES DE TRAVAIL',
  'NO PARTS': 'SANS PIÈCES',
  'AWAITING PARTS': 'EN ATTENTE DE PIÈCES',
  PROMOTE: 'PROMOUVOIR',
  TRAIN: 'FORMER',
  'STAND DOWN': 'METTRE AU REPOS',
  'RETURN TO DUTY': 'REPRENDRE LE SERVICE',
  'VIEW ROSTER': 'VOIR L’EFFECTIF',
  'CENTRE VIEW': 'CENTRER LA VUE',
  'STOP MENTORING': 'ARRÊTER LE TUTORAT',
  'MOVE TO HANGAR': 'DESCENDRE AU HANGAR',
  'MOVE TO FLIGHT DECK': 'MONTER AU PONT D’ENVOL',
  'AIRCREW {n}': 'ÉQUIPAGE {n}',
  'FUEL {n}/SORTIE': 'CARBURANT {n}/SORTIE',

  Personnel: 'Effectif',
  Workload: 'Charge de travail',
  Efficiency: 'Efficacité',
  Activity: 'Activité',
  'Equipment condition': 'État du matériel',
  'Facility level': 'Niveau de l’installation',
  ACTIVITY: 'ACTIVITÉ',
  Status: 'Statut',
  'Current task': 'Tâche en cours',
  'Output today': 'Rendement du jour',
  'Days aboard': 'Jours à bord',
  'Consecutive duty days': 'Jours de service consécutifs',
  Morale: 'Moral',
  Fatigue: 'Fatigue',
  Course: 'Stage',
  'Days remaining': 'Jours restants',
  'Primary: {spec}': 'Spécialité principale : {spec}',
  'Completed: {list}': 'Validé : {list}',
  'All requirements met.': 'Toutes les conditions sont remplies.',
  'Highest rank aboard.': 'Grade le plus élevé à bord.',
  'Not enrolled.': 'Aucun stage en cours.',
  'No one is assigned to this space.': 'Personne n’est affecté à ce local.',
  'No suitable junior crew to mentor.': 'Aucun subordonné à encadrer.',
  'Passing skill down costs this person some of their own output.':
    'Transmettre son savoir-faire lui coûte une partie de son propre rendement.',
  '+{n} more — open the roster to see all.':
    '+{n} autres — ouvrez l’effectif pour tout voir.',
  'Note: an exceptional technician with weak leadership may be worth more on the tools than running a division.':
    'À noter : un technicien exceptionnel au faible commandement vaut souvent davantage à l’établi qu’à la tête d’une section.',
  Mentoring: 'Tutorat',

  // Aircraft panel
  'aircraft|READY': 'PRÊT',
  'aircraft|NOT READY': 'INDISPONIBLE',
  'aircraft|DAMAGED': 'ENDOMMAGÉ',
  'aircraft|IN MAINTENANCE': 'EN MAINTENANCE',
  'aircraft|AIRBORNE': 'EN VOL',
  'Overall readiness': 'Disponibilité globale',
  'Flight hours': 'Heures de vol',
  'Limited by': 'Limité par',
  Fuel: 'Carburant',
  'No open work orders.': 'Aucun ordre de travail ouvert.',
  'An aircraft is only mission capable when every critical system is above its threshold — a healthy airframe cannot cover for dead avionics.':
    'Un aéronef n’est disponible que si chaque système critique dépasse son seuil — une cellule saine ne compense pas une avionique morte.',
  'Work advances when qualified technicians are assigned to the shop holding the order. Click an order to jump to that shop.':
    'Le travail avance lorsque des techniciens qualifiés sont affectés à l’atelier concerné. Cliquez sur un ordre pour y accéder.',
  'Aircraft in the hangar have their wings folded and cannot launch until respotted.':
    'Les aéronefs au hangar ont les voilures repliées et ne peuvent décoller avant d’être remontés.',
  'role|FIGHTER': 'CHASSE',
  'role|EW': 'GUERRE ÉLEC.',
  'role|AEW': 'GUET AÉRIEN',
  'role|HELO': 'HÉLICOPTÈRE',
  'role|TRANSPORT': 'TRANSPORT',
  '{system} discrepancy': 'Anomalie {system}',
  '{system} fault': 'Panne {system}',
  '{system} major fault': 'Panne majeure {system}',
  '{system} work — {tail}': 'Travaux {system} — {tail}',

  // Crew tasks
  'Avionics bench check': 'Contrôle au banc avionique',
  'Engine turn-up inspection': 'Point fixe moteur',
  'Panel and structure inspection': 'Inspection panneaux et structure',
  'Ordnance handling drill': 'Exercice de manutention munitions',
  'Air picture watch': 'Veille de la situation aérienne',
  'Marshal and approach control': 'Contrôle d’approche et de ralliement',
  'Deck respot': 'Repositionnement sur le pont',
  'Aircraft towing': 'Remorquage d’aéronef',
  'Circuit monitoring': 'Veille des circuits',
  'Sick call': 'Visite médicale',
  'Stores issue': 'Distribution des approvisionnements',
  'Compartment inspection rounds': 'Ronde d’inspection des compartiments',
  'Switchboard rounds': 'Ronde des tableaux électriques',
  'Launch cycle coordination': 'Coordination du cycle de catapultage',
  'Course: {course}': 'Stage : {course}',

  // Career entries
  'Reported aboard': 'Embarqué à bord',
  'Advanced to {rank}': 'Promu {rank}',
  'Promoted to {rank}': 'Promu {rank}',
  'Injured on duty': 'Blessé en service',
  'Granted {days} days leave': 'Permission de {days} jours accordée',
  'Returned to duty': 'Retour au service',
  'Began {course}': 'Début du stage {course}',
  'Completed {course}': 'Stage {course} validé',

  // =========================================================================
  // Roster
  // =========================================================================
  NAME: 'NOM',
  RANK: 'GRADE',
  SPECIALTY: 'SPÉCIALITÉ',
  SKILL: 'COMPÉT.',
  MORALE: 'MORAL',
  FATIGUE: 'FATIGUE',
  LOCATION: 'LOCALISATION',
  ROOM: 'LOCAL',
  'ALL DEPARTMENTS': 'TOUS LES SERVICES',
  'ALL STATUSES': 'TOUS LES STATUTS',
  'Search name, rank or specialty': 'Rechercher un nom, un grade ou une spécialité',
  '{n} ELIGIBLE FOR PROMOTION': '{n} PROMOUVABLE(S)',
  'No personnel match these filters.': 'Aucun personnel ne correspond à ces filtres.',
  'Showing 400 of {n}. Narrow the filters to see more.':
    'Affichage de 400 sur {n}. Affinez les filtres pour en voir davantage.',
  'Selecting a crew member closes the roster and moves the camera to where they physically are.':
    'Sélectionner un membre d’équipage ferme la liste et déplace la caméra là où il se trouve physiquement.',

  // =========================================================================
  // Carrier status — the mission cycle
  // =========================================================================
  'CARRIER STATUS': 'ÉTAT DU PORTE-AVIONS',
  'Carrier status': 'État du porte-avions',
  PASSAGE: 'TRANSIT',
  Passage: 'Transit',
  'carrierstatus|IN PORT': 'AU PORT',
  'carrierstatus|OUTBOUND': 'EN TRANSIT ALLER',
  'carrierstatus|ON STATION': 'SUR ZONE',
  'carrierstatus|RETURNING': 'RETOUR AU PORT',
  alongside: 'à quai',
  'in the operating area': 'sur la zone d’opérations',
  'arrives on station tomorrow': 'sur zone demain',
  'on station in {n} days': 'sur zone dans {n} jours',
  'alongside tomorrow': 'à quai demain',
  'alongside in {n} days': 'à quai dans {n} jours',
  'On station — {title} begins': 'Sur zone — début de « {title} »',
  'On passage — {n} days to the operating area':
    'En transit — {n} jours avant la zone d’opérations',
  'On passage home — {n} days to port': 'Retour — {n} jours avant le port',
  'Detached from the operating area — {n} days to port':
    'Dégagement de la zone d’opérations — {n} jours avant le port',
  'Alongside. Stores, equipment and personnel can come aboard.':
    'À quai. Vivres, matériel et personnel peuvent embarquer.',
  'Stores, equipment, airframes and personnel can come aboard':
    'Vivres, matériel, aéronefs et personnel peuvent embarquer',
  'Nothing can be brought aboard until the ship is alongside':
    'Rien ne peut embarquer avant le retour à quai',
  'nothing can be brought aboard until the ship is alongside. Orders already placed will wait in port.':
    'rien ne peut embarquer avant le retour à quai. Les commandes déjà passées attendront au port.',
  'The ship is at sea. A new mission can only be accepted once it is alongside.':
    'Le navire est en mer. Une nouvelle mission ne peut être acceptée qu’à quai.',
  'A mission can only be accepted alongside in port.':
    'Une mission ne peut être acceptée qu’à quai.',
  'The ship is on passage — nothing can be brought aboard until it returns to port':
    'Le navire est en transit — rien ne peut embarquer avant son retour au port',
  'The ship is on station — nothing can be brought aboard until it returns to port':
    'Le navire est sur zone — rien ne peut embarquer avant son retour au port',
  'The ship is on passage home — wait until it is alongside':
    'Le navire fait route vers le port — attendez son retour à quai',
  '{n} day passage each way': 'transit de {n} jours par trajet',
  '{n} days each way': '{n} jours par trajet',
  'On station': 'Sur zone',
  'Days on station': 'Jours sur zone',

  // =========================================================================
  // Air tasking order
  // =========================================================================
  TASKING: 'ORDRES DE VOL',
  'AIR TASKING ORDER': 'ORDRE DE VOL DU JOUR',
  'TODAY’S TASKING': 'AFFECTATIONS DU JOUR',
  'DUTY BOARD': 'TABLEAU DE SERVICE',
  'OBJECTIVE COVER': 'COUVERTURE OBJECTIF',
  'TASKED TO FLY': 'EN VOL PRÉVU',
  'ON DECK ALERT': 'EN ALERTE PONT',
  'ASSIGN DUTY': 'AFFECTER',
  TAIL: 'CODE',
  TYPE: 'TYPE',
  DUTY: 'SERVICE',
  'AUTO-ASSIGN': 'RÉPARTITION AUTO',
  'ALL ON ALERT': 'TOUS EN ALERTE',
  'STAND DOWN THE WING': 'METTRE LE GROUPE AU REPOS',
  'ORDERS OF THE DAY': 'ORDRES DU JOUR',
  'DECISIONS PENDING': 'DÉCISIONS EN ATTENTE',
  'Sortie contribution': 'Contribution en sorties',
  'Deck capacity': 'Capacité du pont',
  tasked: 'prévus',
  'can launch': 'catapultables',
  'Counts toward mission': 'Compte pour la mission',
  'not at all': 'pas du tout',
  Contributing: 'Contribution',
  '{n} on alert': '{n} en alerte',

  'Strike / Mission Tasking': 'Frappe / mission assignée',
  STRIKE: 'FRAPPE',
  CAP: 'PAC',
  RECON: 'RECO',
  LIFT: 'TRANSPORT',
  ALERT: 'ALERTE',
  MAINT: 'MAINT',
  'STOOD DOWN': 'SAISI',
  'Objective cover': 'Couverture objectif',
  Grounded: 'Immobilisés',
  'duty|STRIKE': 'FRAPPE',
  'Flying the assigned objective. The only duty that moves a strike mission.':
    'Exécution de l’objectif assigné. Le seul service qui fait avancer une mission de frappe.',
  'Combat Air Patrol': 'Patrouille aérienne de combat',
  'duty|CAP': 'PAC',
  'Air defence overhead. Protects the group and lowers accumulated risk.':
    'Défense aérienne au-dessus du groupe. Protège la force et réduit le risque accumulé.',
  'Surveillance & Recon': 'Surveillance et reconnaissance',
  'duty|RECON': 'RECO',
  'Building the picture. Carries patrol and intelligence missions.':
    'Construction de la situation. Porte les missions de patrouille et de renseignement.',
  'Lift & Logistics': 'Transport et logistique',
  'duty|LIFT': 'TRANSPORT',
  'Moving people and cargo. Carries humanitarian and evacuation work.':
    'Transport de personnes et de fret. Porte les missions humanitaires et d’évacuation.',
  'Training Sorties': 'Sorties d’entraînement',
  'duty|TRAINING': 'ENTRAÎN.',
  'No mission progress, but aircrew and deck crews gain experience.':
    'Aucune progression de mission, mais les équipages et le personnel de pont gagnent en expérience.',
  'Deck Alert': 'Alerte sur le pont',
  'duty|ALERT': 'ALERTE',
  'Grounded — Maintenance': 'Immobilisé — maintenance',
  'duty|MAINT': 'MAINT',
  'Released to the shops. Open work orders progress faster.':
    'Confié aux ateliers. Les ordres de travail avancent plus vite.',
  'Stood Down': 'Immobilisé — saisi',
  'duty|STOOD DOWN': 'SAISI',
  'Secured and untouched. No wear, no contribution.':
    'Saisi et laissé tranquille. Aucune usure, aucune contribution.',

  'No mission is active, so nothing the wing flies today advances an objective. Aircraft on alert stay ready; aircraft in the shops get fixed.':
    'Aucune mission en cours : ce que le groupe aérien vole aujourd’hui ne fait avancer aucun objectif. Les appareils en alerte restent prêts, ceux en atelier sont réparés.',
  'Cover above 100% finishes the mission faster; below it, progress slows in proportion. This is the main thing you control each day.':
    'Une couverture supérieure à 100 % accélère la mission ; en dessous, la progression ralentit d’autant. C’est le principal levier dont vous disposez chaque jour.',
  'The deck, not the hangar, is the limit here. Raising operational tempo turns more sorties — at the cost of fatigue and wear.':
    'C’est le pont, et non le hangar, qui limite ici. Augmenter le rythme opérationnel permet plus de sorties — au prix de la fatigue et de l’usure.',
  'Click a duty to assign it. A greyed duty is one this airframe cannot usefully fly.':
    'Cliquez sur un service pour l’affecter. Un service grisé est un service que cet appareil ne peut pas assurer utilement.',
  'Little progress — the air tasking order did not cover the objective.':
    'Peu de progrès — l’ordre de vol ne couvrait pas l’objectif.',
  '{n} tasked airframes are not mission capable and will not launch':
    '{n} appareils affectés ne sont pas disponibles et ne décolleront pas',
  'Deck can turn {capacity} sorties; {tasked} are tasked to fly':
    'Le pont peut assurer {capacity} sorties ; {tasked} sont prévues',
  'Tasking falls well short of what {title} needs today':
    'Les affectations sont très en deçà de ce que « {title} » exige aujourd’hui',

  // =========================================================================
  // Missions
  // =========================================================================
  'MISSION BOARD': 'TABLEAU DES MISSIONS',
  'ACTIVE MISSION': 'MISSION EN COURS',
  'AVAILABLE OPERATIONS': 'OPÉRATIONS DISPONIBLES',
  OBJECTIVES: 'OBJECTIFS',
  'MISSION LOG': 'JOURNAL DE MISSION',
  'MISSION HISTORY': 'HISTORIQUE DES MISSIONS',
  'ACCEPT MISSION': 'ACCEPTER LA MISSION',
  'Mission accepted': 'Mission acceptée',
  'Cannot accept that mission': 'Impossible d’accepter cette mission',
  'A new mission can be accepted once this one resolves.':
    'Une nouvelle mission pourra être acceptée une fois celle-ci terminée.',
  Progress: 'Progression',
  'Accumulated risk': 'Risque accumulé',
  Duration: 'Durée',
  'Est. success': 'Réussite est.',
  'Standing: {tier} ({n} prestige) — {unlocks}':
    'Réputation : {tier} ({n} prestige) — {unlocks}',
  'Recommended: {list}': 'Recommandé : {list}',
  '1 requirement unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.':
    '1 condition non remplie — vous pouvez accepter malgré tout, mais le risque augmente fortement et l’estimation ci-dessus en tient déjà compte.',
  '{n} requirements unmet — you may still accept, but risk rises sharply and the estimate above already reflects it.':
    '{n} conditions non remplies — vous pouvez accepter malgré tout, mais le risque augmente fortement et l’estimation ci-dessus en tient déjà compte.',
  prestige: 'prestige',

  'Aircraft Ready': 'Aéronefs prêts',
  'Crew Readiness': 'Disponibilité équipage',
  'Aviation Fuel': 'Carburant aviation',
  'Carrier Readiness': 'Disponibilité du navire',

  'missioncat|HUMANITARIAN': 'HUMANITAIRE',
  'missioncat|MARITIME': 'SÛRETÉ MARITIME',
  'missioncat|AIR': 'AÉRIEN',
  'missioncat|FLEET': 'SOUTIEN FLOTTE',
  'missioncat|INTEL': 'RENSEIGNEMENT',
  'missioncat|COMBAT': 'COMBAT',
  'missioncat|CRISIS': 'CRISE',

  'OUTSTANDING SUCCESS': 'SUCCÈS REMARQUABLE',
  SUCCESS: 'SUCCÈS',
  'PARTIAL SUCCESS': 'SUCCÈS PARTIEL',
  FAILURE: 'ÉCHEC',
  'CATASTROPHIC FAILURE': 'ÉCHEC CATASTROPHIQUE',

  'Mission accepted: {title}': 'Mission acceptée : {title}',
  '{title} — {outcome}': '{title} — {outcome}',
  'Exceptional day — the cycle ran clean and ahead of plan.':
    'Journée exceptionnelle — le cycle a tourné sans accroc et en avance.',
  'Slow day — degraded readiness held the operation back.':
    'Journée lente — la disponibilité dégradée a freiné l’opération.',

  'Fleet Work-Ups': 'Entraînement de flotte',
  'Routine training cycle in home waters. Low risk, modest reward, and a chance to shake down the air wing before anything serious.':
    'Cycle d’entraînement de routine dans les eaux nationales. Peu de risque, faible récompense, et l’occasion de roder le groupe aérien avant les choses sérieuses.',
  'Fly 40 training sorties': 'Effectuer 40 sorties d’entraînement',
  'No Class A mishaps': 'Aucun accident majeur',
  'Qualify deck crews': 'Qualifier les équipes de pont',
  'Any airframes': 'Tout type d’aéronef',
  'No special capability required': 'Aucune capacité particulière requise',

  'Maritime Security Patrol': 'Patrouille de sûreté maritime',
  'Presence patrol across a shipping corridor. Long, unglamorous, and steady — the bread and butter of a carrier group.':
    'Patrouille de présence sur un couloir maritime. Longue, ingrate et régulière — le quotidien d’un groupe aéronaval.',
  'Maintain continuous surface picture': 'Maintenir une situation de surface continue',
  'Log 60 patrol sorties': 'Réaliser 60 sorties de patrouille',
  'Report all contacts': 'Signaler tous les contacts',
  'Early warning aircraft': 'Aéronef de guet aérien',
  'Experienced radar operators': 'Opérateurs radar expérimentés',

  'Disaster Relief — Coastal Flooding': 'Secours — inondations côtières',
  'A typhoon has flattened a coastal province. Rotary wing lift and medical capacity matter far more than combat power here.':
    'Un typhon a ravagé une province côtière. La capacité d’emport des hélicoptères et les moyens médicaux comptent bien plus ici que la puissance de combat.',
  'Deliver 300 tonnes of relief supplies': 'Livrer 300 tonnes de fret humanitaire',
  'Evacuate casualties': 'Évacuer les blessés',
  'Sustain shore medical support': 'Assurer le soutien médical à terre',
  'Maritime helicopters': 'Hélicoptères embarqués',
  'Medical capacity': 'Capacité médicale',
  'Deep general stores': 'Magasins généraux bien remplis',

  'Convoy Protection': 'Protection de convoi',
  'Escort a merchant convoy through a contested strait. Persistent air cover for nine days with no let-up in the launch cycle.':
    'Escorter un convoi marchand dans un détroit disputé. Couverture aérienne permanente pendant neuf jours, sans relâche dans le cycle de catapultage.',
  'Zero convoy losses': 'Aucune perte dans le convoi',
  'Maintain 24-hour CAP': 'Maintenir une patrouille aérienne 24 h/24',
  'Deter surface threats': 'Dissuader les menaces de surface',
  'Electronic warfare capability': 'Capacité de guerre électronique',

  'Electronic Intelligence Collection': 'Recueil de renseignement électronique',
  'Loiter at the edge of a denied area and collect emitter data. Success depends almost entirely on Operations and sensor crews.':
    'Patrouiller à la lisière d’une zone interdite et recueillir les données d’émetteurs. La réussite dépend presque entièrement des Opérations et des équipes capteurs.',
  'Collect 12 emitter fingerprints': 'Recueillir 12 signatures d’émetteurs',
  'Remain undetected': 'Rester non détecté',
  'Return all airframes': 'Ramener tous les aéronefs',
  'Electronic warfare aircraft': 'Aéronef de guerre électronique',
  'Senior radar operators': 'Opérateurs radar chevronnés',
  'Intelligence staff': 'Personnel de renseignement',

  'Integrated Air Defence Exercise': 'Exercice de défense aérienne intégrée',
  'A multinational exercise under observation. Reputation is on the line: sloppy deck work will be seen by everyone watching.':
    'Un exercice multinational sous observation. La réputation est en jeu : le moindre relâchement sur le pont sera vu de tous.',
  'Intercept 90% of inbound raids': 'Intercepter 90 % des raids entrants',
  'Sustain 30 sorties per day': 'Tenir 30 sorties par jour',
  'No mishaps': 'Aucun incident',
  'Full fighter complement': 'Groupe de chasse au complet',
  'Experienced air controllers': 'Contrôleurs aériens expérimentés',

  'Non-Combatant Evacuation': 'Évacuation de ressortissants',
  'A city is falling. Lift out several thousand civilians under a deteriorating security situation, at maximum tempo, for as long as it takes.':
    'Une ville tombe. Évacuer plusieurs milliers de civils dans une situation sécuritaire qui se dégrade, au rythme maximal, aussi longtemps qu’il le faudra.',
  'Evacuate 4,000 civilians': 'Évacuer 4 000 civils',
  'Zero civilian casualties': 'Aucune victime civile',
  'Sustain maximum tempo': 'Tenir le rythme maximal',
  'Maximum rotary lift': 'Capacité hélicoptère maximale',
  'Medical expansion': 'Infirmerie agrandie',
  'Deep fuel reserves': 'Fortes réserves de carburant',

  'Precision Strike Package': 'Raid de frappe de précision',
  'Deliver a limited strike against a defended target set. Weapons handling, avionics availability and pilot experience all matter at once.':
    'Mener une frappe limitée sur un ensemble d’objectifs défendus. Manutention des munitions, disponibilité avionique et expérience des pilotes comptent toutes en même temps.',
  'Strike all assigned targets': 'Frapper tous les objectifs assignés',
  'Return every aircraft': 'Ramener chaque aéronef',
  'Avoid collateral damage': 'Éviter les dommages collatéraux',
  'Electronic warfare escort': 'Escorte de guerre électronique',
  'Full magazine': 'Soute à munitions pleine',
  'Elite avionics division': 'Section avionique d’élite',

  'Crisis Response — Contested Waters': 'Réponse de crise — eaux disputées',
  'A standing deployment into an active crisis with no defined end state. Everything degrades: airframes, tempers, and the margin for error.':
    'Un déploiement permanent dans une crise active sans fin définie. Tout se dégrade : les cellules, les nerfs et la marge d’erreur.',
  'Maintain deterrent posture 14 days': 'Tenir une posture de dissuasion 14 jours',
  'Zero aircraft losses': 'Aucune perte d’aéronef',
  'No escalation': 'Aucune escalade',
  'Elite crew across all divisions': 'Équipage d’élite dans tous les services',
  'Upgraded workshops': 'Ateliers améliorés',
  'Full stores': 'Magasins pleins',

  // =========================================================================
  // Procurement — aircraft and equipment
  // =========================================================================
  'AIRFRAME PROCUREMENT': 'ACQUISITION D’AÉRONEFS',
  EQUIPMENT: 'MATÉRIEL',
  'ON ORDER': 'EN COMMANDE',
  ORDER: 'COMMANDER',
  'arrives tomorrow': 'livraison demain',
  'arrives in {n} days': 'livraison dans {n} jours',
  'Parking {used} / {max}. Airframes arrive after a delivery lead time, so buy for the campaign you expect rather than today’s problem.':
    'Stationnement {used} / {max}. Les aéronefs arrivent après un délai de livraison : achetez pour la campagne à venir, pas pour le problème du jour.',
  '{n} IN WING': '{n} AU GROUPE',
  '{n} ON ORDER': '{n} EN COMMANDE',
  'Sortie value': 'Valeur par sortie',
  Aircrew: 'Équipage de conduite',
  'Fuel per sortie': 'Carburant par sortie',
  Delivery: 'Livraison',
  'Best on: {list}': 'Idéal pour : {list}',
  '{type} ordered': '{type} commandé',
  '{item} ordered': '{item} commandé',
  'Requires {n} prestige to access': 'Nécessite {n} de prestige pour y accéder',
  'Equipment is bought in quantity and each item feeds one system directly. Unlike a facility upgrade, you can see exactly what it does.':
    'Le matériel s’achète en quantité et chaque article agit directement sur un système. Contrairement à une amélioration d’installation, son effet est explicite.',
  Held: 'En dotation',
  'Each one': 'Chaque unité',
  'On order': 'En commande',
  'Standing too low for this airframe': 'Réputation insuffisante pour cet aéronef',
  'Standing too low for this equipment': 'Réputation insuffisante pour ce matériel',
  'No parking left on the deck or in the hangar':
    'Plus aucun emplacement sur le pont ni au hangar',
  'The ship holds as many as it can use': 'Le navire en détient déjà le maximum utile',
  'Insufficient prestige': 'Prestige insuffisant',
  'Delivered: {item}': 'Livré : {item}',
  'Delivered: {type} #{tail}': 'Livré : {type} #{tail}',
  'No parking for {type} — order refunded':
    'Aucun emplacement pour {type} — commande remboursée',

  'eqcat|DECK': 'PONT',
  'eqcat|MAINTENANCE': 'MAINTENANCE',
  'eqcat|SAFETY': 'SÉCURITÉ',
  'eqcat|CREW': 'ÉQUIPAGE',
  'eqcat|WEAPONS': 'ARMEMENT',
  'eqcat|OPERATIONS': 'OPÉRATIONS',

  'Aircraft Tow Tractor': 'Tracteur de piste',
  'More tractors means more airframes respotted per cycle. The most direct way to raise how many sorties the deck can turn.':
    'Plus de tracteurs, plus d’appareils repositionnés par cycle. Le moyen le plus direct d’augmenter le nombre de sorties que le pont peut assurer.',
  '+1 sortie per day': '+1 sortie par jour',
  'Ground Support Equipment Set': 'Lot de matériel de servitude',
  'Power carts, hydraulic rigs and nitrogen carts. Shops stop waiting for shared kit.':
    'Groupes de parc, bancs hydrauliques et chariots d’azote. Les ateliers n’attendent plus le matériel partagé.',
  'Maintenance work +8%': 'Travaux de maintenance +8 %',
  'Precision Tool Sets': 'Jeux d’outillage de précision',
  'Calibrated torque and test tooling issued per shop rather than shared.':
    'Outillage dynamométrique et de contrôle attribué à chaque atelier plutôt que mutualisé.',
  'Maintenance work +6%': 'Travaux de maintenance +6 %',
  'Spare Module Pool': 'Volant de modules de rechange',
  'Rotable engine and avionics modules held aboard. Work orders stop stalling for want of a part.':
    'Modules moteur et avionique réparables détenus à bord. Les ordres de travail ne calent plus faute de pièce.',
  'Spares consumption -15%': 'Consommation de rechanges -15 %',
  'Flight Deck Safety Equipment': 'Équipement de sécurité du pont d’envol',
  'Cranials, float coats, sound protection and better deck lighting. Fewer people get hurt.':
    'Casques, gilets, protections auditives et meilleur éclairage du pont. Moins de blessés.',
  'Accident rate -12%': 'Taux d’accident -12 %',
  'Firefighting & Rescue Equipment': 'Matériel incendie et sauvetage',
  'AFFF stations, rescue kit and proximity suits. Emergencies do less damage when they happen.':
    'Postes à émulseur, matériel de sauvetage et tenues d’approche. Les sinistres font moins de dégâts.',
  'Equipment damage in emergencies -15%': 'Dégâts matériels lors des sinistres -15 %',
  'Improved Berthing Fittings': 'Aménagement des postes d’équipage',
  'Better racks, curtains and ventilation. Rest actually rests people.':
    'Meilleures bannettes, rideaux et ventilation. Le repos repose vraiment.',
  'Fatigue recovery +9%': 'Récupération de la fatigue +9 %',
  'Precision Munitions Package': 'Lot de munitions guidées',
  'Guided stores held ready in the magazine. Strike work carries less risk of going wrong.':
    'Munitions guidées tenues prêtes en soute. Les frappes présentent moins de risque de dérapage.',
  'Mission risk -4 per day': 'Risque de mission -4 par jour',
  'Tactical Datalink Suite': 'Liaison de données tactique',
  'Shared air picture across the group. Operations coordinate faster and the wing flies smarter.':
    'Situation aérienne partagée dans tout le groupe. Les Opérations coordonnent plus vite et le groupe aérien vole plus juste.',
  'Mission risk -3 per day': 'Risque de mission -3 par jour',
  'Corrosion Control Programme': 'Programme de lutte anticorrosion',
  'Wash racks, sealants and a proper paint shop. Salt air stops eating the air wing.':
    'Rampes de lavage, mastics et véritable atelier peinture. L’air salin cesse de ronger le groupe aérien.',
  'Airframe wear -12%': 'Usure cellule -12 %',


  // =========================================================================
  // Development: upgrades, recruitment, stores
  // =========================================================================
  'CARRIER DEVELOPMENT': 'DÉVELOPPEMENT DU NAVIRE',
  FACILITIES: 'INSTALLATIONS',
  RECRUITMENT: 'RECRUTEMENT',
  STORES: 'APPROVISIONNEMENT',
  'FACILITY UPGRADES': 'AMÉLIORATION DES INSTALLATIONS',
  'RECRUITMENT OFFERS': 'CANDIDATURES',
  REPLENISHMENT: 'RAVITAILLEMENT',
  UPGRADE: 'AMÉLIORER',
  RECRUIT: 'RECRUTER',
  'LEVEL {a} / {b}': 'NIVEAU {a} / {b}',
  Level: 'Niveau',
  'Next level': 'Niveau suivant',
  Cost: 'Coût',
  'Unit cost': 'Coût unitaire',
  '{cost} per point': '{cost} par point',
  'Fully upgraded.': 'Amélioration maximale atteinte.',
  'Credits {credits}   ·   Prestige {n} ({tier})':
    'Crédits {credits}   ·   Prestige {n} ({tier})',
  'Upgrades cost both credits and prestige — spending reputation is a real trade against unlocking better missions.':
    'Les améliorations coûtent des crédits et du prestige — dépenser sa réputation se paie sur l’accès aux meilleures missions.',
  'Crew {n} / {max}. Candidate quality is gated by prestige — a Legendary carrier attracts people an unknown one never sees. New candidates arrive every five days.':
    'Équipage {n} / {max}. La qualité des candidats dépend du prestige — un porte-avions Légendaire attire des profils qu’un navire inconnu ne verra jamais. De nouveaux candidats arrivent tous les cinq jours.',
  'No candidates are currently available.': 'Aucun candidat disponible actuellement.',
  '{spec} skill': 'Compétence {spec}',
  '{name} has reported aboard': '{name} a embarqué',
  '{name} upgraded to level {level}': '{name} amélioré au niveau {level}',
  'Buying stores at sea is expensive. Running out mid-mission is worse.':
    'S’approvisionner en mer coûte cher. Tomber en rupture en pleine mission coûte plus cher encore.',
  'Cannot purchase — insufficient credits or already full':
    'Achat impossible — crédits insuffisants ou stock déjà plein',

  Food: 'Vivres',
  'Medical Supplies': 'Fournitures médicales',
  'Spare Parts': 'Pièces de rechange',
  'General Supplies': 'Fournitures générales',
  Ammunition: 'Munitions',

  Unknown: 'Inconnu',
  Respected: 'Respecté',
  Established: 'Établi',
  Distinguished: 'Distingué',
  Elite: 'Élite',
  Legendary: 'Légendaire',
  'Basic missions, standard recruits': 'Missions de base, recrues standard',
  'More mission choices, better recruits': 'Plus de choix de missions, meilleures recrues',
  'Experienced personnel, advanced training': 'Personnel expérimenté, formations avancées',
  'Elite specialists, advanced equipment': 'Spécialistes d’élite, équipement avancé',
  'High-value missions, rare recruits': 'Missions de haute valeur, recrues rares',
  'Special missions, unique upgrades': 'Missions spéciales, améliorations uniques',

  'Main Machinery': 'Machines principales',
  'Crew Quarters': 'Postes d’équipage',
  'Recreation Facilities': 'Installations de détente',
  'Better test benches and diagnostic sets. The single highest-leverage maintenance upgrade.':
    'Meilleurs bancs d’essai et valises de diagnostic. L’amélioration de maintenance la plus rentable.',
  'Overhaul stands and spare module racks shorten powerplant turnaround.':
    'Bâtis de révision et racks de modules de rechange raccourcissent le passage des moteurs.',
  'Simulators and classrooms cut course length across the board.':
    'Simulateurs et salles de cours raccourcissent tous les stages.',
  'More beds and a surgical suite. Injured crew return to duty sooner.':
    'Plus de lits et un bloc opératoire. Les blessés reprennent le service plus vite.',
  'Refit berthing for privacy and quiet. Rested crew recover fatigue faster.':
    'Postes réaménagés pour l’intimité et le calme. L’équipage récupère plus vite.',
  'Somewhere to go that is not your rack or your shop. Morale recovers faster.':
    'Un endroit où aller qui ne soit ni sa bannette ni son atelier. Le moral remonte plus vite.',
  'Upgraded consoles and data fusion improve detection and mission coordination.':
    'Consoles modernisées et fusion de données améliorent la détection et la coordination.',
  'Overhauled auxiliaries and spares holding. Machinery fails less often.':
    'Auxiliaires révisés et stock de rechanges. Les machines tombent moins souvent en panne.',
  'Better plotting, comms and locker equipment. Emergencies do less damage.':
    'Meilleure table traçante, transmissions et matériel de poste. Les sinistres font moins de dégâts.',
  'Reorganised holds and extra tankage raise every supply ceiling.':
    'Cales réorganisées et capacité supplémentaire relèvent tous les plafonds d’approvisionnement.',

  'Avionics work +12%': 'Travaux avionique +12 %',
  'Avionics work +25%': 'Travaux avionique +25 %',
  'Avionics work +38%': 'Travaux avionique +38 %',
  'Avionics work +55%': 'Travaux avionique +55 %',
  'Engine work +12%': 'Travaux moteurs +12 %',
  'Engine work +25%': 'Travaux moteurs +25 %',
  'Engine work +38%': 'Travaux moteurs +38 %',
  'Engine work +55%': 'Travaux moteurs +55 %',
  'Courses 10% faster': 'Stages 10 % plus rapides',
  'Courses 20% faster': 'Stages 20 % plus rapides',
  'Courses 30% faster': 'Stages 30 % plus rapides',
  'Courses 45% faster': 'Stages 45 % plus rapides',
  'Recovery 15% faster': 'Guérison 15 % plus rapide',
  'Recovery 28% faster': 'Guérison 28 % plus rapide',
  'Recovery 40% faster': 'Guérison 40 % plus rapide',
  'Recovery 55% faster': 'Guérison 55 % plus rapide',
  'Rest +12%': 'Repos +12 %',
  'Rest +22%': 'Repos +22 %',
  'Rest +32%': 'Repos +32 %',
  'Rest +45%': 'Repos +45 %',
  'Morale recovery +15%': 'Récupération du moral +15 %',
  '+28%': '+28 %',
  '+40%': '+40 %',
  '+55%': '+55 %',
  '+30%': '+30 %',
  '+45%': '+45 %',
  '+65%': '+65 %',
  'Operations +8': 'Opérations +8',
  'Operations +15': 'Opérations +15',
  'Operations +22': 'Opérations +22',
  'Operations +30': 'Opérations +30',
  'Failure rate -15%': 'Taux de panne -15 %',
  '-28%': '-28 %',
  '-40%': '-40 %',
  '-55%': '-55 %',
  'Emergency damage -15%': 'Dégâts en cas de sinistre -15 %',
  'Storage +15%': 'Stockage +15 %',

  // =========================================================================
  // Training
  // =========================================================================
  ENROL: 'INSCRIRE',
  COMPLETED: 'VALIDÉ',
  Attributes: 'Attributs',
  'coursecat|BASIC': 'BASE',
  'coursecat|SPECIALTY': 'SPÉCIALITÉ',
  'coursecat|ADVANCED': 'AVANCÉ',
  'coursecat|LEADERSHIP': 'COMMANDEMENT',
  'Requires a qualified instructor aboard.': 'Nécessite un instructeur qualifié à bord.',
  'Required for {gate}: {list}': 'Requis pour {gate} : {list}',
  'Enrolled crew are unavailable for duty for the whole course — that lost productivity is the real cost, not the credits.':
    'Le personnel inscrit est indisponible pour toute la durée du stage — c’est cette perte de rendement qui coûte cher, pas les crédits.',
  '{name} enrolled — unavailable for {days} days':
    '{name} inscrit — indisponible pendant {days} jours',
  'Cannot enrol — requirements not met': 'Inscription impossible — conditions non remplies',
  'Already enrolled in a course': 'Déjà inscrit à un stage',
  'Not available for duty': 'Indisponible pour le service',
  'Already completed': 'Déjà validé',
  'Insufficient credits': 'Crédits insuffisants',
  'No qualified instructor available aboard': 'Aucun instructeur qualifié disponible à bord',

  'Shipboard Safety & Procedures': 'Sécurité et procédures à bord',
  'Fundamental safety drills and shipboard routine. Required before any promotion.':
    'Exercices de sécurité fondamentaux et routine du bord. Requis avant toute promotion.',
  'Firefighting & Damage Control': 'Lutte contre l’incendie et sécurité',
  'Hose teams, boundary cooling and flooding response. Improves emergency response.':
    'Équipes de lance, refroidissement des cloisons et lutte contre l’envahissement. Améliore la réponse aux sinistres.',
  'First Aid & Casualty Handling': 'Premiers secours et prise en charge des blessés',
  'Stabilising casualties before they reach medical. Reduces injury severity.':
    'Stabiliser les blessés avant leur arrivée à l’infirmerie. Réduit la gravité des blessures.',
  'Specialty Refresher': 'Remise à niveau de spécialité',
  'Focused practice in the technician’s own trade. Reliable, unspectacular gains.':
    'Pratique ciblée dans le métier du technicien. Gains fiables, sans éclat.',
  'Aircraft Engine Maintenance': 'Maintenance des moteurs',
  'Powerplant teardown, borescope inspection and module replacement.':
    'Dépose de groupe motopropulseur, endoscopie et remplacement de modules.',
  'Avionics Systems': 'Systèmes avioniques',
  'Radar, mission computers and bus faults. The bottleneck trade on most carriers.':
    'Radar, calculateurs de mission et pannes de bus. Le métier goulot d’étranglement sur la plupart des porte-avions.',
  'Airframe & Structures': 'Cellule et structures',
  'Structural repair, hydraulics and control surfaces.':
    'Réparation structurale, hydraulique et gouvernes.',
  'Weapons Handling': 'Manutention de l’armement',
  'Ordnance movement, arming procedures and magazine discipline.':
    'Mouvement des munitions, procédures d’armement et discipline en soute.',
  'Flight Deck Handling': 'Manœuvre sur le pont d’envol',
  'Aircraft directing, spotting and tractor operations on a live deck.':
    'Guidage des aéronefs, positionnement et conduite de tracteur sur un pont en activité.',
  'Radar & Sensor Operation': 'Mise en œuvre radar et capteurs',
  'Track management, contact classification and sensor employment.':
    'Gestion des pistes, classification des contacts et emploi des capteurs.',
  'Advanced Avionics': 'Avionique avancée',
  'Deep fault diagnosis on integrated mission systems. Long, expensive, transformative.':
    'Diagnostic approfondi sur systèmes de mission intégrés. Long, coûteux, décisif.',
  'Senior Maintenance Management': 'Encadrement de la maintenance',
  'Work-order planning and quality assurance across a division.':
    'Planification des ordres de travail et assurance qualité au niveau d’une section.',
  'Advanced Damage Control': 'Sécurité avancée',
  'Leading a locker through progressive flooding and major fire.':
    'Conduire une équipe de poste face à un envahissement progressif et à un incendie majeur.',
  'Flight Deck Supervision': 'Supervision du pont d’envol',
  'Running a deck cycle: spotting, foul deck calls and emergency pull-forward.':
    'Conduire un cycle de pont : positionnement, annonces de pont encombré et dégagement d’urgence.',
  'Team Management': 'Management d’équipe',
  'Required for chief. Turns a good technician into someone who can run a shop.':
    'Requis pour devenir maître. Transforme un bon technicien en quelqu’un capable de tenir un atelier.',
  'Crisis Management': 'Gestion de crise',
  'Decision making under casualty conditions and incomplete information.':
    'Décider en situation de sinistre et avec une information incomplète.',
  'Instructor Qualification': 'Qualification d’instructeur',
  'Qualifies the crew member to instruct courses and mentor juniors aboard.':
    'Qualifie le marin pour dispenser des stages et encadrer les jeunes à bord.',

  // =========================================================================
  // Daily summary
  // =========================================================================
  'DAY LOG': 'JOURNAL DE BORD',
  CARRIER: 'NAVIRE',
  RESOURCES: 'RESSOURCES',
  CASUALTIES: 'BLESSÉS',
  'TRAINING COMPLETED': 'STAGES VALIDÉS',
  'NOW ELIGIBLE FOR PROMOTION': 'DÉSORMAIS PROMOUVABLE',
  AIRCRAFT: 'AÉRONEFS',
  CREW: 'ÉQUIPAGE',
  Operation: 'Opération',
  Total: 'Total',
  Launched: 'Catapultés',
  Recovered: 'Appontés',
  'Maintenance completed': 'Maintenances terminées',
  'New work orders': 'Nouveaux ordres de travail',
  'In training': 'En formation',
  'Courses completed': 'Stages validés',
  'Newly promotable': 'Nouveaux promouvables',
  Readiness: 'Disponibilité',
  Assessment: 'Évaluation',
  Credits: 'Crédits',
  Prestige: 'Prestige',
  Standing: 'Réputation',
  Balance: 'Solde',
  'Casualties: {list}': 'Blessés : {list}',
  '{name} injured — {days} days off duty':
    '{name} blessé — {days} jours d’indisponibilité',
  'Equipment condition critical in {room}': 'État du matériel critique : {room}',
  '1 maintenance task set back by error':
    '1 tâche de maintenance retardée par une erreur',
  '{n} maintenance tasks set back by error':
    '{n} tâches de maintenance retardées par des erreurs',
  '1 mentoring pair active': '1 binôme de tutorat actif',
  '{n} mentoring pairs active': '{n} binômes de tutorat actifs',
  'Aircraft damaged: {list}': 'Aéronefs endommagés : {list}',
  'Operational tempo set to {tempo}': 'Rythme opérationnel réglé sur {tempo}',
  'Weekly command funding: +{amount} Credits':
    'Dotation hebdomadaire du commandement : +{amount} crédits',
  '{supply} below {threshold}%': '{supply} sous les {threshold} %',
  'Unresolved: {title} — defaulted to "{choice}"':
    'Non traité : {title} — choix par défaut « {choice} »',

  // =========================================================================
  // Assignment picker
  // =========================================================================
  TRADE: 'MÉTIER',
  CURRENT: 'ACTUEL',
  '{name} stood down to rest': '{name} mis au repos',
  '{name} returned to duty': '{name} a repris le service',
  '{name} promoted to {rank}': '{name} promu {rank}',
  'Promotion requirements not met': 'Conditions de promotion non remplies',
  'Mentoring programme started': 'Programme de tutorat lancé',
  'Mentoring ended': 'Tutorat terminé',
  '#{tail} moved to {place}': '#{tail} déplacé vers {place}',
  'the flight deck': 'le pont d’envol',
  'the hangar': 'le hangar',
  'No free spot on that deck': 'Aucun emplacement libre sur ce pont',
  'The campaign has ended.': 'La campagne est terminée.',

  // =========================================================================
  // Events
  // =========================================================================
  'category|PERSONNEL': 'PERSONNEL',
  'category|TRAINING': 'FORMATION',
  'category|MECHANICAL': 'MÉCANIQUE',
  'category|AIRCRAFT': 'AÉRONEF',
  'category|MEDICAL': 'MÉDICAL',
  'category|MORALE': 'MORAL',
  'category|OPERATIONAL': 'OPÉRATIONS',
  'category|MISSION': 'MISSION',
  'category|WEATHER': 'MÉTÉO',
  'category|LOGISTICS': 'LOGISTIQUE',
  'category|COMMAND': 'COMMANDEMENT',
  'category|EMERGENCY': 'URGENCE',
  'category|NARRATIVE': 'RÉCIT',
  '1 DECISION PENDING': '1 DÉCISION EN ATTENTE',
  '{n} DECISIONS PENDING': '{n} DÉCISIONS EN ATTENTE',
  'HIDE 1 DECISION': 'MASQUER 1 DÉCISION',
  'HIDE {n} DECISIONS': 'MASQUER {n} DÉCISIONS',

  // -- Leave request
  'Leave Request': 'Demande de permission',
  '{rank} {subject} has put in for five days of leave. They have been aboard {daysAboard} days without a break, and it shows in their work — but they are also the most capable hand in {room}.':
    '{rank} {subject} a demandé cinq jours de permission. Cela fait {daysAboard} jours qu’il est à bord sans interruption, et cela se voit dans son travail — mais c’est aussi le meilleur élément de : {room}.',
  'Approve five days': 'Accorder cinq jours',
  'They come back sharp. You lose them for five days.':
    'Il reviendra affûté. Vous le perdez cinq jours.',
  'Deny — we need them': 'Refuser — on a besoin de lui',
  'Available tomorrow. They will remember this.':
    'Disponible dès demain. Il s’en souviendra.',
  'Compromise — three days': 'Compromis — trois jours',
  'Half the rest, half the goodwill.':
    'Moitié moins de repos, moitié moins de reconnaissance.',

  'A Quiet Resignation': 'Une démission silencieuse',
  '{rank} {subject} has stopped volunteering for anything. The work still gets done, to the letter and no further. Their chief has noticed and asks whether you want it addressed.':
    '{rank} {subject} ne se porte plus volontaire pour quoi que ce soit. Le travail est fait, à la lettre et rien de plus. Son chef l’a remarqué et demande si vous souhaitez intervenir.',
  'Speak to them personally': 'Lui parler personnellement',
  'Costs you a day of command attention.':
    'Vous coûte une journée d’attention du commandement.',
  'Let the chief handle it': 'Laisser le chef gérer',
  'Delegating is what chiefs are for. Results vary.':
    'Déléguer, c’est le rôle des chefs. Les résultats varient.',
  'Ignore it': 'Ne rien faire',
  'They are still doing their job.': 'Il fait toujours son travail.',

  'Promotion Recommendation': 'Proposition d’avancement',
  '{subject}’s chief has recommended them for advancement. Technically they are among the best aboard. Whether they can lead a division is a different question, and the paperwork does not ask it.':
    'Le chef de {subject} le propose à l’avancement. Techniquement, il fait partie des meilleurs du bord. Savoir s’il peut diriger une section est une autre question, et le dossier ne la pose pas.',
  'Endorse the recommendation': 'Appuyer la proposition',
  'Morale across the division rises. Check their leadership first.':
    'Le moral de la section remonte. Vérifiez d’abord son commandement.',
  'Hold them at their current rank': 'Le maintenir à son grade actuel',
  'Keeps a superb technician on the tools.':
    'Garde un excellent technicien à l’établi.',

  'Mentoring Offer': 'Proposition de tutorat',
  '{rank} {subject} has offered to take the division’s junior hands through hands-on instruction. It would cost their own productivity for a while.':
    '{rank} {subject} propose de former les jeunes de la section sur le terrain. Cela lui coûterait une partie de son rendement pendant un temps.',
  'Approve the mentoring programme': 'Approuver le programme de tutorat',
  'Juniors improve. Your best technician spends the week teaching.':
    'Les jeunes progressent. Votre meilleur technicien passe la semaine à enseigner.',
  'Not now — we have a backlog': 'Pas maintenant — nous avons du retard',
  'Everyone stays on the tools.': 'Tout le monde reste à l’établi.',

  'The Crew Is Running Out': 'L’équipage est à bout',
  'Average fatigue across the ship has passed {avgFatigue}%. The senior chief has come to see you privately: mistakes are creeping into routine work, and someone is going to get hurt.':
    'La fatigue moyenne à bord a dépassé {avgFatigue} %. Le premier maître est venu vous voir en privé : des erreurs apparaissent dans les tâches de routine, et quelqu’un va finir par se blesser.',
  'Stand down for 24 hours': 'Repos général pendant 24 heures',
  'Real rest. Mission progress stops dead for a day.':
    'Un vrai repos. La mission n’avance plus d’un pouce pendant une journée.',
  'Reduce tempo to normal': 'Revenir au rythme normal',
  'A partial measure, which is often the right one.':
    'Une demi-mesure, ce qui est souvent la bonne.',
  'Press on': 'Poursuivre',
  'The mission does not care how tired they are.':
    'La mission se moque de leur fatigue.',

  'Exhausted Technician': 'Technicien épuisé',
  '{rank} {subject} is at {fatigue}% fatigue and has an aircraft opened up in {room}. Their chief wants them relieved; the work order is half finished and nobody else has their hands.':
    '{rank} {subject} est à {fatigue} % de fatigue et a un aéronef ouvert dans : {room}. Son chef veut le faire relever ; l’ordre de travail est à moitié fait et personne d’autre n’a ses mains.',
  'Send them to their rack': 'L’envoyer se coucher',
  'The job waits. So does the aircraft.':
    'Le travail attend. L’aéronef aussi.',
  'Let them finish the job': 'Le laisser terminer',
  'Tired hands on an open aircraft.':
    'Des mains fatiguées sur un aéronef ouvert.',

  // -- Mechanical / aircraft
  'Flight Deck Accident': 'Accident sur le pont d’envol',
  'A tow tractor lost hydraulic pressure during a night respot and an aircraft went into the safety net stanchion. Two crew are down and the airframe is bent.':
    'Un tracteur a perdu sa pression hydraulique lors d’un repositionnement de nuit et un aéronef a heurté un montant des filets. Deux marins sont à terre et la cellule est faussée.',
  'Full stop — secure the deck and investigate':
    'Tout arrêter — sécuriser le pont et enquêter',
  'The right answer. It costs you the day.':
    'La bonne réponse. Elle vous coûte la journée.',
  'Clear the wreck and keep the cycle going':
    'Dégager l’épave et poursuivre le cycle',
  'The deck keeps moving. So does whatever caused this.':
    'Le pont continue de tourner. La cause aussi.',

  'Mishap Investigation Report': 'Rapport d’enquête sur l’accident',
  'The investigation is on your desk. The tractor’s hydraulic inspection was signed off eleven days late. The signature belongs to a chief with fourteen years aboard and an otherwise spotless record.':
    'L’enquête est sur votre bureau. L’inspection hydraulique du tracteur a été visée avec onze jours de retard. La signature est celle d’un maître ayant quatorze ans de bord et un dossier par ailleurs irréprochable.',
  'Formal disciplinary action': 'Sanction disciplinaire formelle',
  'Procedure tightens. The division will not forgive it quickly.':
    'Les procédures se resserrent. La section ne le pardonnera pas de sitôt.',
  'Retraining, not punishment': 'Formation, pas sanction',
  'Costs money and a week of a good chief’s time.':
    'Coûte de l’argent et une semaine du temps d’un bon chef.',
  'File it and move on': 'Classer le dossier et passer à autre chose',
  'Nothing changes, which is the problem.':
    'Rien ne change, et c’est bien le problème.',

  'Maintenance Error Found': 'Erreur de maintenance découverte',
  'A quality assurance walk-through found a panel refitted with the wrong fasteners on an aircraft that flew twice yesterday. It held. It should not have.':
    'Un contrôle qualité a trouvé un panneau remonté avec les mauvaises fixations sur un aéronef qui a volé deux fois hier. Ça a tenu. Ça n’aurait pas dû.',
  'Ground the airframe and re-inspect the whole batch':
    'Immobiliser l’aéronef et réinspecter tout le lot',
  'Thorough. Expensive in time and parts.':
    'Rigoureux. Coûteux en temps et en pièces.',
  'Fix that one aircraft': 'Ne réparer que cet aéronef',
  'Probably fine. Probably.': 'Sans doute sans conséquence. Sans doute.',

  'A Junior Technician Finds Something': 'Un jeune technicien trouve quelque chose',
  '{subject}, three months out of technical school, stopped a launch. They found a chafed control run inside a wing root that was not on any inspection card. Their chief says another twenty hours and it would have failed in flight.':
    '{subject}, sorti de l’école technique depuis trois mois, a arrêté un catapultage. Il a trouvé une commande de vol usée par frottement dans une emplanture d’aile, absente de toute fiche d’inspection. Son chef estime qu’il restait vingt heures de vol avant la rupture.',
  'Recognise it publicly at quarters': 'Le citer publiquement au rassemblement',
  'The whole ship hears that speaking up is rewarded.':
    'Tout le navire comprend qu’il est payant de parler.',
  'Quiet word and a note in their record':
    'Un mot en privé et une mention au dossier',
  'Correct, unremarkable, and less useful than it could be.':
    'Correct, discret, et moins utile que cela aurait pu l’être.',

  'Aircraft Elevator Failure': 'Panne d’ascenseur aéronefs',
  'The forward aircraft elevator has jammed at hangar level with an airframe on the platform. Until it moves, half the deck cycle runs through one elevator.':
    'L’ascenseur avant est bloqué au niveau du hangar avec un aéronef sur la plateforme. Tant qu’il ne bouge pas, la moitié du cycle de pont passe par un seul ascenseur.',
  'All hands from Engineering onto it': 'Y mettre tout le service machines',
  'Fixed by morning. Engineering does nothing else today.':
    'Réparé au matin. Les machines ne feront rien d’autre aujourd’hui.',
  'Work around it and repair overnight':
    'Faire sans et réparer dans la nuit',
  'Slower cycle for a day, but nothing else stops.':
    'Cycle ralenti une journée, mais rien d’autre ne s’arrête.',
  'Bypass the interlock and keep using it':
    'Shunter le verrouillage et continuer à l’utiliser',
  'It will move. It should not.': 'Il bougera. Il ne devrait pas.',

  'Arresting Gear Anomaly': 'Anomalie des brins d’arrêt',
  'Number three arresting engine is showing inconsistent retraction pressure. Deck Department wants it out of service for a full strip-down; Air Department points out that three wires make a very thin margin for night recovery.':
    'Le frein numéro trois présente une pression de rappel irrégulière. Le service pont veut le retirer du service pour démontage complet ; le service aéronautique rappelle que trois brins laissent une marge très mince pour l’appontage de nuit.',
  'Out of service — strip it down': 'Hors service — démontage complet',
  'Safe. Recovery rate drops while it is down.':
    'Sûr. La cadence d’appontage baisse pendant l’immobilisation.',
  'Keep it rigged for day recovery only':
    'Le conserver pour l’appontage de jour uniquement',
  'A reasonable middle course with a real edge to it.':
    'Un juste milieu raisonnable, mais qui a du tranchant.',
  'Leave it in service': 'Le laisser en service',
  'Four wires, one of them suspect.': 'Quatre brins, dont un suspect.',

  'Ordnance Handling Discrepancy': 'Écart en manutention de munitions',
  'A magazine inventory does not reconcile: the count is right but two arming units are logged to an aircraft that never flew. Weapons Department wants a full magazine recount, which shuts ordnance handling down for a day.':
    'Un inventaire de soute ne se recoupe pas : le compte est bon, mais deux dispositifs d’armement sont attribués à un aéronef qui n’a jamais volé. Le service armement veut un recomptage complet, ce qui arrête la manutention pendant une journée.',
  'Full recount — nobody touches the magazine':
    'Recomptage complet — personne ne touche à la soute',
  'The only defensible answer. It costs a launch cycle.':
    'La seule réponse défendable. Elle coûte un cycle de catapultage.',
  'Spot-check the affected racks': 'Contrôler par sondage les râteliers concernés',
  'Faster. Narrower.': 'Plus rapide. Plus étroit.',
  'Correct the paperwork': 'Corriger la paperasse',
  'The count is right, after all.': 'Après tout, le compte est bon.',

  'Magazine Incident': 'Incident en soute à munitions',
  'An arming unit was found on a handling cart in a passageway, unsecured, half a deck from where it should have been. No one will say who left it. The magazine discrepancy you filed away is now a formal inquiry.':
    'Un dispositif d’armement a été trouvé sur un chariot dans une coursive, non arrimé, à un demi-pont de l’endroit où il aurait dû être. Personne ne dira qui l’y a laissé. L’écart de soute que vous aviez classé fait désormais l’objet d’une enquête formelle.',
  'Report it up the chain yourself': 'Le signaler vous-même à la hiérarchie',
  'Prestige hit now, credibility kept.':
    'Coup au prestige immédiat, crédibilité préservée.',
  'Handle it internally': 'Régler l’affaire en interne',
  'Contained, unless it is not.': 'Circonscrit — sauf si ça ne l’est pas.',

  'Command Inquiry': 'Enquête de commandement',
  'Fleet has sent an inspection team. They are asking about the magazine incident, and they have the original discrepancy log.':
    'L’état-major a envoyé une équipe d’inspection. Elle interroge sur l’incident de soute, et détient le registre d’écart d’origine.',
  'Full cooperation': 'Coopération totale',
  'Painful and final.': 'Douloureux et définitif.',
  'Defend the ship’s handling of it': 'Défendre la gestion faite par le bord',
  'Might hold. Might double the cost.':
    'Cela peut tenir. Cela peut aussi doubler la facture.',

  'Inquiry Findings': 'Conclusions de l’enquête',
  'The findings are in. The team accepted that the ship’s handling procedures were sound but criticised the command climate that let a discrepancy be filed away.':
    'Les conclusions sont tombées. L’équipe a reconnu que les procédures du bord étaient saines, mais a critiqué le climat de commandement qui a permis de classer un écart.',
  'Accept the findings': 'Accepter les conclusions',
  'It ends here.': 'Cela s’arrête là.',

  'Aircraft Returns Damaged': 'Un aéronef rentre endommagé',
  'An airframe recovered with structural damage and a dead hydraulic system. Maintenance estimates four days of work, or two days if they cannibalise parts from a hangared aircraft.':
    'Une cellule est rentrée avec des dommages structuraux et un circuit hydraulique mort. La maintenance estime quatre jours de travail, ou deux en prélevant des pièces sur un aéronef au hangar.',
  'Order parts and do it properly': 'Commander les pièces et faire les choses correctement',
  'Four days down, stores drawn.': 'Quatre jours d’immobilisation, magasins ponctionnés.',
  'Cannibalise the hangar queen': 'Prélever sur l’aéronef immobilisé',
  'One aircraft flies sooner, another stops flying at all.':
    'Un aéronef vole plus tôt, un autre ne vole plus du tout.',
  'Defer it — park the aircraft': 'Reporter — laisser l’aéronef au parc',
  'Nothing spent, nothing gained, one fewer airframe.':
    'Rien de dépensé, rien de gagné, une cellule de moins.',

  // -- Operational / weather / mission
  'Severe Weather Approaching': 'Météo sévère en approche',
  'A storm front will reach the operating area within eight hours. Sea state will make recovery marginal and the deck will need to be respotted and chained.':
    'Un front orageux atteindra la zone d’opérations sous huit heures. L’état de la mer rendra l’appontage marginal et le pont devra être repositionné et saisi.',
  'Continue operations': 'Poursuivre les opérations',
  'Progress now, risk now.': 'Progression immédiate, risque immédiat.',
  'Reduce flight operations': 'Réduire les opérations aériennes',
  'The measured option.': 'L’option mesurée.',
  'Cancel today’s operations and secure the deck':
    'Annuler les opérations du jour et saisir le pont',
  'No risk, no progress, and the crew gets a rare quiet day.':
    'Aucun risque, aucune progression, et l’équipage gagne une rare journée calme.',

  'Foul Deck': 'Pont encombré',
  'An aircraft has gone down on the foul line with a nose gear indication during a recovery cycle. There are four airframes in the pattern and one of them is at low state.':
    'Un aéronef est immobilisé sur la ligne d’encombrement avec une alarme de train avant en plein cycle d’appontage. Quatre appareils sont dans le circuit et l’un d’eux est en carburant bas.',
  'Divert the low-state aircraft to the tanker':
    'Envoyer l’appareil en carburant bas au ravitailleur',
  'Costs fuel, buys time.': 'Coûte du carburant, gagne du temps.',
  'Push the aircraft clear by hand — fast':
    'Dégager l’aéronef à la main — vite',
  'Deck crew work under a recovering aircraft.':
    'Le personnel de pont travaille sous un appareil en approche.',
  'Rig the barricade': 'Monter la barrière d’arrêt',
  'Safe, slow, and everybody watching will note it.':
    'Sûr, lent, et tous les observateurs le noteront.',

  'Unidentified Contact': 'Contact non identifié',
  'CIC holds an air contact at 140 miles, closing, no response to interrogation. Operations recommends launching the alert fighters.':
    'Le central opérations tient un contact aérien à 140 milles, en rapprochement, sans réponse à l’interrogation. Les Opérations recommandent de lancer la chasse d’alerte.',
  'Launch the alert pair': 'Lancer la patrouille d’alerte',
  'Correct and expensive in fuel and crew rest.':
    'Correct, et coûteux en carburant et en repos d’équipage.',
  'Track it and hold the fighters': 'Le pister sans lancer la chasse',
  'Cheaper. Depends on your Operations department.':
    'Moins coûteux. Dépend de votre service Opérations.',

  Intercept: 'Interception',
  'The alert pair has intercepted and is escorting the contact clear. The wing wants to extend the patrol to shadow it home; that means a tanker cycle and two more hours on tired aircrew.':
    'La patrouille d’alerte a intercepté et escorte le contact hors de la zone. Le groupe aérien veut prolonger la mission pour le raccompagner : cela signifie un cycle de ravitaillement et deux heures de plus pour des équipages fatigués.',
  'Extend the patrol': 'Prolonger la patrouille',
  'Good intelligence, tired crews, thirsty aircraft.':
    'Bon renseignement, équipages fatigués, appareils assoiffés.',
  'Recover the pair': 'Faire apponter la patrouille',
  'Nothing gained, nothing spent.': 'Rien de gagné, rien de dépensé.',

  'We Are Being Watched': 'On nous observe',
  'A trawler has been holding station twelve miles off the beam for two days, matching every course change. Operations is confident it is collecting.':
    'Un chalutier tient position à douze milles par le travers depuis deux jours, épousant chaque changement de route. Les Opérations sont convaincues qu’il collecte du renseignement.',
  'Run deception — vary the cycle, mask emissions':
    'Mener une déception — varier le cycle, masquer les émissions',
  'Protects the mission, complicates everything aboard.':
    'Protège la mission, complique tout à bord.',
  'Carry on as normal': 'Continuer normalement',
  'Let them watch a well-run ship.':
    'Qu’ils observent un navire bien tenu.',

  'Fleet Observer Aboard': 'Observateur de l’état-major à bord',
  'A staff captain has embarked to observe operations for three days. Everything the ship does this week will be written down by someone who reports to the people who assign missions.':
    'Un capitaine de vaisseau d’état-major a embarqué pour observer les opérations pendant trois jours. Tout ce que fera le bord cette semaine sera consigné par quelqu’un qui rend compte à ceux qui attribuent les missions.',
  'Show them the real ship': 'Lui montrer le navire tel qu’il est',
  'Honest. Whatever is broken will be seen.':
    'Honnête. Ce qui ne va pas sera vu.',
  'Put the best division forward': 'Mettre en avant la meilleure section',
  'Safer prestige, and the crew knows exactly what you did.':
    'Prestige plus sûr, et l’équipage sait très bien ce que vous avez fait.',

  'Communications Degraded': 'Transmissions dégradées',
  'The primary satellite terminal has dropped out and the backup is running at reduced bandwidth. Operations can work through it, but coordination will be slower and less certain.':
    'Le terminal satellite principal est tombé et le secours fonctionne à débit réduit. Les Opérations peuvent faire avec, mais la coordination sera plus lente et moins sûre.',
  'Pull an electrical team off machinery to fix it':
    'Détacher une équipe électricité des machines pour réparer',
  'Comms restored, Engineering loses a day.':
    'Transmissions rétablies, les machines perdent une journée.',
  'Operate on the backup': 'Fonctionner sur le secours',
  'Degraded Operations for a few days.':
    'Opérations dégradées pendant quelques jours.',

  'Reactor Plant Alarm': 'Alarme de la chaufferie nucléaire',
  'A coolant pump has annunciated low differential pressure and the plant has automatically reduced power. Reactor Control reports the plant is stable and safe. Available power is down, which means fewer catapult cycles.':
    'Une pompe de refroidissement signale une pression différentielle basse et l’installation a automatiquement réduit sa puissance. Le contrôle réacteur indique une installation stable et sûre. La puissance disponible baisse, donc moins de cycles de catapultage.',
  'Shut the affected loop down and repair it':
    'Isoler la boucle concernée et la réparer',
  'By the book. Reduced power for two days.':
    'Dans les règles. Puissance réduite pendant deux jours.',
  'Run on reduced power and repair at sea alongside':
    'Fonctionner à puissance réduite et réparer en parallèle',
  'A compromise Engineering does not love.':
    'Un compromis que les machines n’apprécient guère.',

  // -- Logistics / medical
  'Aviation Fuel Running Low': 'Carburant aviation en baisse',
  'Aviation fuel is down to {fuel}%. The next replenishment window is not for several days, and the current launch cycle will not reach it.':
    'Le carburant aviation est tombé à {fuel} %. Le prochain créneau de ravitaillement est dans plusieurs jours, et le cycle actuel ne tiendra pas jusque-là.',
  'Request an emergency replenishment': 'Demander un ravitaillement d’urgence',
  'Expensive, and Fleet notices you did not plan.':
    'Coûteux, et l’état-major note que vous n’avez pas anticipé.',
  'Cut the launch cycle to conserve': 'Réduire le cycle pour économiser',
  'Free, and the mission slows down.':
    'Gratuit, et la mission ralentit.',
  'Press on and hope for the window': 'Continuer et espérer le créneau',
  'If you run dry mid-mission, everything stops.':
    'Si vous tombez à sec en pleine mission, tout s’arrête.',

  'Spare Parts Shortage': 'Pénurie de pièces de rechange',
  'Spares are at {parts}% with {openWorkOrders} work orders open. Supply says the high-demand avionics modules are the constraint.':
    'Les rechanges sont à {parts} % avec {openWorkOrders} ordres de travail ouverts. Le commissariat indique que les modules avioniques à forte demande sont le goulot d’étranglement.',
  'Buy spares at premium price': 'Acheter des rechanges au prix fort',
  'Solves it with money.': 'Réglé à coups d’argent.',
  'Authorise controlled cannibalisation': 'Autoriser un prélèvement contrôlé',
  'Free parts from an aircraft you stop flying.':
    'Des pièces gratuites, prises sur un aéronef que vous clouez au sol.',
  'Prioritise the work orders and wait': 'Prioriser les ordres et attendre',
  'Discipline. The backlog grows.': 'De la rigueur. Le retard s’accumule.',

  'Fresh Provisions Exhausted': 'Vivres frais épuisés',
  'The last of the fresh provisions went out at breakfast. Everything from here is out of a can until replenishment, and five thousand people will notice by tomorrow.':
    'Les derniers vivres frais sont partis au petit-déjeuner. À partir de maintenant, tout sort d’une boîte jusqu’au ravitaillement, et cinq mille personnes s’en apercevront dès demain.',
  'Arrange a stores transfer': 'Organiser un transfert de vivres',
  'Money fixes it.': 'L’argent règle le problème.',
  'Ration and explain it at quarters':
    'Rationner et l’expliquer au rassemblement',
  'Honesty helps a little. Not much.':
    'L’honnêteté aide un peu. Pas beaucoup.',

  'Medical Surge': 'Afflux à l’infirmerie',
  'Medical has more patients than beds — a mix of heat casualties from the flight deck and a gastrointestinal outbreak in one berthing compartment.':
    'L’infirmerie a plus de patients que de lits — un mélange de coups de chaleur venus du pont d’envol et d’une épidémie gastro-intestinale dans un poste d’équipage.',
  'Convert a berthing space into an overflow ward':
    'Convertir un poste d’équipage en salle de débordement',
  'Capacity now, crowding later.':
    'De la capacité maintenant, de la promiscuité ensuite.',
  'Fly the worst cases ashore': 'Évacuer les cas les plus graves à terre',
  'Costs a sortie and some fuel; they get real hospitals.':
    'Coûte une sortie et du carburant ; ils auront de vrais hôpitaux.',
  'Treat aboard and restrict movement':
    'Soigner à bord et restreindre les mouvements',
  'Contained, uncomfortable, and slower to clear.':
    'Circonscrit, inconfortable, et plus long à résorber.',

  'More People Than Lift': 'Plus de monde que de capacité d’emport',
  'The shore team reports three times the expected number of people waiting at the landing site, and the light is going. Every additional lift tonight is flown by aircrew already at their limit.':
    'L’équipe à terre signale trois fois plus de personnes que prévu sur la zone de poser, et la lumière décline. Chaque rotation supplémentaire cette nuit sera assurée par des équipages déjà à la limite.',
  'Fly through the night': 'Voler toute la nuit',
  'More people out. Everyone pays for it tomorrow.':
    'Plus de gens évacués. Tout le monde le paiera demain.',
  'Stop at last light, resume at dawn':
    'S’arrêter à la nuit, reprendre à l’aube',
  'Disciplined. Some of those people will not be there at dawn.':
    'Rigoureux. Certaines de ces personnes ne seront plus là à l’aube.',
  'Request additional lift from the group':
    'Demander des moyens supplémentaires au groupe',
  'Shares the credit and the load.':
    'Partage le mérite et la charge.',

  'The Ship Has Gone Quiet': 'Le navire s’est tu',
  'Morale is at {avgMorale}%. The mess is silent, the recreation space is empty, and three separate chiefs have used the same phrase this week: the crew is just going through the motions.':
    'Le moral est à {avgMorale} %. Le mess est silencieux, l’espace détente est vide, et trois chefs différents ont employé la même formule cette semaine : l’équipage fait les gestes, rien de plus.',
  'Steel beach picnic — half a day off':
    'Barbecue sur le pont — une demi-journée de repos',
  'Costs stores and a day. Works.':
    'Coûte des vivres et une journée. Ça marche.',
  'Address the crew directly': 'S’adresser directement à l’équipage',
  'Free. Depends on what you have earned.':
    'Gratuit. Dépend de ce que vous avez mérité.',
  'Nothing — they will work through it': 'Rien — ils s’en remettront',
  'Sometimes true.': 'Parfois vrai.',

  'Operating Budget Review': 'Revue du budget de fonctionnement',
  'Fleet is reviewing the ship’s operating account. You can make a case for additional funding, but you will be asked to justify the tempo you have been running.':
    'L’état-major réexamine le budget de fonctionnement du bord. Vous pouvez plaider pour une rallonge, mais on vous demandera de justifier le rythme que vous imposez.',
  'Request an increase': 'Demander une augmentation',
  'Money now, scrutiny later.': 'De l’argent maintenant, des questions plus tard.',
  'Report the account as sufficient': 'Déclarer le budget suffisant',
  'Reputation for efficiency; no cash.':
    'Une réputation d’efficacité ; pas d’argent.',
  'Return unspent funds': 'Restituer les crédits non consommés',
  'A gesture, at a real cost.': 'Un geste, à un coût réel.',

  'Fire in a Machinery Space': 'Incendie dans un local machines',
  'Class Bravo fire reported in an auxiliary machinery space. The compartment is manned. Damage Control is closing up; the on-scene leader is asking permission to enter rather than seal and flood the space.':
    'Incendie de classe B signalé dans un local de machines auxiliaires. Le compartiment est occupé. L’équipe de sécurité se met en place ; le chef sur zone demande l’autorisation d’entrer plutôt que de condamner et noyer le local.',
  'Send the hose team in': 'Envoyer l’équipe de lance',
  'Saves the equipment. Risks the team.':
    'Sauve le matériel. Met l’équipe en danger.',
  'Seal and flood the compartment': 'Condamner et noyer le compartiment',
  'Nobody gets hurt. The space is destroyed.':
    'Personne n’est blessé. Le local est détruit.',
  // ---------------------------------------------------------------- aircrew
  Pilot: 'Pilote',
  'Naval Aircrewman': 'Équipier de bord',
  'Mission brief and flight planning': 'Briefing de mission et préparation de vol',
  'Mission systems preparation': 'Préparation des systèmes de mission',
  '1 airframe is flying short-crewed': 'Un appareil vole en équipage incomplet',
  '{n} airframes are flying short-crewed': '{n} appareils volent en équipage incomplet',
  '{name} has flown {days} days running and is worn out':
    '{name} vole depuis {days} jours d’affilée et accuse la fatigue',
  '{name} has flown 8 days without a break': '{name} vole depuis 8 jours sans interruption',
  '1 tasked airframe has no pilot in the seat and will not launch':
    'Un appareil assigné n’a pas de pilote et ne décollera pas',
  '{n} tasked airframes have no pilot in the seat and will not launch':
    '{n} appareils assignés n’ont pas de pilote et ne décolleront pas',

  AIRCREW: 'ÉQUIPAGES',
  'CREW CHART': 'TABLEAU D’ÉQUIPAGE',
  'The commander flies the aircraft and counts for most of what the sortie is worth; mission crew share the rest. An empty or unfit seat is a seat that does not contribute — and with no commander the aircraft does not launch at all.':
    'Le commandant de bord pilote l’appareil et représente l’essentiel de la valeur de la sortie ; les équipiers se partagent le reste. Un siège vide ou occupé par quelqu’un d’indisponible ne contribue pas — et sans commandant de bord, l’appareil ne décolle pas du tout.',
  'CREW EFFECT': 'EFFET ÉQUIPAGE',
  Squadron: 'Escadron',
  'Seats manned': 'Sièges pourvus',
  'FILL EMPTY SEATS': 'POURVOIR LES SIÈGES',
  'CLEAR ALL SEATS': 'VIDER TOUS LES SIÈGES',
  DONE: 'TERMINÉ',
  COMMANDER: 'COMMANDANT DE BORD',
  'MISSION CREW {n}': 'ÉQUIPIER {n}',
  VACANT: 'LIBRE',
  EMPTY: 'VIDE',
  '— Leave this seat empty —': '— Laisser ce siège vide —',
  SORTIES: 'SORTIES',
  '{n} DAYS FLYING': '{n} JOURS DE VOL',
  'BACK TO CREW CHART': 'RETOUR AU TABLEAU D’ÉQUIPAGE',
  'That seat cannot be filled by this crew member':
    'Ce membre d’équipage ne peut pas occuper ce siège',
  'Aircrew posted across the wing': 'Équipages affectés dans tout le groupe aérien',
  FLYING: 'ACTIVITÉ AÉRIENNE',
  'Assigned airframe': 'Appareil affecté',
  'None — not on the flight schedule': 'Aucun — hors planning de vol',
  'Sorties flown': 'Sorties effectuées',
  'Consecutive flying days': 'Jours de vol consécutifs',
  'Aircrew flown day after day tire faster than anyone else aboard, and a tired crew is both worth less in the air and more likely to break something. Standing them down costs sorties today and saves the wing next week.':
    'Les équipages qui volent jour après jour s’usent plus vite que n’importe qui d’autre à bord, et un équipage fatigué vaut moins en vol tout en cassant davantage. Les mettre au repos coûte des sorties aujourd’hui et préserve le groupe aérien la semaine prochaine.',
  seats: 'sièges',
  'Crew effect': 'Effet équipage',
  'NO PILOT': 'SANS PILOTE',
  'ASSIGN AIRCREW': 'AFFECTER L’ÉQUIPAGE',
  'AUTO-CREW': 'ÉQUIPAGES AUTO',
  'Aircrew condition': 'État des équipages',
  '{n}d flying': '{n}j de vol',
  SHORT: 'INCOMPLET',
  'Click to set who flies this airframe': 'Cliquer pour définir qui pilote cet appareil',
  // ------------------------------------------------- assigning to a space
  'ASSIGN PERSONNEL': 'AFFECTER DU PERSONNEL',
  Department: 'Département',
  'AVAILABLE PERSONNEL': 'PERSONNEL DISPONIBLE',
  '+{n} more, further down the ranking — narrow it with the roster instead.':
    '+{n} autres, plus bas dans le classement — affinez plutôt depuis l’effectif.',
  FIT: 'APTITUDE',
  'SECOND TRADE': 'SECOND MÉTIER',
  DEPARTMENT: 'DÉPARTEMENT',
  'OUTSIDE TRADE': 'HORS MÉTIER',
  'SHOW EVERY TRADE': 'TOUS LES MÉTIERS',
  'ONLY MATCHING TRADES': 'MÉTIERS CORRESPONDANTS',
  // ------------------------------------------------------------------ posts
  'Avionics Maintenance': 'Maintenance avionique',
  'Engine Maintenance': 'Maintenance moteurs',
  ENGINES: 'MOTEURS',
  'Airframe Maintenance': 'Maintenance cellules',
  AIRFRAMES: 'CELLULES',
  'DECK HANDLING': 'MANŒUVRE PONT',
  'Aircraft Movement': 'Déplacement des aéronefs',
  MOVEMENT: 'DÉPLACEMENT',
  'Flight Operations': 'Opérations aériennes',
  'FLIGHT OPS': 'OPS AÉRIENNES',
  'Air Picture Watch': 'Veille de la situation aérienne',
  'AIR PICTURE': 'SITUATION AÉR.',
  'Air Traffic Control': 'Contrôle aérien',
  'AIR CONTROL': 'CONTRÔLE AÉR.',
  'Communications Watch': 'Veille communications',
  'COMMS WATCH': 'VEILLE COMMS',
  'Electrical & Machinery': 'Électricité et machines',
  'Damage Control Watch': 'Veille sécurité',
  'DAMAGE CONTROL': 'SÉCURITÉ',
  'Medical Department': 'Service médical',
  'Stores & Supply': 'Magasins et approvisionnement',
  SUPPLY: 'APPRO',
  'Flying Squadrons': 'Escadrons de vol',
  SQUADRONS: 'ESCADRONS',
  'Mission Aircrew': 'Équipiers de mission',
  'MISSION AIRCREW': 'ÉQUIPIERS',

  'Appointed to {post}': 'Affecté au poste {post}',
  'Cannot reappoint right now': 'Réaffectation impossible pour le moment',
  'MANNED BY': 'ARMÉ PAR',
  'SHORT-HANDED': 'SOUS-EFFECTIF',
  '{here} here of {total}': '{here} ici sur {total}',
  '{here} here of {total} / {billets}': '{here} ici sur {total} / {billets}',
  'Personnel are appointed to a post, which covers every space its job reaches. Click a post to man it; the ship moves its people to whichever of its spaces has work waiting.':
    'Le personnel est affecté à un poste, qui couvre tous les locaux que sa fonction atteint. Cliquez sur un poste pour l’armer ; le navire répartit ses gens vers celui de ses locaux où le travail attend.',
  Post: 'Poste',
  'Working in': 'En service dans',
  APPOINT: 'AFFECTER',
  'THE POST': 'LE POSTE',
  Trade: 'Métier',
  'Spaces covered': 'Locaux couverts',
  Appointed: 'Affectés',
  'This post is short of its established strength, so the work it covers goes slower than the ship expects.':
    'Ce poste est en dessous de son effectif théorique : le travail qu’il couvre avance moins vite que ce que le navire attend.',
  'A post covers every space its job reaches. Its people are moved to whichever of those spaces has work waiting, so nobody has to be placed compartment by compartment.':
    'Un poste couvre tous les locaux que sa fonction atteint. Ses gens sont envoyés vers celui de ces locaux où le travail attend : personne n’a besoin d’être placé local par local.',
  'Ranked by how well suited they are to this post: the trade it calls for first, then skill, then how much use they would actually be today. Click someone to appoint them.':
    'Classé par aptitude au poste : d’abord le métier qu’il exige, puis la compétence, puis l’utilité réelle aujourd’hui. Cliquez sur une personne pour l’y affecter.',
  'Nobody is available to appoint. Everyone fit already holds this post.':
    'Personne de disponible à affecter. Tout le personnel apte tient déjà ce poste.',
  POST: 'POSTE',
  'A post is a function, not a compartment: its people work in every space the job covers, and the ship moves them to whichever of those has work waiting. Posts calling for their trade are listed first.':
    'Un poste est une fonction, pas un local : ses gens travaillent dans tous les locaux que couvre la fonction, et le navire les envoie vers celui où le travail attend. Les postes qui demandent leur métier sont listés en premier.',
  spaces: 'locaux',
  'POST NOW': 'POSTE ACTUEL',

  // =========================================================================
  // Sound, deployment, debrief and the guided first day
  // =========================================================================
  'SOUND ON': 'SON ACTIVÉ',
  'SOUND OFF': 'SON COUPÉ',
  'Toggle ambient sound': 'Activer ou couper le son d’ambiance',
  'NEW DEPLOYMENT — 30 DAYS': 'NOUVEAU DÉPLOIEMENT — 30 JOURS',
  'OPEN CAREER': 'CARRIÈRE LIBRE',
  'DEPLOYMENT ORDERS': 'ORDRES DE DÉPLOIEMENT',
  'DAY {n} / {total}': 'JOUR {n} / {total}',
  'DAY {n} OF {total}': 'JOUR {n} SUR {total}',
  '{n}d': '{n}j',
  'Complete operations with Success or better': 'Réussir des opérations (Succès ou mieux)',
  'Raise the ship’s prestige': 'Accroître le prestige du navire',
  'Bring the crew home in good heart (morale)': 'Ramener un équipage au bon moral',
  'Bring the ship home ready (readiness)': 'Ramener un navire opérationnel (disponibilité)',
  'Orders: two successful operations inside thirty days. Each other objective met on the last day earns a star. ● on track · ▲ at risk · ✓ done':
    'Ordres : deux opérations réussies en trente jours. Chaque autre objectif atteint le dernier jour rapporte une étoile. ● en bonne voie · ▲ menacé · ✓ atteint',
  'Deployment accomplished. The Resolute is relieved on station and heads home.':
    'Déploiement accompli. Le Resolute est relevé sur zone et rentre au port.',
  'Deployment not accomplished. Fleet expected two successful operations.':
    'Déploiement non accompli. La flotte attendait deux opérations réussies.',
  'The operating account has been unsustainable for five days. Command relieved.':
    'Les comptes d’exploitation sont intenables depuis cinq jours. Commandant relevé.',
  'Carrier readiness has been critical for seven days. Command relieved.':
    'La disponibilité du porte-avions est critique depuis sept jours. Commandant relevé.',
  'DEPLOYMENT ACCOMPLISHED': 'DÉPLOIEMENT ACCOMPLI',
  'DEPLOYMENT NOT ACCOMPLISHED': 'DÉPLOIEMENT NON ACCOMPLI',
  'THE DEPLOYMENT': 'LE DÉPLOIEMENT',
  'Days at sea and alongside': 'Jours en mer et à quai',
  'Operations completed': 'Opérations menées',
  'Crew injured on duty': 'Blessés en service',
  'RETURN TO TITLE': 'RETOUR AU TITRE',
  'KEEP COMMAND — OPEN CAREER': 'GARDER LE COMMANDEMENT — CARRIÈRE LIBRE',
  'Orders not carried out': 'Ordres non exécutés',
  'Orders carried out': 'Ordres exécutés',
  'Well done': 'Bien joué',
  'Bravo Zulu': 'Bravo Zulu',
  'Exceptional command': 'Commandement exceptionnel',
  'Command continues — open career': 'Le commandement continue — carrière libre',
  'STEP {n} OF {total}': 'ÉTAPE {n} SUR {total}',
  'SKIP TUTORIAL': 'PASSER LE TUTORIEL',
  NEXT: 'SUIVANT',
  FINISH: 'TERMINER',
  'Waiting for you…': 'À vous de jouer…',
  'WELCOME ABOARD, CAPTAIN': 'BIENVENUE À BORD, COMMANDANT',
  'You command the USS Resolute for a thirty-day deployment. Your orders: complete two operations successfully. One turn is one day, and nothing moves until you end it, so take your time.':
    'Vous commandez l’USS Resolute pour un déploiement de trente jours. Vos ordres : réussir deux opérations. Un tour est une journée, et rien ne bouge tant que vous ne la terminez pas : prenez votre temps.',
  'THE SHIP IS THE INTERFACE': 'LE NAVIRE EST L’INTERFACE',
  'This is the flight deck. Click an aircraft to inspect it: its systems, its fuel, and who flies it.':
    'Voici le pont d’envol. Cliquez sur un avion pour l’inspecter : ses systèmes, son carburant et son équipage.',
  'GO BELOW': 'DESCENDRE',
  'Press 2, or click deck 02 in the overview, to go down to the hangar. Wings fold below decks, and the shops there keep the air wing flying.':
    'Appuyez sur 2, ou cliquez sur le pont 02 dans la vue d’ensemble, pour descendre au hangar. Sous le pont, les ailes se replient, et les ateliers y maintiennent le groupe aérien en état de vol.',
  'THE DAY’S DECISIONS': 'LES DÉCISIONS DU JOUR',
  'Every day brings decisions, and none is free: each choice trades something you want for something else you want. Answer today’s.':
    'Chaque jour apporte ses décisions, et aucune n’est gratuite : chaque choix sacrifie une chose que vous voulez pour une autre. Répondez à celles d’aujourd’hui.',
  'TAKE AN OPERATION': 'ACCEPTER UNE OPÉRATION',
  'Open MISSIONS (M) and accept an operation. Work-ups are the gentlest start. The ship sails at once, and nothing can be brought aboard at sea.':
    'Ouvrez MISSIONS (M) et acceptez une opération. L’entraînement est le départ le plus doux. Le navire appareille aussitôt, et rien ne peut être embarqué en mer.',
  'THE AIR TASKING ORDER': 'L’ORDRE DE MISSION AÉRIENNE',
  'Open TASKING (A). Each airframe holds one duty, and only the duties the operation rewards make progress. AUTO-ASSIGN lays on a workable order; close the panel when you are happy with it.':
    'Ouvrez ORDRES DE VOL (A). Chaque appareil tient une tâche, et seules les tâches utiles à l’opération la font progresser. La RÉPARTITION AUTO propose un ordre viable ; fermez le panneau quand il vous convient.',
  'END THE DAY': 'TERMINER LA JOURNÉE',
  'Press END DAY. The ship resolves the day and reports back, including why readiness moved. Tired crews make mistakes: the WATCH BILL in the sidebar sets how each department rotates its people through rest.':
    'Appuyez sur FIN DE JOURNÉE. Le navire résout la journée et fait son rapport, y compris pourquoi la disponibilité a bougé. Un équipage fatigué commet des erreurs : la ROTATION DES QUARTS, dans la colonne de droite, règle la façon dont chaque service fait reposer ses marins.',
  'YOUR ORDERS': 'VOS ORDRES',
  'Your orders are always here. Two successful operations win the deployment; morale, readiness and prestige on the last day earn the stars. Good hunting, Captain.':
    'Vos ordres sont toujours ici. Deux opérations réussies remportent le déploiement ; le moral, la disponibilité et le prestige du dernier jour rapportent les étoiles. Bonne chasse, commandant.',

  // =========================================================================
  // Watch bill, the passage, why readiness moved
  // =========================================================================
  'WATCH BILL':
    'ROTATION DES QUARTS',
  'RESTING':
    'AU REPOS',
  'watch|SRG':
    'MAX',
  'watch|STD':
    'STD',
  'watch|3W':
    '3Q',
  'SURGE':
    'EFFORT MAXIMAL',
  'STANDARD':
    'STANDARD',
  '3 WATCHES':
    '3 QUARTS',
  'All departments: {policy}':
    'Tous les services : {policy}',
  'Surge: nobody is stood down. Everyone on duty today, paid for in fatigue later.':
    'Effort maximal : personne n’est mis au repos. Tout le monde de service aujourd’hui, la fatigue se paiera plus tard.',
  'Standard: the exhausted are stood down to rest, a few at a time.':
    'Standard : les plus épuisés sont mis au repos, quelques-uns à la fois.',
  'Three watches: people rest before they are worn out. Fewer hands on duty, sharper ones.':
    'Trois quarts : chacun se repose avant d’être usé. Moins de bras de service, mais plus affûtés.',
  'SRG surge · STD standard · 3W three watches. Rested people return to duty on their own.':
    'MAX effort maximal · STD standard · 3Q trois quarts. Les reposés reprennent leur service d’eux-mêmes.',
  'Watch bill: {policy} — {down} stood down, {up} back on duty':
    'Rotation des quarts : {policy} — {down} mis au repos, {up} de retour en service',
  'Change of watch: {down} stood down to rest, {up} back on duty':
    'Relève des quarts : {down} mis au repos, {up} de retour en service',
  'Done':
    'Atteint',
  'On track':
    'En bonne voie',
  'At risk':
    'Menacé',
  'Missed':
    'Manqué',
  'Weakest link':
    'Maillon faible',
  'WHY READINESS MOVED':
    'POURQUOI LA DISPONIBILITÉ A BOUGÉ',
  'Readiness held steady today.':
    'La disponibilité est restée stable aujourd’hui.',
  '{ready} of {total} airframes mission capable':
    '{ready} appareils sur {total} aptes à la mission',
  'Crew fatigue {fatigue}%, morale {morale}%, {away} away or in sick bay':
    'Fatigue de l’équipage {fatigue} %, moral {morale} %, {away} absents ou à l’infirmerie',
  '{orders} open work orders for {techs} technicians on duty':
    '{orders} ordres de travail ouverts pour {techs} techniciens de service',
  'Engineering spaces at {condition}%, department fatigue {fatigue}%':
    'Locaux machines à {condition} %, fatigue du service {fatigue} %',
  'Operations at {efficiency}% efficiency, department fatigue {fatigue}%':
    'Opérations à {efficiency} % d’efficacité, fatigue du service {fatigue} %',
  'Lowest stores: {supply} at {value}%':
    'Stock le plus bas : {supply} à {value} %',
  'Ammunition at {ammo}%, air department at {air}%':
    'Munitions à {ammo} %, service aviation à {air} %',
  '{injured} crew in sick bay, medical stores at {stores}%':
    '{injured} marins à l’infirmerie, stocks médicaux à {stores} %',
  '{seniors} senior hands fit for duty':
    '{seniors} cadres aptes au service',
  'Release airframes to the shops on MAINT duty and keep parts stocked.':
    'Confiez des appareils aux ateliers (tâche MAINT) et gardez des pièces en stock.',
  'Put tired departments on three watches, lower the tempo, or let the ship rest alongside.':
    'Passez les services fatigués en trois quarts, baissez le rythme, ou laissez le navire se reposer à quai.',
  'Clear the backlog: technicians on duty, parts aboard, fewer sorties for a day.':
    'Résorbez le retard : des techniciens de service, des pièces à bord, moins de sorties pendant un jour.',
  'Engineering is worn: three watches for ENG and no maximum tempo.':
    'La propulsion s’use : trois quarts pour ENG et pas de rythme maximal.',
  'Operations is stretched: rotate its watches and fill its posts.':
    'Les opérations sont à la peine : faites tourner leurs quarts et pourvoyez leurs postes.',
  'Stores are low: buy supplies alongside, or take a replenishment at sea.':
    'Les stocks sont bas : achetez à quai, ou acceptez un ravitaillement à la mer.',
  'Restock ammunition and keep the air department rested.':
    'Réapprovisionnez les munitions et gardez le service aviation reposé.',
  'Sick bay is busy: lower the tempo and risk, keep medical stores up.':
    'L’infirmerie est pleine : baissez le rythme et le risque, gardez des stocks médicaux.',
  'Too few fit senior hands: rest your chiefs, promote, or recruit.':
    'Trop peu de cadres aptes : reposez vos chefs, promouvez ou recrutez.',
  'Work-ups on passage: +{gain} progress banked for arrival ({total} in hand)':
    'Entraînement en transit : +{gain} de progression acquise pour l’arrivée ({total} en réserve)',
  'WORK-UPS ON PASSAGE':
    'ENTRAÎNEMENT EN TRANSIT',
  '{n} airframes tasked to work-up training':
    '{n} appareils affectés à l’entraînement',
  'ON PASSAGE — REHEARSE OR REST':
    'EN TRANSIT — RÉPÉTER OU SE REPOSER',
  'Sorties do not count toward the objective until the ship is on station. Training sorties rehearse the operation: each banks {per} progress for arrival, up to {cap} ({banked} banked so far). Stood-down crews and airframes recover instead.':
    'Les sorties ne comptent pour l’objectif qu’une fois le navire sur zone. Les sorties d’entraînement répètent l’opération : chacune acquiert {per} de progression pour l’arrivée, jusqu’à {cap} ({banked} acquis pour l’instant). Au repos, équipages et appareils récupèrent à la place.',
  'ON PASSAGE HOME':
    'TRANSIT RETOUR',
  'The operation is over. Stand the wing down and let the ship recover before it comes alongside.':
    'L’opération est terminée. Mettez le groupe aérien au repos et laissez le navire récupérer avant d’accoster.',
  'Replenishment at Sea':
    'Ravitaillement à la mer',
  'A fleet oiler has been routed to meet you on the passage. Coming alongside at speed is hard work for the deck and supply departments, and the stores are not free — but nothing else can come aboard until you are back in port.':
    'Un pétrolier ravitailleur a été dérouté pour vous rejoindre en transit. Se mettre à couple en route est un travail éprouvant pour le pont et le service approvisionnement, et les vivres ne sont pas gratuits — mais rien d’autre ne pourra embarquer avant le retour au port.',
  'Full replenishment':
    'Ravitaillement complet',
  'Fuel, food and parts topped up. A long, tiring evolution.':
    'Carburant, vivres et pièces complétés. Une manœuvre longue et fatigante.',
  'Fuel only':
    'Carburant seulement',
  'A short approach. The essentials, cheaply.':
    'Une approche courte. L’essentiel, à moindre coût.',
  'Wave her off':
    'La renvoyer',
  'No cost and no stores. The crew notices the mail did not come.':
    'Aucun coût, aucun vivre. L’équipage remarque que le courrier n’est pas venu.',
  'General Quarters Drill':
    'Exercice de postes de combat',
  'The executive officer wants to use the passage for a full general quarters drill: every compartment manned, damage control teams put through their paces, the flight deck cleared and re-spotted.':
    'Le commandant en second veut profiter du transit pour un exercice complet de postes de combat : chaque local armé, les équipes de sécurité mises à l’épreuve, le pont d’envol dégagé puis réorganisé.',
  'Full drill, twice':
    'Exercice complet, deux fois',
  'The crew gets better. It also gets tired.':
    'L’équipage progresse. Il se fatigue aussi.',
  'One run-through':
    'Un seul passage',
  'A useful rehearsal at a modest cost.':
    'Une répétition utile à coût modéré.',
  'Not this passage':
    'Pas pour ce transit',
  'Everyone rests. The XO thinks the ship is going soft, and the operation carries the risk.':
    'Tout le monde se repose. Le second trouve que le navire s’amollit, et l’opération en portera le risque.',
  'Man Overboard':
    'Un homme à la mer',
  '"Man overboard, starboard side!" {rank} {subject} went over the side from a sponson in a rising sea. The escort is closer, but the carrier has the helicopters.':
    '« Un homme à la mer, tribord ! » {rank} {subject} est passé par-dessus bord depuis une coursive, par mer grossissante. L’escorteur est plus proche, mais c’est le porte-avions qui a les hélicoptères.',
  'Turn the ship and launch the helicopters':
    'Faire demi-tour et lancer les hélicoptères',
  'Fuel and a night’s routine thrown away — and the whole crew sees the ship come back for one of its own.':
    'Du carburant et une nuit de routine perdus — et tout l’équipage voit le navire revenir chercher l’un des siens.',
  'Helicopters only, the ship holds her course':
    'Les hélicoptères seuls, le navire garde son cap',
  'A middle path that rests on the aircrew.':
    'Une voie médiane qui repose sur les équipages.',
  'Leave it to the escort':
    'Laisser faire l’escorteur',
  'Efficient. The sailor comes back hurt, and the crew draws its own conclusions.':
    'Efficace. Le marin revient blessé, et l’équipage en tire ses propres conclusions.',
  'Heavy Weather on Passage':
    'Gros temps en transit',
  'A deep low is crossing the route. Green water is coming over the bow and the hangar deck is moving under the parked aircraft.':
    'Une profonde dépression traverse la route. Des paquets de mer passent par l’étrave et le pont hangar bouge sous les appareils parqués.',
  'Ride it out at speed':
    'Tenir la vitesse',
  'Keeps the schedule. Something will break.':
    'Le calendrier est tenu. Quelque chose va casser.',
  'Double the lashings and ease the speed':
    'Doubler les saisines et réduire l’allure',
  'Hard, wet work for the deck crews and extra fuel. Nothing breaks.':
    'Un travail dur et mouillé pour le pont, et du carburant en plus. Rien ne casse.',
  'Strike everything below':
    'Tout descendre au hangar',
  'Safe, and a day’s work for the deck and the shops to undo.':
    'Sûr, et une journée de travail pour le pont et les ateliers pour tout remettre en place.',
  'VIEW FILE': 'VOIR LA FICHE',
  'Open their personnel file before you decide': 'Ouvrir sa fiche avant de décider',

  // =========================================================================
  // The commanding officer’s council
  // =========================================================================
  '{seat} handled “{title}”: {choice}':
    '{seat} a tranché « {title} » : {choice}',
  'XO revised the watch bill for {n} departments':
    'Le second a revu la rotation des quarts de {n} services',
  'Supply Officer restocked {n} kinds of stores':
    'Le commissaire a réapprovisionné {n} types de stocks',
  'Operations accepted {title}':
    'Les opérations ont accepté {title}',
  'Air Boss set the tempo to {tempo}':
    'L’Air Boss a réglé le rythme sur {tempo}',
  'COUNCIL':
    'CONSEIL',
  'COMMANDING OFFICER’S COUNCIL':
    'CONSEIL DU COMMANDANT',
  'You are the commanding officer. Your department heads advise on the decisions in their domain, and any of them can be left to run it — though left alone, an officer misjudges some days, the fewer the better they are. Their opinion of you rises when you take their advice and the ship does well.':
    'Vous êtes le commandant. Vos chefs de service vous conseillent sur les décisions de leur domaine, et chacun peut le gérer seul — mais livré à lui-même, un officier se trompe certains jours, d’autant moins qu’il est compétent. Leur opinion de vous monte quand vous suivez leurs conseils et que le navire réussit.',
  'Competence':
    'Compétence',
  'Opinion of you':
    'Opinion de vous',
  '{n} days in post':
    '{n} jours en poste',
  'A department without its head drifts. Appoint someone alongside.':
    'Un service sans chef dérive. Nommez quelqu’un à quai.',
  '{seat} now runs the domain':
    '{seat} gère désormais son domaine',
  'RELIEVE':
    'RELEVER',
  '{name} relieved of duty':
    '{name} relevé de ses fonctions',
  'CANDIDATES':
    'CANDIDATS',
  'Officers can only join or leave the ship alongside. The candidates will be waiting in port.':
    'Les officiers ne peuvent embarquer ou débarquer qu’à quai. Les candidats attendront au port.',
  'No candidates ashore for this seat. More report each time the ship comes alongside.':
    'Aucun candidat à terre pour ce poste. D’autres se présentent à chaque retour au port.',
  '{name} takes the seat of {seat}':
    '{name} prend le poste de {seat}',
  'BACK TO THE COUNCIL':
    'RETOUR AU CONSEIL',
  'Recommends':
    'Recommande',
  'RUNNING IT':
    'GÈRE SEUL',
  'LET THEM RUN IT':
    'LUI CONFIER',
  'REPLACE':
    'REMPLACER',
  'Executive Officer':
    'Commandant en second',
  'The crew, discipline and the watch bill.':
    'L’équipage, la discipline et la rotation des quarts.',
  'Accidents and crew morale':
    'Accidents et moral de l’équipage',
  'Sets each department’s watch bill and answers personnel and command decisions.':
    'Règle la rotation des quarts de chaque service et tranche les décisions de personnel et de commandement.',
  'Air Boss':
    'Air Boss (chef du pont d’envol)',
  'The flight deck: launch and recovery, the tempo, deck safety.':
    'Le pont d’envol : catapultages et appontages, le rythme, la sécurité du pont.',
  'Sortie capacity':
    'Capacité de sorties',
  'Sets the operational tempo and answers flight deck decisions.':
    'Règle le rythme opérationnel et tranche les décisions du pont d’envol.',
  'Commander, Air Wing':
    'Commandant du groupe aérien (CAG)',
  'The squadrons: the air tasking order and the aircrew.':
    'Les flottilles : l’ordre de vol et les équipages.',
  'Aircrew fatigue from flying':
    'Fatigue des équipages en vol',
  'Writes the daily air tasking order, flies work-ups on passage, and answers aircraft and training decisions.':
    'Établit l’ordre de vol quotidien, fait l’entraînement en transit, et tranche les décisions sur les appareils et l’entraînement.',
  'Operations Officer':
    'Officier opérations',
  'Which operations the ship takes, and how they are run.':
    'Les opérations que prend le navire, et leur conduite.',
  'Mission progress':
    'Progression des missions',
  'Chooses and accepts operations when the ship is ready, and answers mission decisions.':
    'Choisit et accepte les opérations quand le navire est prêt, et tranche les décisions de mission.',
  'Navigator':
    'Officier de navigation',
  'The passage and the weather.':
    'Le transit et la météo.',
  'Crew fatigue on passage':
    'Fatigue de l’équipage en transit',
  'Answers weather decisions.':
    'Tranche les décisions liées à la météo.',
  'Warfare Officer':
    'Officier de lutte',
  'The threat picture, weapons and the risk an operation carries.':
    'La menace, les armes et le risque que porte une opération.',
  'Daily reduction of operational risk':
    'Réduction quotidienne du risque opérationnel',
  'Answers risk and operational-threat decisions on missions.':
    'Tranche les décisions de risque et de menace en mission.',
  'Chief Engineer':
    'Chef du service machine',
  'Propulsion, power and the condition of the ship’s spaces.':
    'La propulsion, l’énergie et l’état des locaux du navire.',
  'Repair rate':
    'Vitesse de réparation',
  'Answers mechanical decisions.':
    'Tranche les décisions techniques.',
  'Supply Officer':
    'Commissaire (approvisionnement)',
  'Stores, the budget and what comes aboard.':
    'Les stocks, le budget et ce qui embarque.',
  'Consumption of stores':
    'Consommation des stocks',
  'Restocks stores alongside within a cash reserve, and answers logistics decisions.':
    'Réapprovisionne à quai en gardant une réserve de trésorerie, et tranche les décisions logistiques.',
  'Information Warfare Officer':
    'Officier systèmes d’information',
  'Communications, intelligence and the ship’s networks.':
    'Les transmissions, le renseignement et les réseaux du bord.',
  'Accuracy of the whole council’s advice, and mission progress':
    'Justesse des conseils de tout le conseil, et progression des missions',
  'Answers intelligence and narrative decisions.':
    'Tranche les décisions de renseignement et les situations particulières.',
  'Command Master Chief':
    'Major du bord',
  'The voice of the enlisted crew: morale, welfare, the deckplates.':
    'La voix des marins : le moral, le bien-être, la vie du bord.',
  'Crew morale':
    'Moral de l’équipage',
  'Answers morale, medical and personnel decisions.':
    'Tranche les décisions de moral, de santé et de personnel.',
  'The crew will remember this.':
    'L’équipage s’en souviendra.',
  'The crew will take it badly otherwise.':
    'Sinon, l’équipage le prendra mal.',
  'People need the rest.':
    'Les gens ont besoin de repos.',
  'The others wear people out.':
    'Les autres options épuisent les gens.',
  'It is the cheapest course.':
    'C’est la solution la moins chère.',
  'We cannot afford the alternatives.':
    'Nous n’avons pas les moyens des autres options.',
  'Fleet will notice.':
    'La flotte le remarquera.',
  'Anything less reflects on the ship.':
    'Faire moins nuirait à la réputation du navire.',
  'It moves the operation forward.':
    'Cela fait avancer l’opération.',
  'The operation cannot wait.':
    'L’opération ne peut pas attendre.',
  'It keeps the risk down.':
    'Cela limite le risque.',
  'The other courses invite trouble later.':
    'Les autres options attireront des ennuis plus tard.',
  'It protects the airframes.':
    'Cela protège les appareils.',
  'The wing cannot spare the airframes.':
    'Le groupe aérien ne peut pas se passer de ces appareils.',
  'The ship’s spaces come first.':
    'Les locaux du navire passent en premier.',
  'The spaces will not stand much more.':
    'Les locaux n’en supporteront pas beaucoup plus.',
  'We cannot run short of stores.':
    'Nous ne pouvons pas manquer de stocks.',
  'The stores will not last otherwise.':
    'Sinon, les stocks ne tiendront pas.',
  'The crew will be better for it.':
    'L’équipage en sortira meilleur.',
  'The crew needs the practice.':
    'L’équipage a besoin de pratique.',
  'Nobody gets hurt this way.':
    'Personne ne sera blessé ainsi.',
  'The alternatives will put people in sick bay.':
    'Les autres options enverront des gens à l’infirmerie.',
  'Cautious':
    'Prudent',
  'Measured':
    'Mesuré',
  'Bold':
    'Audacieux',
  'Loyal':
    'Loyal',
  'Content':
    'Satisfait',
  'Reserved':
    'Réservé',
  'Wary':
    'Méfiant',
  'Hostile':
    'Hostile',

  // =========================================================================
  // Alerts and the journal
  // =========================================================================
  '{title} needs an answer before the day ends':
    '« {title} » attend une réponse avant la fin de la journée',
  '{n} decisions are waiting for you':
    '{n} décisions vous attendent',
  '{done} of {need} operations done, {days} days left':
    '{done} opérations sur {need} menées, {days} jours restants',
  'Sustained debt will cost you the command':
    'Une dette prolongée vous coûtera le commandement',
  'Readiness {value}% — see the weakest link in SHIP STATUS':
    'Disponibilité {value} % — voyez le maillon faible dans ÉTAT DU NAVIRE',
  'Objective cover {value}% — the operation is barely moving':
    'Couverture de l’objectif {value} % — l’opération n’avance presque plus',
  '{n} tasked airframes will not launch':
    '{n} appareils affectés ne décolleront pas',
  '{n} operations on the board':
    '{n} opérations au tableau',
  '{list} — consider three watches':
    '{list} — envisagez trois quarts',
  'Low: {list} — buy alongside':
    'Bas : {list} — achetez à quai',
  'Low: {list} — a replenishment at sea would help':
    'Bas : {list} — un ravitaillement à la mer aiderait',
  '{room} at {value}%':
    '{room} à {value} %',
  '{seat} has no head':
    '{seat} n’a pas de titulaire',
  '{seat} works at reduced effect':
    '{seat} travaille à efficacité réduite',
  '{n} people have earned a promotion':
    '{n} marins ont mérité une promotion',
  'JOURNAL':
    'JOURNAL',
  'SHIP’S LOG':
    'JOURNAL DE BORD',
  'The log fills as the days pass.':
    'Le journal se remplit au fil des jours.',
  'Emergency decision pending':
    'Décision urgente en attente',
  'Decisions pending':
    'Décisions en attente',
  'Decision — {title}: {choice}':
    'Décision — {title} : {choice}',
  'Orders at risk':
    'Ordres menacés',
  'Operating account overdrawn':
    'Compte d’exploitation à découvert',
  'Readiness critical':
    'Disponibilité critique',
  'Air tasking falls short':
    'Ordre de vol insuffisant',
  'Airframes without a pilot':
    'Appareils sans pilote',
  'Alongside without orders':
    'À quai sans ordres',
  'Departments worn out':
    'Services épuisés',
  'Stores running low':
    'Stocks en baisse',
  'Spaces in critical condition':
    'Locaux en état critique',
  'Council seat vacant':
    'Siège du conseil vacant',
  'Disaffected officers':
    'Officiers mécontents',
  'Crew eligible for promotion':
    'Marins promouvables',
  'Airframes out of service':
    'Appareils hors service',
  '{n} of {total} out of service — {damaged} damaged, {shops} in the shops, {parts} waiting for parts':
    '{n} sur {total} hors service — {damaged} endommagés, {shops} aux ateliers, {parts} en attente de pièces',
  'Work orders waiting for parts':
    'Ordres de travail en attente de pièces',
  '{n} jobs stalled, spare parts at {value}%':
    '{n} travaux bloqués, pièces détachées à {value} %',
  'Airframes short of aircrew':
    'Appareils sans équipage complet',
  '{n} airframes have empty seats':
    '{n} appareils ont des sièges vides',
  'Posts short-handed':
    'Postes en sous-effectif',
  '{list} below strength':
    '{list} sous l’effectif prévu',
  'Operation below its requirements':
    'Opération sous ses exigences',
  '{label} {actual} of {required} needed — progress is slowed':
    '{label} {actual} pour {required} requis — la progression est ralentie',
  'Operations waiting on the ship':
    'Opérations en attente du navire',
  '{n} operations on the board need more readiness or standing':
    '{n} opérations au tableau exigent plus de disponibilité ou de prestige',
  '{n} TO ATTEND TO':
    '{n} À TRAITER',
  'ALL QUIET':
    'RAS',
  'Decisions and alerts — click to see the list':
    'Décisions et alertes — cliquez pour voir la liste',
  'DECISIONS ({n})':
    'DÉCISIONS ({n})',
  'No decision waiting.':
    'Aucune décision en attente.',
  'ALERTS ({n})':
    'ALERTES ({n})',
  'Nothing else needs you. The ship is running.':
    'Rien d’autre ne vous attend. Le navire tourne.',
  'The ship’s log: every notification and decision, day by day':
    'Le journal de bord : chaque notification et décision, jour après jour',
  'FAULT':
    'AVARIE',
  'FLIGHT OPERATIONS — DAY {n}':
    'OPÉRATIONS AÉRIENNES — JOUR {n}',
  '{n} sorties launched and recovered':
    '{n} sorties catapultées et récupérées',
  '{n} came back with a fault':
    '{n} rentrées avec une avarie',
  '{n} more not shown':
    '{n} autres non montrées',
  'SKIP':
    'PASSER',
  'DON’T PLAY EVERY DAY':
    'NE PAS JOUER CHAQUE JOUR',
  'Flight operations will not play automatically. Watch them from the day’s summary.':
    'Les opérations aériennes ne seront plus jouées automatiquement. Revoyez-les depuis le bilan du jour.',
  'Click the deck or press Enter to skip':
    'Cliquez sur le pont ou appuyez sur Entrée pour passer',
  'WATCH FLIGHT OPS':
    'REVOIR LES OPÉRATIONS',
  'Play the day’s flying automatically when the day ends':
    'Jouer automatiquement les vols du jour à la fin de la journée',
  'AUTO-PLAY: ON':
    'LECTURE AUTO : OUI',
  'AUTO-PLAY: OFF':
    'LECTURE AUTO : NON',
  'Armed, fuelled and crewed on a launch spot, ready at five minutes. Takes risk off the operation without burning airframe life — four spots at most.':
    'Armé, ravitaillé et équipage à bord sur un poste de lancement, prêt en cinq minutes. Retire du risque à l’opération sans user les cellules — quatre postes au plus.',
  'not mission capable':
    'inapte à la mission',
  'in the hangar':
    'au hangar',
  'no fit crew in the seats':
    'pas d’équipage apte à bord',
  'low on fuel':
    'carburant insuffisant',
  'not armed':
    'non armé',
  'no launch spot free':
    'aucun poste de lancement libre',
  '{n} airframes on alert are not ready to launch — mostly {reason}':
    '{n} appareils en alerte ne sont pas prêts à décoller — surtout : {reason}',
  'Ready to launch':
    'Prêts à décoller',
  'spots':
    'postes',
  'Not ready':
    'Pas prêts',
  'Ready means up on the flight deck, crewed, fuelled and, for fighters and jammers, armed. Each airframe on alert takes risk off the operation; every two hold a catapult and cost a deck cycle.':
    'Prêt signifie : sur le pont d’envol, équipage à bord, ravitaillé et, pour les chasseurs et brouilleurs, armé. Chaque appareil en alerte retire du risque à l’opération ; tous les deux, ils bloquent une catapulte et coûtent un cycle de pont.',
  'No deck alert standing':
    'Aucune alerte en place sur le pont',
  'Nothing is ready to launch at five minutes — the operation carries its risk unchecked':
    'Rien n’est prêt à décoller en cinq minutes — l’opération porte son risque sans parade',
  'READY':
    'PRÊT',
  'TO DECK ALERT':
    'VERS L’ALERTE',
  'UP FROM THE HANGAR':
    'MONTÉE DU HANGAR',
  'DOWN TO THE HANGAR':
    'DESCENTE AU HANGAR',
  'Anti-Submarine Warfare':
    'Lutte anti-sous-marine',
  'ASW':
    'ASM',
  'duty|ASW':
    'ASM',
  'Hunting submarines with sonar and sonobuoys. Counts where a submarine threat is part of the mission, and takes risk off it.':
    'Chasser les sous-marins au sonar et aux bouées acoustiques. Compte quand la menace sous-marine fait partie de la mission, et lui retire du risque.',
  'Aerial Refuelling':
    'Ravitaillement en vol',
  'TANKER':
    'RAVITAILLEUR',
  'duty|TANKER':
    'RAVIT.',
  'Fuel in the air. Lengthens every strike, CAP and recon sortie: a multiplier on their worth, not progress of its own.':
    'Du carburant en l’air. Allonge chaque sortie d’attaque, de CAP et de reconnaissance : un multiplicateur de leur valeur, pas une progression propre.',
  'Electronic Escort':
    'Escorte de guerre électronique',
  'EW ESCORT':
    'ESCORTE GE',
  'duty|EW ESCORT':
    'ESC. GE',
  'Jamming the defences ahead of the package. Makes strike sorties count for more and takes risk off the operation.':
    'Brouiller les défenses devant le dispositif. Les sorties d’attaque comptent davantage et l’opération perd du risque.',
  'Plane Guard / SAR':
    'Plane guard / sauvetage',
  'SAR':
    'SAR',
  'duty|SAR':
    'SAR',
  'A helicopter airborne near the ship whenever it flies, ready to pull aircrew out of the water. Flying with one is markedly safer.':
    'Un hélicoptère en vol près du navire pendant les opérations, prêt à repêcher les équipages. Voler avec lui est nettement plus sûr.',
  'No plane guard airborne: {n} sorties fly without a helicopter ready to pull aircrew out of the water':
    'Pas de plane guard en vol : {n} sorties volent sans hélicoptère prêt à repêcher les équipages',
  'role|UAV':
    'DRONE',
  'Boost to strike, CAP and recon':
    'Bonus attaque, CAP et reconnaissance',
  'Boost to strike':
    'Bonus attaque',
  'Plane guard up':
    'Plane guard en vol',
  'YES':
    'OUI',
  'NO':
    'NON',
  'No airframe for a key task':
    'Aucun appareil pour une tâche clé',
  '{title} needs {duty}: no capable, crewed airframe can fly it':
    '{title} exige : {duty} — aucun appareil apte et équipé ne peut l’assurer',
  'Support missing':
    'Soutien manquant',
  'Nothing available for: {list}':
    'Rien de disponible pour : {list}',
  'The wing cannot cover the operation':
    'Le groupe aérien ne peut pas couvrir l’opération',
  'Even the best order reaches {value}% of what {title} needs':
    'Même le meilleur ordre de vol n’atteint que {value} % de ce qu’exige {title}',
  'No anti-submarine cover — the group slows and the submarine threat goes unwatched.':
    'Aucune couverture anti-sous-marine — le groupe ralentit et la menace sous-marine n’est pas surveillée.',
  'A surface contact has gone dark and is closing the operating area at speed. The picture says fishing trawler; the track says otherwise.':
    'Un contact de surface a coupé ses émissions et fonce vers la zone d’opérations. La situation tactique dit chalutier ; la route dit autre chose.',
  'Send a section to intercept':
    'Envoyer une patrouille l’intercepter',
  'Eyes on it within the hour. Fuel and a tired pair of aircrew.':
    'Identifié dans l’heure. Du carburant et deux équipages fatigués.',
  'Shadow it with the Hawkeye':
    'Le pister avec le Hawkeye',
  'A slower answer, and the contact may slip away.':
    'Une réponse plus lente, et le contact peut filer.',
  'Log it and carry on':
    'Le noter et continuer',
  'No cost today. An unknown in the picture is a risk carried.':
    'Rien aujourd’hui. Une inconnue dans la situation est un risque porté.',
  'A Fishing Fleet in the Box':
    'Une flottille de pêche dans la zone',
  'Forty fishing boats have drifted into the patrol area, each one a contact to sort from anything hiding among them. The boarding team is keen; the recon crews are not.':
    'Quarante bateaux de pêche ont dérivé dans la zone de patrouille, autant de contacts à distinguer de ce qui pourrait se cacher parmi eux. L’équipe de visite est partante ; les équipages de reconnaissance beaucoup moins.',
  'Sort them one by one':
    'Les trier un par un',
  'Every contact accounted for. A long day for the recon crews.':
    'Chaque contact identifié. Une longue journée pour la reconnaissance.',
  'Route the patrol around them':
    'Contourner la flottille',
  'Clean picture, smaller area: the operation loses a little ground.':
    'Situation claire, zone réduite : l’opération perd un peu de terrain.',
  'Treat the fleet as one contact':
    'Traiter la flottille comme un seul contact',
  'Fast, and anything hiding in it stays hidden.':
    'Rapide, et ce qui s’y cache reste caché.',
  'Raid Warning':
    'Alerte au raid',
  'Intelligence expects a heavy raid tomorrow: aircraft massing at two fields and a surface group moving to support them. The CAP as tasked will not meet it all.':
    'Le renseignement attend un raid lourd demain : des avions se massent sur deux bases et un groupe naval monte en soutien. La CAP prévue n’y suffira pas.',
  'Surge the CAP tomorrow':
    'Renforcer la CAP demain',
  'High tempo: more fighters up, more fatigue and wear.':
    'Rythme élevé : plus de chasseurs en l’air, plus de fatigue et d’usure.',
  'Bring the alert to five minutes overnight':
    'Passer l’alerte à cinq minutes cette nuit',
  'Takes risk off now; the alert crews lose their sleep.':
    'Réduit le risque tout de suite ; les équipages d’alerte perdent leur nuit.',
  'Trust the screen as tasked':
    'Faire confiance au dispositif prévu',
  'Nothing changes. Check the tasking order before the day ends.':
    'Rien ne change. Vérifiez l’ordre de vol avant la fin de la journée.',
  'Leaker':
    'Raid passé',
  'A raider slipped the screen yesterday and fired before the CAP could turn back. A ship in company is damaged; her captain is asking what the carrier means to do about it.':
    'Un assaillant a franchi l’écran hier et a tiré avant que la CAP ne revienne. Un bâtiment de l’escorte est touché ; son commandant demande ce que compte faire le porte-avions.',
  'Send the damage control team across':
    'Envoyer l’équipe de sécurité à son bord',
  'Your engineers save her. They come back exhausted.':
    'Vos mécaniciens le sauvent. Ils reviennent épuisés.',
  'Launch the alert and hunt the shooter':
    'Lancer l’alerte et traquer le tireur',
  'A point made. The alert crews fly a long night.':
    'Le message passe. Les équipages d’alerte volent toute la nuit.',
  'Keep station and report it':
    'Garder la position et rendre compte',
  'The operation goes on. The fleet will remember the screen failed.':
    'L’opération continue. La flotte retiendra que l’écran a cédé.',
  'Mass Casualty Arrival':
    'Afflux massif de blessés',
  'Three helicopters are inbound with more injured than sick bay has beds. The medical officer wants the hangar deck cleared for triage within twenty minutes.':
    'Trois hélicoptères arrivent avec plus de blessés que l’infirmerie n’a de lits. Le médecin-chef veut le pont hangar dégagé pour le tri dans vingt minutes.',
  'Clear the hangar — triage there':
    'Dégager le hangar — tri sur place',
  'Everyone pitches in. Medical stores and sleep both go fast.':
    'Tout le monde s’y met. Stocks médicaux et sommeil fondent.',
  'They get a real hospital; the helicopters lose half a day.':
    'Ils ont un vrai hôpital ; les hélicoptères perdent une demi-journée.',
  'Sick bay only; the routine continues':
    'Infirmerie seulement ; la routine continue',
  'The ship keeps its rhythm. The crew sees who is left waiting.':
    'Le navire garde son rythme. L’équipage voit qui reste à attendre.',
  'The Target Moves':
    'La cible a bougé',
  'The target the package has been building toward has moved overnight. The intelligence is a day old; the strike leads want to go anyway.':
    'La cible préparée par le dispositif a bougé cette nuit. Le renseignement a un jour ; les chefs de raid veulent y aller quand même.',
  'Re-task the recon and rebuild the picture':
    'Relancer la reconnaissance et refaire la situation',
  'Sound targeting, and the window slips.':
    'Un ciblage solide, et la fenêtre recule.',
  'Strike on the old intelligence':
    'Frapper sur l’ancien renseignement',
  'Progress now, at a real risk of hitting nothing worth hitting.':
    'Progresser maintenant, au risque réel de frapper dans le vide.',
  'Ask the theatre for fresh imagery':
    'Demander de l’imagerie fraîche au théâtre',
  'Costs money and goodwill with staff. The picture holds.':
    'Coûte de l’argent et du crédit auprès de l’état-major. La situation tient.',
  'Shadowed':
    'Pisté',
  'A foreign destroyer has taken station two miles off the quarter and is lighting the carrier up with fire-control radar. The world is watching what the Resolute does next.':
    'Un destroyer étranger s’est placé à deux nautiques sur l’arrière et illumine le porte-avions avec son radar de conduite de tir. Le monde regarde ce que va faire le Resolute.',
  'Hold course and ignore it':
    'Garder le cap et l’ignorer',
  'No escalation from you. It reads as weakness to some.':
    'Aucune escalade de votre part. Certains y verront de la faiblesse.',
  'Put a helicopter over it':
    'Placer un hélicoptère au-dessus de lui',
  'A clear message. Tension climbs, and so does your standing.':
    'Un message clair. La tension monte, votre prestige aussi.',
  'Open a bridge-to-bridge channel':
    'Ouvrir un canal de passerelle à passerelle',
  'Talk it down. Some at home will call it soft.':
    'Désamorcer par la parole. Certains, chez nous, trouveront ça mou.',
  'Flashpoint':
    'Point d’embrasement',
  'Missile boats are closing at speed and the other side has stopped answering on any channel. The next decision will be read in every capital in the region.':
    'Des vedettes lance-missiles approchent à grande vitesse et l’autre camp ne répond plus sur aucun canal. La prochaine décision sera lue dans toutes les capitales de la région.',
  'Hold fire and stand firm':
    'Ne pas tirer et tenir bon',
  'Nerve under pressure. The crew feels every minute of it.':
    'Du sang-froid sous la pression. L’équipage sent chaque minute.',
  'Show of force: launch the alert':
    'Démonstration de force : lancer l’alerte',
  'They turn away, or they do not. Progress and risk both jump.':
    'Ils font demi-tour, ou pas. Progression et risque bondissent.',
  'Open the distance — ten miles':
    'Prendre du champ — dix nautiques',
  'The crisis cools. The operation gives ground, and so does your name.':
    'La crise retombe. L’opération recule, votre réputation aussi.',
  'Raid expected — defence short':
    'Raid attendu — défense insuffisante',
  'Air defence {have} of {need}: more CAP or a fuller deck alert':
    'Défense aérienne {have} sur {need} : plus de CAP ou une alerte plus fournie',
  'Strike window open':
    'Fenêtre de frappe ouverte',
  '{n} days to put the package on target':
    '{n} jours pour mettre le dispositif sur la cible',
  'Contacts piling up':
    'Contacts qui s’accumulent',
  '{n} contacts unidentified — more recon':
    '{n} contacts non identifiés — plus de reconnaissance',
  'Tension rising':
    'Tension en hausse',
  'Tension {n}: presence in the air brings it down':
    'Tension {n} : la présence aérienne la fait baisser',
  'Bonus objective met — extra reward paid':
    'Objectif bonus atteint — prime versée',
  '{found} new contacts, {ided} identified':
    '{found} nouveaux contacts, {ided} identifiés',
  '{n} contacts unidentified — the picture is going stale':
    '{n} contacts non identifiés — la situation vieillit',
  'Raid met short: {n} raiders through the screen':
    'Raid mal contré : {n} assaillants ont franchi l’écran',
  'Raid met in full by the CAP and the alert':
    'Raid entièrement contré par la CAP et l’alerte',
  '{evac} people brought aboard, {injured} of them hurt':
    '{evac} personnes embarquées, dont {injured} blessées',
  'Sick bay is out of medical stores — the casualty flow slows everything':
    'L’infirmerie n’a plus de stocks médicaux — l’afflux de blessés ralentit tout',
  'The strike window has closed; the targeting picture must be rebuilt':
    'La fenêtre de frappe s’est refermée ; le ciblage est à refaire',
  'Strike window open: two days to put the package on target':
    'Fenêtre de frappe ouverte : deux jours pour mettre le dispositif sur la cible',
  'Flashpoint: tension at {n}':
    'Point d’embrasement : tension à {n}',
  'The crisis is de-escalating':
    'La crise se désamorce',
  'threat|NONE':
    'AUCUN',
  'threat|LIGHT':
    'LÉGER',
  'threat|HEAVY':
    'LOURD',
  'threat|MAJOR':
    'MAJEUR',
  'Contacts identified':
    'Contacts identifiés',
  'Raid forecast':
    'Raid prévu',
  'Air defence':
    'Défense aérienne',
  'Raiders through':
    'Assaillants passés',
  'People brought aboard':
    'Personnes embarquées',
  'hurt':
    'blessés',
  'Strike window':
    'Fenêtre de frappe',
  'OPEN — {n} days':
    'OUVERTE — {n} jours',
  'Targeting picture':
    'Ciblage',
  'Tension':
    'Tension',
  'Bonus objective':
    'Objectif bonus',
  'Bonus':
    'Bonus',
  'Recon finds contacts and identifies them: {n} still unidentified.':
    'La reconnaissance détecte et identifie les contacts : {n} encore non identifiés.',
  'Raid forecast {level}: CAP aloft and the deck alert give {have} of the {need} air defence it needs.':
    'Raid prévu {level} : la CAP en vol et l’alerte donnent {have} des {need} de défense aérienne nécessaires.',
  'Lift brings evacuees and injured aboard — keep food and medical stores up.':
    'Le transport amène évacués et blessés à bord — gardez vivres et stocks médicaux.',
  'The strike window is open: strike sorties count for far more today. Put the package up.':
    'La fenêtre de frappe est ouverte : les sorties d’attaque comptent bien davantage aujourd’hui. Lancez le dispositif.',
  'Recon builds the targeting picture ({n}%); until the window opens, the day counts for little.':
    'La reconnaissance construit le ciblage ({n} %) ; tant que la fenêtre n’est pas ouverte, la journée compte peu.',
  'Tension {n}: CAP, anti-submarine and recon presence bring it down; at 90 it becomes a flashpoint.':
    'Tension {n} : la présence en CAP, en lutte ASM et en reconnaissance la fait baisser ; à 90, c’est l’embrasement.',
  'TODAY’S OPERATION':
    'L’OPÉRATION AUJOURD’HUI',
  'Contacts to find and identify':
    'Des contacts à détecter et identifier',
  'Daily raids, forecast the evening before':
    'Des raids quotidiens, annoncés la veille',
  'Evacuees and injured brought aboard':
    'Évacués et blessés embarqués',
  'Targeting, then a two-day strike window':
    'Ciblage, puis une fenêtre de frappe de deux jours',
  'Tension that rises on its own':
    'Une tension qui monte d’elle-même',
  'Finish within {target} days on station':
    'Terminer en {target} jours sur zone au plus',
  'Identify {target} contacts':
    'Identifier {target} contacts',
  'Let no more than {target} raiders through':
    'Ne pas laisser passer plus de {target} assaillants',
  'Bring {target} people to safety':
    'Mettre {target} personnes en sécurité',
  'End with tension at {target} or below':
    'Finir avec une tension à {target} ou moins',
  '{n} airframes in work-ups are ones {title} depends on for {duty} — their crews may arrive tired':
    '{n} appareils à l’entraînement sont indispensables à {title} pour : {duty} — leurs équipages risquent d’arriver fatigués',
  'Work-ups tiring key crews':
    'Entraînement qui fatigue des équipages clés',
  '{list} — the operation will need them rested for {duty}':
    '{list} — l’opération en aura besoin reposés pour : {duty}',
  'Rest the airframes {title} depends on for {duty}: {list}. WORK-UPS ON PASSAGE leaves them out.':
    'Laissez au repos les appareils dont {title} dépend pour {duty} : {list}. L’ENTRAÎNEMENT EN TRANSIT les épargne.',
};
