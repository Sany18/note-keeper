const createEvent = (name: string) => {
  const event = new CustomEvent(name);
  const element = document.createElement('div');
  const callbacks = new Set<() => void>();

  element.addEventListener(name, () => {
    callbacks.forEach(callback => callback());
  });

  return {
    emit: () => {
      element.dispatchEvent(event);
    },
    on: (callback: () => void) => {
      callbacks.add(callback);
    },
    off: (callback: () => void) => {
      callbacks.delete(callback);
    },
    destroy: () => {
      element.remove();
      callbacks.clear();
    }
  };
};

const appEventNames = [
  'onSaveToGoogleDrive',
];

export const appEvents = appEventNames.reduce((acc, name) => {
  acc[name] = createEvent(name);
  return acc;
}, {} as Record<string, ReturnType<typeof createEvent>>);
