const fs = require('fs');

async function main() {
  let content = fs.readFileSync('src/api.ts', 'utf8');

  const wrapperCode = `
// Wrapper genérico para soporte Offline-First
export async function withOfflineSync<T>(
  operation: () => Promise<{ data: any, error: any }>,
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any,
  optimisticData: T
): Promise<T> {
  const isTargetOffline = typeof window !== 'undefined' && !window.navigator.onLine;
  if (isTargetOffline) {
    saveToSyncQueue({ table, action, payload });
    return optimisticData;
  }
  try {
    const { data, error } = await operation();
    if (error) throw error;
    if (data) return mapKeys(data, toCamel) as T;
    return optimisticData;
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || (typeof window !== 'undefined' && !window.navigator.onLine)) {
       saveToSyncQueue({ table, action, payload });
       return optimisticData;
    }
    throw err;
  }
}`;

  if (!content.includes('withOfflineSync')) {
    content = content.replace('// ─── Tipos', wrapperCode + '\n// ─── Tipos');
  }

  // INSERT regex
  const insertRegex = /const dbData = mapKeys\(([^,]+), toSnake\);\s*const \{\s*data\s*,\s*error\s*\} = await supabase\.from\('([^']+)'\)\.insert\(dbData\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*return mapKeys\(data, toCamel\) as ([a-zA-Z]+);/g;

  content = content.replace(insertRegex, (match, param, table, type) => {
    return `const dbData = mapKeys(${param}, toSnake);
  return await withOfflineSync<${type}>(
    () => supabase.from('${table}').insert(dbData).select().single(),
    '${table}',
    'INSERT',
    dbData,
    { ...${param}, id: \`${table.substring(0,3)}\${Date.now()}\` } as unknown as ${type}
  );`;
  });

  // UPDATE regex
  const updateRegex = /const \{\s*id\s*,\s*\.\.\.rest\s*\} = ([^;]+);\s*const dbData = mapKeys\(rest, toSnake\);\s*const \{\s*data\s*,\s*error\s*\} = await supabase\.from\('([^']+)'\)\.update\(dbData\)\.eq\('id', id\)\.select\(\)\.single\(\);\s*if \(error\) throw error;\s*return mapKeys\(data, toCamel\) as ([a-zA-Z]+);/g;

  content = content.replace(updateRegex, (match, param, table, type) => {
    return `const { id, ...rest } = ${param};
  const dbData = mapKeys(rest, toSnake);
  return await withOfflineSync<${type}>(
    () => supabase.from('${table}').update(dbData).eq('id', id).select().single(),
    '${table}',
    'UPDATE',
    { ...dbData, id },
    ${param} as unknown as ${type}
  );`;
  });

  // DELETE regex
  const deleteRegex = /const \{\s*error\s*\} = await supabase\.from\('([^']+)'\)\.delete\(\)\.eq\('id', (id|[^)]+)\);\s*if \(error\) throw error;/g;

  content = content.replace(deleteRegex, (match, table, idParam) => {
    return `await withOfflineSync<void>(
    () => supabase.from('${table}').delete().eq('id', ${idParam}) as any,
    '${table}',
    'DELETE',
    { id: ${idParam} },
    undefined as void
  );`;
  });

  fs.writeFileSync('src/api.ts', content);
  console.log('Refactoring complete.');
}

main();
