import { useEffect, useState } from 'react';

import { Button } from './ui/Button.jsx';

/**
 * Invite de mise à jour de la PWA.
 *
 * Le service worker signale qu'une version plus récente est prête ; on laisse
 * la main à l'utilisateur plutôt que de recharger d'autorité — recharger
 * pendant la saisie d'un article ferait perdre ce qui est en train d'être tapé.
 */
export function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener('minka:update-available', show);
    return () => window.removeEventListener('minka:update-available', show);
  }, []);

  if (!visible) return null;

  return (
    // Au-dessus de la barre d'onglets, comme les champs d'ajout : le bandeau
    // informe, il ne doit pas masquer la navigation.
    <div className="bottom-onglets fixed inset-x-0 z-30 px-3 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-sand-900 px-4 py-3 text-fond shadow-lg">
        <p className="flex-1 text-sm">Une nouvelle version de Minka est disponible.</p>
        <Button
          size="sm"
          variant="primary"
          onClick={() => window.dispatchEvent(new CustomEvent('minka:apply-update'))}
        >
          Mettre à jour
        </Button>
      </div>
    </div>
  );
}
