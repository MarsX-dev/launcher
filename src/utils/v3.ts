import { SfcBlock } from './sfc';

export type V3MongoBlock = {
  Folder: string;
  Name: string;
  Type: string;
  app?: { name: string };
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

export function convertV3ToSfc(block: V3MongoBlock): SfcBlock {
  const sfc: SfcBlock = {
    identity: {
      folder: block.Folder,
      name: block.Name,
      blockTypeName: block.Type,
      ext: 'vue',
      fullName: '',
      filePath: '',
    },
    metadata: {},
    jsons: {},
    sources: {},
    rawContent: null,
  };
  for (const [prop, value] of Object.entries(block)) {
    const sfcLang = SFC_FIELD_MAP[prop] || 'METADATA';

    switch (sfcLang) {
      case 'json':
        if (typeof value !== 'object' && !Array.isArray(value)) throw new Error(`Object or array is expected for ${prop} property`);
        sfc.jsons[prop] = value;
        break;
      case 'DELETE':
        break;
      case 'METADATA':
        sfc.metadata[prop] = value;
        break;
      default:
        if (typeof value !== 'string') throw new Error(`String is expected for ${prop} property`);
        sfc.sources[prop] = { source: value, lang: sfcLang };
        break;
    }
  }

  if (block.app) {
    sfc.metadata['app'] = { name: block.app.name };
  }
  return sfc;
}

export function convertSfcToV3(sfc: SfcBlock): V3MongoBlock {
  const block: V3MongoBlock = {
    Name: sfc.identity.name,
    Type: sfc.identity.blockTypeName,
    Folder: sfc.identity.folder,
    ...sfc.metadata,
    ...sfc.jsons,
  };

  for (const [key, value] of Object.entries(sfc.sources)) {
    block[key] = value.source;
  }

  return block;
}
