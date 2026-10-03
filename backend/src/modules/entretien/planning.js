/**
 * Planning d'entretien de départ.
 *
 * Un module d'entretien vide ne sert à rien : personne ne s'assoit pour saisir
 * cinquante interventions. Celles-ci sont donc posées au premier démarrage,
 * d'après l'inventaire de la maison — libre ensuite d'en retirer, d'en ajouter
 * et de changer les rythmes.
 *
 * Le plan est semé dans la langue de l'instance, une fois pour toutes : ce sont
 * des données du foyer dès qu'elles sont en base, pas des textes de
 * l'interface. Les deux versions décrivent la même maison, intervention pour
 * intervention et dans le même ordre — `planning.test.js` y veille.
 */

import { LANGUE } from '../../lib/langue.js';

/**
 * Pour chaque langue, les pièces dans l'ordre où on les parcourt, puis les
 * interventions, sous la forme `[zone, libellé, rythme]`. Une zone `null`
 * désigne ce qui ne se range dans aucune pièce — les vitres se font en une
 * fois, dans toute la maison.
 */
const PLANS = {
  fr: {
    zones: [
      'Salle de bain',
      'Toilettes',
      'Buanderie',
      'Cuisine',
      'Salon',
      'Chambre parentale',
      'Chambre enfant',
      'Cave',
    ],

    interventions: [
      ['Salle de bain', 'Détartrer la robinetterie du lavabo et du bidet', 'monthly'],
      ['Salle de bain', 'Détartrer le pommeau et la paroi de douche', 'monthly'],
      ['Salle de bain', 'Traiter les joints de douche contre les moisissures', 'quarterly'],
      ['Salle de bain', 'Déboucher les siphons (lavabo, bidet, douche)', 'quarterly'],
      ['Salle de bain', 'Nettoyage à fond du carrelage et des murs', 'quarterly'],

      ['Toilettes', 'Détartrer la cuvette', 'monthly'],
      ['Toilettes', 'Nettoyage à fond (abattant, base, brosse)', 'monthly'],
      ['Toilettes', 'Détartrer le mécanisme de chasse', 'yearly'],

      ['Buanderie', 'Lave-linge : bac à produits et joint de hublot', 'monthly'],
      ['Buanderie', 'Lave-linge : filtre de vidange', 'quarterly'],
      ['Buanderie', 'Lave-linge : cycle à vide à 90 °C', 'quarterly'],
      ['Buanderie', 'Sèche-linge : filtre à peluches', 'weekly'],
      ['Buanderie', 'Sèche-linge : condenseur et échangeur', 'monthly'],
      ['Buanderie', 'Lave-vaisselle : filtre', 'monthly'],
      ['Buanderie', 'Lave-vaisselle : sel et liquide de rinçage', 'monthly'],
      ['Buanderie', 'Lave-vaisselle : déboucher les bras de lavage', 'quarterly'],
      ['Buanderie', 'Lave-vaisselle : cycle à vide dégraissant', 'quarterly'],
      ['Buanderie', 'Déboucher le siphon de l’évier', 'quarterly'],

      ['Cuisine', 'Micro-ondes : nettoyage intérieur', 'weekly'],
      ['Cuisine', 'Machine à espresso : groupe et buse vapeur', 'weekly'],
      ['Cuisine', 'Gazinière : grilles et plaque', 'weekly'],
      ['Cuisine', 'Machine à espresso : détartrage', 'monthly'],
      ['Cuisine', 'Gazinière : brûleurs et chapeaux', 'monthly'],
      ['Cuisine', 'Hotte : filtre à graisse', 'monthly'],
      ['Cuisine', 'Réfrigérateur : nettoyage intérieur', 'monthly'],
      ['Cuisine', 'Machine à espresso : changer le filtre à eau', 'quarterly'],
      ['Cuisine', 'Four : nettoyage à fond', 'quarterly'],
      ['Cuisine', 'Épicerie : vérifier les dates de péremption', 'quarterly'],
      ['Cuisine', 'Four : joint de porte et vitre', 'biannual'],
      ['Cuisine', 'Réfrigérateur : joints et dégivrage', 'biannual'],
      ['Cuisine', 'Placard à couverts : vider et nettoyer', 'biannual'],
      ['Cuisine', 'Placard à casseroles : tri', 'biannual'],
      ['Cuisine', 'Tupperwares : tri des couvercles orphelins', 'biannual'],

      ['Salon', 'Tapis : aspiration en profondeur', 'monthly'],
      ['Salon', 'Canapé : aspirer sous les coussins', 'monthly'],
      ['Salon', 'Coin jeux : tri des jouets', 'quarterly'],
      ['Salon', 'Coin jeux : désinfection des surfaces', 'quarterly'],
      ['Salon', 'Canapé : housses au lavage', 'biannual'],
      ['Salon', 'Tapis : shampooing', 'yearly'],

      ['Chambre parentale', 'Aspirer sous le lit et le sommier', 'monthly'],
      ['Chambre parentale', 'Matelas : retourner et aspirer', 'quarterly'],
      ['Chambre parentale', 'Commodes : tri des vêtements de saison', 'biannual'],
      ['Chambre parentale', 'Oreillers et couettes : lavage', 'biannual'],

      ['Chambre enfant', 'Matelas : retourner et aspirer', 'quarterly'],
      ['Chambre enfant', 'Commode : tri des vêtements (taille et saison)', 'quarterly'],
      ['Chambre enfant', 'Tiroirs à jeux : tri', 'quarterly'],
      ['Chambre enfant', 'Lit mezzanine : vérifier le serrage des vis et la stabilité', 'biannual'],
      ['Chambre enfant', 'Peluches : lavage', 'biannual'],

      ['Cave', 'Cuve à fioul : contrôle visuel (fuite, corrosion, jauge)', 'quarterly'],
      ['Cave', 'Vérifier les traces d’humidité et d’infiltration', 'quarterly'],
      ['Cave', 'Soupiraux et aération', 'biannual'],
      ['Cave', 'Chaudière fioul : entretien par un professionnel', 'yearly'],
      ['Cave', 'Ramonage du conduit', 'yearly'],
      ['Cave', 'Filtre fioul : remplacement', 'yearly'],
      ['Cave', 'Boîtes entreposées : tri', 'yearly'],

      [null, 'Détecteurs de fumée : test', 'monthly'],
      [null, 'Laver toutes les vitres', 'quarterly'],
      [null, 'Bouches de VMC et aérations', 'biannual'],
      [null, 'Détecteurs de fumée : changer les piles', 'yearly'],
    ],
  },

  en: {
    zones: [
      'Bathroom',
      'Toilet',
      'Utility room',
      'Kitchen',
      'Living room',
      'Main bedroom',
      'Children’s bedroom',
      'Cellar',
    ],

    interventions: [
      ['Bathroom', 'Descale the basin and bidet taps', 'monthly'],
      ['Bathroom', 'Descale the shower head and screen', 'monthly'],
      ['Bathroom', 'Treat the shower grout against mould', 'quarterly'],
      ['Bathroom', 'Unclog the drains (basin, bidet, shower)', 'quarterly'],
      ['Bathroom', 'Deep-clean the tiles and walls', 'quarterly'],

      ['Toilet', 'Descale the bowl', 'monthly'],
      ['Toilet', 'Deep clean (seat, base, brush)', 'monthly'],
      ['Toilet', 'Descale the flush mechanism', 'yearly'],

      ['Utility room', 'Washing machine: detergent drawer and door seal', 'monthly'],
      ['Utility room', 'Washing machine: drain filter', 'quarterly'],
      ['Utility room', 'Washing machine: empty cycle at 90 °C', 'quarterly'],
      ['Utility room', 'Tumble dryer: lint filter', 'weekly'],
      ['Utility room', 'Tumble dryer: condenser and heat exchanger', 'monthly'],
      ['Utility room', 'Dishwasher: filter', 'monthly'],
      ['Utility room', 'Dishwasher: salt and rinse aid', 'monthly'],
      ['Utility room', 'Dishwasher: unclog the spray arms', 'quarterly'],
      ['Utility room', 'Dishwasher: empty degreasing cycle', 'quarterly'],
      ['Utility room', 'Unclog the sink trap', 'quarterly'],

      ['Kitchen', 'Microwave: clean the inside', 'weekly'],
      ['Kitchen', 'Espresso machine: group head and steam wand', 'weekly'],
      ['Kitchen', 'Gas cooker: pan supports and hob', 'weekly'],
      ['Kitchen', 'Espresso machine: descale', 'monthly'],
      ['Kitchen', 'Gas cooker: burners and caps', 'monthly'],
      ['Kitchen', 'Cooker hood: grease filter', 'monthly'],
      ['Kitchen', 'Fridge: clean the inside', 'monthly'],
      ['Kitchen', 'Espresso machine: replace the water filter', 'quarterly'],
      ['Kitchen', 'Oven: deep clean', 'quarterly'],
      ['Kitchen', 'Pantry: check the use-by dates', 'quarterly'],
      ['Kitchen', 'Oven: door seal and glass', 'biannual'],
      ['Kitchen', 'Fridge: seals and defrosting', 'biannual'],
      ['Kitchen', 'Cutlery drawer: empty and clean', 'biannual'],
      ['Kitchen', 'Pan cupboard: sort out', 'biannual'],
      ['Kitchen', 'Food containers: sort out the orphan lids', 'biannual'],

      ['Living room', 'Rug: deep vacuum', 'monthly'],
      ['Living room', 'Sofa: vacuum under the cushions', 'monthly'],
      ['Living room', 'Play corner: sort out the toys', 'quarterly'],
      ['Living room', 'Play corner: disinfect the surfaces', 'quarterly'],
      ['Living room', 'Sofa: wash the covers', 'biannual'],
      ['Living room', 'Rug: shampoo', 'yearly'],

      ['Main bedroom', 'Vacuum under the bed and its base', 'monthly'],
      ['Main bedroom', 'Mattress: turn and vacuum', 'quarterly'],
      ['Main bedroom', 'Chests of drawers: sort out seasonal clothes', 'biannual'],
      ['Main bedroom', 'Pillows and duvets: wash', 'biannual'],

      ['Children’s bedroom', 'Mattress: turn and vacuum', 'quarterly'],
      ['Children’s bedroom', 'Chest of drawers: sort out clothes (size and season)', 'quarterly'],
      ['Children’s bedroom', 'Toy drawers: sort out', 'quarterly'],
      ['Children’s bedroom', 'Loft bed: check the screws are tight and it is stable', 'biannual'],
      ['Children’s bedroom', 'Soft toys: wash', 'biannual'],

      ['Cellar', 'Heating oil tank: visual check (leaks, corrosion, gauge)', 'quarterly'],
      ['Cellar', 'Check for signs of damp and seepage', 'quarterly'],
      ['Cellar', 'Basement windows and ventilation', 'biannual'],
      ['Cellar', 'Oil boiler: professional service', 'yearly'],
      ['Cellar', 'Sweep the chimney flue', 'yearly'],
      ['Cellar', 'Oil filter: replace', 'yearly'],
      ['Cellar', 'Stored boxes: sort out', 'yearly'],

      [null, 'Smoke alarms: test', 'monthly'],
      [null, 'Clean all the windows', 'quarterly'],
      [null, 'Ventilation outlets and air vents', 'biannual'],
      [null, 'Smoke alarms: replace the batteries', 'yearly'],
    ],
  },
};

