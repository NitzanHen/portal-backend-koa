import { Middleware } from 'koa';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { getEnvVariableSafely } from '../common/getEnvVariableSafely.js';
import { db } from '../peripheral/db.js';
import { middlewareGuard } from './middlewareGuard.js';
import { CtxState } from '../types/CtxState.js';
import { User } from '../model/User.js';
import { Cache } from '../common/cache.js';

const tokenEndpoint = getEnvVariableSafely('AZURE_AD_TOKEN_ENDPOINT');
const clientId = getEnvVariableSafely('AZURE_CLIENT_ID');
const tenantId = getEnvVariableSafely('AZURE_TENANT_ID');

/** @todo do something to decouple this outta here. */
const userController = db.collection('users');

type KidSignatureRecord = Record<string, string>;

let kidSignatureRecord: KidSignatureRecord | null = null;
let issuer: string | null = null;

const jwtCache = new Cache<string, User>();

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


  return [kidSignatureRecord, issuerUrl]
}

await loadPublicKeys().then(([record, iss]) => {
  kidSignatureRecord = record;
  issuer = iss
  console.log(`Azure AD public keys loaded`)
});

/** Once a day, refresh the kid signature record */
setInterval(() => loadPublicKeys().then(([record, iss]) => {
  kidSignatureRecord = record;
  issuer = iss
  console.log(`Azure AD public keys & issuer url refreshed`)
}), 1000 * 60 * 60 * 24)

const bearerRegex = /^Bearer ([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)$/


/**
 * Authenticator middleware; expects an OAuth2 Bearer token, i.e.
 * an Authorization header containing `Bearer [token]`, where token is a JWT token.
 */
export const authenticate: Middleware<CtxState> = middlewareGuard(async (ctx, next) => {
  if (!kidSignatureRecord) {
    console.error('kid signature record is not loaded; cannot authenticate requests');
    return ctx.throw(500);
  }

  /** Helper function to return 401 properly if one of the checks fails. */
  const unauthorized = (message?: string) => {
    ctx.headers['www-authenticate'] = 'Bearer';
    return message ? ctx.throw(401, message) : ctx.throw(401);
  }


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
  if(cachedUser) {
    ctx.state.user = cachedUser;
    // jwtCache.setTTL(...)
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

  const verifiedPayload = jwt.verify(token, signature) as jwt.JwtPayload | null;
  if (!verifiedPayload) {
    // The JWT's signature is incorrect.
    return unauthorized();
  }
  else if (verifiedPayload.iss !== issuer) {
    // The JWT's issuer incorrect, i.e. it was not issued by our tenant in Azure.
    return unauthorized();
  }
  else if (verifiedPayload.aud !== clientId) {
    // The JWT's audience is incorrect, i.e. it was issued by our tenant in Azure, but not for this app.
    ctx.header['www-authenticate'] = 'Bearer'
    return unauthorized();
  }

  const { oid, iat, exp } = verifiedPayload;
  if (!oid) {
    // This should not be possible
    throw new Error('Valid JWT token received that has no oid field');
  }

  if (iat && Date.now() <= iat) {
    return unauthorized()
  }
  else if (exp && exp <= Date.now()) {
    return unauthorized('Token expired')
  }

  // All checks passed. Fetch a user and attach it to ctx.
  // Note that from this point, we don't return 401 on an error - the user *is* authenticated.

  const user = await userController.findOne({ oid });
  if (!user) {
    // JWT token is valid, but the user is not registered in the portal's databases.
    return ctx.throw(403, "JWT token is valid but the user isn't registered to the Agamim Portal.")
  }

  const ttl = exp ? Math.min(exp - Date.now(), 1000 * 60 * 60) : 1000 * 60 * 60;

  /** @todo make userController typed properly */
  jwtCache.set(token, user as User, ttl)
  ctx.state.user = user as User;

  /** @todo make ttl refresh on request */

  await next();
})