import { MARS_SFC_EXT, SfcBlock } from './sfc';

export type V3MongoBlock = {
  Folder: string;
  Name: string;
  Type: string;
  app?: { name: string; appId: string };
} & Record<string, unknown>;

const SFC_FIELD_MAP: Record<string, string> = {
  // JSONs
  DataArgs: 'json',
  Page: 'json',
  pages: 'json',
  blocks: 'json',
  Config: 'json',
  langs: 'json',
  // Scripts
  BlockFunction: 'ts',
  Html: 'html',
  HTML: 'html',
  Jsx: 'tsx',
  JsxTranspiled: 'js',
  JsxTranspiledTranspiled: 'js',
  JSX: 'tsx',
  JSXTranspiled: 'js',
  DemoJsx: 'tsx',
  DemoJsxTranspiled: 'js',
  Script: 'ts',
  Css: 'css',
  TestCode: 'ts',
  JestDefinition: 'ts',
  DataForScriptFunction: 'ts',
  // Ignore (part of file path)
  // _id: 'DELETE',
  Name: 'DELETE',
  Type: 'DELETE',
  Folder: 'DELETE',
  // Ignore (will be tracked by git)
  app: 'DELETE',
  Created: 'DELETE',
  LastChanged: 'DELETE',
  createdAt: 'DELETE',
  createdBy: 'DELETE',
  updatedAt: 'DELETE',
  updatedBy: 'DELETE',
  // ... rest of the fields will be saved in metadata
};

const SFC_SOURCE_MAP: Record<string, string> = {
  // JSONs
  DataArgs: 'DataArgs',
  Page: 'Page',
  // Scripts
  BlockFunction: 'BlockFunction',
  Html: 'Html',
  HTML: 'Html',
  Jsx: 'Jsx',
  JsxTranspiled: 'JsxTranspiled',
  JsxTranspiledTranspiled: 'JsxTranspiledTranspiled',
  JSX: 'Jsx',
  JSXTranspiled: 'JsxTranspiled',
  DemoJsx: 'DemoJsx',
  DemoJsxTranspiled: 'DemoJsxTranspiled',
  Script: 'Script',
  Css: 'Css',
  TestCode: 'TestCode',
};

export function convertV3ToSfc(block: V3MongoBlock): SfcBlock {
  const sfc: SfcBlock = {
    path: {
      folder: block.Folder,
      name: block.Name,
      blockTypeName: block.Type,
      ext: MARS_SFC_EXT,
      filePath: '',
    },
    metadata: {},
    jsons: {},
    sources: {},
    rawContent: null,
  };
  for (const [prop, value] of Object.entries(block)) {
    const sfcLang = SFC_FIELD_MAP[prop] || 'METADATA';
    const sfcSourceName = SFC_SOURCE_MAP[prop] || prop;

    switch (sfcLang) {
      case 'json':
        if (typeof value !== 'object' && !Array.isArray(value)) throw new Error(`Object or array is expected for ${prop} property`);
        sfc.jsons[sfcSourceName] = value;
        break;
      case 'DELETE':
        break;
      case 'METADATA':
        sfc.metadata[prop] = value;
        break;
      default:
        if (typeof value !== 'string') throw new Error(`String is expected for ${prop} property`);
        sfc.sources[prop] = {
          name: sfcSourceName,
          source: value,
          lang: sfcLang,
        };
        break;
    }
  }

  sfc.metadata['marsVersion'] = 3;

  if (block.app) {
    sfc.metadata['app'] = {
      name: block.app.name,
      appId: block.app.appId,
    };
  }
  return sfc;
}

export function convertSfcToV3(sfc: SfcBlock): V3MongoBlock {
  const block: V3MongoBlock = {
    Name: sfc.path.name,
    Type: sfc.path.blockTypeName,
    Folder: sfc.path.folder,
    ...sfc.metadata,
    ...sfc.jsons,
  };

  for (const [key, value] of Object.entries(sfc.sources)) {
    block[key] = value.source;
  }

  return block;
}
