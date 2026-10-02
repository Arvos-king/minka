import { useEffect, useRef, useState } from 'react';

import { vitesseDeDefilement } from './defilement.js';

/** En deçà, le doigt a touché la poignée ; au-delà, il emporte le repas. */
const SEUIL = 6;

const memeCase = (a, b) => (a && b ? a.date === b.date && a.slot === b.slot : a === b);

/**
 * La case sous le pointeur, d'après les `data-*` que porte chaque créneau du
 * planning ; `null` ailleurs — en-tête, barre d'onglets, marges.
 */
function caseSous(x, y) {
  const element = document.elementFromPoint(x, y)?.closest('[data-case]');
  return element ? { date: element.dataset.date, slot: element.dataset.slot } : null;
}

/**
 * Glisser un repas par sa poignée.
 *
 * **Événements pointeur**, qui couvrent le doigt comme la souris. La poignée
 * porte `touch-action: none` : le navigateur ne lui dispute pas le geste pour
 * faire défiler la page, et la suit dès le premier pixel — le reste de la
 * ligne, lui, défile normalement. Aucun appui long à attendre, donc rien de
 * l'aiguillage entre événements tactiles et souris qu'exige l'appui long des
 * courses.
 *
 * **Toucher ou glisser.** Un pointeur qui ne s'éloigne pas de quelques pixels
 * a touché la poignée : le `click` qui suit ouvre le mode « Déplacer… »
 * (`onToucher`). Au-delà, le repas est saisi : un fantôme suit le pointeur, la
 * case visée s'éclaire, et le lâcher appelle `onDeposer(de, vers)`. Le `click`
 * que le navigateur envoie encore à la poignée après un glisser est avalé —
 * la garde de l'appui long des courses, pour la même raison : sans elle,
 * chaque dépôt ouvrirait aussi « Déplacer… ».
 *
 * **La case visée** se trouve par `elementFromPoint` : ni mesure ni registre
 * des positions, et le défilement se compte de lui-même. Revenir sur la case
 * de départ, ou lâcher hors du planning, ne déplace rien.
 *
 * **Le suivi du geste** passe par `window` plutôt que par la poignée : celle-ci
 * peut disparaître en plein geste — un rafraîchissement qui retire le repas —,
 * et le fantôme resterait alors figé à l'écran. La capture du pointeur n'est
 * gardée que pour la souris qui sortirait de la fenêtre.
 *
 * Seuls la saisie, le changement de case visée et le lâcher passent par l'état
 * de React. Le fantôme, lui, se déplace par sa référence, à chaque mouvement,
 * sans redessiner la semaine.
 *
 * @param {object} rappels
 * @param {(de: object, vers: object) => void} rappels.onDeposer
 * @param {(de: object) => void} rappels.onToucher
 * @returns {{
 *   glisse: null | { de: object, intitule: string, vers: object|null },
 *   fantome: { current: HTMLElement|null },
 *   poignee: (de: object, intitule: string) => object,
 * }} `poignee` rend les propriétés à étaler sur le bouton de la poignée.
 */
