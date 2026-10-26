import type { Rng } from '../core/rng';

const FIRST = [
  'James', 'Maria', 'Robert', 'Sarah', 'Michael', 'Linda', 'David', 'Angela',
  'Daniel', 'Karen', 'Marcus', 'Elena', 'Thomas', 'Nadia', 'Andre', 'Grace',
  'Victor', 'Priya', 'Owen', 'Claire', 'Hugo', 'Ines', 'Samuel', 'Rosa',
  'Kenji', 'Amara', 'Felix', 'Dana', 'Ivan', 'Naomi', 'Oscar', 'Leila',
  'Curtis', 'Bianca', 'Elliot', 'Sofia', 'Reuben', 'Tess', 'Mateo', 'Iris',
  'Callum', 'Yuki', 'Dmitri', 'Zara', 'Hector', 'Fiona', 'Nils', 'Camille',
];

const LAST = [
  'Miller', 'Davis', 'Wilson', 'Johnson', 'Carter', 'Reyes', 'Okafor', 'Novak',
  'Brennan', 'Castillo', 'Hoffman', 'Petrov', 'Larsen', 'Whitfield', 'Duarte',
  'Kowalski', 'Ferreira', 'Sandoval', 'Ashford', 'Bergman', 'Vasquez', 'Kimura',
  'Oyelaran', 'Rutherford', 'Halloran', 'Menendez', 'Vance', 'Kessler', 'Boone',
  'Ibarra', 'Sorensen', 'Marchetti', 'Delacroix', 'Nakamura', 'Quintero',
  'Thornton', 'Abadi', 'Lindqvist', 'Beaumont', 'Sarkisian', 'Chalmers',
  'Mwangi', 'Villanueva', 'Radcliffe', 'Ostrowski', 'Farrell', 'Zieliński',
];

/**
 * The squadrons of the embarked wing, in the pattern a current carrier air
 * wing flies. A newly delivered airframe joins whichever of them operates
 * that type.
 */
const SQUADRONS = [
  'VFA-14 "Tophatters"',
  'VFA-151 "Vigilantes"',
  'VFA-41 "Black Aces"',
  'VMFA-314 "Black Knights"',
  'VAQ-133 "Wizards"',
  'VAW-117 "Wallbangers"',
  'HSC-14 "Chargers"',
  'HSM-71 "Raptors"',
  'VRM-30 "Titans"',
  'VUQ-10 "Firebirds"',
];

export function randomName(rng: Rng, used: Set<string>): string {
  for (let attempt = 0; attempt < 60; attempt++) {
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  // Fall back to an initialled variant rather than looping forever.
  const name = `${rng.pick(FIRST)} ${String.fromCharCode(65 + rng.int(0, 25))}. ${rng.pick(LAST)}`;
  used.add(name);
  return name;
}

/** "John Miller" -> "J. Miller", for the roster and tight UI slots. */
export function shortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

/** The squadron a newly delivered airframe of this type joins. */
export function squadronFor(typeId: string, role: string): string {
  switch (typeId) {
    case 'fa18e':
      return SQUADRONS[0]!;
    case 'fa18f':
      return SQUADRONS[2]!;
    case 'f35c':
      return SQUADRONS[3]!;
    case 'ea18g':
      return SQUADRONS[4]!;
    case 'e2d':
      return SQUADRONS[5]!;
    case 'mh60s':
      return SQUADRONS[6]!;
    case 'mh60r':
      return SQUADRONS[7]!;
    case 'cmv22b':
      return SQUADRONS[8]!;
    case 'mq25':
      return SQUADRONS[9]!;
    default:
      break;
  }
  // An unrecognised type still lands with the squadron that flies its kind.
  switch (role) {
    case 'ew':
      return SQUADRONS[4]!;
    case 'aew':
      return SQUADRONS[5]!;
    case 'helo':
      return SQUADRONS[7]!;
    case 'transport':
      return SQUADRONS[8]!;
    default:
      return SQUADRONS[0]!;
  }
}

export { SQUADRONS };

/**
 * Whether a first name is drawn from the feminine half of the list. The
 * list alternates, which keeps the company roughly balanced; the personnel
 * photographs use it to choose a likely face and regulation hairstyle.
 */
export function presentsFeminine(firstName: string): boolean {
  const i = FIRST.indexOf(firstName);
  return i >= 0 && i % 2 === 1;
}
