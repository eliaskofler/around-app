export const DEFAULT_FOOD_EMOJI = '🍽️';

/**
 * Emoji → every spelling that should resolve to it, across English and a
 * handful of common languages (Spanish, French, German, Italian,
 * Portuguese). Flattened into `FOOD_EMOJI` below and checked against a food
 * name at log time — a stand-in for a real classifier: swap or prepend a
 * smarter lookup inside `matchFoodEmoji` later (e.g. an on-device ML/
 * Foundation Models call) without touching any of its callers.
 */
const FOOD_EMOJI_GROUPS: readonly (readonly [string, readonly string[]])[] = [
  // ---- Fruits ----
  ['🍎', ['apple', 'apples', 'manzana', 'manzanas', 'pomme', 'pommes', 'apfel', 'äpfel', 'mela', 'mele', 'maçã', 'maçãs']],
  ['🍐', ['pear', 'pears', 'pera', 'peras', 'poire', 'poires', 'birne', 'birnen']],
  ['🍊', ['orange', 'oranges', 'naranja', 'naranjas', 'laranja', 'laranjas', 'arancia', 'arance', 'mandarin', 'mandarine', 'mandarina', 'tangerine', 'clementine', 'satsuma']],
  ['🍋', ['lemon', 'lemons', 'lime', 'limes', 'limón', 'limon', 'limones', 'citron', 'citrons', 'zitrone', 'zitronen', 'limone', 'limoni', 'limão', 'limões', 'lemonade', 'limonada']],
  ['🍌', ['banana', 'bananas', 'plátano', 'platano', 'plátanos', 'platanos', 'banane', 'bananen']],
  ['🍉', ['watermelon', 'watermelons', 'sandía', 'sandia', 'pastèque', 'pasteque', 'wassermelone', 'anguria', 'cocomero', 'melancia']],
  ['🍇', ['grape', 'grapes', 'uva', 'uvas', 'raisin', 'raisins', 'traube', 'trauben']],
  ['🍓', ['strawberry', 'strawberries', 'fresa', 'fresas', 'frutilla', 'frutillas', 'fraise', 'fraises', 'erdbeere', 'erdbeeren', 'fragola', 'fragole', 'morango', 'morangos']],
  ['🫐', ['blueberry', 'blueberries', 'arándano', 'arandano', 'arándanos', 'myrtille', 'myrtilles', 'heidelbeere', 'heidelbeeren', 'mirtillo', 'mirtilli', 'mirtilo', 'mirtilos', 'raspberry', 'raspberries', 'blackberry', 'blackberries', 'cranberry', 'cranberries']],
  ['🍈', ['melon', 'melons', 'melón', 'melones', 'cantaloupe', 'honeydew', 'melone', 'melão', 'melões']],
  ['🍒', ['cherry', 'cherries', 'cereza', 'cerezas', 'cerise', 'cerises', 'kirsche', 'kirschen', 'ciliegia', 'ciliegie', 'cereja', 'cerejas']],
  ['🍑', ['peach', 'peaches', 'durazno', 'duraznos', 'melocotón', 'melocoton', 'melocotones', 'pêche', 'peches', 'pfirsich', 'pfirsiche', 'pesca', 'pesche', 'pêssego', 'pêssegos']],
  ['🥭', ['mango', 'mangoes', 'mangos']],
  ['🍍', ['pineapple', 'pineapples', 'piña', 'pina', 'piñas', 'ananas', 'abacaxi', 'abacaxis']],
  ['🥥', ['coconut', 'coconuts', 'coco', 'cocos', 'noix de coco', 'kokosnuss', 'cocco']],
  ['🥝', ['kiwi', 'kiwis', 'kiwifruit']],
  ['🍅', ['tomato', 'tomatoes', 'tomate', 'tomates', 'pomodoro', 'pomodori', 'ketchup', 'kétchup', 'salsa']],
  ['🍆', ['eggplant', 'eggplants', 'berenjena', 'berenjenas', 'aubergine', 'aubergines', 'melanzana', 'melanzane', 'berinjela', 'berinjelas']],
  ['🥑', ['avocado', 'avocados', 'aguacate', 'aguacates', 'palta', 'paltas', 'avocat', 'avocats', 'abacate', 'abacates', 'guacamole']],
  ['🫒', ['olive', 'olives', 'aceituna', 'aceitunas', 'oliva', 'olivas', 'azeitona', 'azeitonas']],

  // ---- Vegetables ----
  ['🥦', ['broccoli', 'brócoli', 'brocoli', 'brocolis', 'cauliflower', 'coliflor', 'chou-fleur', 'blumenkohl', 'cavolfiore', 'couve-flor']],
  ['🥬', ['lettuce', 'cabbage', 'kale', 'bok choy', 'lechuga', 'col', 'repollo', 'laitue', 'chou', 'grünkohl', 'gruenkohl', 'kohl', 'lattuga', 'cavolo', 'alface', 'couve', 'spinach', 'espinaca', 'épinard', 'epinard', 'spinat', 'spinaci', 'espinafre', 'celery', 'apio', 'céleri', 'celeri', 'sellerie', 'sedano', 'aipo', 'kimchi']],
  ['🥒', ['cucumber', 'cucumbers', 'pepino', 'pepinos', 'concombre', 'concombres', 'gurke', 'gurken', 'cetriolo', 'cetrioli', 'zucchini', 'zucchinis', 'courgette', 'courgettes', 'calabacín', 'calabacin', 'zucchine', 'abobrinha']],
  ['🌶️', ['chili', 'chile', 'chilli', 'chilies', 'chiles', 'ají', 'aji', 'guindilla', 'piment', 'chilischote', 'peperoncino', 'pimenta']],
  ['🫑', ['bell pepper', 'capsicum', 'pimiento', 'pimientos', 'poivron', 'poivrons', 'paprika', 'peperone', 'peperoni', 'pimentão', 'pimentao', 'pepper']],
  ['🌽', ['corn', 'maize', 'maíz', 'maiz', 'maïs', 'mais', 'milho']],
  ['🍿', ['popcorn', 'palomitas', 'pipoca', 'pop corn']],
  ['🥕', ['carrot', 'carrots', 'zanahoria', 'zanahorias', 'carotte', 'carottes', 'karotte', 'karotten', 'möhre', 'moehre', 'carota', 'carote', 'cenoura', 'cenouras']],
  ['🧄', ['garlic', 'ajo', 'ail', 'knoblauch', 'aglio', 'alho']],
  ['🧅', ['onion', 'onions', 'cebolla', 'cebollas', 'oignon', 'oignons', 'zwiebel', 'zwiebeln', 'cipolla', 'cipolle', 'cebola', 'cebolas']],
  ['🥔', ['potato', 'potatoes', 'papa', 'papas', 'patata', 'patatas', 'pomme de terre', 'pommes de terre', 'kartoffel', 'kartoffeln', 'batata', 'batatas']],
  ['🍠', ['sweet potato', 'yam', 'yams', 'camote', 'boniato', 'patate douce', 'süßkartoffel', 'süsskartoffel']],
  ['🎃', ['pumpkin', 'squash', 'calabaza', 'citrouille', 'kürbis', 'kuerbis', 'zucca', 'abóbora', 'abobora', 'pumpkin seed', 'pumpkin seeds', 'pepita', 'pepitas']],
  ['🌰', ['chestnut', 'chestnuts', 'castaña', 'castañas', 'châtaigne', 'chataigne', 'châtaignes', 'kastanie', 'kastanien', 'castagna', 'castagne', 'castanha', 'castanhas']],
  ['🫘', ['beans', 'bean', 'frijol', 'frijoles', 'judía', 'judia', 'judias', 'alubia', 'alubias', 'haricot', 'haricots', 'bohne', 'bohnen', 'fagiolo', 'fagioli', 'feijão', 'feijao', 'feijões', 'lentil', 'lentils', 'lenteja', 'lentejas', 'lentille', 'lentilles', 'linse', 'linsen', 'lenticchia', 'lenticchie', 'lentilha', 'lentilhas', 'dal', 'daal', 'chickpea', 'chickpeas', 'garbanzo', 'garbanzos', 'pois chiche', 'kichererbse', 'kichererbsen', 'cece', 'ceci', 'grão de bico', 'grao de bico']],
  ['🍄', ['mushroom', 'mushrooms', 'champiñón', 'champinon', 'champiñones', 'hongo', 'hongos', 'champignon', 'champignons', 'pilz', 'pilze', 'fungo', 'funghi', 'cogumelo', 'cogumelos']],
  ['🫛', ['pea', 'peas', 'guisante', 'guisantes', 'arveja', 'arvejas', 'petit pois', 'erbse', 'erbsen', 'pisello', 'piselli', 'ervilha', 'ervilhas', 'edamame']],
  ['🫚', ['ginger', 'jengibre', 'gingembre', 'ingwer', 'zenzero', 'gengibre']],

  // ---- Bread / grains ----
  ['🍞', ['bread', 'toast', 'pan', 'pain', 'brot', 'pane', 'pão', 'pao', 'french toast', 'torrija', 'torrijas', 'pain perdu', 'rabanada', 'rabanadas']],
  ['🥐', ['croissant', 'croissants']],
  ['🥖', ['baguette', 'baguettes']],
  ['🥨', ['pretzel', 'pretzels', 'bretzel', 'brezel']],
  ['🥯', ['bagel', 'bagels']],
  ['🫓', ['flatbread', 'naan', 'pita', 'roti', 'chapati', 'tortilla', 'tortillas']],
  ['🥞', ['pancake', 'pancakes', 'panqueque', 'panqueques', 'hotcake', 'hotcakes', 'crêpe', 'crepe', 'crêpes', 'crepes', 'pfannkuchen', 'panqueca', 'panquecas']],
  ['🧇', ['waffle', 'waffles', 'waffel', 'waffeln', 'gaufre', 'gaufres', 'gofre', 'gofres']],
  ['🍚', ['rice', 'arroz', 'riz', 'reis', 'riso', 'quinoa', 'couscous', 'cuscuz', 'fried rice', 'arroz frito', 'riz frit', 'gebratener reis', 'riso fritto', 'bibimbap']],
  ['🍙', ['onigiri', 'rice ball']],
  ['🍘', ['rice cracker', 'senbei']],
  ['🍝', ['pasta', 'spaghetti', 'macarrão', 'macarrao', 'massa', 'lasagna', 'lasagne', 'ravioli', 'gnocchi', 'macaroni', 'macarrones', 'fettuccine', 'penne', 'linguine']],
  ['🍜', ['noodle', 'noodles', 'ramen', 'udon', 'soba', 'fideos', 'nouilles', 'nudel', 'nudeln', 'pho', 'pad thai']],
  ['🥟', ['dumpling', 'dumplings', 'gyoza', 'pierogi', 'empanada', 'empanadas', 'momo', 'momos', 'dim sum', 'dimsum', 'spring roll', 'springroll', 'egg roll', 'eggroll', 'rollito de primavera', 'rouleau de printemps', 'frühlingsrolle', 'fruehlingsrolle', 'involtino primavera', 'rolinho primavera', 'samosa', 'samosas', 'croqueta', 'croquetas', 'croquette', 'croquettes', 'kroketten']],
  ['🌾', ['wheat', 'trigo', 'blé', 'ble', 'weizen', 'grano']],
  ['🥣', ['oatmeal', 'porridge', 'avena', 'avoine', 'hafer', 'haferbrei', 'aveia', 'cereal', 'cereals', 'granola', 'muesli', 'müsli', 'yogurt', 'yoghurt', 'yogur', 'yaourt', 'joghurt', 'iogurte']],

  // ---- Dairy ----
  ['🧀', ['cheese', 'queso', 'quesos', 'fromage', 'fromages', 'käse', 'kaese', 'formaggio', 'formaggi', 'queijo', 'queijos', 'paneer', 'fondue']],
  ['🥛', ['milk', 'leche', 'lait', 'milch', 'leite', 'milkshake', 'milkshakes', 'batido', 'batidos', 'licuado', 'licuados', 'milchshake', 'frappé', 'frappe', 'smoothie', 'smoothies', 'cream', 'crema', 'crème', 'creme', 'sahne', 'panna', 'nata']],
  ['🧈', ['butter', 'mantequilla', 'beurre', 'burro', 'manteiga']],
  ['🍦', ['ice cream', 'icecream', 'helado', 'helados', 'glace', 'glaces', 'eis', 'gelato', 'gelati', 'sorvete', 'sorvetes', 'sorbet', 'sorbete', 'sorbetto']],
  ['🍨', ['sundae', 'soft serve']],
  ['🍧', ['shaved ice', 'snow cone', 'raspado', 'popsicle', 'ice lolly', 'paleta helada', 'picolé', 'picole']],

  // ---- Meat ----
  ['🍗', ['chicken', 'chickens', 'turkey', 'poultry', 'pollo', 'poulet', 'hähnchen', 'haehnchen', 'huhn', 'frango', 'drumstick', 'teriyaki', 'katsu', 'fried chicken', 'pollo frito', 'poulet frit', 'pollo fritto', 'frango frito']],
  ['🥩', ['steak', 'beef', 'meat', 'pork', 'lamb', 'veal', 'mutton', 'carne', 'carnes', 'viande', 'viandes', 'fleisch', 'bœuf', 'boeuf', 'cerdo', 'cordero', 'ternera', 'agnello', 'maiale', 'manzo', 'vitello', 'porco', 'cordeiro', 'vitela', 'schnitzel', 'milanesa', 'cotoletta', 'escalope', 'bulgogi']],
  ['🥓', ['bacon', 'tocino', 'panceta', 'lard', 'speck', 'pancetta', 'toucinho']],
  ['🌭', ['hot dog', 'hotdog', 'perrito caliente', 'hot-dog', 'sausage', 'sausages', 'salami', 'chorizo', 'salchicha', 'salchichas', 'saucisse', 'saucisses', 'wurst', 'würste', 'salsiccia', 'salsicce', 'linguiça', 'linguica']],
  ['🍖', ['rib', 'ribs', 'costilla', 'costillas']],
  ['🥚', ['egg', 'eggs', 'huevo', 'huevos', 'œuf', 'oeuf', 'œufs', 'oeufs', 'ei', 'eier', 'uovo', 'uova', 'ovo', 'ovos', 'omelette', 'omelet', 'frittata', 'frittatas']],
  ['🦆', ['duck', 'ducks', 'pato', 'patos', 'canard', 'canards', 'ente', 'enten', 'anatra', 'anatre']],

  // ---- Seafood ----
  ['🐟', ['fish', 'pescado', 'pescados', 'pesce', 'pesci', 'peixe', 'peixes', 'poisson', 'poissons', 'fisch', 'fische', 'salmon', 'salmón', 'salmone', 'salmão', 'salmao', 'tuna', 'atún', 'atun', 'atum', 'thon', 'thunfisch', 'tonno', 'cod', 'bacalao', 'morue', 'kabeljau', 'merluzzo', 'bacalhau', 'trout', 'trucha', 'truite', 'forelle', 'trota', 'truta', 'ceviche', 'cebiche']],
  ['🍤', ['shrimp', 'shrimps', 'prawn', 'prawns', 'camarón', 'camaron', 'camarones', 'gamba', 'gambas', 'crevette', 'crevettes', 'garnele', 'garnelen', 'gambero', 'gamberi', 'camarão', 'camarao', 'camarões', 'tempura']],
  ['🦀', ['crab', 'crabs', 'cangrejo', 'cangrejos', 'crabe', 'crabes', 'krabbe', 'krabben', 'granchio', 'granchi', 'caranguejo', 'caranguejos']],
  ['🦞', ['lobster', 'lobsters', 'langosta', 'langostas', 'homard', 'homards', 'hummer', 'aragosta', 'aragoste', 'lagosta', 'lagostas']],
  ['🦑', ['squid', 'calamari', 'calamar', 'calamares', 'calmar', 'calmars', 'tintenfisch', 'calamaro', 'lula', 'lulas']],
  ['🐙', ['octopus', 'pulpo', 'pulpos', 'poulpe', 'poulpes', 'oktopus', 'polpo', 'polpi', 'polvo', 'polvos']],
  ['🦪', ['oyster', 'oysters', 'ostra', 'ostras', 'huître', 'huitre', 'huîtres', 'auster', 'austern', 'mussel', 'mussels', 'clam', 'clams', 'mejillón', 'mejillon', 'mejillones', 'almeja', 'almejas', 'moule', 'moules', 'palourde', 'muschel', 'muscheln', 'cozza', 'cozze', 'vongola', 'vongole', 'mexilhão', 'mexilhao', 'marisco', 'mariscos', 'scallop', 'scallops', 'vieira', 'vieiras', 'coquille', 'pettine']],
  ['🍣', ['sushi', 'sashimi', 'nigiri', 'maki', 'poke', 'poke bowl', 'kimbap']],

  // ---- Dishes ----
  ['🍕', ['pizza', 'pizzas']],
  ['🍔', ['burger', 'burgers', 'hamburger', 'hamburgers', 'hamburguesa', 'hamburguesas', 'cheeseburger', 'cheeseburgers']],
  ['🍟', ['fries', 'fry', 'chips', 'crisps', 'papas fritas', 'patatas fritas', 'frites', 'pommes frites', 'patatine', 'patatine fritte', 'batata frita', 'batatas fritas']],
  ['🌮', ['taco', 'tacos', 'fajita', 'fajitas', 'quesadilla', 'quesadillas', 'nachos', 'enchilada', 'enchiladas', 'tostada', 'tostadas', 'chilaquiles']],
  ['🌯', ['burrito', 'burritos', 'wrap', 'wraps']],
  ['🥙', ['shawarma', 'gyro', 'gyros', 'doner', 'döner', 'kebab', 'kebabs', 'souvlaki']],
  ['🧆', ['falafel', 'falafels']],
  ['🥪', ['sandwich', 'sandwiches', 'sándwich', 'sanduche', 'bocadillo', 'bocadillos', 'sanduíche', 'sanduiche', 'sanduíches']],
  ['🥗', ['salad', 'salads', 'ensalada', 'ensaladas', 'salade', 'salades', 'salat', 'salate', 'insalata', 'insalate', 'salada', 'saladas', 'tabbouleh', 'tabulé', 'tabule']],
  ['🍲', ['stew', 'stews', 'soup', 'soups', 'guiso', 'guisos', 'estofado', 'estofados', 'sopa', 'sopas', 'ragoût', 'ragout', 'eintopf', 'suppe', 'stufato', 'spezzatino', 'zuppa', 'ensopado', 'caldo', 'moussaka', 'goulash', 'gulasch']],
  ['🍛', ['curry', 'curries', 'biryani', 'tikka masala', 'tandoori']],
  ['🥘', ['paella', 'risotto', 'jambalaya', 'casserole', 'casseroles']],
  ['🍱', ['bento', 'bento box']],
  ['🍥', ['fish cake', 'narutomaki', 'kamaboko']],
  ['🍢', ['oden', 'skewer', 'skewers', 'brochette', 'brochettes', 'espeto', 'espetinho', 'spiedino']],
  ['🍡', ['dango', 'mochi']],
  ['🥮', ['mooncake', 'mooncakes']],
  ['🫔', ['tamale', 'tamales', 'tamal']],

  // ---- Desserts / sweets ----
  ['🍰', ['cake', 'cakes', 'pastel', 'pasteles', 'tarta', 'tartas', 'torta', 'tortas', 'gâteau', 'gateau', 'gâteaux', 'kuchen', 'torte', 'torten', 'bolo', 'bolos']],
  ['🎂', ['birthday cake']],
  ['🧁', ['cupcake', 'cupcakes', 'magdalena', 'magdalenas', 'muffin', 'muffins', 'sprinkles']],
  ['🍪', ['cookie', 'cookies', 'galleta', 'galletas', 'biscuit', 'biscuits', 'keks', 'kekse', 'biscotto', 'biscotti', 'biscoito', 'biscoitos']],
  ['🍩', ['donut', 'donuts', 'doughnut', 'doughnuts', 'dona', 'donas', 'rosquilla', 'rosquillas', 'beignet', 'beignets', 'ciambella', 'ciambelle', 'rosquinha', 'rosquinhas']],
  ['🍫', ['chocolate', 'chocolates', 'schokolade', 'cioccolato', 'cioccolata', 'brownie', 'brownies', 'hot chocolate', 'cocoa', 'cacao', 'chocolate caliente', 'chocolat chaud', 'heiße schokolade', 'heisse schokolade', 'cioccolata calda', 'chocolate quente']],
  ['🍬', ['candy', 'candies', 'sweet', 'sweets', 'caramelo', 'caramelos', 'dulce', 'dulces', 'bonbon', 'bonbons', 'karamell', 'caramella', 'caramelle', 'bala', 'balas', 'doce', 'doces', 'marshmallow', 'marshmallows', 'toffee', 'fudge', 'caramel']],
  ['🍭', ['lollipop', 'lollipops', 'piruleta', 'piruletas', 'paleta', 'paletas', 'sucette', 'sucettes', 'lutscher', 'lecca-lecca', 'pirulito', 'pirulitos']],
  ['🍮', ['pudding', 'puddings', 'flan', 'flanes', 'budino', 'pudim', 'pudins', 'mousse', 'custard', 'tiramisu', 'cheesecake', 'panna cotta', 'crème brûlée', 'creme brulee']],
  ['🥧', ['pie', 'pies', 'quiche', 'quiches', 'tarte', 'tartes', 'cannoli', 'baklava', 'churro', 'churros', 'macaron', 'macarons', 'macaroon', 'macaroons', 'éclair', 'eclair', 'eclairs', 'meringue', 'meringues']],
  ['🍯', ['honey', 'miel', 'miele', 'mel', 'sugar', 'azúcar', 'azucar', 'sucre', 'zucker', 'zucchero', 'açúcar', 'acucar']],

  // ---- Nuts / seeds ----
  ['🥜', ['nut', 'nuts', 'peanut', 'peanuts', 'cacahuete', 'cacahuetes', 'maní', 'mani', 'cacahuète', 'cacahuètes', 'erdnuss', 'erdnüsse', 'arachide', 'arachidi', 'amendoim', 'amendoins', 'almond', 'almonds', 'almendra', 'almendras', 'amande', 'amandes', 'mandel', 'mandeln', 'mandorla', 'mandorle', 'amêndoa', 'amendoa', 'amêndoas', 'walnut', 'walnuts', 'nuez', 'nueces', 'noix', 'walnuss', 'walnüsse', 'noce', 'noci', 'cashew', 'cashews', 'anacardo', 'anacardos', 'cajou', 'cajú', 'caju', 'cashewnuss', 'pistachio', 'pistachios', 'pistacho', 'pistachos', 'pistache', 'pistazie', 'pistacchio', 'pistacchi', 'hazelnut', 'hazelnuts', 'avellana', 'avellanas', 'noisette', 'noisettes', 'haselnuss', 'haselnüsse', 'nocciola', 'nocciole', 'avelã', 'avela', 'avelãs', 'pecan', 'pecans', 'pecana', 'macadamia', 'macadamias', 'sesame', 'sésamo', 'sesamo', 'sésame', 'gergelim', 'chia', 'flaxseed', 'linaza', 'lin', 'leinsamen', 'linhaça', 'sunflower seed', 'sunflower seeds', 'pipas']],

  // ---- Beverages ----
  ['☕', ['coffee', 'café', 'cafe', 'kaffee', 'caffè', 'caffe', 'espresso', 'cappuccino', 'mocha', 'macchiato', 'americano', 'latte']],
  ['🍵', ['tea', 'té', 'te', 'thé', 'tee', 'tè', 'chá', 'cha']],
  ['🧃', ['juice', 'juice box', 'jugo', 'jugos', 'zumo', 'zumos', 'jus', 'saft', 'säfte', 'saefte', 'succo', 'succhi', 'suco', 'sucos']],
  ['🥤', ['soda', 'sodas', 'pop', 'cola', 'refresco', 'refrescos', 'boisson gazeuse', 'limonade', 'bibita', 'bibite', 'refrigerante', 'refrigerantes', 'gaseosa', 'gaseosas']],
  ['🍺', ['beer', 'beers', 'cerveza', 'cervezas', 'bière', 'biere', 'bieres', 'bier', 'birra', 'birre', 'cerveja', 'cervejas']],
  ['🍷', ['wine', 'wines', 'vino', 'vinos', 'vin', 'vins', 'wein', 'weine', 'vinho', 'vinhos']],
  ['🥂', ['champagne', 'champán', 'champan', 'champagner', 'champanhe']],
  ['🍸', ['cocktail', 'cocktails', 'coctel', 'cóctel', 'cocteles']],
  ['🍹', ['tropical drink', 'mocktail', 'mojito', 'piña colada', 'pina colada', 'margarita', 'sangria', 'sangría', 'caipirinha']],
  ['🥃', ['whiskey', 'whisky', 'whiskies', 'vodka', 'rum', 'ron', 'ginebra', 'gin', 'tequila', 'brandy', 'cognac', 'coñac', 'conac']],
  ['🍶', ['sake']],
  ['🧋', ['bubble tea', 'boba', 'milk tea']],
  ['💧', ['water', 'agua', 'aguas', 'eau', 'wasser', 'acqua', 'acque', 'água', 'águas']],
  ['🧂', ['salt', 'sal', 'sel', 'salz', 'sale']],
];

