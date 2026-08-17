import { useEffect } from 'react';

/**
 * Recharge des données au retour sur l'application.
 *
 * En l'absence de temps réel, c'est ce qui permet de voir ce que l'autre a
 * ajouté : on rouvre l'onglet ou l'application, et l'écran est à jour.
 *
 * Les deux événements sont écoutés parce qu'ils ne couvrent pas les mêmes
 * situations, et c'est la source d'un piège :
 *   — `visibilitychange` signale le retour depuis un autre onglet ou depuis
 *     l'écran verrouillé ; il faut alors vérifier que la page est bien
 *     redevenue visible ;
 *   — `focus` signale le retour depuis une autre fenêtre, alors que la page
 *     n'a jamais cessé d'être « visible » au sens de l'API. Y appliquer le
 *     même test que ci-dessus laisserait ce cas passer entre les mailles.
 */
export function useRefreshOnFocus(refresh) {
  useEffect(() => {
    const surChangementDeVisibilite = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const surFocus = () => refresh();

    document.addEventListener('visibilitychange', surChangementDeVisibilite);
    window.addEventListener('focus', surFocus);
    return () => {
      document.removeEventListener('visibilitychange', surChangementDeVisibilite);
      window.removeEventListener('focus', surFocus);
    };
  }, [refresh]);
}
