export const deepClone = <T>(obj: T): T => {
  if (window.structuredClone) {
    return window.structuredClone(obj);
  } else {
    return JSON.parse(JSON.stringify(obj));
  }
}
