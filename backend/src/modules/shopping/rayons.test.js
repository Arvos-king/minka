import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LANGUES } from '../../lib/langue.js';
import {
  choisirRayon,
  classer,
  cleDeNom,
  CLES_RAYONS,
  DICTIONNAIRE,
  dictionnaire,
  RAYONS,
  RAYON_PAR_DEFAUT,
  rayons,
} from './rayons.js';

describe('cleDeNom', () => {
  it('réunit la casse, les accents et les ligatures', () => {
    // « Œufs » et « oeufs » désignent la même chose : ils doivent se ranger au
    // même endroit, et surtout partager la même clé de correction apprise.
    assert.equal(cleDeNom('Œufs'), 'oeuf');
    assert.equal(cleDeNom('ŒUFS'), 'oeuf');
    assert.equal(cleDeNom('oeufs'), 'oeuf');
  });

  it('efface la quantité et son unité', () => {
    // Une recette envoie « 500 g de farine », la main tape « Farine » : le
    // dictionnaire ne doit voir qu'un seul produit.
    assert.equal(cleDeNom('500 g de farine'), 'farine');
    assert.equal(cleDeNom('Farine'), 'farine');
  });

  it('efface le multiplicateur', () => {
    assert.equal(cleDeNom('Lait ×2'), 'lait');
    assert.equal(cleDeNom('Lait x2'), 'lait');
    assert.equal(cleDeNom('2 laits'), 'lait');
  });

  it('lit le libellé que produisent les menus', () => {
    // Format réel de `libelleCourse` (module recettes), pas un cas d'école.
    assert.equal(cleDeNom('Courgettes (200 g + 2)'), 'courgette');
    assert.equal(cleDeNom('Ail (2 gousses + un peu)'), 'ail');
  });

  it('garde les liaisons du milieu, retire celles des bords', () => {
    // C'est le « de » du milieu qui distingue « lait de coco » de « lait » ;
    // celui de tête ne dit rien et ferait de « 500 g de farine » un produit
    // différent de « farine ».
    assert.equal(cleDeNom('Filet de poulet'), 'filet de poulet');
    assert.equal(cleDeNom('de la farine'), 'farine');
  });

  it('rend une clé vide quand il ne reste aucun mot', () => {
    // Une clé vide n'apprend rien : on ne veut pas retenir « le rayon de 500 g ».
    assert.equal(cleDeNom('500 g'), '');
    assert.equal(cleDeNom('12'), '');
    assert.equal(cleDeNom('—'), '');
    assert.equal(cleDeNom(null), '');
    assert.equal(cleDeNom(undefined), '');
  });
});

