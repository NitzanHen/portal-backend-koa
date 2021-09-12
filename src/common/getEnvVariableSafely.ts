
/**
 * Retrieves an env variable in a safe manner, i.e. ensures that it actually exists.
 * If it doesn't, a proper message is logged, and the process exits.
 * 
 * @param key the env key to retrieve
 */
export const getEnvVariableSafely = (key: string): string => {
  const variable = process.env[key];
  if(!variable) {
    console.error(`Can't find the env variable ${key}. Make sure it exists and is valid.`);
    process.exit(1);
  }

  return variable;
};