/**
 * Les règles anglaises du rangement par rayon — même forme que
 * `rayons.fr.js`, dont elles suivent les partis pris : un dictionnaire écrit
 * comme on parle, des expressions réservées aux exceptions, et le reste laissé
 * à l'apprentissage du foyer.
 *
 * Deux différences tiennent à la langue elle-même :
 *   — le nom principal vient en dernier (« apple juice », « chicken stock ») :
 *     le balayage part de la droite ;
 *   — quelques adjectifs disent le rayon mieux que le produit : « frozen
 *     peas » est au surgelé, « tinned tomatoes » en épicerie, quel que soit le
 *     légume. Ce sont les mots prioritaires.
 *
 * L'anglais retenu est britannique, comme les dates : « crisps » pour les
 * chips, « courgette », « mince ». Les mots américains courants y sont aussi
 * (« eggplant », « cookie »), puisqu'ils ne désignent rien d'autre.
 */

/** Mots de liaison : ignorés au balayage, gardés au milieu du nom. */
const LIAISONS = [
  'a', 'an', 'the', 'of', 'and', 'or', 'for', 'with', 'without', 'in', 'to', 'some',
  // Le « s » du génitif, que la normalisation détache : « goat's cheese ».
  's',
];

/** Unités de mesure, métriques et impériales. */
const UNITES_MESURE = [
  'g', 'kg', 'kgs', 'mg', 'l', 'ml', 'cl', 'dl', 'oz', 'lb', 'lbs', 'fl', 'qt',
  'gram', 'gramme', 'kilo', 'kilogram', 'litre', 'liter', 'millilitre', 'milliliter',
  'ounce', 'pound', 'pint', 'quart', 'gallon', 'cup', 'tsp', 'tbsp', 'tbs',
  'teaspoon', 'tablespoon',
];

/**
 * Conditionnements et découpes, ignorés au balayage. « fillet » y joue le rôle
 * de « filet » : « salmon fillets » reste du saumon. « roll » aussi : un
 * « bread roll » est du pain, et les rouleaux qui changent de rayon
 * (« kitchen roll ») s'écrivent en expressions.
 */
const CONDITIONNEMENTS = [
  'pack', 'packet', 'multipack', 'bag', 'box', 'tin', 'can', 'jar', 'bottle',
  'carton', 'tub', 'pot', 'punnet', 'bunch', 'head', 'clove', 'pinch', 'slice',
  'piece', 'portion', 'sachet', 'sprig', 'handful', 'dozen', 'pair', 'case',
  'crate', 'tube', 'block', 'wedge', 'rasher', 'fillet', 'roll', 'stick',
  'sheet', 'cube',
];

/**
 * Pluriels qui échappent à la règle. Les mots en « -ie » (« cookies ») et en
 * « -che » (« brioches ») ne se ramènent pas à leur singulier en ôtant une
 * terminaison : sans cette table, « cookie » et « cookies » se rangeraient
 * chacun de leur côté.
 */
const IRREGULIERS = {
  cookies: 'cookie',
  brownies: 'brownie',
  pies: 'pie',
  smoothies: 'smoothie',
  veggies: 'veggie',
  chillies: 'chilli',
  chilies: 'chili',
  loaves: 'loaf',
  leaves: 'leaf',
  brioches: 'brioche',
  quiches: 'quiche',
};

/**
 * Singulier approximatif, comme en français : les termes du dictionnaire
 * passent par la même fonction, donc les erreurs se compensent. Seule compte
 * la règle qui réunirait mal un singulier et son pluriel.
 */
function singulariser(mot) {
  if (IRREGULIERS[mot]) return IRREGULIERS[mot];
  if (mot.length <= 3) return mot; // egg, pea, gin, oil, tea
  if (mot.endsWith('ies')) return `${mot.slice(0, -3)}y`; // berries, batteries
  if (mot.endsWith('oes')) return mot.slice(0, -2); // tomatoes, potatoes
  if (/(ch|sh|x|ss|z)es$/.test(mot)) return mot.slice(0, -2); // peaches, radishes, boxes
  // asparagus, hummus, couscous, cress : déjà au singulier.
  if (/(ss|us|is)$/.test(mot)) return mot;
  if (mot.endsWith('s')) return mot.slice(0, -1);
  return mot;
}