export function useGlisser({ onDeposer, onToucher }) {
  const [glisse, setGlisse] = useState(null);

  const geste = useRef(null);
  const fantome = useRef(null);
  const animation = useRef(null);
  // Le `click` qui suit un glisser, à ne pas prendre pour un toucher.
  const avaler = useRef(false);

  // Les rappels les plus récents, sans réabonner les écouteurs d'un geste en cours.
  const rappels = useRef({ onDeposer, onToucher });
  useEffect(() => {
    rappels.current = { onDeposer, onToucher };
  });

  // La page quittée en plein geste : rien ne doit continuer d'écouter.
  useEffect(() => () => detacher(geste.current), []);

  function detacher(g) {
    if (!g) return;
    window.removeEventListener('pointermove', g.surMouvement);
    window.removeEventListener('pointerup', g.surLacher);
    window.removeEventListener('pointercancel', g.surAnnulation);
    window.removeEventListener('keydown', g.surTouche);
    window.removeEventListener('blur', g.surAbandon);
    cancelAnimationFrame(animation.current);
  }

  function placerFantome(x, y) {
    // Au-dessus du doigt, qui sinon le cacherait.
    if (fantome.current) {
      fantome.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, calc(-100% - 16px))`;
    }
  }

  function viser() {
    const g = geste.current;
    if (!g?.actif) return;

    let vers = caseSous(g.x, g.y);
    // Revenir sur sa propre case, c'est reposer le repas où il était.
    if (memeCase(vers, g.de)) vers = null;
    if (memeCase(vers, g.vers)) return;

    g.vers = vers;
    setGlisse((precedent) => precedent && { ...precedent, vers });
  }

  function defiler() {
    const g = geste.current;
    if (!g?.actif) return;

    const vitesse = vitesseDeDefilement(g.y, window.innerHeight);
    if (vitesse !== 0) {
      window.scrollBy(0, vitesse);
      // La page a bougé sous un pointeur immobile : la case visée aussi.
      viser();
    }
    animation.current = requestAnimationFrame(defiler);
  }

  function terminer(deposer) {
    const g = geste.current;
    if (!g) return;

    geste.current = null;
    detacher(g);
    // Un simple toucher : le `click` qui suit ouvrira « Déplacer… ».
    if (!g.actif) return;

    avaler.current = true;
    setGlisse(null);
    if (deposer && g.vers) rappels.current.onDeposer(g.de, g.vers);
  }

  function saisir(evenement, de, intitule) {
    // Bouton principal, doigt ou stylet : un clic droit n'emporte rien.
    if (evenement.button !== 0 || geste.current) return;
    avaler.current = false;

    const { pointerId, clientX: x, clientY: y } = evenement;
    evenement.currentTarget.setPointerCapture(pointerId);

    const g = { pointerId, de, intitule, depart: { x, y }, x, y, actif: false, vers: null };

    g.surMouvement = (e) => {
      if (e.pointerId !== pointerId) return;
      g.x = e.clientX;
      g.y = e.clientY;

      if (!g.actif) {
        if (Math.hypot(g.x - g.depart.x, g.y - g.depart.y) < SEUIL) return;
        g.actif = true;
        // Le repas se décroche : un retour au doigt, là où le téléphone le
        // permet. Pas avant un premier vrai geste sur la page — le navigateur
        // refuserait, et le signalerait en erreur.
        if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.(10);
        setGlisse({ de, intitule, vers: null });
        animation.current = requestAnimationFrame(defiler);
      }

      placerFantome(g.x, g.y);
      viser();
    };
    g.surLacher = (e) => {
      if (e.pointerId === pointerId) terminer(true);
    };
    g.surAnnulation = (e) => {
      if (e.pointerId === pointerId) terminer(false);
    };
    g.surTouche = (e) => {
      if (e.key === 'Escape') terminer(false);
    };
    // Quitter l'application en plein geste : le lâcher ne nous parviendra pas.
    g.surAbandon = () => terminer(false);

    geste.current = g;
    window.addEventListener('pointermove', g.surMouvement);
    window.addEventListener('pointerup', g.surLacher);
    window.addEventListener('pointercancel', g.surAnnulation);
    window.addEventListener('keydown', g.surTouche);
    window.addEventListener('blur', g.surAbandon);
  }

  return {
    glisse,
    fantome,
    poignee: (de, intitule) => ({
      onPointerDown: (evenement) => saisir(evenement, de, intitule),
      onClick: () => {
        if (avaler.current) {
          avaler.current = false;
          return;
        }
        rappels.current.onToucher(de);
      },
      // L'appui prolongé d'un doigt immobile ouvrirait le menu du navigateur.
      onContextMenu: (evenement) => evenement.preventDefault(),
    }),
  };
}
