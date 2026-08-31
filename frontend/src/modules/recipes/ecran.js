import { useEffect, useState } from 'react';

/**
 * Empêche l'écran de s'éteindre pendant qu'on cuisine.
 *
 * C'est la moitié du confort du mode cuisine : les mains sont occupées, souvent
 * mouillées, et un écran qui s'éteint toutes les trente secondes oblige à le
 * rallumer d'un doigt propre qu'on n'a pas.
 *
 * `navigator.wakeLock` n'existe pas partout — Safari ne l'a que depuis peu, et
 * jamais hors HTTPS. Sans lui, le mode cuisine fonctionne exactement pareil,
 * simplement l'écran suit le réglage du téléphone. D'où la valeur renvoyée :
 * l'interface le dit plutôt que de laisser croire à une promesse tenue.
 *
 * @param {boolean} actif
 * @returns {boolean} vrai si le verrou est effectivement tenu.
 */
export function useEcranAllume(actif) {
  const [tenu, setTenu] = useState(false);

  useEffect(() => {
    if (!actif || !('wakeLock' in navigator)) return undefined;

    let verrou = null;
    let abandonne = false;

    async function demander() {
      // Déjà tenu : le système ne rend le verrou que lorsque la page passe en
      // arrière-plan, et en cumuler deux n'apporterait rien.
      if (verrou && !verrou.released) return;

      try {
        verrou = await navigator.wakeLock.request('screen');
        if (abandonne) {
          verrou.release().catch(() => {});
          return;
        }
        setTenu(true);
        verrou.addEventListener('release', () => setTenu(false));
      } catch {
        // Batterie faible, onglet en arrière-plan, permission refusée : tant
        // pis pour l'écran, la recette s'affiche quand même.
        setTenu(false);
      }
    }

    /*
     * Le verrou est rendu par le système dès que la page passe en
     * arrière-plan. Sans ce réveil, répondre à un message en pleine
     * préparation suffirait à ce que l'écran se rendorme au retour.
     */
    function auRetour() {
      if (document.visibilityState === 'visible') demander();
    }

    demander();
    document.addEventListener('visibilitychange', auRetour);

    return () => {
      abandonne = true;
      document.removeEventListener('visibilitychange', auRetour);
      verrou?.release().catch(() => {});
    };
  }, [actif]);

  return tenu;
}
