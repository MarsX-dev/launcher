process.env['SUPPRESS_NO_CONFIG_WARNING'] = 'true';
import configModule from 'config';
import path from 'path';
import { assert } from './utils/utils';

export interface ImportProjectConfig {
  name: string;
  url: string;
  api_key: string;
  git_commit_ish?: string | undefined;
}

const ensureType =
  <T>(typeName: string) =>
  (configName: string): T => {
    const value = configModule.get(configName);
    assert(typeof value === typeName);
    return value as T;
  };

const ensureString = ensureType<string>('string');
const ensureBoolean = ensureType<boolean>('boolean');
const ensureNumber = ensureType<number>('number');

function validatedConfig() {
  if (configModule.util.getConfigSources().length === 0) {
    return new Proxy({} as never, {
      get() {
        throw new Error('Config file not found, ensure you have "config/default.json" file.');
      },
    });
  }

  return {
    production: ensureBoolean('production'),
    port: ensureNumber('port'),
    blocksDir: path.resolve(ensureString('blocksDir')),
    cacheDir: path.resolve(ensureString('cacheDir')),
    mongoConn: ensureString('mongoConn'),
    mongoDbName: ensureString('mongoDbName'),
    azureStorageConnection: ensureString('azureStorageConnection'),
    azureStorageAccountName: ensureString('azureStorageAccountName'),
    azureStorageUrl: ensureString('azureStorageUrl'),
    secret: ensureString('secret'),
    webFilesTable: ensureString('webFilesTable'),
    webRecentFilesTable: ensureString('webRecentFilesTable'),
    webFilesBlob: ensureString('webFilesBlob'),
    importProjects: configModule.get<ImportProjectConfig[]>('importProjects'),
  };
}

export const config = validatedConfig();
export type Configuration = typeof config;
