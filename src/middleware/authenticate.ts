import { Middleware } from 'koa';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely';
import { CtxState } from '../types/CtxState';
import { JwtCache } from '../common/JwtCache';
import { AsyncResult, err, ok } from '../common/Result';
import { safeTry } from '../common/safeTry';
import { userService } from '../service/UserService';
import { UserWithId } from '../model/User';
import { isUnauthorizedError, UnauthorizedError } from '../common/UnauthorizedError';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { middlewareGuard } from './middlewareGuard';
import { logger } from './logger';

const tokenEndpoint = getEnvVariableSafely('AZURE_AD_TOKEN_ENDPOINT');
const clientId = getEnvVariableSafely('AZURE_CLIENT_ID');
const tenantId = getEnvVariableSafely('AZURE_TENANT_ID');

type KidSignatureRecord = Record<string, string>;

let kidSignatureRecord: KidSignatureRecord | null = null;
let issuer: string | null = null;

const jwtCache = new JwtCache();

/**
 * Retrieves Azure's public keys for decoding tokens, and the issuer url.
 * 
 * For more info, see [this guide](https://www.voitanos.io/blog/validating-azure-ad-generated-oauth-tokens/).
 */
const loadPublicKeys = async (): Promise<[KidSignatureRecord, string]> => {
  const oidConfiguration = (await axios.get(tokenEndpoint)).data;

  const issuerUrl = (oidConfiguration.issuer as string).replace('{tenantid}', tenantId);

  const jwksUri = oidConfiguration['jwks_uri'];
  const keyRecord = (await axios.get(jwksUri)).data;

  const x5cToSignature = (x5c: string) => `-----BEGIN CERTIFICATE-----\n${x5c}\n-----END CERTIFICATE-----`;

  const kidSignatureRecord = keyRecord.keys.reduce((record: KidSignatureRecord, key: any) => ({
    ...record,
    [key.kid]: x5cToSignature(key.x5c[0])
  }), {});


  return [kidSignatureRecord, issuerUrl];
};

const refreshKeys = () => loadPublicKeys().then(([record, iss]) => {
  kidSignatureRecord = record;
  issuer = iss;
  logger.info('Azure AD public keys & issuer url refreshed');
});

refreshKeys();
/** Once a day, refresh the kid signature record */
setInterval(refreshKeys, 1000 * 60 * 60 * 24);

const bearerRegex = /^Bearer ([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)$/;

/**
 * 
 * @param bearer a Bearer token string.
 * @returns A User if authentication is successful, an error otherwise.
 * If Authentication fails, UnauthorizedError is returned.
 */
export const authenticateUser = async (bearer?: string): AsyncResult<UserWithId> => {
  if (!kidSignatureRecord) {
    console.error('kid signature record is not loaded; cannot authenticate requests');
    return err(new Error('Internal Server Error'));
  }

  const unauthorized = (message?: string) => err(new UnauthorizedError(message));

  if (!bearer) {
    return unauthorized('Requests must have the Authorization header set with a proper Bearer auth string, and a JWT token retrieved from Azure AD');
  }

  const matches = bearer.match(bearerRegex);

  if (!matches || !matches[1]) {
    return unauthorized('Invalid Bearer auth string or JWT');
  }

  const token = matches[1];

  //Check the cache for an existing token
  const cachedUser = jwtCache.get(token);
  if (cachedUser) {
    jwtCache.refresh(token);

    return ok(cachedUser);
  }

  const jwtPayload = jwt.decode(token, {
    complete: true
  });
  if (!jwtPayload) {
    //non-parsable token
    return unauthorized('Bad token');
  }

  const { kid } = jwtPayload.header;
  if (!kid) {
    return unauthorized();
  }

  const signature = kidSignatureRecord[kid];
  if (!signature) {
    // The JWT's kid has no matching signature.
    return unauthorized();
  }

  const verifyResult = safeTry(() => jwt.verify(token, signature, {
    issuer: issuer!,
    audience: clientId,
    // Also validates nbf and exp
  }) as jwt.JwtPayload | null);

  if (!verifyResult.ok) {
    return unauthorized();
  }

  const verifiedPayload = verifyResult.data;
  if (!verifiedPayload) {
    return unauthorized();
  }

  const { oid, exp } = verifiedPayload;
  if (!oid) {
    // This should not be possible
    return err(new Error('Valid JWT token received that has no oid field'));
  }

  // All checks passed. Fetch a user return it.
  // Note that from this point, we don't return 401 on an error - the user *is* authenticated.

  const result = await userService.findByOID(oid);
  if (!result.ok) {
    return result;
  }

  const user = result.data;

  jwtCache.cache(token, user, exp);

  return ok(user);
};

/**
 * Authenticator middleware; expects an OAuth2 Bearer token, i.e.
 * an Authorization header containing `Bearer [token]`, where token is a JWT token.
 */
const authenticateMiddleware: Middleware<CtxState> = middlewareGuard(async (ctx, next) => {
  if (!kidSignatureRecord) {
    console.error('kid signature record is not loaded; cannot authenticate requests');
    ctx.status = 500;
    ctx.body = err('Internal Server Error');
    return;
  }

  /** Helper function to return 401 properly if one of the checks fails. */
  const unauthorized = (error: UnauthorizedError) => {
    ctx.headers['www-authenticate'] = 'Bearer';
    ctx.status = 401;
    ctx.body = error;
    return;
  };

  const authResult = await authenticateUser(ctx.header.authorization);
  if (!authResult.ok) {
    const { err: error } = authResult;
    if (isUnauthorizedError(error)) {
      return unauthorized(error);
    }
    else if (isNoSuchResourceError(error)) {
      ctx.status = 403;
      ctx.body = err("JWT token is valid but the user isn't registered to the Agamim Portal.");
      return;
    }

    console.error(error);
    ctx.status = 500;
    ctx.body = err('Internal server error');
    return;
  }

  const user = authResult.data;
  ctx.state.user = user;

  await next();
});

export { authenticateMiddleware as authenticate };