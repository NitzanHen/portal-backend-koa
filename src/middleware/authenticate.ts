import { Middleware } from 'koa';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely';
import { CtxState } from '../types/CtxState';
import { JwtCache } from '../common/JwtCache';
import { err } from '../common/Result';
import { safeTry } from '../common/safeTry';
import { userService } from '../service/UserService';
import { isNoSuchResourceError } from '../common/NoSuchResourceError';
import { middlewareGuard } from './middlewareGuard';

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
  console.log('Azure AD public keys & issuer url refreshed');
});

refreshKeys();
/** Once a day, refresh the kid signature record */
setInterval(refreshKeys, 1000 * 60 * 60 * 24);

const bearerRegex = /^Bearer ([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)$/;


/**
 * Authenticator middleware; expects an OAuth2 Bearer token, i.e.
 * an Authorization header containing `Bearer [token]`, where token is a JWT token.
 */
export const authenticate: Middleware<CtxState> = middlewareGuard(async (ctx, next) => {
  if (!kidSignatureRecord) {
    console.error('kid signature record is not loaded; cannot authenticate requests');
    ctx.status = 500;
    ctx.body = err('Internal Server Error');
    return;
  }

  /** Helper function to return 401 properly if one of the checks fails. */
  const unauthorized = (message?: string) => {
    ctx.headers['www-authenticate'] = 'Bearer';
    ctx.status = 401;
    if (message) {
      ctx.body = err(message);
    }
    return;
  };


  const { authorization } = ctx.header;
  if (!authorization) {
    return unauthorized('Requests must have the Authorization header set with a proper Bearer auth string, and a JWT token retrieved from Azure AD');
  }
  const matches = authorization.match(bearerRegex);

  if (!matches || !matches[1]) {
    return unauthorized('Invalid Bearer auth string or JWT');
  }

  const token = matches[1];

  //Check the cache for an existing token
  const cachedUser = jwtCache.get(token);
  if (cachedUser) {
    ctx.state.user = cachedUser;
    jwtCache.refresh(token);
    return await next();
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
    console.log(verifyResult.err);
    return unauthorized();
  }

  const verifiedPayload = verifyResult.data;
  if (!verifiedPayload) {
    return unauthorized();
  }

  const { oid, exp } = verifiedPayload;
  if (!oid) {
    // This should not be possible
    throw new Error('Valid JWT token received that has no oid field');
  }

  // All checks passed. Fetch a user and attach it to ctx.
  // Note that from this point, we don't return 401 on an error - the user *is* authenticated.

  const result = await userService.findByOID(oid);
  if (!result.ok) {
    const { err: error } = result;
    if (isNoSuchResourceError(error)) {
      // JWT token is valid, but the user is not registered in the portal's databases.
      ctx.status = 403;
      ctx.body = "JWT token is valid but the user isn't registered to the Agamim Portal.";
      return;
    }

    throw error;
  }

  const user = result.data;

  /** @todo make userController typed properly */
  jwtCache.cache(token, user, exp);
  ctx.state.user = user;

  await next();
});