describe('classer', () => {
  it('reconnaît un témoin de chaque rayon', () => {
    const temoins = [
      ['Tomates', 'fruits-legumes'],
      ['Baguette', 'boulangerie'],
      ['Escalopes de dinde', 'boucherie'],
      ['Saumon fumé', 'poissonnerie'],
      ['Jambon blanc', 'charcuterie-traiteur'],
      ['Yaourts nature', 'cremerie'],
      ['Huile d’olive', 'epicerie-salee'],
      ['Confiture de fraises', 'epicerie-sucree'],
      ['Bière', 'boissons'],
      ['Glace vanille', 'surgeles'],
      ['Dentifrice', 'hygiene'],
      ['Lessive', 'entretien'],
    ];

    for (const [nom, rayon] of temoins) assert.equal(classer(nom), rayon, nom);
  });

  describe('les pièges du français', () => {
    it('ne prend pas le lait de coco pour de la crémerie', () => {
      // Il se garde des mois dans un placard, à côté du curry.
      assert.equal(classer('Lait'), 'cremerie');
      assert.equal(classer('Lait de coco'), 'epicerie-salee');
      // Même écrit au pluriel : l'expression passe par la même normalisation.
      assert.equal(classer('2 laits de coco'), 'epicerie-salee');
    });

    it('ne prend pas le pain de mie pour de la boulangerie', () => {
      assert.equal(classer('Pain'), 'boulangerie');
      assert.equal(classer('Pain de mie'), 'epicerie-sucree');
    });

    it('ne prend pas l’eau de Javel pour une boisson', () => {
      assert.equal(classer('Eau'), 'boissons');
      assert.equal(classer('Eau de Javel'), 'entretien');
      assert.equal(classer('Eau micellaire'), 'hygiene');
    });

    it('ne prend pas la crème solaire pour de la crémerie', () => {
      assert.equal(classer('Crème fraîche'), 'cremerie');
      assert.equal(classer('Crème solaire'), 'hygiene');
      assert.equal(classer('Crème de marrons'), 'epicerie-sucree');
    });

    it('ne prend pas le papier cuisson pour du papier toilette', () => {
      assert.equal(classer('Papier toilette'), 'hygiene');
      assert.equal(classer('Papier cuisson'), 'epicerie-salee');
    });

    it('ne prend pas le vinaigre blanc pour un condiment', () => {
      assert.equal(classer('Vinaigre balsamique'), 'epicerie-salee');
      assert.equal(classer('Vinaigre blanc'), 'entretien');
    });

    it('ne prend pas « filet » pour une découpe quand c’est un conditionnement', () => {
      // « filet » est déclaré conditionnement : sans cela, « filet de poulet »
      // cesserait d'être du poulet.
      assert.equal(classer('Filet de poulet'), 'boucherie');
      assert.equal(classer('Filet mignon'), 'boucherie');
    });
  });

  it('range le sucre vanillé sans qu’il soit écrit', () => {
    // Aucune expression ne le mentionne : c'est la lecture de gauche à droite
    // qui décide, « sucre » venant avant « vanillé ». C'est le mécanisme qui
    // évite d'avoir à énumérer les variantes de chaque produit.
    assert.equal(classer('Sucre vanillé'), 'epicerie-sucree');
  });

  it('suit l’ordre des mots, qui porte le sens en français', () => {
    // Le nom principal vient en premier, le reste le qualifie.
    assert.equal(classer('Jus de pomme'), 'boissons');
    assert.equal(classer('Compote de pommes'), 'epicerie-sucree');
  });

  it('rattrape les pluriels et les féminins sans lemmatiseur', () => {
    assert.equal(classer('Pommes'), 'fruits-legumes');
    assert.equal(classer('Choux-fleurs'), 'fruits-legumes');
    assert.equal(classer('Crèmes fraîches'), 'cremerie');
  });

  it('replie sur « Autres » ce qu’il ne connaît pas', () => {
    // Un rayon au hasard serait pire que pas de rayon du tout : l'article
    // serait cherché là où il n'est pas.
    assert.equal(classer('Bidule truc'), RAYON_PAR_DEFAUT);
    assert.equal(classer(''), RAYON_PAR_DEFAUT);
    assert.equal(classer('500 g'), RAYON_PAR_DEFAUT);
    assert.equal(classer(null), RAYON_PAR_DEFAUT);
  });
});

