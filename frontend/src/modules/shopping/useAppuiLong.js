import { useCallback, useEffect, useRef } from 'react';

/** Durée d'appui long des deux systèmes mobiles. */
const DELAI = 500;
/** Au-delà, le doigt fait défiler la liste : il n'appuie pas. */
const TOLERANCE = 10;

/**
 * Appui long tactile, et ses équivalents non tactiles.
 *
 * Le hook prend **aussi** le clic simple, et ce n'est pas une commodité : en
 * relâchant le doigt, le navigateur émet un `click` par-dessus l'appui long.
 * Sans cette exclusion, corriger le rayon d'un article le cocherait au passage.
 * Tenir les deux gestes au même endroit est le seul moyen de rendre la garde
 * non facultative.
 *
 * `contextmenu` couvre gratuitement trois entrées — le clic droit à la souris,
 * la touche Menu et Maj+F10 au clavier : les navigateurs émettent le même
 * événement pour les trois. Son `preventDefault` évite en outre le menu natif
 * de sélection de texte que déclenche un appui long sur iOS et Android.
 *
 * Événements tactiles plutôt que `pointer*` : un `pointerdown` maintenu une
 * demi-seconde à la souris ouvrirait le panneau sur un simple clic hésitant, et
 * `pointercancel` ne se déclenche pas au défilement de la même façon partout.
 * Deux mondes distincts, deux traitements explicites.
 *
 * Sans `onAppuiLong`, tous les gestes se réduisent au clic simple et le menu
 * contextuel du navigateur reprend son comportement normal.
 *
 * @param {object} options
 * @param {() => void} options.onClic
 * @param {(() => void)} [options.onAppuiLong]
 * @returns les propriétés à étaler sur l'élément qui porte le geste.
 */
export function useAppuiLong({ onClic, onAppuiLong }) {
  const minuteur = useRef(null);
  const depart = useRef(null);
  // Consommé par le `click` que le navigateur envoie après le relâchement.
  const declenche = useRef(false);

  const annuler = useCallback(() => {
    if (minuteur.current !== null) {
      clearTimeout(minuteur.current);
      minuteur.current = null;
    }
  }, []);

  // L'article peut disparaître pendant l'appui, effacé par l'autre personne.
  useEffect(() => annuler, [annuler]);

  const declencher = useCallback(() => {
    minuteur.current = null;
    declenche.current = true;
    onAppuiLong();
  }, [onAppuiLong]);

  if (!onAppuiLong) return { onClick: onClic };

  return {
    onClick: () => {
      if (declenche.current) {
        declenche.current = false;
        return;
      }
      onClic();
    },

    // Aucun `preventDefault` ici ni dans `onTouchMove` : le défilement de la
    // liste s'arrêterait.
    onTouchStart: (evenement) => {
      annuler();
      // Deux doigts : c'est un pincement, pas un appui.
      if (evenement.touches.length !== 1) return;

      const { clientX, clientY } = evenement.touches[0];
      depart.current = { x: clientX, y: clientY };
      minuteur.current = setTimeout(declencher, DELAI);
    },

    onTouchMove: (evenement) => {
      if (minuteur.current === null || !depart.current) return;

      const { clientX, clientY } = evenement.touches[0];
      const ecart = Math.hypot(clientX - depart.current.x, clientY - depart.current.y);
      if (ecart > TOLERANCE) annuler();
    },

    onTouchEnd: annuler,
    onTouchCancel: annuler,

    onContextMenu: (evenement) => {
      evenement.preventDefault();
      onAppuiLong();
    },
  };
}
