/**
 * Planning d'entretien de départ.
 *
 * Un module d'entretien vide ne sert à rien : personne ne s'assoit pour saisir
 * cinquante interventions. Celles-ci sont donc posées au premier démarrage,
 * d'après l'inventaire de la maison — libre ensuite d'en retirer, d'en ajouter
 * et de changer les rythmes.
 */

/** Les pièces, dans l'ordre où on les parcourt. */
export const ZONES = [
  'Salle de bain',
  'Toilettes',
  'Buanderie',
  'Cuisine',
  'Salon',
  'Chambre parentale',
  'Chambre enfant',
  'Cave',
];

/**
 * `[zone, libellé, rythme]`. Une zone `null` désigne ce qui ne se range dans
 * aucune pièce — les vitres se font en une fois, dans toute la maison.
 */
export const INTERVENTIONS = [
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
];

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
export function planningInitial(dans) {
  const compteurs = new Map();
  const totaux = new Map();

  for (const [, , recurrence] of INTERVENTIONS) {
    totaux.set(recurrence, (totaux.get(recurrence) ?? 0) + 1);
  }

  return INTERVENTIONS.map(([zone, label, recurrence]) => {
    const rang = (compteurs.get(recurrence) ?? 0) + 1;
    compteurs.set(recurrence, rang);

    // Rangs répartis sur la période, sans jamais tomber sur aujourd'hui : rien
    // n'est en retard le premier jour.
    const periode = DUREES[recurrence];
    const decalage = Math.max(1, Math.round((rang * periode) / (totaux.get(recurrence) + 1)));

    return { zone, label, recurrence, dueOn: dans(decalage) };
  });
}