/** Le plan de départ dans la langue demandée, celle de l'instance par défaut. */
export function planDeDepart(langue = LANGUE) {
  return PLANS[langue] ?? PLANS.fr;
}

/** Longueur de chaque rythme, en jours, pour étaler la mise en route. */
const DUREES = { weekly: 7, monthly: 30, quarterly: 91, biannual: 182, yearly: 365 };

/**
 * Répartit les premières échéances au lieu de toutes les poser à aujourd'hui.
 *
 * Sans cela, le premier écran afficherait cinquante-cinq interventions en
 * retard — de quoi refermer le module et ne jamais y revenir. Chaque groupe de
 * même rythme est donc étalé sur sa propre période : les hebdomadaires sur la
 * semaine, les annuelles sur l'année, et la maison se met en route au fil de
 * l'eau.
 *
 * Le calcul est déterministe : mêmes données, même planning, ce qui rend la
 * mise en place vérifiable.
 *
 * @param {(jours: number) => string} dans  décale la date du jour de N jours.
 * @returns {Array<{zone: string|null, label: string, recurrence: string, dueOn: string}>}
 */
export function planningInitial(dans, langue = LANGUE) {
  const { interventions } = planDeDepart(langue);
  const compteurs = new Map();
  const totaux = new Map();

  for (const [, , recurrence] of interventions) {
    totaux.set(recurrence, (totaux.get(recurrence) ?? 0) + 1);
  }

  return interventions.map(([zone, label, recurrence]) => {
    const rang = (compteurs.get(recurrence) ?? 0) + 1;
    compteurs.set(recurrence, rang);

    // Rangs répartis sur la période, sans jamais tomber sur aujourd'hui : rien
    // n'est en retard le premier jour.
    const periode = DUREES[recurrence];
    const decalage = Math.max(1, Math.round((rang * periode) / (totaux.get(recurrence) + 1)));

    return { zone, label, recurrence, dueOn: dans(decalage) };
  });
}