const FOOD_EMOJI: Map<string, string> = new Map(
  FOOD_EMOJI_GROUPS.flatMap(([emoji, keywords]) => keywords.map((keyword) => [keyword, emoji] as const))
);

/**
 * Keywords checked longest-first so a specific match (e.g. "pineapple")
 * always wins over a shorter one it happens to contain (e.g. "apple").
 */
const SORTED_KEYWORDS: readonly string[] = [...FOOD_EMOJI.keys()].sort((a, b) => b.length - a.length);

/** Unicode-letter/number runs, used to require whole-word matches for short keywords. */
function tokenize(name: string): Set<string> {
  return new Set(name.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** The emoji a food's name matches, or `DEFAULT_FOOD_EMOJI` if nothing does. */
export function matchFoodEmoji(name: string): string {
  const lower = name.toLowerCase();
  const tokens = tokenize(name);

  for (const keyword of SORTED_KEYWORDS) {
    // Keywords this short (e.g. "pan", "riz", "ei") turn up as substrings of
    // unrelated words in other languages, so require a whole-word match;
    // longer keywords use substring matching to also catch plurals and
    // compounds (e.g. "cheeseburger" via "burger").
    const matches = keyword.length <= 3 ? tokens.has(keyword) : lower.includes(keyword);
    if (matches) return FOOD_EMOJI.get(keyword)!;
  }

  return DEFAULT_FOOD_EMOJI;
}
