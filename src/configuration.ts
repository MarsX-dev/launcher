process.env['SUPPRESS_NO_CONFIG_WARNING'] = 'true';
import configModule from 'config';
import _ from 'lodash';
import path from 'path';
import * as yup from 'yup';
import { ValidationError } from 'yup';

export interface ImportProjectConfig {
  name: string;
  url: string;
  api_key: string;
  git_commit_ish?: string | undefined;
}

export interface Config {
  production: boolean;
  port: number;
  projectName: string;
  blocksDir: string;
  cacheDir: string;
  mongoConn: string;
  mongoDbName: string;
  azureStorageConnection: string;
  azureStorageAccountName: string;
  azureStorageUrl: string;
  secret: string;
  webFilesTable: string;
  webRecentFilesTable: string;
  webFilesBlob: string;
  importProjects: ImportProjectConfig[];
}

export class ConfigError extends Error {}

const ImportProjectSchema = yup.object({
  name: yup.string().required(),
  url: yup.string().url().required(),
  api_key: yup.string().required(),
  git_commit_ish: yup.string().optional(),
});

const ConfigSchema = yup.object().shape({
  production: yup.boolean().required(),
  port: yup.number().required().positive().integer(),
  projectName: yup.string().required(),
  blocksDir: yup
    .string()
    .required()
    .transform(v => path.resolve(v)),
  cacheDir: yup
    .string()
    .required()
    .transform(v => path.resolve(v)),
  mongoConn: yup.string().required(),
  mongoDbName: yup.string().required(),
  azureStorageConnection: yup.string().required(),
  azureStorageAccountName: yup.string().required(),
  azureStorageUrl: yup.string().required(),
  secret: yup.string().required(),
  webFilesTable: yup.string().required(),
  webRecentFilesTable: yup.string().required(),
  webFilesBlob: yup.string().required(),
  importProjects: yup.array().of(ImportProjectSchema).required(),
});

function ErrorThrowingConfig(errorMessage: string) {
  return new Proxy({} as never, {
    get() {
      throw new ConfigError(errorMessage);
    },
  });
}

function validateConfig(): Config {
  if (configModule.util.getConfigSources().length === 0) {
    return ErrorThrowingConfig('Config file not found, ensure you have "config/default.json" file.');
  }

  const configObject = configModule.util.toObject();
  try {
    return ConfigSchema.validateSync(configObject, { abortEarly: false, stripUnknown: false });
  } catch (e) {
    if (e instanceof ValidationError) {
      return ErrorThrowingConfig(e.errors.join('\n'));
    } else {
      throw e;
    }
  }
}

export const config = validateConfig();

function getEnvVarMapping() {
  const result: Record<string, string | { __name: string; __format: string }> = {};
  for (const [name, field] of Object.entries(ConfigSchema.fields)) {
    const envVar = `MARSX_${_.snakeCase(name).toUpperCase()}`;
    if ('type' in field && (field.type === 'object' || field.type === 'array')) {
      result[name] = { __name: envVar, __format: 'json' };
    } else {
      result[name] = envVar;
    }
  }
  return result;
}

export const CustomEnvironmentVariables = getEnvVarMapping();