/**
 * Le dictionnaire, un bloc par rayon. Les clés sont celles des rayons du
 * moteur ; leurs libellés anglais vivent avec les autres textes du module.
 */
const DICTIONNAIRE = {
  'fruits-legumes': [
    'apple', 'apricot', 'artichoke', 'asparagus', 'aubergine', 'avocado',
    'banana', 'basil', 'bay', 'bean', 'beansprout', 'beetroot', 'berry',
    'blackberry', 'blackcurrant', 'blueberry', 'broccoli', 'cabbage', 'carrot',
    'cauliflower', 'celeriac', 'celery', 'chard', 'cherry', 'chicory', 'chilli',
    'chili', 'chive', 'choi', 'clementine', 'coriander', 'corn', 'courgette',
    'cranberry', 'cress', 'cucumber', 'dill', 'eggplant', 'fennel', 'fig',
    'fruit', 'garlic', 'ginger', 'gooseberry', 'grape', 'grapefruit', 'greens',
    'kale', 'kiwi', 'leek', 'lemon', 'lemongrass', 'lettuce', 'lime', 'lychee',
    'mandarin', 'mangetout', 'mango', 'melon', 'mint', 'mushroom', 'nectarine',
    'okra', 'onion', 'orange', 'papaya', 'parsley', 'parsnip', 'pea', 'peach',
    'pear', 'pepper', 'pineapple', 'plum', 'pomegranate', 'potato', 'pumpkin',
    'radish', 'raspberry', 'redcurrant', 'rhubarb', 'rocket', 'rosemary',
    'sage', 'salad', 'satsuma', 'shallot', 'spinach', 'sprout', 'squash',
    'strawberry', 'swede', 'tangerine', 'tarragon', 'thyme', 'tomato', 'turnip',
    'veg', 'vegetable', 'watercress', 'watermelon', 'yam',
  ],

  boulangerie: [
    'bagel', 'baguette', 'bap', 'bread', 'brioche', 'bun', 'ciabatta',
    'croissant', 'crumpet', 'donut', 'doughnut', 'focaccia', 'loaf', 'muffin',
    'naan', 'pastry', 'pie', 'pita', 'pitta', 'scone', 'sourdough', 'teacake',
    'wrap',
  ],

  boucherie: [
    'beef', 'breast', 'brisket', 'burger', 'chicken', 'chop', 'drumstick',
    'duck', 'gammon', 'goose', 'kebab', 'lamb', 'liver', 'meat', 'meatball',
    'mince', 'mutton', 'oxtail', 'pheasant', 'pork', 'poultry', 'rabbit', 'rib',
    'sausage', 'sirloin', 'steak', 'thigh', 'turkey', 'veal', 'venison', 'wing',
  ],

  poissonnerie: [
    'anchovy', 'bass', 'bream', 'calamari', 'clam', 'cockle', 'cod', 'crab',
    'crayfish', 'cuttlefish', 'fish', 'haddock', 'hake', 'halibut', 'herring',
    'kipper', 'langoustine', 'lobster', 'mackerel', 'monkfish', 'mussel',
    'octopus', 'oyster', 'plaice', 'pollock', 'prawn', 'salmon', 'sardine',
    'scallop', 'seafood', 'shellfish', 'shrimp', 'sole', 'squid', 'trout',
    'tuna', 'whelk', 'whitebait',
  ],

  'charcuterie-traiteur': [
    'antipasti', 'bacon', 'bresaola', 'chorizo', 'coleslaw', 'guacamole', 'ham',
    'houmous', 'hummus', 'mortadella', 'pancetta', 'pastrami', 'pâté',
    'pepperoni', 'prosciutto', 'quiche', 'rillettes', 'salami', 'speck',
    'sushi', 'taramasalata', 'terrine', 'tzatziki',
    // Chacun de ces mots tirerait ailleurs : le « roll » s'efface, l'œuf irait
    // en crémerie, le « dog » à l'animalerie.
    'sausage roll', 'scotch egg', 'pork pie', 'black pudding', 'hot dog',
    'foie gras',
  ],

  cremerie: [
    'brie', 'butter', 'buttermilk', 'camembert', 'cheddar', 'cheese', 'cream',
    'egg', 'emmental', 'feta', 'gouda', 'gruyère', 'halloumi', 'kefir',
    'margarine', 'mascarpone', 'milk', 'mozzarella', 'paneer', 'parmesan',
    'quark', 'ricotta', 'roquefort', 'skyr', 'stilton', 'yoghurt', 'yogurt',
    // Les pâtes à dérouler sont au frais, comme en France.
    'crème fraîche', 'puff pastry', 'shortcrust pastry', 'filo pastry',
    'pizza dough',
  ],

  // Le sec et les conserves, comme l'épicerie salée française — papier cuisson
  // et film alimentaire compris.
  'epicerie-salee': [
    'bouillon', 'breadcrumb', 'broth', 'bulgur', 'caper', 'chickpea', 'chip',
    'chutney', 'couscous', 'cracker', 'crisp', 'crumb', 'cumin', 'curry',
    'dressing', 'foil', 'gherkin', 'gnocchi', 'gravy', 'harissa', 'ketchup',
    'lasagna', 'lasagne', 'lentil', 'linguine', 'macaroni', 'mayo',
    'mayonnaise', 'miso', 'mustard', 'noodle', 'nori', 'nutmeg', 'oil', 'olive',
    'oregano', 'paprika', 'passata', 'pasta', 'paste', 'penne', 'peppercorn',
    'pesto', 'pickle', 'polenta', 'popcorn', 'pretzel', 'puree', 'quinoa',
    'ravioli', 'relish', 'rice', 'saffron', 'salt', 'sauce', 'soup', 'spaghetti',
    'spice', 'sriracha', 'stock', 'stuffing', 'sweetcorn', 'tabasco',
    'tagliatelle', 'tahini', 'tortellini', 'tortilla', 'turmeric', 'vinaigrette',
    'vinegar', 'wasabi', 'worcestershire', 'fusilli',
    // Les légumineuses en boîte ou en sachet, quand le mot seul les enverrait
    // au frais.
    'baked beans', 'kidney beans', 'black beans', 'butter beans',
    'cannellini beans', 'borlotti beans', 'chick peas', 'split peas',
    'chopped tomatoes', 'coconut milk',
    'black pepper', 'white pepper', 'ground pepper', 'cayenne pepper',
    'garlic powder', 'chilli powder', 'chilli flakes', 'ground ginger',
    'ground coriander', 'salad cream',
    'baking paper', 'greaseproof paper', 'cling film',
  ],

  'epicerie-sucree': [
    'almond', 'bar', 'biscuit', 'brownie', 'cake', 'candy', 'caramel', 'cereal',
    'chocolate', 'cinnamon', 'cocoa', 'coconut', 'coffee', 'cookie',
    'cornflake', 'cornflour', 'cupcake', 'curd', 'currant', 'custard', 'date',
    'flapjack', 'flour', 'fudge', 'gingerbread', 'granola', 'gum', 'hazelnut',
    'honey', 'icing', 'jam', 'jelly', 'lollipop', 'macaroon', 'marmalade',
    'marshmallow', 'meringue', 'muesli', 'nut', 'nutella', 'oat', 'pancake',
    'peanut', 'pecan', 'pistachio', 'porridge', 'prune', 'pudding', 'raisin',
    'shortbread', 'spread', 'sprinkle', 'sugar', 'sultana', 'sweet',
    'sweetener', 'syrup', 'tea', 'toffee', 'treacle', 'vanilla', 'wafer',
    'waffle', 'walnut', 'yeast',
    'peanut butter', 'almond butter', 'chocolate chips', 'coffee beans',
    'jelly beans', 'corn flakes', 'apple sauce', 'easter egg',
    'almond milk', 'oat milk', 'soy milk', 'soya milk', 'rice milk',
    'condensed milk', 'evaporated milk',
    'baking powder', 'baking soda', 'bicarbonate of soda',
  ],

  boissons: [
    'ale', 'aperitif', 'beer', 'brandy', 'champagne', 'cider', 'coke', 'cola',
    'cordial', 'drink', 'gin', 'juice', 'kombucha', 'lager', 'lemonade',
    'milkshake', 'prosecco', 'rum', 'sherry', 'smoothie', 'soda', 'stout',
    'tonic', 'vermouth', 'vodka', 'water', 'whiskey', 'whisky', 'wine',
    // Au Royaume-Uni, le « squash » se boit — sauf seul, où c'est une courge.
    'orange squash', 'lemon squash', 'blackcurrant squash', 'iced tea',
  ],

  surgeles: [
    'edamame', 'fries', 'gelato', 'ice', 'lolly', 'nugget', 'pizza', 'popsicle',
    'sorbet',
    'ice cream', 'fish fingers', 'fish cakes', 'oven chips', 'chunky chips',
    'potato waffles', 'hash browns', 'spring rolls', 'yorkshire pudding',
  ],

  hygiene: [
    'antiseptic', 'aspirin', 'balm', 'bandage', 'brush', 'cleanser', 'comb',
    'conditioner', 'condom', 'cotton', 'deodorant', 'diaper', 'floss', 'gel',
    'ibuprofen', 'lipstick', 'lotion', 'makeup', 'mascara', 'medicine',
    'moisturiser', 'moisturizer', 'mouthwash', 'nail', 'nappy', 'paper',
    'paracetamol', 'perfume', 'plaster', 'razor', 'shampoo', 'soap',
    'suncream', 'sunscreen', 'tampon', 'tissue', 'toilet', 'toothbrush',
    'toothpaste', 'towel', 'tweezers', 'vitamin', 'wash', 'wipe',
    'sun cream', 'shaving cream', 'hand cream', 'face cream', 'micellar water',
    'nail polish',
  ],

  // L'animalerie est ici, comme en France.
  entretien: [
    'battery', 'bin', 'bleach', 'broom', 'bucket', 'bulb', 'candle', 'cat',
    'charcoal', 'cleaner', 'cloth', 'descaler', 'detergent', 'dishwasher',
    'dog', 'duster', 'firelighter', 'freshener', 'glove', 'glue', 'insecticide',
    'kibble', 'laundry', 'limescale', 'liner', 'litter', 'match', 'mop',
    'napkin', 'pet', 'polish', 'scourer', 'sellotape', 'softener', 'sponge',
    'tape', 'washing',
    'kitchen roll', 'tea towel', 'paper towel', 'dish soap',
    'fabric conditioner', 'dishwasher salt',
  ],
};

export const REGLES = {
  liaisons: LIAISONS,
  unites: UNITES_MESURE,
  conditionnements: CONDITIONNEMENTS,
  singulariser,

  /**
   * En anglais, ce qui qualifie vient d'abord et le nom principal en dernier :
   * « apple juice » est une boisson, « apple pie » de la boulangerie,
   * « chicken stock » de l'épicerie. Le dernier mot reconnu gagne.
   */
  sens: 'droite',

  /**
   * Les mots qui décident seuls, où qu'ils soient dans le nom. « frozen
   * peas » serait sinon rangé avec les petits pois frais.
   */
  prioritaires: {
    frozen: 'surgeles',
    tinned: 'epicerie-salee',
    canned: 'epicerie-salee',
  },

  dictionnaire: DICTIONNAIRE,
};