describe('le dictionnaire', () => {
  // Le chargement du module refuse déjà les incohérences, mais un « refus de
  // démarrer » se découvre en production. Ces tests les nomment.
  const entrees = Object.entries(DICTIONNAIRE).flatMap(([rayon, termes]) =>
    termes.map((terme) => ({ rayon, terme, forme: cleDeNom(terme) })),
  );

  it('ne range rien dans un rayon qui n’existe pas', () => {
    for (const rayon of Object.keys(DICTIONNAIRE)) assert.ok(CLES_RAYONS.includes(rayon), rayon);
  });

  it('ne déclare aucun terme dans deux rayons', () => {
    // Le second gagnerait en silence. La comparaison porte sur la forme
    // normalisée, ce qui attrape aussi « pomme » et « pommes ».
    const vus = new Map();
    for (const { rayon, terme, forme } of entrees) {
      if (forme.includes(' ')) continue; // les expressions ne s'indexent pas par mot
      assert.equal(vus.get(forme), undefined, `« ${terme} » est aussi dans « ${vus.get(forme)} »`);
      vus.set(forme, rayon);
    }
  });

  it('ne contient aucun terme qui s’efface à la normalisation', () => {
    for (const { terme, forme } of entrees) assert.notEqual(forme, '', terme);
  });

  it('range chaque terme là où il est déclaré', () => {
    // L'invariant qui tient tout le fichier : un terme écrit dans un rayon doit
    // y arriver. Il attrape d'un coup le terme déclaré deux fois, celui qui est
    // aussi un conditionnement ou une liaison — « filet », « paquet », « de » —
    // et donc ignoré du balayage, et l'expression qu'une autre recouvre.
    for (const { rayon, terme } of entrees) assert.equal(classer(terme), rayon, terme);
  });

  it('finit par « Autres », qui est le repli', () => {
    assert.equal(RAYONS.at(-1).cle, RAYON_PAR_DEFAUT);
    assert.ok(CLES_RAYONS.includes(RAYON_PAR_DEFAUT));
    // Le repli n'a pas de termes : rien ne s'y range volontairement.
    assert.equal(DICTIONNAIRE[RAYON_PAR_DEFAUT], undefined);
  });
});

describe('en anglais', () => {
  const en = (nom) => classer(nom, 'en');

  describe('cleDeNom', () => {
    it('efface la quantité, l’unité et le conditionnement de tête', () => {
      assert.equal(cleDeNom('500 g of flour', 'en'), 'flour');
      assert.equal(cleDeNom('Eggs x12', 'en'), 'egg');
      assert.equal(cleDeNom('2 lbs of potatoes', 'en'), 'potato');
    });

    it('réunit le singulier et le pluriel, irréguliers compris', () => {
      for (const [pluriel, singulier] of [
        ['Tomatoes', 'Tomato'],
        ['Berries', 'Berry'],
        ['Peaches', 'Peach'],
        ['Cookies', 'Cookie'],
        ['Chillies', 'Chilli'],
        ['Brioches', 'Brioche'],
        ['Loaves', 'Loaf'],
      ]) {
        assert.equal(cleDeNom(pluriel, 'en'), cleDeNom(singulier, 'en'), pluriel);
      }
    });

    it('laisse intacts les mots déjà au singulier', () => {
      assert.equal(cleDeNom('Asparagus', 'en'), 'asparagus');
      assert.equal(cleDeNom('Hummus', 'en'), 'hummus');
      assert.equal(cleDeNom('Watercress', 'en'), 'watercress');
    });
  });

  it('reconnaît un témoin de chaque rayon', () => {
    const temoins = [
      ['Tomatoes', 'fruits-legumes'],
      ['Baguette', 'boulangerie'],
      ['Chicken thighs', 'boucherie'],
      ['Smoked salmon', 'poissonnerie'],
      ['Ham', 'charcuterie-traiteur'],
      ['Greek yoghurt', 'cremerie'],
      ['Olive oil', 'epicerie-salee'],
      ['Strawberry jam', 'epicerie-sucree'],
      ['Beer', 'boissons'],
      ['Vanilla ice cream', 'surgeles'],
      ['Toothpaste', 'hygiene'],
      ['Washing powder', 'entretien'],
    ];

    for (const [nom, rayon] of temoins) assert.equal(en(nom), rayon, nom);
  });

  it('lit le nom principal en dernier', () => {
    // L'inverse du français : « apple juice » est du jus, « apple pie » une
    // tarte, et le dernier mot reconnu l'emporte.
    assert.equal(en('Apple juice'), 'boissons');
    assert.equal(en('Apple pie'), 'boulangerie');
    assert.equal(en('Chicken stock'), 'epicerie-salee');
    assert.equal(en('Vanilla sugar'), 'epicerie-sucree');
  });

  describe('les pièges de l’anglais', () => {
    it('ne prend pas le lait de coco ni le lait d’amande pour de la crémerie', () => {
      assert.equal(en('Milk'), 'cremerie');
      assert.equal(en('Coconut milk'), 'epicerie-salee');
      assert.equal(en('Almond milk'), 'epicerie-sucree');
    });

    it('ne prend pas le beurre de cacahuète pour du beurre', () => {
      assert.equal(en('Butter'), 'cremerie');
      assert.equal(en('Peanut butter'), 'epicerie-sucree');
    });

    it('range la glace au congélateur et la crème au frais', () => {
      assert.equal(en('Double cream'), 'cremerie');
      assert.equal(en('Ice cream'), 'surgeles');
      assert.equal(en('Sun cream'), 'hygiene');
    });

    it('ne prend pas le papier cuisson pour du papier toilette', () => {
      assert.equal(en('Toilet paper'), 'hygiene');
      assert.equal(en('Baking paper'), 'epicerie-salee');
    });

    it('ne prend pas les hot dogs pour de la nourriture pour chien', () => {
      assert.equal(en('Dog food'), 'entretien');
      assert.equal(en('Hot dogs'), 'charcuterie-traiteur');
    });

    it('distingue le torchon du thé', () => {
      assert.equal(en('Tea bags'), 'epicerie-sucree');
      assert.equal(en('Tea towel'), 'entretien');
    });

    it('distingue les courges du sirop à diluer', () => {
      assert.equal(en('Butternut squash'), 'fruits-legumes');
      assert.equal(en('Orange squash'), 'boissons');
    });

    it('ne prend pas « fillet » pour une découpe à part', () => {
      assert.equal(en('Salmon fillets'), 'poissonnerie');
      assert.equal(en('Fish fingers'), 'surgeles');
    });
  });

  it('laisse les mots prioritaires décider seuls', () => {
    assert.equal(en('Peas'), 'fruits-legumes');
    assert.equal(en('Frozen peas'), 'surgeles');
    assert.equal(en('Tinned tomatoes'), 'epicerie-salee');
    assert.equal(en('Canned tuna'), 'epicerie-salee');
  });

  it('replie sur « Other » ce qu’il ne connaît pas', () => {
    assert.equal(en('Gizmo'), RAYON_PAR_DEFAUT);
    assert.equal(en('500 g'), RAYON_PAR_DEFAUT);
  });

  it('nomme les rayons dans sa langue, sur les mêmes clés', () => {
    assert.deepEqual(
      rayons('en').map((r) => r.cle),
      CLES_RAYONS,
    );
    assert.equal(rayons('en')[0].libelle, 'Fruit and veg');
    assert.equal(rayons('fr')[0].libelle, 'Fruits et légumes');
  });
});

