/**
 * Validation des requêtes par schémas zod.
 *
 * Usage dans un module :
 *
 *   router.post('/items', validate({ body: createItemSchema }), (req, res) => {
 *     const { name } = req.valid.body;
 *   });
 *
 * Les valeurs validées sont déposées dans `req.valid` et non réécrites sur
 * `req.query` / `req.body` : sous Express 5, `req.query` est une propriété en
 * lecture seule et toute affectation lève une erreur.
 */

import { T } from '../textes.js';
import { AppError } from './errorHandler.js';

const SOURCES = ['body', 'query', 'params'];

export function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          champ: issue.path.join('.') || source,
          message: issue.message,
        }));
        return next(new AppError(400, 'VALIDATION_ERROR', T.erreurs.donneesInvalides, details));
      }

      req.valid[source] = result.data;
    }

    return next();
  };
}
