export function cloneDeep(value) {
  return structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