describe('les dictionnaires de chaque langue', () => {
  for (const langue of LANGUES) {
    const entrees = Object.entries(dictionnaire(langue)).flatMap(([rayon, termes]) =>
      termes.map((terme) => ({ rayon, terme })),
    );

    it(`rangent chaque terme là où il est déclaré (${langue})`, () => {
      for (const { rayon, terme } of entrees) assert.equal(classer(terme, langue), rayon, terme);
    });

    it(`ne rangent rien dans « Autres » ni ailleurs qu’un rayon connu (${langue})`, () => {
      for (const rayon of Object.keys(dictionnaire(langue))) {
        assert.ok(CLES_RAYONS.includes(rayon), rayon);
        assert.notEqual(rayon, RAYON_PAR_DEFAUT);
      }
    });
  }
});

describe('choisirRayon', () => {
  it('fait passer la correction du foyer avant le dictionnaire', () => {
    assert.equal(choisirRayon('Lait', 'epicerie-salee'), 'epicerie-salee');
  });

  it('ignore une correction vers un rayon qui n’existe plus', () => {
    // Retirer un rayon du code ne doit pas laisser d'articles orphelins :
    // le dictionnaire reprend simplement la main.
    assert.equal(choisirRayon('Lait', 'rayon-supprime'), 'cremerie');
    assert.equal(choisirRayon('Lait', null), 'cremerie');
  });
});
