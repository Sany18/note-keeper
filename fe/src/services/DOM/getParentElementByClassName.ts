export const getDOMParrentElement = (element: HTMLElement, className: string) => {
  if (!element) return;

  if (element.classList.contains(className)) {
    return element;
  } else {
    return getDOMParrentElement(element.parentElement, className);
  }
};
